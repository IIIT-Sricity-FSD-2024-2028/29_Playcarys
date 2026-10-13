import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { GameSessionRepository } from './game-session.repository';
import { EndSessionDto } from './game-session.dto';
import {
  games,
  player_profiles,
  match_results,
  GameSession,
} from '../data/store';
import { creditCarys } from '../economy/carys.ledger';

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

  // ── REMOVED: the room workflows ──────────────────────────────────────────
  //
  //   create()          host opens a room
  //   joinSession()     player takes a seat
  //   leaveSession()    player gives the seat back
  //   getSpectateList() list rooms to watch
  //   quickPlay()       find the busiest room, or open one
  //
  // ~200 lines of seat management: capacity checks, duplicate-member checks,
  // host-reassignment when the host left, "is this room full". They were also
  // never called — the frontend built rooms client-side and bulk-synced them.
  //
  // endSession() below is kept: it writes match_results and updates
  // carys_points, play_time and matches_won, which is real work.
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
        // Through the ledger, not straight onto the total — see carys.ledger.ts.
        // No publisher royalty is credited here: EconomyService.awardMatch is
        // the path that does that, and crediting in both would pay a studio
        // twice for one session.
        creditCarys(result.player_id, pointsEarned, 'Session result', {
          type: 'session',
          id: session.session_id,
        });
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

  // ── Private Helpers ──────────────────────────────────────

  private calculatePoints(rank: number, totalPlayers: number, score: number): number {
    // Winner gets more points, scaled by player count
    const basePoints = Math.max(0, totalPlayers - rank + 1) * 50;
    const scoreBonus = Math.floor(score / 100);
    return basePoints + scoreBonus;
  }

  private enrich(session: GameSession) {
    // Who took part, from match_results rather than the room junction.
    const playerIds = [
      ...new Set(
        match_results
          .filter((r) => String(r.session_id) === String(session.session_id))
          .map((r) => r.player_id),
      ),
    ];
    const game = games.find((g) => g.game_id === session.game_id);
    return {
      ...session,
      current_players: playerIds.length,
      player_ids: playerIds,
      game_name: game?.game_name ?? session.game,
      game_type: game?.game_type ?? '',
    };
  }
}


