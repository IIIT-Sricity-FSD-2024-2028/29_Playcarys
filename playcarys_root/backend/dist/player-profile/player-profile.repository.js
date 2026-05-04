"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerProfileRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let PlayerProfileRepository = class PlayerProfileRepository {
    findAll() {
        return [...store_1.player_profiles];
    }
    findByUserId(user_id) {
        return store_1.player_profiles.find((p) => p.user_id === user_id);
    }
    nameExists(player_name, excludeUserId) {
        return store_1.player_profiles.some((p) => p.player_name === player_name && p.user_id !== excludeUserId);
    }
    update(user_id, partial) {
        const idx = store_1.player_profiles.findIndex((p) => p.user_id === user_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.player_profiles[idx], partial);
        return store_1.player_profiles[idx];
    }
    getMatchHistory(user_id) {
        return store_1.match_results.filter((mr) => mr.player_id === user_id);
    }
    getLeaderboard() {
        return [...store_1.player_profiles].sort((a, b) => b.carys_points - a.carys_points);
    }
};
exports.PlayerProfileRepository = PlayerProfileRepository;
exports.PlayerProfileRepository = PlayerProfileRepository = __decorate([
    (0, common_1.Injectable)()
], PlayerProfileRepository);
//# sourceMappingURL=player-profile.repository.js.map