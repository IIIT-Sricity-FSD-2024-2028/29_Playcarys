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
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const game_repository_1 = require("./game.repository");
const store_1 = require("../data/store");
let GameService = class GameService {
    constructor(gameRepo) {
        this.gameRepo = gameRepo;
    }
    findAll(filter) {
        if (filter?.active)
            return this.gameRepo.findActive();
        if (filter?.publisherId)
            return this.gameRepo.findByPublisher(filter.publisherId);
        if (filter?.status)
            return this.gameRepo.findByStatus(filter.status);
        return this.gameRepo.findAll();
    }
    findOne(id) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        return game;
    }
    create(dto) {
        const publisher = store_1.users.find((u) => u.user_id === dto.game_publisher && u.role_id === 5);
        if (!publisher) {
            throw new common_1.BadRequestException(`User ${dto.game_publisher} is not a registered publisher`);
        }
        if (this.gameRepo.nameExists(dto.game_name)) {
            throw new common_1.ConflictException(`Game name "${dto.game_name}" is already taken`);
        }
        const newId = this.gameRepo.nextId();
        const game = this.gameRepo.create({
            game_id: newId,
            game_name: dto.game_name,
            game_type: dto.game_type,
            game_status: 'disabled',
            game_approval_status: 'pending',
            game_publisher: dto.game_publisher,
            desc: dto.desc,
            players: dto.players,
            img: dto.img ?? '',
            rating: 0,
            views: 0,
            submittedDate: new Date().toISOString().split('T')[0],
            sessions: 0,
        });
        const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === dto.game_publisher);
        if (pubProfile)
            pubProfile.total_games += 1;
        return game;
    }
    update(id, dto, requestingPublisherId) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_publisher !== requestingPublisherId) {
            throw new common_1.ForbiddenException('You can only update your own games');
        }
        if (dto.game_name && this.gameRepo.nameExists(dto.game_name, id)) {
            throw new common_1.ConflictException(`Game name "${dto.game_name}" is already taken`);
        }
        return this.gameRepo.update(id, dto);
    }
    setGameState(id, dto, requestingPublisherId) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_publisher !== requestingPublisherId) {
            throw new common_1.ForbiddenException('You can only change the state of your own games');
        }
        if (dto.game_status === 'enabled' && game.game_approval_status !== 'approved') {
            throw new common_1.BadRequestException('Game must be approved before it can be enabled');
        }
        const updated = this.gameRepo.update(id, { game_status: dto.game_status });
        const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
        if (pubProfile) {
            const publisherGames = this.gameRepo.findByPublisher(game.game_publisher);
            pubProfile.active_games = publisherGames.filter((g) => g.game_approval_status === 'approved' && g.game_status === 'enabled').length;
        }
        return updated;
    }
    approveGame(id, dto) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_approval_status !== 'pending') {
            throw new common_1.BadRequestException('Only pending games can be approved or rejected');
        }
        const updated = this.gameRepo.update(id, {
            game_approval_status: dto.game_approval_status,
            game_status: dto.game_approval_status === 'approved' ? 'enabled' : 'disabled',
        });
        if (dto.game_approval_status === 'approved') {
            const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
            if (pubProfile) {
                pubProfile.approved_games += 1;
                pubProfile.active_games += 1;
            }
        }
        return updated;
    }
    remove(id) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        const hasActiveSessions = store_1.sessions.some((session) => session.game_id === id && session.status !== 'ended');
        if (hasActiveSessions) {
            throw new common_1.BadRequestException('Games with active sessions cannot be removed');
        }
        this.gameRepo.remove(id);
        const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
        if (pubProfile) {
            pubProfile.total_games = Math.max(0, pubProfile.total_games - 1);
            if (game.game_approval_status === 'approved') {
                pubProfile.approved_games = Math.max(0, pubProfile.approved_games - 1);
            }
            if (game.game_status === 'enabled') {
                pubProfile.active_games = Math.max(0, pubProfile.active_games - 1);
            }
        }
        return { message: `Game ${id} removed` };
    }
};
exports.GameService = GameService;
exports.GameService = GameService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_repository_1.GameRepository])
], GameService);
//# sourceMappingURL=game.service.js.map