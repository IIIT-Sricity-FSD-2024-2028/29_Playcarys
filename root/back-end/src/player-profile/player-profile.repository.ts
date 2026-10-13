import { Injectable } from '@nestjs/common';
import { player_profiles, PlayerProfile, match_results, MatchResult } from '../data/store';

@Injectable()
export class PlayerProfileRepository {
  findAll(): PlayerProfile[] {
    return [...player_profiles];
  }

  findByUserId(user_id: number): PlayerProfile | undefined {
    return player_profiles.find((p) => p.user_id === user_id);
  }

  nameExists(player_name: string, excludeUserId?: number): boolean {
    return player_profiles.some(
      (p) => p.player_name === player_name && p.user_id !== excludeUserId,
    );
  }

  update(user_id: number, partial: Partial<PlayerProfile>): PlayerProfile | undefined {
    const idx = player_profiles.findIndex((p) => p.user_id === user_id);
    if (idx === -1) return undefined;
    Object.assign(player_profiles[idx], partial);
    return player_profiles[idx];
  }

  // Match history for a player
  getMatchHistory(user_id: number): MatchResult[] {
    return match_results.filter((mr) => mr.player_id === user_id);
  }

  // Leaderboard: sorted by carys_points desc
  getLeaderboard(): PlayerProfile[] {
    return [...player_profiles].sort((a, b) => b.carys_points - a.carys_points);
  }
}
