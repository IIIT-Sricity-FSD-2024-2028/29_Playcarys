"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchResultRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let MatchResultRepository = class MatchResultRepository {
    findAll() {
        return [...store_1.match_results];
    }
    findBySession(session_id) {
        return store_1.match_results
            .filter((mr) => mr.session_id === session_id)
            .sort((a, b) => a.player_rank - b.player_rank);
    }
    findByPlayer(player_id) {
        return store_1.match_results
            .filter((mr) => mr.player_id === player_id)
            .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
    }
    exists(session_id, player_id) {
        return store_1.match_results.some((mr) => mr.session_id === session_id && mr.player_id === player_id);
    }
    create(result) {
        store_1.match_results.push(result);
        return result;
    }
    getTopScorers(limit = 10) {
        const scoreMap = new Map();
        for (const mr of store_1.match_results) {
            const existing = scoreMap.get(mr.player_id) ?? { total_score: 0, session_count: 0 };
            scoreMap.set(mr.player_id, {
                total_score: existing.total_score + mr.score,
                session_count: existing.session_count + 1,
            });
        }
        return Array.from(scoreMap.entries())
            .map(([player_id, stats]) => ({ player_id, ...stats }))
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, limit);
    }
};
exports.MatchResultRepository = MatchResultRepository;
exports.MatchResultRepository = MatchResultRepository = __decorate([
    (0, common_1.Injectable)()
], MatchResultRepository);
//# sourceMappingURL=match-result.repository.js.map