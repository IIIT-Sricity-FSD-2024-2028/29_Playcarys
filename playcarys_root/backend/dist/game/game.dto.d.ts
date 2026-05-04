export declare class CreateGameDto {
    game_name: string;
    game_type: string;
    desc: string;
    players: string;
    img?: string;
    game_publisher: number;
}
export declare class UpdateGameDto {
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
    note?: string;
}
