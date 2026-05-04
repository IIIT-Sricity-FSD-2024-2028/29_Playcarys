import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto } from './auth.dto';
import { player_profiles, publisher_profiles, roles } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-AUTH-1: Password must be at least 8 characters
// R-AUTH-2: Email must be unique across all users
// R-AUTH-3: Banned users cannot log in
// R-AUTH-4: Registration only allowed for player (4) or publisher (5) roles
// R-AUTH-5: On register, matching profile row is auto-created
// ────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  // Workflow: Login
  login(dto: LoginDto) {
    const user = this.authRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // R-AUTH-3
    if (user.status === 'banned') {
      throw new UnauthorizedException('Account is banned. Contact support.');
    }

    if (user.password !== dto.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.authRepository.updateLastSeen(user.user_id);

    const role = roles.find((r) => r.role_id === user.role_id);

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

  // Workflow: Register
  register(dto: RegisterDto) {
    // R-AUTH-1
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // R-AUTH-2
    if (this.authRepository.emailExists(dto.email)) {
      throw new ConflictException('Email already registered');
    }

    // R-AUTH-4 — only player or publisher can self-register
    const allowedRoles = [4, 5];
    const roleId = dto.role_id ?? 4;
    if (!allowedRoles.includes(roleId)) {
      throw new BadRequestException('Self-registration only available for player or publisher roles');
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

    // R-AUTH-5: auto-create profile
    if (roleId === 4) {
      player_profiles.push({
        user_id: newId,
        player_name: dto.user_name,
        carys_points: 0,
        play_time: 0,
        matches_won: 0,
        player_status: true,
      });
    } else if (roleId === 5) {
      publisher_profiles.push({
        user_id: newId,
        total_games: 0,
        approved_games: 0,
        active_games: 0,
      });
    }

    return { message: 'Registration successful', user_id: newUser.user_id };
  }
}
