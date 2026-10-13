export declare class CreateModeratorActionDto {
    moderator_id: number;
    report_id?: number;
    action_type: 'warning' | 'restrict' | 'ban' | 'review';
    action_reason: string;
    target_user_id: number;
    ban_duration?: string;
}
export declare class HandleViolationDto {
    moderator_id: number;
    target_user_id: number;
    action_type: 'warning' | 'restrict' | 'ban';
    action_reason: string;
    violation_type: string;
    ban_duration?: string;
}
export declare class LiftBanDto {
    moderator_id: number;
}
