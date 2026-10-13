import { TournamentRepository } from './tournament.repository';
import { CreateTournamentDto, UpdateTournamentDto, RegisterPlayerDto } from './tournament.dto';
export declare class TournamentService {
    private readonly repo;
    constructor(repo: TournamentRepository);
    findAll(filter?: {
        status?: string;
        gameId?: number;
    }): import("../data/store").Tournament[];
    findOne(id: number): any;
    create(dto: CreateTournamentDto): any;
    update(id: number, dto: UpdateTournamentDto): any;
    registerPlayer(tournamentId: number, dto: RegisterPlayerDto): {
        message: string;
        tournament_id: number;
        player_id: number;
    };
    unregisterPlayer(tournamentId: number, playerId: number): {
        message: string;
    };
    getRegistrations(tournamentId: number): import("../data/store").PlayerTournament[];
    getPlayerTournaments(playerId: number): any[];
    remove(id: number): {
        message: string;
    };
    private enrich;
}
