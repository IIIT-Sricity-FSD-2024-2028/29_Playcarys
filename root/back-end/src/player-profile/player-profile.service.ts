import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PlayerProfileRepository } from './player-profile.repository';
import { UpdatePlayerProfileDto, AddPointsDto } from './player-profile.dto';
import { sessions, games } from '../data/store';
import { creditCarys } from '../economy/carys.ledger';

// ── Domain Rules ────────────────────────────────────────────
// R-PP-1: player_name must be unique across all player profiles
// R-PP-2: carys_points, play_time, matches_won must never go below 0
// R-PP-3: Only players with player_status=true can join sessions
// R-PP-4: Rankings are sorted by carys_points descending
// ────────────────────────────────────────────────────────────

@Injectable()
export class PlayerProfileService {
  constructor(private readonly repo: PlayerProfileRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  findOne(userId: number) {
    const profile = this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(`Player profile for user ${userId} not found`);
    return profile;
  }

  update(userId: number, dto: UpdatePlayerProfileDto) {
    const profile = this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(`Player profile for user ${userId} not found`);

    // R-PP-1
    if (dto.player_name && dto.player_name !== profile.player_name) {
      if (this.repo.nameExists(dto.player_name, userId)) {
        throw new ConflictException('Player name already taken');
      }
    }

    return this.repo.update(userId, dto);
  }

  // Called internally when a session ends — awards points and play time
  addSessionResult(userId: number, dto: AddPointsDto) {
    const profile = this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(`Player profile for user ${userId} not found`);

    // R-PP-2
    const newTime = Math.max(0, profile.play_time + dto.play_time);
    const newWins = dto.won ? profile.matches_won + 1 : profile.matches_won;

    // carys_points is NOT written here. creditCarys is the single writer for
    // it, so every movement lands in carys_ledger with the balance it
    // produced. A total that can change without a ledger row behind it is a
    // total nobody can audit once the currency is worth money.
    if (dto.points) {
      creditCarys(userId, dto.points, 'Session result', { type: 'session' });
    }

    return this.repo.update(userId, {
      play_time: newTime,
      matches_won: newWins,
    });
  }

  getMatchHistory(userId: number) {
    const profile = this.repo.findByUserId(userId);
    if (!profile) throw new NotFoundException(`Player profile for user ${userId} not found`);

    const history = this.repo.getMatchHistory(userId);

    // Enrich with session + game name
    return history.map((mr) => {
      const session = sessions.find((s) => s.session_id === mr.session_id);
      const game = session ? games.find((g) => g.game_id === session.game_id) : null;
      return {
        ...mr,
        session_name: session?.name ?? 'Unknown Session',
        game_name: game?.game_name ?? 'Unknown Game',
      };
    });
  }

  // R-PP-4
  getLeaderboard() {
    return this.repo.getLeaderboard().map((p, i) => ({
      rank: i + 1,
      ...p,
      level: Math.floor(p.carys_points / 100),
    }));
  }
}
