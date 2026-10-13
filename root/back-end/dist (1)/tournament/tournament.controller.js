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
exports.TournamentController = void 0;
const common_1 = require("@nestjs/common");
const tournament_service_1 = require("./tournament.service");
const tournament_dto_1 = require("./tournament.dto");
let TournamentController = class TournamentController {
    constructor(tournamentService) {
        this.tournamentService = tournamentService;
    }
    findAll(status, gameId) {
        return this.tournamentService.findAll({
            status,
            gameId: gameId ? parseInt(gameId, 10) : undefined,
        });
    }
    findOne(id) {
        return this.tournamentService.findOne(id);
    }
    getRegistrations(id) {
        return this.tournamentService.getRegistrations(id);
    }
    getPlayerTournaments(playerId) {
        return this.tournamentService.getPlayerTournaments(playerId);
    }
    create(dto) {
        return this.tournamentService.create(dto);
    }
    registerPlayer(id, dto) {
        return this.tournamentService.registerPlayer(id, dto);
    }
    unregisterPlayer(id, playerId) {
        return this.tournamentService.unregisterPlayer(id, playerId);
    }
    update(id, dto) {
        return this.tournamentService.update(id, dto);
    }
    remove(id) {
        return this.tournamentService.remove(id);
    }
};
exports.TournamentController = TournamentController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/registrations'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "getRegistrations", null);
__decorate([
    (0, common_1.Get)('player/:playerId'),
    __param(0, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "getPlayerTournaments", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [tournament_dto_1.CreateTournamentDto]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/register'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, tournament_dto_1.RegisterPlayerDto]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "registerPlayer", null);
__decorate([
    (0, common_1.Delete)(':id/register/:playerId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "unregisterPlayer", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, tournament_dto_1.UpdateTournamentDto]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TournamentController.prototype, "remove", null);
exports.TournamentController = TournamentController = __decorate([
    (0, common_1.Controller)('tournaments'),
    __metadata("design:paramtypes", [tournament_service_1.TournamentService])
], TournamentController);
//# sourceMappingURL=tournament.controller.js.map