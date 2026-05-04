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
exports.MatchResultService = void 0;
const common_1 = require("@nestjs/common");
const match_result_repository_1 = require("./match-result.repository");
const store_1 = require("../data/store");
let MatchResultService = class MatchResultService {
    constructor(repo) {
        this.repo = repo;
    }
    findBySession(sessionId) {
        const session = store_1.sessions.find((s) => s.session_id === sessionId);
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        const results = this.repo.findBySession(sessionId);
        const game = store_1.games.find((g) => g.game_id === session.game_id);
        return results.map((mr) => {
            const user = store_1.users.find((u) => u.user_id === mr.player_id);
            return {
                ...mr,
                player_name: user?.user_name ?? `Player ${mr.player_id}`,
                session_name: session.name,
                game_name: game?.game_name ?? 'Unknown',
            };
        });
    }
    findByPlayer(playerId) {
        const results = this.repo.findByPlayer(playerId);
        return results.map((mr) => {
            const session = store_1.sessions.find((s) => s.session_id === mr.session_id);
            const game = session ? store_1.games.find((g) => g.game_id === session.game_id) : null;
            return {
                ...mr,
                session_name: session?.name ?? 'Unknown Session',
                game_name: game?.game_name ?? 'Unknown Game',
                won: mr.player_rank === 1,
            };
        });
    }
    getTopScorers(limit = 10) {
        const scorers = this.repo.getTopScorers(limit);
        return scorers.map((s) => {
            const user = store_1.users.find((u) => u.user_id === s.player_id);
            return {
                ...s,
                player_name: user?.user_name ?? `Player ${s.player_id}`,
                avatar: user?.avatar ?? '?',
            };
        });
    }
};
exports.MatchResultService = MatchResultService;
exports.MatchResultService = MatchResultService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [match_result_repository_1.MatchResultRepository])
], MatchResultService);
//# sourceMappingURL=match-result.service.js.map