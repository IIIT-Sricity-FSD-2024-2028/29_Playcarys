import { Injectable } from '@nestjs/common';
import { users, User } from '../data/store';

@Injectable()
export class AuthRepository {
  findByEmail(email: string): User | undefined {
    return users.find((u) => u.email === email);
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

  nextId(): number {
    return users.length === 0 ? 1 : Math.max(...users.map((u) => u.user_id)) + 1;
  }
}
