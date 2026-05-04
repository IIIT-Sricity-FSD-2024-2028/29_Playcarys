import { MatchResult } from '../data/store';
export declare class MatchResultRepository {
    findAll(): MatchResult[];
    findBySession(session_id: number): MatchResult[];
    findByPlayer(player_id: number): MatchResult[];
    exists(session_id: number, player_id: number): boolean;
    create(result: MatchResult): MatchResult;
    getTopScorers(limit?: number): Array<{
        player_id: number;
        total_score: number;
        session_count: number;
    }>;
}
