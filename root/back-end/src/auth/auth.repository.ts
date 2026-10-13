import { Injectable } from '@nestjs/common';
import { users, User } from '../data/store';

@Injectable()
export class AuthRepository {
  findByEmail(email: string): User | undefined {
    return users.find((u) => u.email === email);
  }

  /**
   * Every account on this address. Email is unique per ROLE, not globally
   * (see emailExistsForRole), so one address can legitimately return both a
   * player account and a publisher account.
   */
  findAllByEmail(email: string): User[] {
    const target = String(email ?? '').trim().toLowerCase();
    if (!target) return [];
    return users.filter((u) => String(u.email ?? '').trim().toLowerCase() === target);
  }

  findByUsername(username: string): User | undefined {
    return users.find((u) => u.user_name === username);
  }

  findById(user_id: number): User | undefined {
    return users.find((u) => u.user_id === user_id);
  }

  create(user: User): User {
    users.push(user);
    return user;
  }

  updateLastSeen(user_id: number): void {
    const user = users.find((u) => u.user_id === user_id);
    if (user) user.lastSeen = new Date().toISOString().split('T')[0];
  }

  emailExists(email: string): boolean {
    return users.some((u) => u.email === email);
  }

  /**
   * Is this address already used by an account with the SAME role?
   *
   * Replaces the global emailExists() check on the registration path. Sign-in
   * never resolves an account by email alone (the web client matches on
   * username or a publisher's phone, and this service disambiguates by
   * password), so a globally unique email bought nothing and stopped one
   * person from holding both a player account and a studio account.
   */
  emailExistsForRole(email: string, role_id: number): boolean {
    const target = String(email ?? '').trim().toLowerCase();
    if (!target) return false;
    return users.some(
      (u) => String(u.email ?? '').trim().toLowerCase() === target && u.role_id === role_id,
    );
  }

  nextId(): number {
    return users.length === 0 ? 1 : Math.max(...users.map((u) => u.user_id)) + 1;
  }
}
