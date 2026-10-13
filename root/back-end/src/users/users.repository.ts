import { Injectable } from '@nestjs/common';
import { users, User, roles } from '../data/store';

@Injectable()
export class UsersRepository {
  findAll(): User[] {
    return [...users];
  }

  findById(user_id: number): User | undefined {
    return users.find((u) => u.user_id === user_id);
  }

  findByRole(role_id: number): User[] {
    return users.filter((u) => u.role_id === role_id);
  }

  findByEmail(email: string): User | undefined {
    return users.find((u) => u.email === email);
  }

  /**
   * Another account with the SAME email AND the SAME role. Mirrors
   * AuthRepository.emailExistsForRole so an admin creating an account follows
   * the same rule as self-registration: one address may hold a player account
   * and a studio account, never two of either.
   */
  findByEmailForRole(email: string, role_id: number, excludeUserId?: number): User | undefined {
    const target = String(email ?? '').trim().toLowerCase();
    if (!target) return undefined;
    return users.find(
      (u) =>
        String(u.email ?? '').trim().toLowerCase() === target &&
        u.role_id === role_id &&
        u.user_id !== excludeUserId,
    );
  }

  create(user: User): User {
    users.push(user);
    return user;
  }

  update(user_id: number, partial: Partial<User>): User | undefined {
    const idx = users.findIndex((u) => u.user_id === user_id);
    if (idx === -1) return undefined;
    Object.assign(users[idx], partial);
    return users[idx];
  }

  remove(user_id: number): boolean {
    const idx = users.findIndex((u) => u.user_id === user_id);
    if (idx === -1) return false;
    users.splice(idx, 1);
    return true;
  }

  nextId(): number {
    return users.length === 0 ? 1 : Math.max(...users.map((u) => u.user_id)) + 1;
  }

  resolveRoleName(role_id: number): string {
    return roles.find((r) => r.role_id === role_id)?.role_name ?? String(role_id);
  }
}
