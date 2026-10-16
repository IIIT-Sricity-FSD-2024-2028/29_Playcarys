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
// R-NTF-8: Read state on a role broadcast is tracked per user (readBy), because the
//          broadcast is a single shared row — one user's "mark read" must not clear
//          it for the rest of the role. Direct rows keep the plain `read` flag.
// R-NTF-9: A broadcast may only carry text that is true for every user in the role.
//          Anything phrased "your game / your report / your queue" is per-user and
//          must be sent as one direct notification per recipient.
// ────────────────────────────────────────────────────────────

@Injectable()
export class NotificationService {

  // ── Who may contact whom ──────────────────────────────────
  //
  // Staff messaging had no rules at all: the compose UI listed whoever the page
  // happened to have loaded, and the endpoint accepted any recipient. A
  // moderator could message a publisher about a game they cannot review, and a
  // publisher could message a moderator directly about a ban.
  //
  // The chain below keeps escalation running along the lines that actually
  // exist on this platform:
  //
  //   superuser  → admin, moderator, publisher   (runs the platform)
  //   admin      → moderator, publisher          (runs review + moderation)
  //   moderator  → player, admin                 (acts on players, escalates up)
  //   publisher  → admin, superuser              (raises issues about their games)
  //   player     → (nobody, via this channel)    players use friends chat
  //
  // Deliberately NOT symmetric. A moderator can reach an admin but not a
  // publisher, because a publisher dispute is an admin's job — routing it
  // through the person who issued the ban is how a moderation call turns into
  // an argument with the studio.
  static readonly CONTACTABLE: Record<string, string[]> = {
    superuser: ['admin', 'moderator', 'publisher'],
    admin: ['moderator', 'publisher'],
    moderator: ['player', 'admin', 'superuser'],
    publisher: ['admin', 'superuser'],
    player: [],
  };

  /** The roles this role is allowed to address. */
  contactableRoles(role: string): string[] {
    return NotificationService.CONTACTABLE[String(role).toLowerCase()] ?? [];
  }

  /**
   * The directory a role may see, grouped and sorted by role then name.
   *
   * Grouped because "message someone" is a two-step decision — which kind of
   * person, then which one — and a flat alphabetical list of every account on
   * the platform makes the first step impossible.
   */
  directory(viewerId: number) {
    const me = users.find((u) => u.user_id === Number(viewerId));
    if (!me) throw new NotFoundException(`User ${viewerId} not found`);

    const roleName = (u: { role_id: number }) =>
      roles.find((r) => r.role_id === u.role_id)?.role_name ?? 'player';

    const myRole = roleName(me);
    const allowed = this.contactableRoles(myRole);

    const groups = allowed.map((role) => ({
      role,
      people: users
        .filter((u) => u.user_id !== me.user_id && roleName(u) === role && u.status !== 'banned')
        .map((u) => ({
          user_id: u.user_id,
          user_name: u.user_name,
          avatar: u.avatar,
          role,
          // Staff need to know whether the person they are escalating to is
          // around, or the message sits unread while the incident runs.
          last_seen: u.lastSeen ?? null,
        }))
        .sort((a, b) => a.user_name.localeCompare(b.user_name)),
    }));

    return { viewer_role: myRole, can_contact: allowed, groups };
  }

  /** Whether `fromRole` is permitted to message the account `toUserId`. */
  assertCanContact(fromRole: string, toUserId: number): void {
    const target = users.find((u) => u.user_id === Number(toUserId));
    if (!target) throw new NotFoundException(`User ${toUserId} not found`);

    const targetRole =
      roles.find((r) => r.role_id === target.role_id)?.role_name ?? 'player';
    const allowed = this.contactableRoles(fromRole);

    if (!allowed.includes(targetRole)) {
      throw new ForbiddenException(
        `A ${fromRole} cannot message a ${targetRole}.`,
      );
    }
  }
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
    // The directory decides what the compose box offers; this decides what the
    // platform accepts. Both are needed — the endpoint is reachable without the
    // UI, and a rule enforced only in a dropdown is not a rule.
    if (dto.fromRole && dto.toUser != null) {
      this.assertCanContact(dto.fromRole, dto.toUser);
    }

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
      // Carry the KIND of notification through.
      //
      // The DTO declares `type` and the frontend sends it, but this object
      // never copied it, so every notification created through the REST API was
      // stored untyped. `type` is exactly what the notification drawer keys off
      // to draw the Accept / Reject buttons — so a friend request sent through
      // the API arrived looking like an ordinary message, with no way for the
      // recipient to act on it. Omitted entirely when absent, so a plain
      // message does not gain a meaningless `type: undefined`.
      ...(dto.type ? { type: dto.type } : {}),
    });

    return notification;
  }

  // Workflow: Mark a single notification as read/unread
  markRead(id: number, userId: number, roleName: string, dto: MarkReadStateDto) {
    const notif = this.repo.findById(id);
    if (!notif) throw new NotFoundException(`Notification ${id} not found`);

    // R-NTF-5: verify this notification belongs to the requesting user
    this.assertOwnership(notif, userId, roleName);

    // R-NTF-8: on a broadcast the read flag is per user — writing the shared
    // `read` field marked the announcement read for everyone in the role.
    const updated = this.repo.setReadForUser(id, userId, dto.read);
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
