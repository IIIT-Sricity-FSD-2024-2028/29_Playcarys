import { GameService } from './game.service';
import { ApproveGameDto, CreateGameDto, SetGameStateRequestDto, UpdateGameRequestDto } from './game.dto';
export declare class GameController {
    private readonly gameService;
    constructor(gameService: GameService);
    findAll(status?: string, publisherId?: string, active?: string): import("../data/store").Game[];
    findOne(id: number): import("../data/store").Game;
    create(dto: CreateGameDto): import("../data/store").Game;
    update(id: number, body: UpdateGameRequestDto): import("../data/store").Game;
    setGameState(id: number, body: SetGameStateRequestDto): import("../data/store").Game;
    approveGame(id: number, dto: ApproveGameDto): import("../data/store").Game;
    remove(id: number): {
        message: string;
    };
}
