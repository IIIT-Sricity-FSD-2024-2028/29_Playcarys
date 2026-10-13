import { Achievement } from '../data/store';
import { CreateAchievementDto, SetActiveTitleDto, UnlockAchievementDto } from './achievement.dto';
export declare class AchievementService {
    private readonly logger;
    findForGame(gameId: number, viewerId?: number): ({
        achievement_id: number;
        game_id: number;
        code: string;
        name: string;
        description: string;
        icon: string;
        carys_reward: number;
        secret: boolean;
        unlocked: boolean;
    } | {
        unlocked: boolean;
        achievement_id: number;
        game_id: number;
        code: string;
        name: string;
        description: string;
        icon: string;
        carys_reward: number;
        title_awarded?: string;
        secret?: boolean;
        created_at: string;
    })[];
    findForPlayer(userId: number): {
        name: string;
        description: string;
        icon: string;
        title_awarded: string;
        game_name: string;
        user_id: number;
        achievement_id: number;
        game_id: number;
        unlocked_at: string;
        session_id?: string;
        carys_granted: number;
    }[];
    titlesFor(userId: number): string[];
    create(gameId: number, dto: CreateAchievementDto): Achievement;
    remove(achievementId: number, publisherId: number): {
        message: string;
    };
    unlock(dto: UnlockAchievementDto): {
        unlocked: boolean;
        already_earned: boolean;
        achievement: Achievement;
        carys_granted: number;
        title_awarded?: undefined;
        carys_total?: undefined;
    } | {
        unlocked: boolean;
        already_earned: boolean;
        achievement: Achievement;
        carys_granted: number;
        title_awarded: string;
        carys_total: number;
    };
    setActiveTitle(dto: SetActiveTitleDto): {
        active_title: string;
    };
    private nextId;
}
