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
exports.AchievementController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const achievement_service_1 = require("./achievement.service");
const roles_decorator_1 = require("../roles/roles.decorator");
const achievement_dto_1 = require("./achievement.dto");
let AchievementController = class AchievementController {
    constructor(achievementService) {
        this.achievementService = achievementService;
    }
    listForGame(gameId, viewerId) {
        return this.achievementService.findForGame(gameId, viewerId ? parseInt(viewerId, 10) : undefined);
    }
    create(gameId, dto) {
        return this.achievementService.create(gameId, dto);
    }
    remove(achievementId, publisherId) {
        return this.achievementService.remove(achievementId, publisherId);
    }
    unlock(dto) {
        return this.achievementService.unlock(dto);
    }
    listForPlayer(userId) {
        return this.achievementService.findForPlayer(userId);
    }
    titles(userId) {
        return { titles: this.achievementService.titlesFor(userId) };
    }
    setTitle(userId, dto) {
        return this.achievementService.setActiveTitle({ ...dto, user_id: userId });
    }
};
exports.AchievementController = AchievementController;
__decorate([
    (0, common_1.Get)('games/:id/achievements'),
    (0, swagger_1.ApiOperation)({ summary: "List a game's achievements (secret ones masked until earned)" }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('viewerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "listForGame", null);
__decorate([
    (0, common_1.Post)('games/:id/achievements'),
    (0, roles_decorator_1.Roles)('publisher'),
    (0, swagger_1.ApiOperation)({ summary: 'Define an achievement for your own game' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, achievement_dto_1.CreateAchievementDto]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)('achievements/:id'),
    (0, roles_decorator_1.Roles)('publisher'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('publisherId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('achievements/unlock'),
    (0, swagger_1.ApiOperation)({ summary: 'Record that a player earned a declared achievement' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [achievement_dto_1.UnlockAchievementDto]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "unlock", null);
__decorate([
    (0, common_1.Get)('players/:userId/achievements'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "listForPlayer", null);
__decorate([
    (0, common_1.Get)('players/:userId/titles'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "titles", null);
__decorate([
    (0, common_1.Patch)('players/:userId/title'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, achievement_dto_1.SetActiveTitleDto]),
    __metadata("design:returntype", void 0)
], AchievementController.prototype, "setTitle", null);
exports.AchievementController = AchievementController = __decorate([
    (0, swagger_1.ApiTags)('achievements'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [achievement_service_1.AchievementService])
], AchievementController);
//# sourceMappingURL=achievement.controller.js.map