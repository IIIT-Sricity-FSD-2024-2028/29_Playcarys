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
exports.TournamentService = void 0;
const common_1 = require("@nestjs/common");
const tournament_repository_1 = require("./tournament.repository");
const store_1 = require("../data/store");
let TournamentService = class TournamentService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(filter) {
        if (filter?.status)
            return this.repo.findByStatus(filter.status);
        if (filter?.gameId)
            return this.repo.findByGame(filter.gameId);
        return this.repo.findAll();
    }
    findOne(id) {
        const t = this.repo.findById(id);
        if (!t)
            throw new common_1.NotFoundException(`Tournament ${id} not found`);
        return this.enrich(t);
    }
    create(dto) {
        const game = store_1.games.find((g) => g.game_id === dto.game_id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${dto.game_id} not found`);
        if (game.game_approval_status !== 'approved' || game.game_status !== 'enabled') {
            throw new common_1.BadRequestException('Tournament can only be created for active approved games');
        }
        if (this.repo.nameExists(dto.tournament_name)) {
            throw new common_1.ConflictException(`Tournament name "${dto.tournament_name}" already exists`);
        }
        if (new Date(dto.start_date) > new Date(dto.end_date)) {
            throw new common_1.BadRequestException('start_date must be before or equal to end_date');
        }
        if (new Date(dto.regClose) > new Date(dto.start_date)) {
            throw new common_1.BadRequestException('Registration close date must be before or on start_date');
        }
        const newId = this.repo.nextId();
        const tournament = this.repo.create({
            tournament_id: newId,
            game_id: dto.game_id,
            tournament_name: dto.tournament_name,
            desc: dto.desc,
            participants: 0,
            maxParticipants: dto.maxParticipants,
            status: 'upcoming',
            start_date: dto.start_date,
            end_date: dto.end_date,
            regClose: dto.regClose,
            prize: dto.prize,
            organizer: dto.organizer,
        });
        return this.enrich(tournament);
    }
    update(id, dto) {
        const t = this.repo.findById(id);
        if (!t)
            throw new common_1.NotFoundException(`Tournament ${id} not found`);
        if (t.status === 'completed') {
            throw new common_1.ForbiddenException('Completed tournaments cannot be modified');
        }
        if (dto.tournament_name && this.repo.nameExists(dto.tournament_name, id)) {
            throw new common_1.ConflictException(`Tournament name "${dto.tournament_name}" already exists`);
        }
        const nextStartDate = dto.start_date ?? t.start_date;
        const nextEndDate = dto.end_date ?? t.end_date;
        const nextRegClose = dto.regClose ?? t.regClose;
        if (new Date(nextStartDate) > new Date(nextEndDate)) {
            throw new common_1.BadRequestException('start_date must be before or equal to end_date');
        }
        if (new Date(nextRegClose) > new Date(nextStartDate)) {
            throw new common_1.BadRequestException('Registration close date must be before or on start_date');
        }
        if (dto.maxParticipants !== undefined) {
            const currentCount = this.repo.getRegistrations(id).length;
            if (dto.maxParticipants < currentCount) {
                throw new common_1.BadRequestException('maxParticipants cannot be lower than current registrations');
            }
        }
        const updated = this.repo.update(id, dto);
        return this.enrich(updated);
    }
    registerPlayer(tournamentId, dto) {
        const t = this.repo.findById(tournamentId);
        if (!t)
            throw new common_1.NotFoundException(`Tournament ${tournamentId} not found`);
        if (t.status !== 'upcoming') {
            throw new common_1.BadRequestException('Registration is only open for upcoming tournaments');
        }
        if (new Date() > new Date(t.regClose)) {
            throw new common_1.BadRequestException('Registration has closed for this tournament');
        }
        const profile = store_1.player_profiles.find((p) => p.user_id === dto.player_id);
        if (!profile)
            throw new common_1.NotFoundException(`Player profile ${dto.player_id} not found`);
        if (!profile.player_status) {
            throw new common_1.ForbiddenException('Your account is currently inactive and cannot join tournaments');
        }
        if (this.repo.isRegistered(dto.player_id, tournamentId)) {
            throw new common_1.ConflictException('Player is already registered for this tournament');
        }
        const currentCount = this.repo.getRegistrations(tournamentId).length;
        if (currentCount >= t.maxParticipants) {
            throw new common_1.BadRequestException('Tournament is full');
        }
        this.repo.registerPlayer(dto.player_id, tournamentId);
        this.repo.update(tournamentId, { participants: currentCount + 1 });
        return { message: 'Successfully registered for tournament', tournament_id: tournamentId, player_id: dto.player_id };
    }
    unregisterPlayer(tournamentId, playerId) {
        const t = this.repo.findById(tournamentId);
        if (!t)
            throw new common_1.NotFoundException(`Tournament ${tournamentId} not found`);
        if (t.status !== 'upcoming') {
            throw new common_1.BadRequestException('Cannot withdraw from a tournament that has already started');
        }
        if (!this.repo.isRegistered(playerId, tournamentId)) {
            throw new common_1.BadRequestException('Player is not registered for this tournament');
        }
        this.repo.unregisterPlayer(playerId, tournamentId);
        const remaining = this.repo.getRegistrations(tournamentId).length;
        this.repo.update(tournamentId, { participants: remaining });
        return { message: 'Successfully unregistered from tournament' };
    }
    getRegistrations(tournamentId) {
        const t = this.repo.findById(tournamentId);
        if (!t)
            throw new common_1.NotFoundException(`Tournament ${tournamentId} not found`);
        return this.repo.getRegistrations(tournamentId);
    }
    getPlayerTournaments(playerId) {
        return this.repo.getPlayerTournaments(playerId).map((pt) => {
            const t = this.repo.findById(pt.tournament_id);
            return t ? this.enrich(t) : null;
        }).filter(Boolean);
    }
    remove(id) {
        const t = this.repo.findById(id);
        if (!t)
            throw new common_1.NotFoundException(`Tournament ${id} not found`);
        if (t.status === 'in-progress') {
            throw new common_1.ForbiddenException('Cannot delete a tournament that is in progress');
        }
        this.repo.remove(id);
        return { message: `Tournament ${id} removed` };
    }
    enrich(t) {
        const registrations = this.repo.getRegistrations(t.tournament_id);
        const game = store_1.games.find((g) => g.game_id === t.game_id);
        return {
            ...t,
            participants: registrations.length,
            registered_player_ids: registrations.map((r) => r.player_id),
            game_name: game?.game_name ?? 'Unknown',
        };
    }
};
exports.TournamentService = TournamentService;
exports.TournamentService = TournamentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tournament_repository_1.TournamentRepository])
], TournamentService);
//# sourceMappingURL=tournament.service.js.map