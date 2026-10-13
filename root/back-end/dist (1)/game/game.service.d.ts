import { OnModuleInit } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { CreateGameDto, UpdateGameDto, SetGameStateDto, ApproveGameDto } from './game.dto';
import { BundleService } from './bundle.service';
import { ScanService, ScanReport } from './scan.service';
import { Game, GameReview } from '../data/store';
export declare class GameService implements OnModuleInit {
    private readonly gameRepo;
    private readonly bundleService;
    private readonly scanService;
    private readonly logger;
    constructor(gameRepo: GameRepository, bundleService: BundleService, scanService: ScanService);
    onModuleInit(): void;
    findAll(filter?: {
        status?: string;
        publisherId?: number;
        active?: boolean;
    }): Game[];
    findOne(id: number): Game;
    create(dto: CreateGameDto): Game;
    update(id: number, dto: UpdateGameDto, requestingPublisherId: number): Game;
    private revokeApproval;
    setGameState(id: number, dto: SetGameStateDto, requestingPublisherId: number): Game;
    approveGame(id: number, dto: ApproveGameDto, callerRole?: string): Game;
    private assertReviewable;
    private recordReview;
    installBundle(id: number, buffer: Buffer, requestingPublisherId: number): Game;
    private bundleDir;
    rescan(id: number): {
        game_id: number;
        scan: ScanReport;
    };
    getReview(id: number): {
        game: Game;
        publisher: {
            user_id: number;
            user_name: string;
            email: string;
            status: "active" | "banned" | "suspended";
        };
        scan: ScanReport;
        history: GameReview[];
        changed_since_approved: {
            previous_bundle_hash: string;
            current_bundle_hash: string;
            previously_approved_at: string;
            note: string;
        };
        review_required_reason: string;
        blockers: string[];
    };
    private diffAgainst;
    private reviewBlockers;
    removeBundle(id: number, requestingPublisherId: number): Game;
    remove(id: number): {
        message: string;
    };
}
