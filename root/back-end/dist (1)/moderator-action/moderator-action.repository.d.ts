import { ModeratorAction, Ban } from '../data/store';
export declare class ModeratorActionRepository {
    findAll(): ModeratorAction[];
    findById(action_id: number): ModeratorAction | undefined;
    findByModerator(moderator_id: number): ModeratorAction[];
    findByReport(report_id: number): ModeratorAction[];
    createAction(action: ModeratorAction): ModeratorAction;
    nextActionId(): number;
    findAllBans(): Ban[];
    findActiveBans(): Ban[];
    findBanByPlayer(playerId: number): Ban | undefined;
    createBan(ban: Ban): Ban;
    updateBan(id: number, partial: Partial<Ban>): Ban | undefined;
    liftBan(playerId: number): boolean;
    nextBanId(): number;
}
