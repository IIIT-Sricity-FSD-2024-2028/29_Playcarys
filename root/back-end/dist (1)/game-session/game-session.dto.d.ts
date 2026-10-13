export declare class CreateSessionDto {
    game_id: number;
    name: string;
    created_by: number;
    maxPlayers: number;
    mode: 'casual' | 'ranked';
    start_time: string;
    end_time: string;
}
export declare class JoinSessionDto {
    player_id: number;
}
export declare class SessionResultDto {
    player_id: number;
    score: number;
    player_rank: number;
}
export declare class EndSessionDto {
    results: SessionResultDto[];
}
export declare class EndSessionRequestDto extends EndSessionDto {
    host_id: number;
}
export declare class QuickPlayDto {
    game_id: number;
    player_id: number;
}
