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
