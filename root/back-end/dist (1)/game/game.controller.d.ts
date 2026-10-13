import { GameService } from './game.service';
import { ApproveGameDto, CreateGameDto, SetGameStateRequestDto, UpdateGameRequestDto, UploadBundleDto } from './game.dto';
export declare class GameController {
    private readonly gameService;
    constructor(gameService: GameService);
    findAll(status?: string, publisherId?: string, active?: string): import("../data/store").Game[];
    findOne(id: number): import("../data/store").Game;
    create(dto: CreateGameDto): import("../data/store").Game;
    update(id: number, body: UpdateGameRequestDto): import("../data/store").Game;
    setGameState(id: number, body: SetGameStateRequestDto): import("../data/store").Game;
    uploadBundle(id: number, file: {
        buffer?: Buffer;
        size?: number;
        originalname?: string;
    } | undefined, body: UploadBundleDto): import("../data/store").Game;
    removeBundle(id: number, publisherId: number): import("../data/store").Game;
    getReview(id: number): {
        game: import("../data/store").Game;
        publisher: {
            user_id: number;
            user_name: string;
            email: string;
            status: "active" | "banned" | "suspended";
        };
        scan: import("./scan.service").ScanReport;
        history: import("../data/store").GameReview[];
        changed_since_approved: {
            previous_bundle_hash: string;
            current_bundle_hash: string;
            previously_approved_at: string;
            note: string;
        };
        review_required_reason: string;
        blockers: string[];
    };
    rescan(id: number): {
        game_id: number;
        scan: import("./scan.service").ScanReport;
    };
    approveGame(id: number, dto: ApproveGameDto, callerRole?: string): import("../data/store").Game;
    remove(id: number): {
        message: string;
    };
}
