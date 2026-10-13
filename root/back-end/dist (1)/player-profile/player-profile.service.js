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
exports.PlayerProfileService = void 0;
const common_1 = require("@nestjs/common");
const player_profile_repository_1 = require("./player-profile.repository");
const store_1 = require("../data/store");
let PlayerProfileService = class PlayerProfileService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll() {
        return this.repo.findAll();
    }
    findOne(userId) {
        const profile = this.repo.findByUserId(userId);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile for user ${userId} not found`);
        return profile;
    }
    update(userId, dto) {
        const profile = this.repo.findByUserId(userId);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile for user ${userId} not found`);
        if (dto.player_name && dto.player_name !== profile.player_name) {
            if (this.repo.nameExists(dto.player_name, userId)) {
                throw new common_1.ConflictException('Player name already taken');
            }
        }
        return this.repo.update(userId, dto);
    }
    addSessionResult(userId, dto) {
        const profile = this.repo.findByUserId(userId);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile for user ${userId} not found`);
        const newPoints = Math.max(0, profile.carys_points + dto.points);
        const newTime = Math.max(0, profile.play_time + dto.play_time);
        const newWins = dto.won ? profile.matches_won + 1 : profile.matches_won;
        return this.repo.update(userId, {
            carys_points: newPoints,
            play_time: newTime,
            matches_won: newWins,
        });
    }
    getMatchHistory(userId) {
        const profile = this.repo.findByUserId(userId);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile for user ${userId} not found`);
        const history = this.repo.getMatchHistory(userId);
        return history.map((mr) => {
            const session = store_1.sessions.find((s) => s.session_id === mr.session_id);
            const game = session ? store_1.games.find((g) => g.game_id === session.game_id) : null;
            return {
                ...mr,
                session_name: session?.name ?? 'Unknown Session',
                game_name: game?.game_name ?? 'Unknown Game',
            };
        });
    }
    getLeaderboard() {
        return this.repo.getLeaderboard().map((p, i) => ({
            rank: i + 1,
            ...p,
            level: Math.floor(p.carys_points / 100),
        }));
    }
};
exports.PlayerProfileService = PlayerProfileService;
exports.PlayerProfileService = PlayerProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [player_profile_repository_1.PlayerProfileRepository])
], PlayerProfileService);
//# sourceMappingURL=player-profile.service.js.map