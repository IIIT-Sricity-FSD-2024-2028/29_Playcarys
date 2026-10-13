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

  // A broadcast row is shared by the whole role, so "read" has to be per user.
  isBroadcast(n: Notification): boolean {
    return n.toUser === null || n.toUser === undefined;
  }

  isReadBy(n: Notification, userId: number): boolean {
    if (!this.isBroadcast(n)) return n.read;
    return n.read || (n.readBy || []).includes(userId);
  }

  setReadBy(n: Notification, userId: number, read: boolean): void {
    if (!this.isBroadcast(n)) {
      n.read = read;
      return;
    }
    const seen = new Set(n.readBy || []);
    if (read) seen.add(userId);
    else seen.delete(userId);
    n.readBy = [...seen];
  }

  findUnreadForUser(userId: number, roleName: string): Notification[] {
    return this.findForUser(userId, roleName).filter((n) => !this.isReadBy(n, userId));
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
      if (isForUser && !this.isReadBy(n, userId)) {
        this.setReadBy(n, userId, true);
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

  /** Mark one row read/unread for one user, honouring per-user state on broadcasts. */
  setReadForUser(id: number, userId: number, read: boolean): Notification | undefined {
    const notif = this.findById(id);
    if (!notif) return undefined;
    this.setReadBy(notif, userId, read);
    return notif;
  }
}
