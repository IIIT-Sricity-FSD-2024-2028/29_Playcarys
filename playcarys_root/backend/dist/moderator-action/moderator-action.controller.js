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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeratorActionController = void 0;
const common_1 = require("@nestjs/common");
const moderator_action_service_1 = require("./moderator-action.service");
const roles_decorator_1 = require("../roles/roles.decorator");
const moderator_action_dto_1 = require("./moderator-action.dto");
let ModeratorActionController = class ModeratorActionController {
    constructor(moderatorActionService) {
        this.moderatorActionService = moderatorActionService;
    }
    findAll(moderatorId) {
        if (moderatorId) {
            return this.moderatorActionService.findByModerator(parseInt(moderatorId, 10));
        }
        return this.moderatorActionService.findAll();
    }
    findAllBans() {
        return this.moderatorActionService.findAllBans();
    }
    findActiveBans() {
        return this.moderatorActionService.findActiveBans();
    }
    actOnReport(dto) {
        return this.moderatorActionService.actOnReport(dto);
    }
    handleViolation(dto) {
        return this.moderatorActionService.handleViolation(dto);
    }
    liftBan(playerId, body) {
        return this.moderatorActionService.liftBan(playerId, body.moderator_id);
    }
};
exports.ModeratorActionController = ModeratorActionController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('moderatorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ModeratorActionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('bans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ModeratorActionController.prototype, "findAllBans", null);
__decorate([
    (0, common_1.Get)('bans/active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ModeratorActionController.prototype, "findActiveBans", null);
__decorate([
    (0, common_1.Post)('act-on-report'),
    (0, roles_decorator_1.Roles)('moderator', 'admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [moderator_action_dto_1.CreateModeratorActionDto]),
    __metadata("design:returntype", void 0)
], ModeratorActionController.prototype, "actOnReport", null);
__decorate([
    (0, common_1.Post)('handle-violation'),
    (0, roles_decorator_1.Roles)('moderator', 'admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [moderator_action_dto_1.HandleViolationDto]),
    __metadata("design:returntype", void 0)
], ModeratorActionController.prototype, "handleViolation", null);
__decorate([
    (0, common_1.Patch)('bans/:playerId/lift'),
    (0, roles_decorator_1.Roles)('moderator', 'admin'),
    __param(0, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, moderator_action_dto_1.LiftBanDto]),
    __metadata("design:returntype", void 0)
], ModeratorActionController.prototype, "liftBan", null);
exports.ModeratorActionController = ModeratorActionController = __decorate([
    (0, common_1.Controller)('moderator-actions'),
    __metadata("design:paramtypes", [moderator_action_service_1.ModeratorActionService])
], ModeratorActionController);
//# sourceMappingURL=moderator-action.controller.js.map