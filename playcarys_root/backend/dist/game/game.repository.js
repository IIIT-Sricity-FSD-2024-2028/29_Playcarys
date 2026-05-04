"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let GameRepository = class GameRepository {
    findAll() {
        return [...store_1.games];
    }
    findById(game_id) {
        return store_1.games.find((g) => g.game_id === game_id);
    }
    findByPublisher(publisher_id) {
        return store_1.games.filter((g) => g.game_publisher === publisher_id);
    }
    findByStatus(game_approval_status) {
        return store_1.games.filter((g) => g.game_approval_status === game_approval_status);
    }
    findActive() {
        return store_1.games.filter((g) => g.game_approval_status === 'approved' && g.game_status === 'enabled');
    }
    nameExists(game_name, excludeId) {
        return store_1.games.some((g) => g.game_name.toLowerCase() === game_name.toLowerCase() && g.game_id !== excludeId);
    }
    create(game) {
        store_1.games.push(game);
        return game;
    }
    update(game_id, partial) {
        const idx = store_1.games.findIndex((g) => g.game_id === game_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.games[idx], partial);
        return store_1.games[idx];
    }
    remove(game_id) {
        const idx = store_1.games.findIndex((g) => g.game_id === game_id);
        if (idx === -1)
            return false;
        store_1.games.splice(idx, 1);
        return true;
    }
    nextId() {
        return store_1.games.length === 0 ? 1 : Math.max(...store_1.games.map((g) => g.game_id)) + 1;
    }
};
exports.GameRepository = GameRepository;
exports.GameRepository = GameRepository = __decorate([
    (0, common_1.Injectable)()
], GameRepository);
//# sourceMappingURL=game.repository.js.map