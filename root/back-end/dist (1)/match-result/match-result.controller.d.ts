import { MatchResultService } from './match-result.service';
export declare class MatchResultController {
    private readonly matchResultService;
    constructor(matchResultService: MatchResultService);
    findBySession(sessionId: number): {
        player_name: string;
        session_name: string;
        game_name: string;
        session_id: number;
        player_id: number;
        score: number;
        player_rank: number;
        joined_at: string;
    }[];
    findByPlayer(playerId: number): {
        session_name: string;
        game_name: string;
        won: boolean;
        session_id: number;
        player_id: number;
        score: number;
        player_rank: number;
        joined_at: string;
    }[];
    getTopScorers(limit?: string): {
        player_name: string;
        avatar: string;
        player_id: number;
        total_score: number;
        session_count: number;
    }[];
}
