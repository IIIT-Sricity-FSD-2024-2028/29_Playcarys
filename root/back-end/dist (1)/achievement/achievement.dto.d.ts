export declare const MAX_ACHIEVEMENT_REWARD = 500;
export declare class CreateAchievementDto {
    code: string;
    name: string;
    description: string;
    icon?: string;
    carys_reward: number;
    title_awarded?: string;
    secret?: boolean;
    publisher_id: number;
}
export declare class UnlockAchievementDto {
    game_id: number;
    user_id: number;
    code: string;
    session_id?: string;
}
export declare class SetActiveTitleDto {
    user_id: number;
    title?: string | null;
}
