import { Notification } from '../data/store';
export declare class NotificationRepository {
    findAll(): Notification[];
    findById(id: number): Notification | undefined;
    findForUser(userId: number, roleName: string): Notification[];
    isBroadcast(n: Notification): boolean;
    isReadBy(n: Notification, userId: number): boolean;
    setReadBy(n: Notification, userId: number, read: boolean): void;
    findUnreadForUser(userId: number, roleName: string): Notification[];
    create(notification: Notification): Notification;
    update(id: number, partial: Partial<Notification>): Notification | undefined;
    markAllReadForUser(userId: number, roleName: string): number;
    remove(id: number): boolean;
    nextId(): number;
    countUnread(userId: number, roleName: string): number;
    setReadForUser(id: number, userId: number, read: boolean): Notification | undefined;
}
