import { Tournament, PlayerTournament } from '../data/store';
export declare class TournamentRepository {
    findAll(): Tournament[];
    findById(tournament_id: number): Tournament | undefined;
    findByGame(game_id: number): Tournament[];
    findByStatus(status: string): Tournament[];
    nameExists(name: string, excludeId?: number): boolean;
    create(tournament: Tournament): Tournament;
    update(tournament_id: number, partial: Partial<Tournament>): Tournament | undefined;
    remove(tournament_id: number): boolean;
    nextId(): number;
    getRegistrations(tournament_id: number): PlayerTournament[];
    isRegistered(player_id: number, tournament_id: number): boolean;
    registerPlayer(player_id: number, tournament_id: number): PlayerTournament;
    unregisterPlayer(player_id: number, tournament_id: number): boolean;
    getPlayerTournaments(player_id: number): PlayerTournament[];
}
