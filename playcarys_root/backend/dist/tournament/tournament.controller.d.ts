import { TournamentService } from './tournament.service';
import { CreateTournamentDto, UpdateTournamentDto, RegisterPlayerDto } from './tournament.dto';
export declare class TournamentController {
    private readonly tournamentService;
    constructor(tournamentService: TournamentService);
    findAll(status?: string, gameId?: string): import("../data/store").Tournament[];
    findOne(id: number): any;
    getRegistrations(id: number): import("../data/store").PlayerTournament[];
    getPlayerTournaments(playerId: number): any[];
    create(dto: CreateTournamentDto): any;
    registerPlayer(id: number, dto: RegisterPlayerDto): {
        message: string;
        tournament_id: number;
        player_id: number;
    };
    unregisterPlayer(id: number, playerId: number): {
        message: string;
    };
    update(id: number, dto: UpdateTournamentDto): any;
    remove(id: number): {
        message: string;
    };
}
