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
exports.MatchResultController = void 0;
const common_1 = require("@nestjs/common");
const match_result_service_1 = require("./match-result.service");
let MatchResultController = class MatchResultController {
    constructor(matchResultService) {
        this.matchResultService = matchResultService;
    }
    findBySession(sessionId) {
        return this.matchResultService.findBySession(sessionId);
    }
    findByPlayer(playerId) {
        return this.matchResultService.findByPlayer(playerId);
    }
    getTopScorers(limit) {
        return this.matchResultService.getTopScorers(limit ? parseInt(limit, 10) : 10);
    }
};
exports.MatchResultController = MatchResultController;
__decorate([
    (0, common_1.Get)('session/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MatchResultController.prototype, "findBySession", null);
__decorate([
    (0, common_1.Get)('player/:playerId'),
    __param(0, (0, common_1.Param)('playerId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MatchResultController.prototype, "findByPlayer", null);
__decorate([
    (0, common_1.Get)('top-scorers'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MatchResultController.prototype, "getTopScorers", null);
exports.MatchResultController = MatchResultController = __decorate([
    (0, common_1.Controller)('match-results'),
    __metadata("design:paramtypes", [match_result_service_1.MatchResultService])
], MatchResultController);
//# sourceMappingURL=match-result.controller.js.map