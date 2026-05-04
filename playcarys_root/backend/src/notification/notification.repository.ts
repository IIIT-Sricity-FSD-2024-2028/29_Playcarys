import { Injectable } from '@nestjs/common';
import { notifications, Notification } from '../data/store';

@Injectable()
export class NotificationRepository {
  findAll(): Notification[] {
    return [...notifications];
  }

  findById(id: number): Notification | undefined {
    return notifications.find((n) => n.id === id);
  }

  // All notifications visible to a user:
  //   - broadcast to their role  (toRole === roleName && toUser === null)
  //   - direct messages to them  (toUser === userId)
  findForUser(userId: number, roleName: string): Notification[] {
    return notifications.filter((n) => {
      if (n.toUser !== null && n.toUser !== undefined) {
        return n.toUser === userId;
      }
      return n.toRole === roleName;
    });
  }

  findUnreadForUser(userId: number, roleName: string): Notification[] {
    return this.findForUser(userId, roleName).filter((n) => !n.read);
  }

  create(notification: Notification): Notification {
    notifications.push(notification);
    return notification;
  }

  update(id: number, partial: Partial<Notification>): Notification | undefined {
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx === -1) return undefined;
    Object.assign(notifications[idx], partial);
    return notifications[idx];
  }

  markAllReadForUser(userId: number, roleName: string): number {
    let count = 0;
    notifications.forEach((n) => {
      const isForUser =
        (n.toUser === userId) ||
        (n.toRole === roleName && (n.toUser === null || n.toUser === undefined));
      if (isForUser && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  remove(id: number): boolean {
    const idx = notifications.findIndex((n) => n.id === id);
    if (idx === -1) return false;
    notifications.splice(idx, 1);
    return true;
  }

  nextId(): number {
    return notifications.length === 0
      ? 1
      : Math.max(...notifications.map((n) => n.id)) + 1;
  }

  countUnread(userId: number, roleName: string): number {
    return this.findUnreadForUser(userId, roleName).length;
  }
}
