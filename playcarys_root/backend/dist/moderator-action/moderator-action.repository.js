"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeratorActionRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let ModeratorActionRepository = class ModeratorActionRepository {
    findAll() {
        return [...store_1.moderator_actions];
    }
    findById(action_id) {
        return store_1.moderator_actions.find((a) => a.action_id === action_id);
    }
    findByModerator(moderator_id) {
        return store_1.moderator_actions.filter((a) => a.moderator_id === moderator_id);
    }
    findByReport(report_id) {
        return store_1.moderator_actions.filter((a) => a.report_id === report_id);
    }
    createAction(action) {
        store_1.moderator_actions.push(action);
        return action;
    }
    nextActionId() {
        return store_1.moderator_actions.length === 0
            ? 1
            : Math.max(...store_1.moderator_actions.map((a) => a.action_id)) + 1;
    }
    findAllBans() {
        return [...store_1.bans];
    }
    findActiveBans() {
        return store_1.bans.filter((b) => b.active);
    }
    findBanByPlayer(playerId) {
        return store_1.bans.find((b) => b.playerId === playerId && b.active);
    }
    createBan(ban) {
        store_1.bans.push(ban);
        return ban;
    }
    updateBan(id, partial) {
        const idx = store_1.bans.findIndex((b) => b.id === id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.bans[idx], partial);
        return store_1.bans[idx];
    }
    liftBan(playerId) {
        const ban = store_1.bans.find((b) => b.playerId === playerId && b.active);
        if (!ban)
            return false;
        ban.active = false;
        return true;
    }
    nextBanId() {
        return store_1.bans.length === 0 ? 1 : Math.max(...store_1.bans.map((b) => b.id)) + 1;
    }
};
exports.ModeratorActionRepository = ModeratorActionRepository;
exports.ModeratorActionRepository = ModeratorActionRepository = __decorate([
    (0, common_1.Injectable)()
], ModeratorActionRepository);
//# sourceMappingURL=moderator-action.repository.js.map