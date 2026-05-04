import { PlayerProfileService } from './player-profile.service';
import { UpdatePlayerProfileDto } from './player-profile.dto';
export declare class PlayerProfileController {
    private readonly playerProfileService;
    constructor(playerProfileService: PlayerProfileService);
    findAll(): import("../data/store").PlayerProfile[];
    getLeaderboard(): {
        level: number;
        user_id: number;
        player_name: string;
        carys_points: number;
        play_time: number;
        matches_won: number;
        player_status: boolean;
        rank: number;
    }[];
    findOne(userId: number): import("../data/store").PlayerProfile;
    getMatchHistory(userId: number): {
        session_name: string;
        game_name: string;
        session_id: number;
        player_id: number;
        score: number;
        player_rank: number;
        joined_at: string;
    }[];
    update(userId: number, dto: UpdatePlayerProfileDto): import("../data/store").PlayerProfile;
}
