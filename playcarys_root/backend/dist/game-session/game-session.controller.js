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
exports.GameSessionController = void 0;
const common_1 = require("@nestjs/common");
const game_session_service_1 = require("./game-session.service");
const game_session_dto_1 = require("./game-session.dto");
let GameSessionController = class GameSessionController {
    constructor(gameSessionService) {
        this.gameSessionService = gameSessionService;
    }
    findAll(gameId, status, hostId) {
        return this.gameSessionService.findAll({
            gameId: gameId ? parseInt(gameId, 10) : undefined,
            status,
            hostId: hostId ? parseInt(hostId, 10) : undefined,
        });
    }
    findOne(id) {
        return this.gameSessionService.findOne(id);
    }
    getPlayerSessions(playerId) {
        return this.gameSessionService.getPlayerSessions(playerId);
    }
    getSpectateList(playerId, gameId) {
        return this.gameSessionService.getSpectateList(playerId, gameId ? parseInt(gameId, 10) : undefined);
    }
    create(dto) {
        return this.gameSessionService.create(dto);
    }
    quickPlay(dto) {
        return this.gameSessionService.quickPlay(dto);
    }
    joinSession(id, dto) {
        return this.gameSessionService.joinSession(id, dto);
    }
    leaveSession(id, playerId) {
        return this.gameSessionService.leaveSession(id, playerId);
    }
    endSession(id, body) {
        const { host_id, ...dto } = body;
        return this.gameSessionService.endSession(id, host_id, dto);
    }
};
exports.GameSessionController = GameSessionController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('gameId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('hostId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('player/:playerId'),
    __param(0, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "getPlayerSessions", null);
__decorate([
    (0, common_1.Get)('spectate/:playerId'),
    __param(0, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "getSpectateList", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [game_session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('quick-play'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [game_session_dto_1.QuickPlayDto]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "quickPlay", null);
__decorate([
    (0, common_1.Post)(':id/join'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, game_session_dto_1.JoinSessionDto]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "joinSession", null);
__decorate([
    (0, common_1.Delete)(':id/leave/:playerId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "leaveSession", null);
__decorate([
    (0, common_1.Patch)(':id/end'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, game_session_dto_1.EndSessionRequestDto]),
    __metadata("design:returntype", void 0)
], GameSessionController.prototype, "endSession", null);
exports.GameSessionController = GameSessionController = __decorate([
    (0, common_1.Controller)('sessions'),
    __metadata("design:paramtypes", [game_session_service_1.GameSessionService])
], GameSessionController);
//# sourceMappingURL=game-session.controller.js.map