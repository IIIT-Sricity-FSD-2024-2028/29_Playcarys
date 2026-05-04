"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSessionRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let GameSessionRepository = class GameSessionRepository {
    findAll() {
        return [...store_1.sessions];
    }
    findById(session_id) {
        return store_1.sessions.find((s) => s.session_id === session_id);
    }
    findByGame(game_id) {
        return store_1.sessions.filter((s) => s.game_id === game_id);
    }
    findByStatus(status) {
        return store_1.sessions.filter((s) => s.status === status);
    }
    findByHost(hostId) {
        return store_1.sessions.filter((s) => s.created_by === hostId);
    }
    findByPlayer(player_id) {
        const sessionIds = store_1.player_session
            .filter((ps) => ps.player_id === player_id)
            .map((ps) => ps.session_id);
        return store_1.sessions.filter((s) => sessionIds.includes(s.session_id));
    }
    create(session) {
        store_1.sessions.push(session);
        return session;
    }
    update(session_id, partial) {
        const idx = store_1.sessions.findIndex((s) => s.session_id === session_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.sessions[idx], partial);
        return store_1.sessions[idx];
    }
    remove(session_id) {
        const idx = store_1.sessions.findIndex((s) => s.session_id === session_id);
        if (idx === -1)
            return false;
        store_1.sessions.splice(idx, 1);
        return true;
    }
    nextId() {
        return store_1.sessions.length === 0
            ? 1
            : Math.max(...store_1.sessions.map((s) => s.session_id)) + 1;
    }
    getMembers(session_id) {
        return store_1.player_session.filter((ps) => ps.session_id === session_id);
    }
    getMemberCount(session_id) {
        return store_1.player_session.filter((ps) => ps.session_id === session_id).length;
    }
    isMember(player_id, session_id) {
        return store_1.player_session.some((ps) => ps.player_id === player_id && ps.session_id === session_id);
    }
    addMember(player_id, session_id) {
        const entry = { player_id, session_id };
        store_1.player_session.push(entry);
        return entry;
    }
    removeMember(player_id, session_id) {
        const idx = store_1.player_session.findIndex((ps) => ps.player_id === player_id && ps.session_id === session_id);
        if (idx === -1)
            return false;
        store_1.player_session.splice(idx, 1);
        return true;
    }
    clearMembers(session_id) {
        const indicesToRemove = [];
        store_1.player_session.forEach((ps, idx) => {
            if (ps.session_id === session_id)
                indicesToRemove.push(idx);
        });
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
            store_1.player_session.splice(indicesToRemove[i], 1);
        }
    }
    findBestAvailableSession(game_id, exclude_player_id) {
        return store_1.sessions
            .filter((s) => {
            if (s.game_id !== game_id)
                return false;
            if (s.status !== 'waiting')
                return false;
            if (this.isMember(exclude_player_id, s.session_id))
                return false;
            if (this.getMemberCount(s.session_id) >= s.maxPlayers)
                return false;
            return true;
        })
            .sort((a, b) => {
            return this.getMemberCount(b.session_id) - this.getMemberCount(a.session_id);
        })[0];
    }
};
exports.GameSessionRepository = GameSessionRepository;
exports.GameSessionRepository = GameSessionRepository = __decorate([
    (0, common_1.Injectable)()
], GameSessionRepository);
//# sourceMappingURL=game-session.repository.js.map