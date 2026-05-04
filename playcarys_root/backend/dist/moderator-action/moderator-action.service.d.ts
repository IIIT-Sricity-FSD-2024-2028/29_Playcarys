import { ModeratorActionRepository } from './moderator-action.repository';
import { CreateModeratorActionDto, HandleViolationDto } from './moderator-action.dto';
export declare class ModeratorActionService {
    private readonly repo;
    constructor(repo: ModeratorActionRepository);
    findAll(): any[];
    findByModerator(moderatorId: number): any[];
    findAllBans(): any[];
    findActiveBans(): any[];
    actOnReport(dto: CreateModeratorActionDto): any;
    handleViolation(dto: HandleViolationDto): any;
    liftBan(playerId: number, moderatorId: number): {
        message: string;
    };
    private applyActionEffects;
    private computeExpiry;
    private enrichAction;
    private enrichBan;
}
