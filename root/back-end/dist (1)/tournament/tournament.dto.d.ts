export declare class CreateTournamentDto {
    game_id: number;
    tournament_name: string;
    desc: string;
    maxParticipants: number;
    start_date: string;
    end_date: string;
    regClose: string;
    prize: string;
    organizer: number;
}
export declare class UpdateTournamentDto {
    tournament_name?: string;
    desc?: string;
    maxParticipants?: number;
    start_date?: string;
    end_date?: string;
    regClose?: string;
    prize?: string;
}
export declare class RegisterPlayerDto {
    player_id: number;
}
