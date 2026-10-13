import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GroupsRepository } from './groups.repository';
import { CreateGroupDto, UpdateGroupDto } from './groups.dto';
import { users, messages, notifications, tournaments, Group } from '../data/store';

// ── Domain rules ────────────────────────────────────────────
// R-GRP-1: The owner is always a member and always an officer in spirit —
//          isStaff() treats owner_id as staff even if it is somehow missing
//          from officer_ids, so a data glitch can never lock the owner out
//          of their own group.
// R-GRP-2: join_mode decides how a non-member gets in:
//            'open'        — joinNow() adds them immediately.
//            'request'     — a GroupJoinRequest is created; owner/officers
//                             approve or reject it.
//            'invite_only' — no self-serve path; only the owner/officers
//                             calling addMember() directly gets someone in.
// R-GRP-3: Only the owner may delete the group, change join_mode/visibility,
//          or promote/demote officers. Owner + officers may approve/reject
//          join requests and remove ordinary members.
// R-GRP-4: Group chat reuses `messages` with group_id set — same pattern as
//          tournament chat — and is members-only, both to read and to post.
// ────────────────────────────────────────────────────────────

@Injectable()
export class GroupsService {
  constructor(private readonly repo: GroupsRepository) {}

  private groupOrThrow(group_id: number): Group {
    const g = this.repo.findById(group_id);
    if (!g) throw new NotFoundException(`Group ${group_id} not found`);
    return g;
  }

  private isStaff(g: Group, userId: number) {
    return Number(g.owner_id) === Number(userId) || g.officer_ids.includes(Number(userId));
  }

  private ownerOnly(g: Group, userId: number) {
    if (Number(g.owner_id) !== Number(userId)) {
      throw new ForbiddenException('Only the group owner can do that.');
    }
  }

  private staffOnly(g: Group, userId: number) {
    if (!this.isStaff(g, userId)) {
      throw new ForbiddenException('Only the group owner or an officer can do that.');
    }
  }

  private nameOf(id: number) {
    return users.find((u) => Number(u.user_id) === Number(id))?.user_name ?? `Player ${id}`;
  }

  private notify(toUser: number, fromUser: number, msg: string, type = 'system') {
    const sender = users.find((u) => Number(u.user_id) === Number(fromUser));
    const highest = notifications.reduce((mx, n) => (Number(n.id) > mx ? Number(n.id) : mx), 0);
    notifications.push({
      id: Math.max(highest + 1, Date.now()),
      toRole: null,
      toUser: Number(toUser),
      from: sender?.user_name ?? 'PlayCarys',
      avatar: sender?.avatar ?? 'PC',
      fromRole: 'player',
      fromUserId: Number(fromUser),
      msg,
      time: 'Just now',
      read: false,
      replies: [],
      type,
    });
  }

  private enrich(g: Group) {
    return {
      ...g,
      member_count: g.member_ids.length,
      owner_name: this.nameOf(g.owner_id),
      members: g.member_ids.map((id) => ({
        user_id: id,
        user_name: this.nameOf(id),
        avatar: users.find((u) => Number(u.user_id) === Number(id))?.avatar ?? '??',
        role: Number(id) === Number(g.owner_id) ? 'owner' : g.officer_ids.includes(id) ? 'officer' : 'member',
      })),
      tournament_count: tournaments.filter((t) => t.group_id === g.group_id).length,
    };
  }

  // ── CRUD ────────────────────────────────────────────────────

  findAll(includePrivateFor?: number) {
    return this.repo
      .findAll()
      .filter(
        (g) =>
          g.visibility === 'public' ||
          (includePrivateFor != null && g.member_ids.includes(includePrivateFor)),
      )
      .map((g) => this.enrich(g));
  }

  findOne(group_id: number) {
    return this.enrich(this.groupOrThrow(group_id));
  }

  findForPlayer(player_id: number) {
    return this.repo.findForPlayer(player_id).map((g) => this.enrich(g));
  }

  create(dto: CreateGroupDto) {
    if (!users.some((u) => Number(u.user_id) === Number(dto.owner_id))) {
      throw new NotFoundException(`User ${dto.owner_id} not found`);
    }
    const group: Group = {
      group_id: this.repo.nextId(),
      name: dto.name,
      desc: dto.desc ?? '',
      owner_id: Number(dto.owner_id),
      officer_ids: [],
      member_ids: [Number(dto.owner_id)],
      visibility: dto.visibility ?? 'public',
      join_mode: dto.join_mode ?? 'open',
      avatar: dto.avatar,
      created_at: new Date().toISOString(),
    };
    this.repo.create(group);
    return this.enrich(group);
  }

  update(group_id: number, dto: UpdateGroupDto, requesterId: number) {
    const g = this.groupOrThrow(group_id);
    this.ownerOnly(g, requesterId);
    this.repo.update(group_id, dto);
    return this.enrich({ ...g, ...dto });
  }

  remove(group_id: number, requesterId: number) {
    const g = this.groupOrThrow(group_id);
    this.ownerOnly(g, requesterId);
    this.repo.remove(group_id);
    return { message: `Group ${group_id} removed` };
  }

  // ── Officers ────────────────────────────────────────────────

  promoteOfficer(group_id: number, userId: number, requesterId: number) {
    const g = this.groupOrThrow(group_id);
    this.ownerOnly(g, requesterId);
    if (!g.member_ids.includes(Number(userId))) {
      throw new BadRequestException('That user is not a member of this group.');
    }
    if (g.officer_ids.includes(Number(userId))) return this.enrich(g);
    const officer_ids = [...g.officer_ids, Number(userId)];
    this.repo.update(group_id, { officer_ids });
    this.notify(userId, requesterId, `You've been made an officer of ${g.name}.`, 'system');
    return this.enrich({ ...g, officer_ids });
  }

  demoteOfficer(group_id: number, userId: number, requesterId: number) {
    const g = this.groupOrThrow(group_id);
    this.ownerOnly(g, requesterId);
    const officer_ids = g.officer_ids.filter((id) => Number(id) !== Number(userId));
    this.repo.update(group_id, { officer_ids });
    return this.enrich({ ...g, officer_ids });
  }

  // ── Membership ──────────────────────────────────────────────

  join(group_id: number, userId: number) {
    const g = this.groupOrThrow(group_id);
    if (g.member_ids.includes(Number(userId))) {
      throw new BadRequestException('Already a member.');
    }
    if (g.join_mode === 'invite_only') {
      throw new ForbiddenException('This group is invite-only — ask an officer to add you.');
    }
    if (g.join_mode === 'request') {
      if (this.repo.findPendingRequest(group_id, userId)) {
        throw new BadRequestException('You already have a pending request for this group.');
      }
      const req = this.repo.createRequest({
        id: this.repo.nextRequestId(),
        group_id,
        user_id: Number(userId),
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      [g.owner_id, ...g.officer_ids].forEach((staffId) =>
        this.notify(staffId, userId, `${this.nameOf(userId)} asked to join ${g.name}.`, 'group_join_request'),
      );
      return { message: 'Join request sent.', request: req };
    }
    // 'open'
    const member_ids = [...g.member_ids, Number(userId)];
    this.repo.update(group_id, { member_ids });
    return { message: `Joined ${g.name}.` };
  }

  leave(group_id: number, userId: number) {
    const g = this.groupOrThrow(group_id);
    if (Number(userId) === Number(g.owner_id)) {
      throw new BadRequestException(
        'The owner cannot leave — delete the group or transfer ownership first.',
      );
    }
    const member_ids = g.member_ids.filter((id) => Number(id) !== Number(userId));
    const officer_ids = g.officer_ids.filter((id) => Number(id) !== Number(userId));
    this.repo.update(group_id, { member_ids, officer_ids });
    return { message: `Left ${g.name}.` };
  }

  removeMember(group_id: number, userId: number, requesterId: number) {
    const g = this.groupOrThrow(group_id);
    this.staffOnly(g, requesterId);
    if (Number(userId) === Number(g.owner_id)) {
      throw new BadRequestException('The owner cannot be removed.');
    }
    const member_ids = g.member_ids.filter((id) => Number(id) !== Number(userId));
    const officer_ids = g.officer_ids.filter((id) => Number(id) !== Number(userId));
    this.repo.update(group_id, { member_ids, officer_ids });
    return { message: 'Member removed.' };
  }

  // ── Join requests ───────────────────────────────────────────

  listRequests(group_id: number, requesterId: number) {
    const g = this.groupOrThrow(group_id);
    this.staffOnly(g, requesterId);
    return this.repo
      .requestsForGroup(group_id)
      .filter((r) => r.status === 'pending')
      .map((r) => ({ ...r, user_name: this.nameOf(r.user_id) }));
  }

  respondToRequest(
    group_id: number,
    requestId: number,
    accept: boolean,
    requesterId: number,
  ) {
    const g = this.groupOrThrow(group_id);
    this.staffOnly(g, requesterId);
    const req = this.repo.findRequest(requestId);
    if (!req || req.group_id !== group_id) throw new NotFoundException('Join request not found.');
    if (req.status !== 'pending') throw new BadRequestException('This request was already resolved.');

    req.status = accept ? 'accepted' : 'rejected';
    req.responded_at = new Date().toISOString();

    if (accept) {
      const member_ids = Array.from(new Set([...g.member_ids, req.user_id]));
      this.repo.update(group_id, { member_ids });
      this.notify(req.user_id, requesterId, `Your request to join ${g.name} was accepted!`, 'system');
    } else {
      this.notify(req.user_id, requesterId, `Your request to join ${g.name} was declined.`, 'system');
    }
    return { message: accept ? 'Request accepted.' : 'Request declined.' };
  }

  // ── Community tournaments ───────────────────────────────────

  tournaments(group_id: number) {
    this.groupOrThrow(group_id);
    return tournaments.filter((t) => t.group_id === group_id);
  }

  /** Community-tournament creation must come from the group's owner or an officer. */
  assertCanOrganize(group_id: number, userId: number) {
    const g = this.groupOrThrow(group_id);
    this.staffOnly(g, userId);
  }

  // ── Chat ─────────────────────────────────────────────────────

  chat(group_id: number, limit = 100) {
    const g = this.groupOrThrow(group_id);
    return messages
      .filter((m) => String(m.group_id ?? '') === String(group_id))
      .sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))
      .slice(-limit)
      .map((m) => ({
        id: m.id,
        from_user: m.from_user,
        from_name: this.nameOf(m.from_user),
        body: m.body,
        sent_at: m.sent_at,
      }));
  }

  postChat(group_id: number, fromUser: number, body: string) {
    const g = this.groupOrThrow(group_id);
    const text = String(body ?? '').trim();
    if (!text) throw new BadRequestException('Message cannot be empty.');
    if (text.length > 500) throw new BadRequestException('Messages are limited to 500 characters.');
    if (!g.member_ids.includes(Number(fromUser))) {
      throw new ForbiddenException('Only members can post here.');
    }

    const highest = messages.reduce((mx, m) => (Number(m.id) > mx ? Number(m.id) : mx), 0);
    const row = {
      id: Math.max(highest + 1, Date.now()),
      from_user: Number(fromUser),
      to_user: null,
      group_id: g.group_id,
      body: text,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      deleted_for: [] as number[],
    };
    messages.push(row);
    return { ...row, from_name: this.nameOf(fromUser) };
  }
}
