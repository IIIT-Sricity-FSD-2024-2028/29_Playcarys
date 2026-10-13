import { Injectable } from '@nestjs/common';
import { match_results, MatchResult } from '../data/store';

@Injectable()
export class MatchResultRepository {
  findAll(): MatchResult[] {
    return [...match_results];
  }

  findBySession(session_id: number): MatchResult[] {
    return match_results
      .filter((mr) => mr.session_id === session_id)
      .sort((a, b) => a.player_rank - b.player_rank);
  }

  findByPlayer(player_id: number): MatchResult[] {
    return match_results
      .filter((mr) => mr.player_id === player_id)
      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
  }

  exists(session_id: number, player_id: number): boolean {
    return match_results.some(
      (mr) => mr.session_id === session_id && mr.player_id === player_id,
    );
  }

  create(result: MatchResult): MatchResult {
    match_results.push(result);
    return result;
  }

  // Top N scorers across all sessions
  getTopScorers(limit = 10): Array<{ player_id: number; total_score: number; session_count: number }> {
    const scoreMap = new Map<number, { total_score: number; session_count: number }>();

    for (const mr of match_results) {
      const existing = scoreMap.get(mr.player_id) ?? { total_score: 0, session_count: 0 };
      scoreMap.set(mr.player_id, {
        total_score: existing.total_score + mr.score,
        session_count: existing.session_count + 1,
      });
    }

    return Array.from(scoreMap.entries())
      .map(([player_id, stats]) => ({ player_id, ...stats }))
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, limit);
  }
}
