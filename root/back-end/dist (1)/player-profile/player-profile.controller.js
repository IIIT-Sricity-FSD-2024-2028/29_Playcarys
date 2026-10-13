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
exports.PlayerProfileController = void 0;
const common_1 = require("@nestjs/common");
const player_profile_service_1 = require("./player-profile.service");
const player_profile_dto_1 = require("./player-profile.dto");
let PlayerProfileController = class PlayerProfileController {
    constructor(playerProfileService) {
        this.playerProfileService = playerProfileService;
    }
    findAll() {
        return this.playerProfileService.findAll();
    }
    getLeaderboard() {
        return this.playerProfileService.getLeaderboard();
    }
    findOne(userId) {
        return this.playerProfileService.findOne(userId);
    }
    getMatchHistory(userId) {
        return this.playerProfileService.getMatchHistory(userId);
    }
    update(userId, dto) {
        return this.playerProfileService.update(userId, dto);
    }
};
exports.PlayerProfileController = PlayerProfileController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlayerProfileController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlayerProfileController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PlayerProfileController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':userId/match-history'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PlayerProfileController.prototype, "getMatchHistory", null);
__decorate([
    (0, common_1.Patch)(':userId'),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, player_profile_dto_1.UpdatePlayerProfileDto]),
    __metadata("design:returntype", void 0)
], PlayerProfileController.prototype, "update", null);
exports.PlayerProfileController = PlayerProfileController = __decorate([
    (0, common_1.Controller)('player-profiles'),
    __metadata("design:paramtypes", [player_profile_service_1.PlayerProfileService])
], PlayerProfileController);
//# sourceMappingURL=player-profile.controller.js.map