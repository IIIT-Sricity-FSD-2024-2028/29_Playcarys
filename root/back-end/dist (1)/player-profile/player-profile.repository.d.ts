import { PlayerProfile, MatchResult } from '../data/store';
export declare class PlayerProfileRepository {
    findAll(): PlayerProfile[];
    findByUserId(user_id: number): PlayerProfile | undefined;
    nameExists(player_name: string, excludeUserId?: number): boolean;
    update(user_id: number, partial: Partial<PlayerProfile>): PlayerProfile | undefined;
    getMatchHistory(user_id: number): MatchResult[];
    getLeaderboard(): PlayerProfile[];
}
