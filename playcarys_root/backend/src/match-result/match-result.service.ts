import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { MatchResultRepository } from './match-result.repository';
import { sessions, games, users } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-MR-1: A (session_id, player_id) composite key must be unique
// R-MR-2: score must be >= 0
// R-MR-3: player_rank must be >= 1
// R-MR-4: Match results can only be queried, not manually edited (written by session end)
// ────────────────────────────────────────────────────────────

@Injectable()
export class MatchResultService {
  constructor(private readonly repo: MatchResultRepository) { }

  findBySession(sessionId: number) {
    const session = sessions.find((s) => s.session_id === sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const results = this.repo.findBySession(sessionId);
    const game = games.find((g) => g.game_id === session.game_id);

    return results.map((mr) => {
      const user = users.find((u) => u.user_id === mr.player_id);
      return {
        ...mr,
        player_name: user?.user_name ?? `Player ${mr.player_id}`,
        session_name: session.name,
        game_name: game?.game_name ?? 'Unknown',
      };
    });
  }

  findByPlayer(playerId: number) {
    const results = this.repo.findByPlayer(playerId);
    return results.map((mr) => {
      const session = sessions.find((s) => s.session_id === mr.session_id);
      const game = session ? games.find((g) => g.game_id === session.game_id) : null;
      return {
        ...mr,
        session_name: session?.name ?? 'Unknown Session',
        game_name: game?.game_name ?? 'Unknown Game',
        won: mr.player_rank === 1,
      };
    });
  }

  getTopScorers(limit = 10) {
    const scorers = this.repo.getTopScorers(limit);
    return scorers.map((s) => {
      const user = users.find((u) => u.user_id === s.player_id);
      return {
        ...s,
        player_name: user?.user_name ?? `Player ${s.player_id}`,
        avatar: user?.avatar ?? '?',
      };
    });
  }
}
