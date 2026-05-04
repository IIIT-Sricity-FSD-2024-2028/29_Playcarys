"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeratorActionService = void 0;
const common_1 = require("@nestjs/common");
const moderator_action_repository_1 = require("./moderator-action.repository");
const store_1 = require("../data/store");
const MODERATOR_ROLES = [1, 2, 3];
let ModeratorActionService = class ModeratorActionService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll() {
        return this.repo.findAll().map((a) => this.enrichAction(a));
    }
    findByModerator(moderatorId) {
        return this.repo.findByModerator(moderatorId).map((a) => this.enrichAction(a));
    }
    findAllBans() {
        return this.repo.findAllBans().map((b) => this.enrichBan(b));
    }
    findActiveBans() {
        return this.repo.findActiveBans().map((b) => this.enrichBan(b));
    }
    actOnReport(dto) {
        const moderator = store_1.users.find((u) => u.user_id === dto.moderator_id);
        if (!moderator)
            throw new common_1.NotFoundException(`Moderator user ${dto.moderator_id} not found`);
        if (!MODERATOR_ROLES.includes(moderator.role_id)) {
            throw new common_1.ForbiddenException('Only moderators and admins can apply enforcement actions');
        }
        if (dto.report_id) {
            const report = store_1.reports.find((r) => r.report_id === dto.report_id);
            if (!report)
                throw new common_1.NotFoundException(`Report ${dto.report_id} not found`);
            if (report.status === 'resolved' || report.status === 'rejected') {
                throw new common_1.BadRequestException('This report is already closed');
            }
        }
        const target = store_1.users.find((u) => u.user_id === dto.target_user_id);
        if (!target)
            throw new common_1.NotFoundException(`Target user ${dto.target_user_id} not found`);
        if (MODERATOR_ROLES.includes(target.role_id) && target.role_id <= moderator.role_id) {
            throw new common_1.ForbiddenException('Cannot take enforcement action against a user of equal or higher role');
        }
        if (dto.action_type === 'ban' && !dto.ban_duration) {
            throw new common_1.BadRequestException('ban_duration is required for ban actions');
        }
        if (dto.action_type === 'ban') {
            const existingBan = this.repo.findBanByPlayer(dto.target_user_id);
            if (existingBan) {
                throw new common_1.BadRequestException('Player already has an active ban. Lift the existing ban first.');
            }
        }
        const action = this.repo.createAction({
            action_id: this.repo.nextActionId(),
            moderator_id: dto.moderator_id,
            report_id: dto.report_id ?? 0,
            action_type: dto.action_type,
            action_date: new Date().toISOString().split('T')[0],
            action_reason: dto.action_reason,
        });
        this.applyActionEffects(dto.action_type, dto.target_user_id, moderator, dto);
        if (dto.report_id) {
            const reportIdx = store_1.reports.findIndex((r) => r.report_id === dto.report_id);
            if (reportIdx !== -1) {
                store_1.reports[reportIdx].status = 'resolved';
                store_1.reports[reportIdx].actionNote = dto.action_reason;
            }
        }
        return this.enrichAction(action);
    }
    handleViolation(dto) {
        return this.actOnReport({
            moderator_id: dto.moderator_id,
            report_id: undefined,
            action_type: dto.action_type,
            action_reason: `[${dto.violation_type}] ${dto.action_reason}`,
            target_user_id: dto.target_user_id,
            ban_duration: dto.ban_duration,
        });
    }
    liftBan(playerId, moderatorId) {
        const moderator = store_1.users.find((u) => u.user_id === moderatorId);
        if (!moderator || !MODERATOR_ROLES.includes(moderator.role_id)) {
            throw new common_1.ForbiddenException('Only moderators and admins can lift bans');
        }
        const lifted = this.repo.liftBan(playerId);
        if (!lifted) {
            throw new common_1.NotFoundException(`No active ban found for player ${playerId}`);
        }
        const userIdx = store_1.users.findIndex((u) => u.user_id === playerId);
        if (userIdx !== -1)
            store_1.users[userIdx].status = 'active';
        const profileIdx = store_1.player_profiles.findIndex((p) => p.user_id === playerId);
        if (profileIdx !== -1)
            store_1.player_profiles[profileIdx].player_status = true;
        return { message: `Ban lifted for player ${playerId}` };
    }
    applyActionEffects(actionType, targetUserId, moderator, dto) {
        const userIdx = store_1.users.findIndex((u) => u.user_id === targetUserId);
        const profileIdx = store_1.player_profiles.findIndex((p) => p.user_id === targetUserId);
        if (actionType === 'ban') {
            if (userIdx !== -1)
                store_1.users[userIdx].status = 'banned';
            if (profileIdx !== -1)
                store_1.player_profiles[profileIdx].player_status = false;
            const bannedDate = new Date();
            const expiresDate = this.computeExpiry(bannedDate, dto.ban_duration ?? '7 Days');
            this.repo.createBan({
                id: this.repo.nextBanId(),
                playerId: targetUserId,
                playerName: store_1.users[userIdx]?.user_name ?? `User ${targetUserId}`,
                level: Math.floor((store_1.player_profiles[profileIdx]?.carys_points ?? 0) / 100),
                duration: dto.ban_duration ?? '7 Days',
                reason: dto.action_reason,
                bannedBy: moderator.user_name,
                bannedById: moderator.user_id,
                bannedDate: bannedDate.toISOString().split('T')[0],
                expiresDate: expiresDate.toISOString().split('T')[0],
                active: true,
            });
        }
        if (actionType === 'restrict') {
            if (profileIdx !== -1)
                store_1.player_profiles[profileIdx].player_status = false;
        }
    }
    computeExpiry(from, duration) {
        const d = new Date(from);
        if (duration.toLowerCase().includes('permanent')) {
            d.setFullYear(d.getFullYear() + 100);
        }
        else {
            const days = parseInt(duration) || 7;
            d.setDate(d.getDate() + days);
        }
        return d;
    }
    enrichAction(action) {
        if (!action)
            return action;
        const moderator = store_1.users.find((u) => u.user_id === action.moderator_id);
        return {
            ...action,
            moderator_name: moderator?.user_name ?? 'Unknown',
        };
    }
    enrichBan(ban) {
        return { ...ban };
    }
};
exports.ModeratorActionService = ModeratorActionService;
exports.ModeratorActionService = ModeratorActionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [moderator_action_repository_1.ModeratorActionRepository])
], ModeratorActionService);
//# sourceMappingURL=moderator-action.service.js.map