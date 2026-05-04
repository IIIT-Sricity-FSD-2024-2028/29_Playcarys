import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { GameSessionRepository } from './game-session.repository';
import {
  CreateSessionDto,
  JoinSessionDto,
  EndSessionDto,
  QuickPlayDto,
} from './game-session.dto';
import {
  games,
  player_profiles,
  match_results,
  users,
  GameSession,
} from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-SES-1:  Only approved + enabled games can have sessions created
// R-SES-2:  start_time must be strictly before end_time
// R-SES-3:  A player with player_status=false (banned/inactive) cannot join a session
// R-SES-4:  A player cannot join a session they are already in
// R-SES-5:  A session cannot exceed its maxPlayers count
// R-SES-6:  Only the host (created_by) can end a session
// R-SES-7:  Once a session is 'ended', no further joins or state changes are allowed
// R-SES-8:  Ending a session requires at least one result entry
// R-SES-9:  On session end, match_results are written and player stats are updated
// R-SES-10: A player can spectate any 'waiting' or 'active' session they are NOT a member of
// R-SES-11: Quick Play joins the busiest available room, or creates a new one if none exist
// ────────────────────────────────────────────────────────────

@Injectable()
export class GameSessionService {
  constructor(private readonly repo: GameSessionRepository) {}

  findAll(filter?: { gameId?: number; status?: string; hostId?: number }) {
    let result = this.repo.findAll();
    if (filter?.gameId) result = result.filter((s) => s.game_id === filter.gameId);
    if (filter?.status) result = result.filter((s) => s.status === filter.status);
    if (filter?.hostId) result = result.filter((s) => s.created_by === filter.hostId);
    return result.map((s) => this.enrich(s));
  }

  findOne(id: number) {
    const session = this.repo.findById(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return this.enrich(session);
  }

  getPlayerSessions(playerId: number) {
    return this.repo.findByPlayer(playerId).map((s) => this.enrich(s));
  }

  // Workflow: Create Session (host creates a room)
  create(dto: CreateSessionDto) {
    // R-SES-1
    const game = games.find((g) => g.game_id === dto.game_id);
    if (!game) throw new NotFoundException(`Game ${dto.game_id} not found`);
    if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
      throw new BadRequestException('Sessions can only be created for active approved games');
    }

    // R-SES-2
    if (new Date(dto.start_time) >= new Date(dto.end_time)) {
      throw new BadRequestException('start_time must be before end_time');
    }

    // Validate host is a real user
    const host = users.find((u) => u.user_id === dto.created_by);
    if (!host) throw new NotFoundException(`User ${dto.created_by} not found`);

    const newId = this.repo.nextId();
    const session = this.repo.create({
      session_id: newId,
      game_id: dto.game_id,
      created_by: dto.created_by,
      name: dto.name,
      game: game.game_name,
      host: host.user_name,
      hostId: dto.created_by,
      maxPlayers: dto.maxPlayers,
      status: 'waiting',
      mode: dto.mode,
      start_time: dto.start_time,
      end_time: dto.end_time,
      duration: 0,
      createdAt: new Date().toISOString(),
    });

    // Host automatically joins their own session
    const hostProfile = player_profiles.find((p) => p.user_id === dto.created_by);
    if (hostProfile && hostProfile.player_status) {
      this.repo.addMember(dto.created_by, newId);
    }

    return this.enrich(session);
  }

  // Workflow: Join Session (player joins a waiting room)
  joinSession(sessionId: number, dto: JoinSessionDto) {
    const session = this.repo.findById(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    // R-SES-7
    if (session.status === 'ended') {
      throw new BadRequestException('This session has already ended');
    }

    // R-SES-3
    const profile = player_profiles.find((p) => p.user_id === dto.player_id);
    if (!profile) throw new NotFoundException(`Player profile ${dto.player_id} not found`);
    if (!profile.player_status) {
      throw new ForbiddenException('Your account is inactive and cannot join sessions');
    }

    // R-SES-4
    if (this.repo.isMember(dto.player_id, sessionId)) {
      throw new ConflictException('You are already in this session');
    }

    // R-SES-5
    const currentCount = this.repo.getMemberCount(sessionId);
    if (currentCount >= session.maxPlayers) {
      throw new BadRequestException('Session is full');
    }

    this.repo.addMember(dto.player_id, sessionId);

    // Auto-transition to 'active' when the room fills up
    if (currentCount + 1 >= session.maxPlayers) {
      this.repo.update(sessionId, { status: 'active' });
    }

    return { message: 'Joined session successfully', session_id: sessionId };
  }

  // Workflow: Leave Session
  leaveSession(sessionId: number, playerId: number) {
    const session = this.repo.findById(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    if (session.status === 'ended') {
      throw new BadRequestException('Session has already ended');
    }

    if (!this.repo.isMember(playerId, sessionId)) {
      throw new BadRequestException('You are not a member of this session');
    }

    this.repo.removeMember(playerId, sessionId);

    // If host leaves, end the session
    if (session.created_by === playerId) {
      this.repo.update(sessionId, { status: 'ended' });
      return { message: 'Host left — session has been ended' };
    }

    return { message: 'Left session successfully' };
  }

  // Workflow: End Session + record results (host only)
  endSession(sessionId: number, hostId: number, dto: EndSessionDto) {
    const session = this.repo.findById(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    // R-SES-6
    if (session.created_by !== hostId) {
      throw new ForbiddenException('Only the host can end the session');
    }

    // R-SES-7
    if (session.status === 'ended') {
      throw new BadRequestException('Session is already ended');
    }

    // R-SES-8
    if (!dto.results || dto.results.length === 0) {
      throw new BadRequestException('At least one result entry is required to end a session');
    }

    const now = new Date().toISOString();
    const startMs = new Date(session.start_time).getTime();
    const durationMinutes = Math.round((Date.now() - startMs) / 60000);

    // R-SES-9: write match_results and update player stats
    for (const result of dto.results) {
      // Only add result if not a duplicate for this session+player
      const alreadyExists = match_results.some(
        (mr) => mr.session_id === sessionId && mr.player_id === result.player_id,
      );
      if (!alreadyExists) {
        match_results.push({
          session_id: sessionId,
          player_id: result.player_id,
          score: result.score,
          player_rank: result.player_rank,
          joined_at: now,
        });
      }

      // Update player profile stats
      const profile = player_profiles.find((p) => p.user_id === result.player_id);
      if (profile) {
        const pointsEarned = this.calculatePoints(result.player_rank, dto.results.length, result.score);
        profile.carys_points = Math.max(0, profile.carys_points + pointsEarned);
        profile.play_time += durationMinutes;
        if (result.player_rank === 1) profile.matches_won += 1;
      }
    }

    // Update game session count
    const gameEntry = games.find((g) => g.game_id === session.game_id);
    if (gameEntry) gameEntry.sessions += 1;

    this.repo.update(sessionId, { status: 'ended', duration: durationMinutes });

    return { message: 'Session ended successfully', session_id: sessionId, duration_minutes: durationMinutes };
  }

  // Workflow: Spectate Game — returns live sessions the player is NOT in
  getSpectateList(playerId: number, gameId?: number) {
    // R-SES-10
    return this.repo
      .findAll()
      .filter((s) => {
        if (s.status === 'ended') return false;
        if (this.repo.isMember(playerId, s.session_id)) return false;
        if (gameId && s.game_id !== gameId) return false;
        return true;
      })
      .map((s) => this.enrich(s));
  }

  // Workflow: Quick Play — join busiest room or create a new one
  quickPlay(dto: QuickPlayDto) {
    // R-SES-1: validate game
    const game = games.find((g) => g.game_id === dto.game_id);
    if (!game) throw new NotFoundException(`Game ${dto.game_id} not found`);
    if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
      throw new BadRequestException('Game is not available for Quick Play');
    }

    // R-SES-3: validate player
    const profile = player_profiles.find((p) => p.user_id === dto.player_id);
    if (!profile) throw new NotFoundException(`Player profile ${dto.player_id} not found`);
    if (!profile.player_status) {
      throw new ForbiddenException('Your account is inactive and cannot use Quick Play');
    }

    // R-SES-11: find best available session
    const existing = this.repo.findBestAvailableSession(dto.game_id, dto.player_id);

    if (existing) {
      // Join the existing busiest room
      this.repo.addMember(dto.player_id, existing.session_id);
      const currentCount = this.repo.getMemberCount(existing.session_id);
      if (currentCount >= existing.maxPlayers) {
        this.repo.update(existing.session_id, { status: 'active' });
      }
      return {
        action: 'joined',
        message: 'Joined existing session via Quick Play',
        session: this.enrich(existing),
      };
    }

    // Create a new session
    const host = users.find((u) => u.user_id === dto.player_id);
    const newId = this.repo.nextId();
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    const newSession = this.repo.create({
      session_id: newId,
      game_id: dto.game_id,
      created_by: dto.player_id,
      name: `${game.game_name} Room`,
      game: game.game_name,
      host: host?.user_name ?? 'Player',
      hostId: dto.player_id,
      maxPlayers: 8,
      status: 'waiting',
      mode: 'casual',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      duration: 0,
      createdAt: now.toISOString(),
    });

    this.repo.addMember(dto.player_id, newId);

    return {
      action: 'created',
      message: 'No available sessions found — created a new room',
      session: this.enrich(newSession),
    };
  }

  // ── Private Helpers ──────────────────────────────────────

  private calculatePoints(rank: number, totalPlayers: number, score: number): number {
    // Winner gets more points, scaled by player count
    const basePoints = Math.max(0, totalPlayers - rank + 1) * 50;
    const scoreBonus = Math.floor(score / 100);
    return basePoints + scoreBonus;
  }

  private enrich(session: GameSession) {
    const members = this.repo.getMembers(session.session_id);
    const game = games.find((g) => g.game_id === session.game_id);
    return {
      ...session,
      current_players: members.length,
      player_ids: members.map((m) => m.player_id),
      game_name: game?.game_name ?? session.game,
      game_type: game?.game_type ?? '',
    };
  }
}


