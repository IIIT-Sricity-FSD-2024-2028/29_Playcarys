import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, AssignRoleDto } from './users.dto';
import { player_profiles, publisher_profiles , grantDefaultKit , deleted_users } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-USR-1: Email must remain unique across all users
// R-USR-2: Superuser (role 1) account cannot be deleted or demoted
// R-USR-3: Cannot assign a non-existent role_id (1–5 only)
// R-USR-4: When a user's role changes to player/publisher, a profile is auto-created
// R-USR-5: When a user is removed, their profile rows are also removed
// ────────────────────────────────────────────────────────────

const VALID_ROLE_IDS = [1, 2, 3, 4, 5];

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll() {
    return this.usersRepository.findAll().map((u) => this.serialize(u));
  }

  findOne(id: number) {
    const user = this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.serialize(user);
  }

  findByRole(roleId: number) {
    return this.usersRepository.findByRole(roleId).map((u) => this.serialize(u));
  }

  create(dto: CreateUserDto) {
    // R-USR-3
    if (!VALID_ROLE_IDS.includes(dto.role_id)) {
      throw new BadRequestException(`role_id must be one of ${VALID_ROLE_IDS.join(', ')}`);
    }
    // R-USR-1 — scoped to the role being created, matching R-AUTH-2.
    if (this.usersRepository.findByEmailForRole(dto.email, dto.role_id)) {
      throw new ConflictException('An account with this role already uses this email');
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

    // R-USR-4
    this.ensureProfile(newId, dto.role_id, dto.user_name);

    return this.serialize(user);
  }

  update(id: number, dto: UpdateUserDto) {
    const existing = this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    // R-USR-2
    if (existing.role_id === 1 && dto.role_id && dto.role_id !== 1) {
      throw new ForbiddenException('Cannot demote the superuser account');
    }

    // R-USR-1 — scoped to the role this account will hold after the edit, so
    // changing an address only collides with another account of the same kind.
    if (dto.email && dto.email !== existing.email) {
      const effectiveRole = dto.role_id ?? existing.role_id;
      if (this.usersRepository.findByEmailForRole(dto.email, effectiveRole, existing.user_id)) {
        throw new ConflictException('An account with this role already uses this email');
      }
    }

    // R-USR-3
    if (dto.role_id && !VALID_ROLE_IDS.includes(dto.role_id)) {
      throw new BadRequestException(`role_id must be one of ${VALID_ROLE_IDS.join(', ')}`);
    }

    const updated = this.usersRepository.update(id, dto);

    // R-USR-4: if role changed to player/publisher, ensure profile exists
    if (dto.role_id && dto.role_id !== existing.role_id) {
      this.ensureProfile(id, dto.role_id, existing.user_name);
    }

    return this.serialize(updated);
  }

  updateStatus(id: number, dto: UpdateUserStatusDto) {
    const existing = this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    // R-USR-2
    if (existing.role_id === 1) {
      throw new ForbiddenException('Cannot change status of the superuser account');
    }

    const updated = this.usersRepository.update(id, { status: dto.status });
    return this.serialize(updated);
  }

  assignRole(id: number, dto: AssignRoleDto) {
    const existing = this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    // R-USR-2
    if (existing.role_id === 1) {
      throw new ForbiddenException('Cannot reassign the superuser role');
    }

    // R-USR-3
    if (!VALID_ROLE_IDS.includes(dto.role_id)) {
      throw new BadRequestException(`role_id must be one of ${VALID_ROLE_IDS.join(', ')}`);
    }

    const updated = this.usersRepository.update(id, { role_id: dto.role_id });

    // R-USR-4
    this.ensureProfile(id, dto.role_id, existing.user_name);

    return this.serialize(updated);
  }

  remove(id: number) {
    const existing = this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException(`User ${id} not found`);

    // R-USR-2
    if (existing.role_id === 1) {
      throw new ForbiddenException('Cannot delete the superuser account');
    }

    // R-USR-5: remove profile rows
    const ppIdx = player_profiles.findIndex((p) => p.user_id === id);
    if (ppIdx !== -1) player_profiles.splice(ppIdx, 1);

    const pubIdx = publisher_profiles.findIndex((p) => p.user_id === id);
    if (pubIdx !== -1) publisher_profiles.splice(pubIdx, 1);

    // Record WHY the account is gone, not just that it is.
    //
    // Deleting the row alone is not deletion here. Every client holds a full
    // copy of the user list and posts it back on the next save, so an account
    // removed on the server reappears the moment a tab with a stale snapshot
    // syncs — db-import reads deleted_users to know an absence is deliberate.
    // The same tombstone also strips the account's append-only history rows,
    // which would otherwise be left pointing at a user that no longer exists.
    if (!deleted_users.some((d: any) => String(d?.user_id ?? d) === String(id))) {
      deleted_users.push({
        user_id: String(id),
        user_name: existing.user_name,
        email: existing.email,
        deleted_at: new Date().toISOString(),
      });
    }

    this.usersRepository.remove(id);
    return { message: `User ${id} removed successfully` };
  }

  // ── Private Helpers ──────────────────────────────────────

  private ensureProfile(user_id: number, role_id: number, user_name: string) {
    if (role_id === 4) {
      const exists = player_profiles.find((p) => p.user_id === user_id);
      if (!exists) {
        player_profiles.push({ user_id, player_name: user_name, carys_points: 0, play_time: 0, matches_won: 0, player_status: true });
        grantDefaultKit(user_id);
      }
    }
    if (role_id === 5) {
      const exists = publisher_profiles.find((p) => p.user_id === user_id);
      if (!exists) {
        publisher_profiles.push({ user_id, total_games: 0, approved_games: 0, active_games: 0 });
      }
    }
  }

  private serialize(user: any) {
    if (!user) return user;
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
      friends: user.friends,
    };
  }
}
