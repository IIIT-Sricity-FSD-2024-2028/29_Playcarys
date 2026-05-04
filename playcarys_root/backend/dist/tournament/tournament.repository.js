"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let TournamentRepository = class TournamentRepository {
    findAll() {
        return [...store_1.tournaments];
    }
    findById(tournament_id) {
        return store_1.tournaments.find((t) => t.tournament_id === tournament_id);
    }
    findByGame(game_id) {
        return store_1.tournaments.filter((t) => t.game_id === game_id);
    }
    findByStatus(status) {
        return store_1.tournaments.filter((t) => t.status === status);
    }
    nameExists(name, excludeId) {
        return store_1.tournaments.some((t) => t.tournament_name.toLowerCase() === name.toLowerCase() &&
            t.tournament_id !== excludeId);
    }
    create(tournament) {
        store_1.tournaments.push(tournament);
        return tournament;
    }
    update(tournament_id, partial) {
        const idx = store_1.tournaments.findIndex((t) => t.tournament_id === tournament_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.tournaments[idx], partial);
        return store_1.tournaments[idx];
    }
    remove(tournament_id) {
        const idx = store_1.tournaments.findIndex((t) => t.tournament_id === tournament_id);
        if (idx === -1)
            return false;
        store_1.tournaments.splice(idx, 1);
        return true;
    }
    nextId() {
        return store_1.tournaments.length === 0
            ? 1
            : Math.max(...store_1.tournaments.map((t) => t.tournament_id)) + 1;
    }
    getRegistrations(tournament_id) {
        return store_1.player_tournament.filter((pt) => pt.tournament_id === tournament_id);
    }
    isRegistered(player_id, tournament_id) {
        return store_1.player_tournament.some((pt) => pt.player_id === player_id && pt.tournament_id === tournament_id);
    }
    registerPlayer(player_id, tournament_id) {
        const entry = { player_id, tournament_id };
        store_1.player_tournament.push(entry);
        return entry;
    }
    unregisterPlayer(player_id, tournament_id) {
        const idx = store_1.player_tournament.findIndex((pt) => pt.player_id === player_id && pt.tournament_id === tournament_id);
        if (idx === -1)
            return false;
        store_1.player_tournament.splice(idx, 1);
        return true;
    }
    getPlayerTournaments(player_id) {
        return store_1.player_tournament.filter((pt) => pt.player_id === player_id);
    }
};
exports.TournamentRepository = TournamentRepository;
exports.TournamentRepository = TournamentRepository = __decorate([
    (0, common_1.Injectable)()
], TournamentRepository);
//# sourceMappingURL=tournament.repository.js.map