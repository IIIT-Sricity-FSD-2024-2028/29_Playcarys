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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const users_repository_1 = require("./users.repository");
const store_1 = require("../data/store");
const VALID_ROLE_IDS = [1, 2, 3, 4, 5];
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    findAll() {
        return this.usersRepository.findAll().map((u) => this.serialize(u));
    }
    findOne(id) {
        const user = this.usersRepository.findById(id);
        if (!user)
            throw new common_1.NotFoundException(`User ${id} not found`);
        return this.serialize(user);
    }
    findByRole(roleId) {
        return this.usersRepository.findByRole(roleId).map((u) => this.serialize(u));
    }
    create(dto) {
        if (!VALID_ROLE_IDS.includes(dto.role_id)) {
            throw new common_1.BadRequestException(`role_id must be one of ${VALID_ROLE_IDS.join(', ')}`);
        }
        if (this.usersRepository.findByEmail(dto.email)) {
            throw new common_1.ConflictException('Email already in use');
        }
        const newId = this.usersRepository.nextId();
        const initials = dto.user_name.slice(0, 2).toUpperCase();
        const user = this.usersRepository.create({
            user_id: newId,
            user_name: dto.user_name,
            role_id: dto.role_id,
            email: dto.email,
            password: dto.password,
            avatar: dto.avatar ?? initials,
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            lastSeen: new Date().toISOString().split('T')[0],
        });
        this.ensureProfile(newId, dto.role_id, dto.user_name);
        return this.serialize(user);
    }
    update(id, dto) {
        const existing = this.usersRepository.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`User ${id} not found`);
        if (existing.role_id === 1 && dto.role_id && dto.role_id !== 1) {
            throw new common_1.ForbiddenException('Cannot demote the superuser account');
        }
        if (dto.email && dto.email !== existing.email) {
            if (this.usersRepository.findByEmail(dto.email)) {
                throw new common_1.ConflictException('Email already in use');
            }
        }
        if (dto.role_id && !VALID_ROLE_IDS.includes(dto.role_id)) {
            throw new common_1.BadRequestException(`role_id must be one of ${VALID_ROLE_IDS.join(', ')}`);
        }
        const updated = this.usersRepository.update(id, dto);
        if (dto.role_id && dto.role_id !== existing.role_id) {
            this.ensureProfile(id, dto.role_id, existing.user_name);
        }
        return this.serialize(updated);
    }
    updateStatus(id, dto) {
        const existing = this.usersRepository.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`User ${id} not found`);
        if (existing.role_id === 1) {
            throw new common_1.ForbiddenException('Cannot change status of the superuser account');
        }
        const updated = this.usersRepository.update(id, { status: dto.status });
        return this.serialize(updated);
    }
    assignRole(id, dto) {
        const existing = this.usersRepository.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`User ${id} not found`);
        if (existing.role_id === 1) {
            throw new common_1.ForbiddenException('Cannot reassign the superuser role');
        }
        if (!VALID_ROLE_IDS.includes(dto.role_id)) {
            throw new common_1.BadRequestException(`role_id must be one of ${VALID_ROLE_IDS.join(', ')}`);
        }
        const updated = this.usersRepository.update(id, { role_id: dto.role_id });
        this.ensureProfile(id, dto.role_id, existing.user_name);
        return this.serialize(updated);
    }
    remove(id) {
        const existing = this.usersRepository.findById(id);
        if (!existing)
            throw new common_1.NotFoundException(`User ${id} not found`);
        if (existing.role_id === 1) {
            throw new common_1.ForbiddenException('Cannot delete the superuser account');
        }
        const ppIdx = store_1.player_profiles.findIndex((p) => p.user_id === id);
        if (ppIdx !== -1)
            store_1.player_profiles.splice(ppIdx, 1);
        const pubIdx = store_1.publisher_profiles.findIndex((p) => p.user_id === id);
        if (pubIdx !== -1)
            store_1.publisher_profiles.splice(pubIdx, 1);
        this.usersRepository.remove(id);
        return { message: `User ${id} removed successfully` };
    }
    ensureProfile(user_id, role_id, user_name) {
        if (role_id === 4) {
            const exists = store_1.player_profiles.find((p) => p.user_id === user_id);
            if (!exists) {
                store_1.player_profiles.push({ user_id, player_name: user_name, carys_points: 0, play_time: 0, matches_won: 0, player_status: true });
            }
        }
        if (role_id === 5) {
            const exists = store_1.publisher_profiles.find((p) => p.user_id === user_id);
            if (!exists) {
                store_1.publisher_profiles.push({ user_id, total_games: 0, approved_games: 0, active_games: 0 });
            }
        }
    }
    serialize(user) {
        if (!user)
            return user;
        return {
            user_id: user.user_id,
            user_name: user.user_name,
            role_id: user.role_id,
            role_name: this.usersRepository.resolveRoleName(user.role_id),
            email: user.email,
            avatar: user.avatar,
            status: user.status,
            joinDate: user.joinDate,
            lastSeen: user.lastSeen,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map