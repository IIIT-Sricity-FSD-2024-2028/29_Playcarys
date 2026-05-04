import { PlayerProfileRepository } from './player-profile.repository';
import { UpdatePlayerProfileDto, AddPointsDto } from './player-profile.dto';
export declare class PlayerProfileService {
    private readonly repo;
    constructor(repo: PlayerProfileRepository);
    findAll(): import("../data/store").PlayerProfile[];
    findOne(userId: number): import("../data/store").PlayerProfile;
    update(userId: number, dto: UpdatePlayerProfileDto): import("../data/store").PlayerProfile;
    addSessionResult(userId: number, dto: AddPointsDto): import("../data/store").PlayerProfile;
    getMatchHistory(userId: number): {
        session_name: string;
        game_name: string;
        session_id: number;
        player_id: number;
        score: number;
        player_rank: number;
        joined_at: string;
    }[];
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
}
