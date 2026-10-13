import { ModeratorActionService } from './moderator-action.service';
import { CreateModeratorActionDto, HandleViolationDto, LiftBanDto } from './moderator-action.dto';
export declare class ModeratorActionController {
    private readonly moderatorActionService;
    constructor(moderatorActionService: ModeratorActionService);
    findAll(moderatorId?: string): any[];
    findAllBans(): any[];
    findActiveBans(): any[];
    actOnReport(dto: CreateModeratorActionDto): any;
    handleViolation(dto: HandleViolationDto): any;
    liftBan(playerId: number, body: LiftBanDto): {
        message: string;
    };
}
