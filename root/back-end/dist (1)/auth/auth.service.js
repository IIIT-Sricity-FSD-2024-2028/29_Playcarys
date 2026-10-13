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
const crypto = require("crypto");
const auth_repository_1 = require("./auth.repository");
const store_1 = require("../data/store");
const token_util_1 = require("./token.util");
const SESSION_STALE_MS = 15_000;
const RESET_TTL_MS = 15 * 60 * 1000;
let AuthService = class AuthService {
    constructor(authRepository) {
        this.authRepository = authRepository;
    }
    claimSession(user, force) {
        const now = Date.now();
        const lastBeat = user.active_session_at ? Date.parse(user.active_session_at) : NaN;
        const isFree = !user.active_session_token || isNaN(lastBeat) || now - lastBeat > SESSION_STALE_MS;
        if (!isFree && !force) {
            throw new common_1.ConflictException({
                code: 'SESSION_ACTIVE',
                message: 'This account is signed in on another device.',
            });
        }
        const sessionToken = crypto.randomUUID();
        user.active_session_token = sessionToken;
        user.active_session_at = new Date(now).toISOString();
        return sessionToken;
    }
    login(dto) {
        let candidates = [];
        if (dto.email) {
            candidates = this.authRepository.findAllByEmail(dto.email);
            if (dto.role_id != null) {
                const scoped = candidates.filter((u) => u.role_id === dto.role_id);
                if (scoped.length)
                    candidates = scoped;
            }
        }
        else if (dto.username) {
            const byName = this.authRepository.findByUsername(dto.username);
            if (byName)
                candidates = [byName];
        }
        if (!candidates.length) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const user = candidates.find((u) => u.password === dto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.status === 'banned') {
            throw new common_1.UnauthorizedException('Account is banned. Contact support.');
        }
        this.authRepository.updateLastSeen(user.user_id);
        const sessionToken = this.claimSession(user, dto.force);
        const role = store_1.roles.find((r) => r.role_id === user.role_id);
        const roleName = role?.role_name ?? 'player';
        return {
            user_id: user.user_id,
            user_name: user.user_name,
            username: user.user_name,
            email: user.email,
            role: roleName,
            role_id: user.role_id,
            avatar: user.avatar,
            status: user.status,
            token: (0, token_util_1.signToken)(user, roleName),
            session_token: sessionToken,
        };
    }
    forgotPassword(dto) {
        const generic = {
            status: 'ok',
            message: 'If that address has an account, a one-time code has been sent to the ' +
                'PlayCarys admins. Contact them to receive it.',
        };
        let candidates = this.authRepository.findAllByEmail(dto.email);
        if (dto.role_id != null) {
            const scoped = candidates.filter((u) => u.role_id === dto.role_id);
            if (scoped.length)
                candidates = scoped;
        }
        const user = candidates[0];
        if (!user)
            return generic;
        if (user.status === 'banned')
            return generic;
        const now = Date.now();
        const live = store_1.password_resets.filter((r) => r.user_id === user.user_id && !r.used_at && Date.parse(r.expires_at) > now);
        if (live.length >= 3)
            return generic;
        const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
        store_1.password_resets.push({
            id: now,
            user_id: user.user_id,
            code_hash: crypto.createHash('sha256').update(code).digest('hex'),
            requested_at: new Date(now).toISOString(),
            expires_at: new Date(now + RESET_TTL_MS).toISOString(),
            used_at: null,
        });
        store_1.notifications.push({
            id: now + 1,
            toUser: null,
            toRole: 'admin',
            from: 'PlayCarys Security',
            fromUserId: 0,
            avatar: '🔑',
            fromRole: 'system',
            type: 'password_reset',
            msg: `Password reset requested for ${user.user_name} (${user.email}). ` +
                `One-time code: ${code} — valid ${RESET_TTL_MS / 60000} minutes. ` +
                `Only give this to someone you have confirmed owns the account.`,
            time: 'Just now',
            read: false,
            replies: [],
        });
        return generic;
    }
    resetPassword(dto) {
        let candidates = this.authRepository.findAllByEmail(dto.email);
        if (dto.role_id != null) {
            const scoped = candidates.filter((u) => u.role_id === dto.role_id);
            if (scoped.length)
                candidates = scoped;
        }
        const user = candidates[0];
        const fail = () => new common_1.UnauthorizedException('That code is not valid, or it has expired. Request a new one.');
        if (!user)
            throw fail();
        const hash = crypto.createHash('sha256').update(String(dto.code).trim()).digest('hex');
        const now = Date.now();
        const row = store_1.password_resets.find((r) => r.user_id === user.user_id &&
            !r.used_at &&
            Date.parse(r.expires_at) > now &&
            crypto.timingSafeEqual(Buffer.from(r.code_hash, 'hex'), Buffer.from(hash, 'hex')));
        if (!row)
            throw fail();
        if (String(dto.new_password).length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters.');
        }
        user.password = dto.new_password;
        row.used_at = new Date(now).toISOString();
        store_1.password_resets.forEach((r) => {
            if (r.user_id === user.user_id && !r.used_at)
                r.used_at = new Date(now).toISOString();
        });
        user.active_session_token = null;
        user.active_session_at = null;
        return { status: 'ok', message: 'Password updated. Sign in with your new password.' };
    }
    changePassword(dto) {
        const user = this.authRepository.findById(dto.user_id);
        if (!user || user.password !== dto.current_password) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        if (user.status === 'banned') {
            throw new common_1.UnauthorizedException('Account is banned. Contact support.');
        }
        if (dto.new_password === dto.current_password) {
            throw new common_1.BadRequestException('The new password must be different from the current one');
        }
        user.password = dto.new_password;
        user.active_session_token = null;
        user.active_session_at = null;
        return { message: 'Password updated' };
    }
    heartbeat(dto) {
        const user = this.authRepository.findById(dto.user_id);
        if (!user)
            return { ok: false, evicted: true, reason: 'no such account' };
        if (user.active_session_token && user.active_session_token !== dto.session_token) {
            return { ok: false, evicted: true, reason: 'this account was claimed by another device' };
        }
        const now = new Date().toISOString();
        user.active_session_token = dto.session_token;
        user.active_session_at = now;
        user.lastSeen = now;
        return { ok: true };
    }
    releaseSession(dto) {
        const user = this.authRepository.findById(dto.user_id);
        if (!user)
            return { ok: true };
        if (user.active_session_token && user.active_session_token !== dto.session_token) {
            return { ok: false, reason: 'not the holder of this session' };
        }
        user.active_session_token = null;
        user.active_session_at = null;
        return { ok: true };
    }
    register(dto) {
        if (!dto.password || dto.password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const allowedRoles = [4, 5];
        const roleId = dto.role_id ?? 4;
        if (!allowedRoles.includes(roleId)) {
            throw new common_1.BadRequestException('Self-registration only available for player or publisher roles');
        }
        if (this.authRepository.emailExistsForRole(dto.email, roleId)) {
            throw new common_1.ConflictException(roleId === 5
                ? 'A publisher account already uses this email'
                : 'A player account already uses this email');
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
        const sessionToken = this.claimSession(newUser, true);
        const roleName = roleId === 5 ? 'publisher' : 'player';
        return {
            message: 'Registration successful',
            user_id: newUser.user_id,
            user_name: newUser.user_name,
            username: newUser.user_name,
            email: newUser.email,
            role: roleName,
            role_id: newUser.role_id,
            avatar: newUser.avatar,
            status: newUser.status,
            token: (0, token_util_1.signToken)(newUser, roleName),
            session_token: sessionToken,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_repository_1.AuthRepository])
], AuthService);
//# sourceMappingURL=auth.service.js.map