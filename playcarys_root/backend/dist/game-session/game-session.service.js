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
exports.GameSessionService = void 0;
const common_1 = require("@nestjs/common");
const game_session_repository_1 = require("./game-session.repository");
const store_1 = require("../data/store");
let GameSessionService = class GameSessionService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(filter) {
        let result = this.repo.findAll();
        if (filter?.gameId)
            result = result.filter((s) => s.game_id === filter.gameId);
        if (filter?.status)
            result = result.filter((s) => s.status === filter.status);
        if (filter?.hostId)
            result = result.filter((s) => s.created_by === filter.hostId);
        return result.map((s) => this.enrich(s));
    }
    findOne(id) {
        const session = this.repo.findById(id);
        if (!session)
            throw new common_1.NotFoundException(`Session ${id} not found`);
        return this.enrich(session);
    }
    getPlayerSessions(playerId) {
        return this.repo.findByPlayer(playerId).map((s) => this.enrich(s));
    }
    create(dto) {
        const game = store_1.games.find((g) => g.game_id === dto.game_id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${dto.game_id} not found`);
        if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
            throw new common_1.BadRequestException('Sessions can only be created for active approved games');
        }
        if (new Date(dto.start_time) >= new Date(dto.end_time)) {
            throw new common_1.BadRequestException('start_time must be before end_time');
        }
        const host = store_1.users.find((u) => u.user_id === dto.created_by);
        if (!host)
            throw new common_1.NotFoundException(`User ${dto.created_by} not found`);
        const newId = this.repo.nextId();
        const session = this.repo.create({
            session_id: newId,
            game_id: dto.game_id,
            created_by: dto.created_by,
            name: dto.name,
            game: game.game_name,
            host: host.user_name,
            hostId: dto.created_by,
            maxPlayers: dto.maxPlayers,
            status: 'waiting',
            mode: dto.mode,
            start_time: dto.start_time,
            end_time: dto.end_time,
            duration: 0,
            createdAt: new Date().toISOString(),
        });
        const hostProfile = store_1.player_profiles.find((p) => p.user_id === dto.created_by);
        if (hostProfile && hostProfile.player_status) {
            this.repo.addMember(dto.created_by, newId);
        }
        return this.enrich(session);
    }
    joinSession(sessionId, dto) {
        const session = this.repo.findById(sessionId);
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        if (session.status === 'ended') {
            throw new common_1.BadRequestException('This session has already ended');
        }
        const profile = store_1.player_profiles.find((p) => p.user_id === dto.player_id);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile ${dto.player_id} not found`);
        if (!profile.player_status) {
            throw new common_1.ForbiddenException('Your account is inactive and cannot join sessions');
        }
        if (this.repo.isMember(dto.player_id, sessionId)) {
            throw new common_1.ConflictException('You are already in this session');
        }
        const currentCount = this.repo.getMemberCount(sessionId);
        if (currentCount >= session.maxPlayers) {
            throw new common_1.BadRequestException('Session is full');
        }
        this.repo.addMember(dto.player_id, sessionId);
        if (currentCount + 1 >= session.maxPlayers) {
            this.repo.update(sessionId, { status: 'active' });
        }
        return { message: 'Joined session successfully', session_id: sessionId };
    }
    leaveSession(sessionId, playerId) {
        const session = this.repo.findById(sessionId);
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        if (session.status === 'ended') {
            throw new common_1.BadRequestException('Session has already ended');
        }
        if (!this.repo.isMember(playerId, sessionId)) {
            throw new common_1.BadRequestException('You are not a member of this session');
        }
        this.repo.removeMember(playerId, sessionId);
        if (session.created_by === playerId) {
            this.repo.update(sessionId, { status: 'ended' });
            return { message: 'Host left — session has been ended' };
        }
        return { message: 'Left session successfully' };
    }
    endSession(sessionId, hostId, dto) {
        const session = this.repo.findById(sessionId);
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        if (session.created_by !== hostId) {
            throw new common_1.ForbiddenException('Only the host can end the session');
        }
        if (session.status === 'ended') {
            throw new common_1.BadRequestException('Session is already ended');
        }
        if (!dto.results || dto.results.length === 0) {
            throw new common_1.BadRequestException('At least one result entry is required to end a session');
        }
        const now = new Date().toISOString();
        const startMs = new Date(session.start_time).getTime();
        const durationMinutes = Math.round((Date.now() - startMs) / 60000);
        for (const result of dto.results) {
            const alreadyExists = store_1.match_results.some((mr) => mr.session_id === sessionId && mr.player_id === result.player_id);
            if (!alreadyExists) {
                store_1.match_results.push({
                    session_id: sessionId,
                    player_id: result.player_id,
                    score: result.score,
                    player_rank: result.player_rank,
                    joined_at: now,
                });
            }
            const profile = store_1.player_profiles.find((p) => p.user_id === result.player_id);
            if (profile) {
                const pointsEarned = this.calculatePoints(result.player_rank, dto.results.length, result.score);
                profile.carys_points = Math.max(0, profile.carys_points + pointsEarned);
                profile.play_time += durationMinutes;
                if (result.player_rank === 1)
                    profile.matches_won += 1;
            }
        }
        const gameEntry = store_1.games.find((g) => g.game_id === session.game_id);
        if (gameEntry)
            gameEntry.sessions += 1;
        this.repo.update(sessionId, { status: 'ended', duration: durationMinutes });
        return { message: 'Session ended successfully', session_id: sessionId, duration_minutes: durationMinutes };
    }
    getSpectateList(playerId, gameId) {
        return this.repo
            .findAll()
            .filter((s) => {
            if (s.status === 'ended')
                return false;
            if (this.repo.isMember(playerId, s.session_id))
                return false;
            if (gameId && s.game_id !== gameId)
                return false;
            return true;
        })
            .map((s) => this.enrich(s));
    }
    quickPlay(dto) {
        const game = store_1.games.find((g) => g.game_id === dto.game_id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${dto.game_id} not found`);
        if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
            throw new common_1.BadRequestException('Game is not available for Quick Play');
        }
        const profile = store_1.player_profiles.find((p) => p.user_id === dto.player_id);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile ${dto.player_id} not found`);
        if (!profile.player_status) {
            throw new common_1.ForbiddenException('Your account is inactive and cannot use Quick Play');
        }
        const existing = this.repo.findBestAvailableSession(dto.game_id, dto.player_id);
        if (existing) {
            this.repo.addMember(dto.player_id, existing.session_id);
            const currentCount = this.repo.getMemberCount(existing.session_id);
            if (currentCount >= existing.maxPlayers) {
                this.repo.update(existing.session_id, { status: 'active' });
            }
            return {
                action: 'joined',
                message: 'Joined existing session via Quick Play',
                session: this.enrich(existing),
            };
        }
        const host = store_1.users.find((u) => u.user_id === dto.player_id);
        const newId = this.repo.nextId();
        const now = new Date();
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const newSession = this.repo.create({
            session_id: newId,
            game_id: dto.game_id,
            created_by: dto.player_id,
            name: `${game.game_name} Room`,
            game: game.game_name,
            host: host?.user_name ?? 'Player',
            hostId: dto.player_id,
            maxPlayers: 8,
            status: 'waiting',
            mode: 'casual',
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            duration: 0,
            createdAt: now.toISOString(),
        });
        this.repo.addMember(dto.player_id, newId);
        return {
            action: 'created',
            message: 'No available sessions found — created a new room',
            session: this.enrich(newSession),
        };
    }
    calculatePoints(rank, totalPlayers, score) {
        const basePoints = Math.max(0, totalPlayers - rank + 1) * 50;
        const scoreBonus = Math.floor(score / 100);
        return basePoints + scoreBonus;
    }
    enrich(session) {
        const members = this.repo.getMembers(session.session_id);
        const game = store_1.games.find((g) => g.game_id === session.game_id);
        return {
            ...session,
            current_players: members.length,
            player_ids: members.map((m) => m.player_id),
            game_name: game?.game_name ?? session.game,
            game_type: game?.game_type ?? '',
        };
    }
};
exports.GameSessionService = GameSessionService;
exports.GameSessionService = GameSessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_session_repository_1.GameSessionRepository])
], GameSessionService);
//# sourceMappingURL=game-session.service.js.map