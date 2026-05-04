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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const auth_repository_1 = require("./auth.repository");
const store_1 = require("../data/store");
let AuthService = class AuthService {
    constructor(authRepository) {
        this.authRepository = authRepository;
    }
    login(dto) {
        const user = this.authRepository.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.status === 'banned') {
            throw new common_1.UnauthorizedException('Account is banned. Contact support.');
        }
        if (user.password !== dto.password) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        this.authRepository.updateLastSeen(user.user_id);
        const role = store_1.roles.find((r) => r.role_id === user.role_id);
        return {
            user_id: user.user_id,
            user_name: user.user_name,
            email: user.email,
            role: role?.role_name ?? 'player',
            role_id: user.role_id,
            avatar: user.avatar,
            status: user.status,
        };
    }
    register(dto) {
        if (!dto.password || dto.password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        if (this.authRepository.emailExists(dto.email)) {
            throw new common_1.ConflictException('Email already registered');
        }
        const allowedRoles = [4, 5];
        const roleId = dto.role_id ?? 4;
        if (!allowedRoles.includes(roleId)) {
            throw new common_1.BadRequestException('Self-registration only available for player or publisher roles');
        }
        const newId = this.authRepository.nextId();
        const initials = dto.user_name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        const newUser = this.authRepository.create({
            user_id: newId,
            user_name: dto.user_name,
            role_id: roleId,
            email: dto.email,
            password: dto.password,
            avatar: initials,
            status: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            lastSeen: new Date().toISOString().split('T')[0],
        });
        if (roleId === 4) {
            store_1.player_profiles.push({
                user_id: newId,
                player_name: dto.user_name,
                carys_points: 0,
                play_time: 0,
                matches_won: 0,
                player_status: true,
            });
        }
        else if (roleId === 5) {
            store_1.publisher_profiles.push({
                user_id: newId,
                total_games: 0,
                approved_games: 0,
                active_games: 0,
            });
        }
        return { message: 'Registration successful', user_id: newUser.user_id };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_repository_1.AuthRepository])
], AuthService);
//# sourceMappingURL=auth.service.js.map