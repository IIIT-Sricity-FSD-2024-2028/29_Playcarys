import { Game } from '../data/store';
export declare class GameRepository {
    findAll(): Game[];
    findById(game_id: number): Game | undefined;
    findByPublisher(publisher_id: number): Game[];
    findByStatus(game_approval_status: string): Game[];
    findActive(): Game[];
    nameExists(game_name: string, excludeId?: number): boolean;
    create(game: Game): Game;
    update(game_id: number, partial: Partial<Game>): Game | undefined;
    remove(game_id: number): boolean;
    nextId(): number;
}
