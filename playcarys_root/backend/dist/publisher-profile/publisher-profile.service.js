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
exports.PublisherProfileService = void 0;
const common_1 = require("@nestjs/common");
const publisher_profile_repository_1 = require("./publisher-profile.repository");
const store_1 = require("../data/store");
let PublisherProfileService = class PublisherProfileService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll() {
        return this.repo.findAll();
    }
    findOne(userId) {
        const profile = this.repo.findByUserId(userId);
        if (!profile)
            throw new common_1.NotFoundException(`Publisher profile for user ${userId} not found`);
        const myGames = store_1.games.filter((g) => g.game_publisher === userId);
        return {
            ...profile,
            total_games: myGames.length,
            approved_games: myGames.filter((g) => g.game_approval_status === 'approved').length,
            active_games: myGames.filter((g) => g.game_approval_status === 'approved' && g.game_status === 'enabled').length,
        };
    }
    recalculate(userId) {
        const myGames = store_1.games.filter((g) => g.game_publisher === userId);
        this.repo.update(userId, {
            total_games: myGames.length,
            approved_games: myGames.filter((g) => g.game_approval_status === 'approved').length,
            active_games: myGames.filter((g) => g.game_approval_status === 'approved' && g.game_status === 'enabled').length,
        });
    }
};
exports.PublisherProfileService = PublisherProfileService;
exports.PublisherProfileService = PublisherProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [publisher_profile_repository_1.PublisherProfileRepository])
], PublisherProfileService);
//# sourceMappingURL=publisher-profile.service.js.map