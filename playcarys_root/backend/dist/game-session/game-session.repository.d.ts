import { GameSession, PlayerSession } from '../data/store';
export declare class GameSessionRepository {
    findAll(): GameSession[];
    findById(session_id: number): GameSession | undefined;
    findByGame(game_id: number): GameSession[];
    findByStatus(status: string): GameSession[];
    findByHost(hostId: number): GameSession[];
    findByPlayer(player_id: number): GameSession[];
    create(session: GameSession): GameSession;
    update(session_id: number, partial: Partial<GameSession>): GameSession | undefined;
    remove(session_id: number): boolean;
    nextId(): number;
    getMembers(session_id: number): PlayerSession[];
    getMemberCount(session_id: number): number;
    isMember(player_id: number, session_id: number): boolean;
    addMember(player_id: number, session_id: number): PlayerSession;
    removeMember(player_id: number, session_id: number): boolean;
    clearMembers(session_id: number): void;
    findBestAvailableSession(game_id: number, exclude_player_id: number): GameSession | undefined;
}
