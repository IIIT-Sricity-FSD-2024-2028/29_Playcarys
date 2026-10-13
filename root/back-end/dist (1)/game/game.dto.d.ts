export declare const PLATFORM_MAX_CARYS_PER_MATCH = 1000;
export declare class GameDeliveryDto {
    hosting_type?: 'hosted' | 'selfhosted';
    game_url?: string;
    webhook_url?: string;
    max_carys_per_match?: number;
}
export declare class UploadBundleDto {
    publisher_id: number;
}
export declare class CreateGameDto extends GameDeliveryDto {
    game_name: string;
    game_type: string;
    desc: string;
    players: string;
    img?: string;
    game_publisher: number;
}
export declare class UpdateGameDto extends GameDeliveryDto {
    game_name?: string;
    game_type?: string;
    desc?: string;
    players?: string;
    img?: string;
}
export declare class UpdateGameRequestDto extends UpdateGameDto {
    publisher_id: number;
}
export declare class SetGameStateDto {
    game_status: 'enabled' | 'disabled';
}
export declare class SetGameStateRequestDto extends SetGameStateDto {
    publisher_id: number;
}
export declare class ApproveGameDto {
    game_approval_status: 'approved' | 'rejected';
    reviewer_id: number;
    note?: string;
    override_note?: string;
}
