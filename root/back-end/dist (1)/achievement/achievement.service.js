"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AchievementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementService = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
const achievement_dto_1 = require("./achievement.dto");
let AchievementService = AchievementService_1 = class AchievementService {
    constructor() {
        this.logger = new common_1.Logger(AchievementService_1.name);
    }
    findForGame(gameId, viewerId) {
        const earned = new Set(store_1.player_achievements
            .filter((p) => viewerId != null && p.user_id === viewerId)
            .map((p) => p.achievement_id));
        return store_1.achievements
            .filter((a) => a.game_id === gameId)
            .map((a) => {
            const unlocked = earned.has(a.achievement_id);
            if (a.secret && !unlocked) {
                return {
                    achievement_id: a.achievement_id,
                    game_id: a.game_id,
                    code: a.code,
                    name: 'Hidden achievement',
                    description: 'Keep playing to discover this one.',
                    icon: '❓',
                    carys_reward: a.carys_reward,
                    secret: true,
                    unlocked: false,
                };
            }
            return { ...a, unlocked };
        });
    }
    findForPlayer(userId) {
        return store_1.player_achievements
            .filter((p) => p.user_id === userId)
            .sort((a, b) => Date.parse(b.unlocked_at) - Date.parse(a.unlocked_at))
            .map((p) => {
            const def = store_1.achievements.find((a) => a.achievement_id === p.achievement_id);
            const game = store_1.games.find((g) => g.game_id === p.game_id);
            return {
                ...p,
                name: def?.name ?? 'Unknown achievement',
                description: def?.description ?? '',
                icon: def?.icon ?? '🏆',
                title_awarded: def?.title_awarded ?? null,
                game_name: game?.game_name ?? 'Unknown game',
            };
        });
    }
    titlesFor(userId) {
        const owned = store_1.player_achievements.filter((p) => p.user_id === userId);
        const titles = owned
            .map((p) => store_1.achievements.find((a) => a.achievement_id === p.achievement_id)?.title_awarded)
            .filter((t) => !!t);
        return [...new Set(titles)];
    }
    create(gameId, dto) {
        const game = store_1.games.find((g) => g.game_id === gameId);
        if (!game)
            throw new common_1.NotFoundException(`Game ${gameId} not found`);
        if (game.game_publisher !== dto.publisher_id) {
            throw new common_1.ForbiddenException('You can only define achievements for your own games');
        }
        const code = dto.code.trim().toLowerCase();
        if (store_1.achievements.some((a) => a.game_id === gameId && a.code === code)) {
            throw new common_1.ConflictException(`This game already has an achievement with the code "${code}"`);
        }
        const reward = Math.max(0, Math.min(achievement_dto_1.MAX_ACHIEVEMENT_REWARD, Math.floor(dto.carys_reward)));
        const achievement = {
            achievement_id: this.nextId(),
            game_id: gameId,
            code,
            name: dto.name.trim(),
            description: dto.description.trim(),
            icon: (dto.icon || '🏆').trim(),
            carys_reward: reward,
            title_awarded: dto.title_awarded?.trim() || undefined,
            secret: !!dto.secret,
            created_at: new Date().toISOString(),
        };
        store_1.achievements.push(achievement);
        return achievement;
    }
    remove(achievementId, publisherId) {
        const idx = store_1.achievements.findIndex((a) => a.achievement_id === achievementId);
        if (idx === -1)
            throw new common_1.NotFoundException(`Achievement ${achievementId} not found`);
        const game = store_1.games.find((g) => g.game_id === store_1.achievements[idx].game_id);
        if (!game || game.game_publisher !== publisherId) {
            throw new common_1.ForbiddenException('You can only remove achievements from your own games');
        }
        store_1.achievements.splice(idx, 1);
        return { message: `Achievement ${achievementId} removed` };
    }
    unlock(dto) {
        const game = store_1.games.find((g) => g.game_id === dto.game_id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${dto.game_id} not found`);
        const player = store_1.users.find((u) => u.user_id === dto.user_id);
        if (!player)
            throw new common_1.NotFoundException('Player not found');
        const code = String(dto.code || '').trim().toLowerCase();
        const achievement = store_1.achievements.find((a) => a.game_id === dto.game_id && a.code === code);
        if (!achievement) {
            throw new common_1.BadRequestException(`"${code}" is not an achievement declared by this game. Add it on the publish page first.`);
        }
        const already = store_1.player_achievements.find((p) => p.user_id === dto.user_id && p.achievement_id === achievement.achievement_id);
        if (already) {
            return { unlocked: false, already_earned: true, achievement, carys_granted: 0 };
        }
        const granted = Math.max(0, Math.min(achievement_dto_1.MAX_ACHIEVEMENT_REWARD, achievement.carys_reward));
        store_1.player_achievements.push({
            user_id: dto.user_id,
            achievement_id: achievement.achievement_id,
            game_id: dto.game_id,
            unlocked_at: new Date().toISOString(),
            session_id: dto.session_id,
            carys_granted: granted,
        });
        const profile = store_1.player_profiles.find((p) => p.user_id === dto.user_id);
        if (profile && granted > 0) {
            profile.carys_points = Math.max(0, (profile.carys_points || 0) + granted);
        }
        if (profile && achievement.title_awarded && !profile.active_title) {
            profile.active_title = achievement.title_awarded;
        }
        this.logger.log(`Player ${dto.user_id} unlocked "${achievement.code}" on game ${dto.game_id} (+${granted} Carys)`);
        return {
            unlocked: true,
            already_earned: false,
            achievement,
            carys_granted: granted,
            title_awarded: achievement.title_awarded ?? null,
            carys_total: profile?.carys_points ?? null,
        };
    }
    setActiveTitle(dto) {
        const profile = store_1.player_profiles.find((p) => p.user_id === dto.user_id);
        if (!profile)
            throw new common_1.NotFoundException('Player profile not found');
        const requested = dto.title?.trim();
        if (!requested) {
            profile.active_title = null;
            return { active_title: null };
        }
        if (!this.titlesFor(dto.user_id).includes(requested)) {
            throw new common_1.ForbiddenException('You have not earned that title');
        }
        profile.active_title = requested;
        return { active_title: profile.active_title };
    }
    nextId() {
        return store_1.achievements.length === 0
            ? 1
            : Math.max(...store_1.achievements.map((a) => a.achievement_id)) + 1;
    }
};
exports.AchievementService = AchievementService;
exports.AchievementService = AchievementService = AchievementService_1 = __decorate([
    (0, common_1.Injectable)()
], AchievementService);
//# sourceMappingURL=achievement.service.js.map