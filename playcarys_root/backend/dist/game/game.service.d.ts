import { GameRepository } from './game.repository';
import { CreateGameDto, UpdateGameDto, SetGameStateDto, ApproveGameDto } from './game.dto';
export declare class GameService {
    private readonly gameRepo;
    constructor(gameRepo: GameRepository);
    findAll(filter?: {
        status?: string;
        publisherId?: number;
        active?: boolean;
    }): import("../data/store").Game[];
    findOne(id: number): import("../data/store").Game;
    create(dto: CreateGameDto): import("../data/store").Game;
    update(id: number, dto: UpdateGameDto, requestingPublisherId: number): import("../data/store").Game;
    setGameState(id: number, dto: SetGameStateDto, requestingPublisherId: number): import("../data/store").Game;
    approveGame(id: number, dto: ApproveGameDto): import("../data/store").Game;
    remove(id: number): {
        message: string;
    };
}
