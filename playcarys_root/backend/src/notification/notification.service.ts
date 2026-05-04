import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { CreateNotificationDto, MarkReadStateDto, ReplyDto } from './notification.dto';
import { users, roles } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-NTF-1: A notification must target either a role (broadcast) OR a specific user (direct) — not both, not neither
// R-NTF-2: toRole must be a valid role name if provided
// R-NTF-3: toUser must reference an existing user_id if provided
// R-NTF-4: fromUserId must reference an existing user
// R-NTF-5: A user can only mark their own notifications as read
// R-NTF-6: A user can only delete their own direct notifications
// R-NTF-7: Replies are appended to the notification's replies array with a timestamp
// ────────────────────────────────────────────────────────────

@Injectable()
export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  // Get all notifications for a specific user (role broadcasts + direct messages)
  findForUser(userId: number, roleName: string) {
    const notifs = this.repo.findForUser(userId, roleName);
    return notifs.sort((a, b) => {
      // Unread first, then by id descending (newest first)
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.id - a.id;
    });
  }

  findUnreadForUser(userId: number, roleName: string) {
    return this.repo.findUnreadForUser(userId, roleName);
  }

  countUnread(userId: number, roleName: string) {
    return { unread_count: this.repo.countUnread(userId, roleName) };
  }

  findOne(id: number) {
    const notif = this.repo.findById(id);
    if (!notif) throw new NotFoundException(`Notification ${id} not found`);
    return notif;
  }

  // Workflow: Send a notification (broadcast or direct)
  create(dto: CreateNotificationDto) {
    // R-NTF-1: must target exactly one of toRole or toUser
    const hasRole = dto.toRole !== null && dto.toRole !== undefined && dto.toRole !== '';
    const hasUser = dto.toUser !== null && dto.toUser !== undefined;

    if (!hasRole && !hasUser) {
      throw new BadRequestException('Notification must target either a role (broadcast) or a specific user (direct)');
    }
    if (hasRole && hasUser) {
      throw new BadRequestException('Notification cannot target both a role and a specific user simultaneously');
    }

    // R-NTF-2
    if (hasRole) {
      const validRoleNames = roles.map((r) => r.role_name);
      if (!validRoleNames.includes(dto.toRole!)) {
        throw new BadRequestException(`Invalid role name "${dto.toRole}". Valid roles: ${validRoleNames.join(', ')}`);
      }
    }

    // R-NTF-3
    if (hasUser) {
      const targetUser = users.find((u) => u.user_id === dto.toUser);
      if (!targetUser) {
        throw new NotFoundException(`Target user ${dto.toUser} not found`);
      }
    }

    // R-NTF-4
    const sender = users.find((u) => u.user_id === dto.fromUserId);
    if (!sender) {
      throw new NotFoundException(`Sender user ${dto.fromUserId} not found`);
    }

    const newId = this.repo.nextId();
    const notification = this.repo.create({
      id: newId,
      toRole: dto.toRole ?? null,
      toUser: dto.toUser ?? null,
      from: dto.from,
      avatar: dto.avatar,
      fromRole: dto.fromRole,
      fromUserId: dto.fromUserId,
      msg: dto.msg,
      time: 'Just now',
      read: false,
      replies: [],
    });

    return notification;
  }

  // Workflow: Mark a single notification as read/unread
  markRead(id: number, userId: number, roleName: string, dto: MarkReadStateDto) {
    const notif = this.repo.findById(id);
    if (!notif) throw new NotFoundException(`Notification ${id} not found`);

    // R-NTF-5: verify this notification belongs to the requesting user
    this.assertOwnership(notif, userId, roleName);

    const updated = this.repo.update(id, { read: dto.read });
    return updated;
  }

  // Mark ALL notifications as read for a user
  markAllRead(userId: number, roleName: string) {
    const count = this.repo.markAllReadForUser(userId, roleName);
    return { message: `Marked ${count} notification(s) as read` };
  }

  // Workflow: Reply to a notification (direct messages only)
  reply(id: number, dto: ReplyDto) {
    const notif = this.repo.findById(id);
    if (!notif) throw new NotFoundException(`Notification ${id} not found`);
    if (notif.toUser === null || notif.toUser === undefined) {
      throw new BadRequestException('Replies are only allowed for direct notifications');
    }

    // R-NTF-7
    const sender = users.find((u) => u.user_id === dto.fromUserId);
    if (!sender) throw new NotFoundException(`User ${dto.fromUserId} not found`);

    const replyEntry = {
      fromUserId: dto.fromUserId,
      from: dto.from,
      avatar: sender.avatar,
      msg: dto.msg,
      time: new Date().toISOString(),
    };

    const updatedReplies = [...notif.replies, replyEntry];
    return this.repo.update(id, { replies: updatedReplies });
  }

  // R-NTF-6: delete a direct notification (only the recipient can delete)
  remove(id: number, userId: number, roleName: string) {
    const notif = this.repo.findById(id);
    if (!notif) throw new NotFoundException(`Notification ${id} not found`);
    if (notif.toUser === null || notif.toUser === undefined) {
      throw new BadRequestException('Only direct notifications can be deleted');
    }

    this.assertOwnership(notif, userId, roleName);

    this.repo.remove(id);
    return { message: `Notification ${id} deleted` };
  }

  // ── Private Helpers ──────────────────────────────────────

  private assertOwnership(notif: any, userId: number, roleName: string) {
    const isDirectToUser = notif.toUser === userId;
    const isBroadcastToRole = notif.toRole === roleName && (notif.toUser === null || notif.toUser === undefined);
    if (!isDirectToUser && !isBroadcastToRole) {
      throw new ForbiddenException('You do not have access to this notification');
    }
  }
}
