import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  users,
  friendships,
  friend_requests,
  messages,
  matches,
  match_results,
  notifications,
  FRIEND_REREQUEST_COOLDOWN_MS,
} from '../data/store';

// ── Domain rules ────────────────────────────────────────────
// R-SOC-1: A friendship is ONE row, keyed (user_a, user_b) with user_a < user_b.
//          Neither side owns it, so neither side's sync can drop it.
// R-SOC-2: Every transition in a request's life notifies the other party —
//          including rejection, which used to be silent.
// R-SOC-3: A rejected requester waits out a cooldown before asking again.
// R-SOC-4: Deleting a CONVERSATION is one-sided (deleted_for). Deleting a
//          FRIEND clears the conversation for both.
// R-SOC-5: A message is 'sent' when the server holds it and 'delivered' when
//          the recipient's client acknowledges it. There is no 'read' state,
//          because we cannot prove a human read anything.
// ────────────────────────────────────────────────────────────

@Injectable()
export class SocialService {
  // ── helpers ───────────────────────────────────────────────

  private userOrThrow(id: number) {
    const u = users.find((x) => Number(x.user_id) === Number(id));
    if (!u) throw new NotFoundException(`User ${id} not found`);
    return u;
  }

  /** Canonical ordering, so (7,8) and (8,7) can never become two rows. */
  private pair(a: number, b: number) {
    const x = Number(a);
    const y = Number(b);
    return { user_a: Math.min(x, y), user_b: Math.max(x, y) };
  }

  private findFriendship(a: number, b: number) {
    const p = this.pair(a, b);
    return friendships.find(
      (f) => Number(f.user_a) === p.user_a && Number(f.user_b) === p.user_b,
    );
  }

  areFriends(a: number, b: number): boolean {
    const f = this.findFriendship(a, b);
    return !!f && !f.removed_at;
  }

  /**
   * A new id that is always larger than every existing one.
   *
   * `Date.now() + random(1000)` looked fine and was not: the random part is up
   * to a second wide, so two rows created within the same second could come out
   * in the WRONG ORDER. Caught in testing — a player unfriended somebody and
   * their "newest" notification was still the older friend request, because
   * every list here sorts by id descending. Monotonic by construction instead.
   */
  private nextId(rows: { id: number }[]) {
    const highest = rows.reduce((max, r) => (Number(r.id) > max ? Number(r.id) : max), 0);
    return Math.max(highest + 1, Date.now());
  }

  private notify(
    toUser: number,
    fromUser: number,
    msg: string,
    type = 'system',
    extra: { request_id?: number } = {},
  ) {
    const sender = users.find((u) => Number(u.user_id) === Number(fromUser));
    notifications.push({
      id: this.nextId(notifications as { id: number }[]),
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
      ...extra,
    });
  }

  /**
   * Matches played and won, counted from match_results.
   *
   * The profile modal used to read `user.matches` and `user.wins` — fields that
   * exist on no user row anywhere in this database, so every profile displayed
   * 0 matches, 0 wins and a 0% win rate regardless of what the player had done.
   */
  private statsFor(userId: number) {
    const mine = match_results.filter(
      (r) => String(r.player_id) === String(userId),
    );
    const played = new Set(mine.map((r) => String(r.session_id))).size;
    const wins = mine.filter((r) => (r as any).result === 'win').length;
    return {
      matches: played,
      wins,
      win_rate: played ? Math.round((wins / played) * 100) : 0,
    };
  }

  /** What a player is doing right now, resolved to a game NAME. */
  private presenceOf(userId: number) {
    const live = matches.find(
      (m) =>
        m.status === 'in-progress' &&
        (Array.isArray(m.participants)
          ? m.participants.some((p) => String(p) === String(userId))
          : String(m.created_by) === String(userId)),
    );
    if (!live) return { state: 'offline' as const, game: null, match_id: null };
    return {
      state: 'playing' as const,
      // The name, not the id. statusOf() already returned a gameId and nothing
      // ever resolved it, so the UI could only say "Playing" and never what.
      game: live.game ?? null,
      match_id: live.match_id,
    };
  }

  private publicUser(u: any) {
    return {
      user_id: u.user_id,
      user_name: u.user_name,
      avatar: u.avatar,
      status: u.status,
      joinDate: u.joinDate,
      ...this.statsFor(u.user_id),
      presence: this.presenceOf(u.user_id),
    };
  }

  // ── search ────────────────────────────────────────────────

  /**
   * Find players by name.
   *
   * The only way to add a friend before this was to type an EXACT username into
   * a box; a typo returned "Player not found in Database!" with no suggestions.
   * You had to already know precisely who you were looking for.
   */
  searchPlayers(q: string, viewerId?: number, limit = 20) {
    const needle = String(q ?? '').trim().toLowerCase();
    if (needle.length < 2) {
      throw new BadRequestException('Search needs at least 2 characters');
    }

    const isPlayer = (u: any) => Number(u.role_id) === 4;

    return users
      .filter(isPlayer)
      .filter((u) => u.status !== 'banned')
      .filter((u) => Number(u.user_id) !== Number(viewerId))
      .filter((u) => (u.user_name ?? '').toLowerCase().includes(needle))
      .slice(0, limit)
      .map((u) => ({
        ...this.publicUser(u),
        // So the UI can draw the right button without a second round trip.
        relationship: viewerId != null ? this.relationshipTo(viewerId, u.user_id) : 'none',
      }));
  }

  /** How the viewer stands with this player: none | friends | sent | received. */
  private relationshipTo(viewerId: number, otherId: number) {
    if (this.areFriends(viewerId, otherId)) return 'friends';
    const pending = friend_requests.find(
      (r) =>
        r.status === 'pending' &&
        ((Number(r.from_user) === Number(viewerId) && Number(r.to_user) === Number(otherId)) ||
          (Number(r.from_user) === Number(otherId) && Number(r.to_user) === Number(viewerId))),
    );
    if (!pending) return 'none';
    return Number(pending.from_user) === Number(viewerId) ? 'sent' : 'received';
  }

  getProfile(userId: number, viewerId?: number) {
    const u = this.userOrThrow(userId);
    return {
      ...this.publicUser(u),
      relationship: viewerId != null ? this.relationshipTo(viewerId, userId) : 'none',
    };
  }

  // ── friends ───────────────────────────────────────────────

  listFriends(userId: number) {
    this.userOrThrow(userId);
    return friendships
      .filter(
        (f) =>
          !f.removed_at &&
          (Number(f.user_a) === Number(userId) || Number(f.user_b) === Number(userId)),
      )
      .map((f) => (Number(f.user_a) === Number(userId) ? f.user_b : f.user_a))
      .map((otherId) => users.find((u) => Number(u.user_id) === Number(otherId)))
      .filter(Boolean)
      .map((u) => ({
        ...this.publicUser(u),
        last_message: this.lastMessage(userId, Number((u as any).user_id)),
        unread: messages.filter(
          (m) =>
            Number(m.from_user) === Number((u as any).user_id) &&
            Number(m.to_user) === Number(userId) &&
            !m.delivered_at &&
            !(m.deleted_for ?? []).some((d) => Number(d) === Number(userId)),
        ).length,
      }));
  }

  /** The newest message between two players that `me` has not cleared, for a preview line. */
  private lastMessage(me: number, other: number) {
    let last: (typeof messages)[number] | undefined;
    for (const m of messages) {
      const between =
        (Number(m.from_user) === Number(me) && Number(m.to_user) === Number(other)) ||
        (Number(m.from_user) === Number(other) && Number(m.to_user) === Number(me));
      if (!between) continue;
      if ((m.deleted_for ?? []).some((d) => Number(d) === Number(me))) continue;
      if (!last || Date.parse(m.sent_at) > Date.parse(last.sent_at)) last = m;
    }
    if (!last) return null;
    return {
      body: last.body.length > 60 ? last.body.slice(0, 57) + '…' : last.body,
      sent_at: last.sent_at,
      mine: Number(last.from_user) === Number(me),
    };
  }

  listRequests(userId: number) {
    this.userOrThrow(userId);
    const incoming = friend_requests
      .filter((r) => r.status === 'pending' && Number(r.to_user) === Number(userId))
      .map((r) => ({ ...r, other: this.publicUser(this.userOrThrow(r.from_user)) }));
    const outgoing = friend_requests
      .filter((r) => r.status === 'pending' && Number(r.from_user) === Number(userId))
      .map((r) => ({ ...r, other: this.publicUser(this.userOrThrow(r.to_user)) }));
    return { incoming, outgoing };
  }

  sendRequest(fromUser: number, toUser: number) {
    const me = this.userOrThrow(fromUser);
    const them = this.userOrThrow(toUser);

    if (Number(fromUser) === Number(toUser)) {
      throw new BadRequestException('You cannot add yourself.');
    }
    if (Number(them.role_id) !== 4) {
      throw new BadRequestException('You can only add players as friends.');
    }
    // Search already hides banned accounts. Without the same rule here the two
    // disagreed: a banned player could not be found, but a request addressed to
    // them by id was accepted — and they can never answer it.
    if (them.status === 'banned') {
      throw new BadRequestException('That account is not available.');
    }
    if (this.areFriends(fromUser, toUser)) {
      throw new BadRequestException(`You are already friends with ${them.user_name}.`);
    }

    const existing = friend_requests.find(
      (r) =>
        r.status === 'pending' &&
        ((Number(r.from_user) === Number(fromUser) && Number(r.to_user) === Number(toUser)) ||
          (Number(r.from_user) === Number(toUser) && Number(r.to_user) === Number(fromUser))),
    );
    if (existing) {
      throw new BadRequestException(
        Number(existing.from_user) === Number(fromUser)
          ? 'You have already sent this player a request.'
          : `${them.user_name} has already sent YOU a request — answer that instead.`,
      );
    }

    // R-SOC-3: a rejection means no for a while. Without this the requester can
    // re-send instantly and indefinitely, which is a harassment vector, not a
    // feature.
    const lastRejection = friend_requests
      .filter(
        (r) =>
          r.status === 'rejected' &&
          Number(r.from_user) === Number(fromUser) &&
          Number(r.to_user) === Number(toUser),
      )
      .map((r) => Date.parse(r.responded_at ?? ''))
      .filter((t) => !isNaN(t))
      .sort((a, b) => b - a)[0];

    if (lastRejection && Date.now() - lastRejection < FRIEND_REREQUEST_COOLDOWN_MS) {
      const hours = Math.ceil(
        (FRIEND_REREQUEST_COOLDOWN_MS - (Date.now() - lastRejection)) / 3600000,
      );
      throw new ForbiddenException(
        `${them.user_name} declined recently. You can ask again in ${hours} hour(s).`,
      );
    }

    const req = {
      id: this.nextId(friend_requests),
      from_user: Number(fromUser),
      to_user: Number(toUser),
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      responded_at: null,
    };
    friend_requests.push(req);

    this.notify(
      toUser,
      fromUser,
      `<b>${me.user_name}</b> wants to add you as a friend.`,
      'friend_request',
      { request_id: req.id },
    );

    return { message: `Friend request sent to ${them.user_name}.`, request: req };
  }

  respondToRequest(requestId: number, userId: number, action: 'accept' | 'reject') {
    const req = friend_requests.find((r) => Number(r.id) === Number(requestId));
    if (!req) throw new NotFoundException(`Friend request ${requestId} not found`);
    if (req.status !== 'pending') {
      throw new BadRequestException(`This request was already ${req.status}.`);
    }
    // Only the person who was ASKED may answer.
    if (Number(req.to_user) !== Number(userId)) {
      throw new ForbiddenException('This friend request was not addressed to you.');
    }

    const me = this.userOrThrow(userId);
    const requester = this.userOrThrow(req.from_user);
    const now = new Date().toISOString();

    // The question has been answered, so the notification that asked it is done.
    // Without this, the Accept / Decline buttons stayed on screen after the
    // request was settled, and pressing them again hit "already accepted".
    for (const n of notifications) {
      if (
        n.type === 'friend_request' &&
        Number(n.toUser) === Number(userId) &&
        Number(n.fromUserId) === Number(req.from_user) &&
        !n.read
      ) {
        n.read = true;
      }
    }

    if (action === 'accept') {
      req.status = 'accepted';
      req.responded_at = now;

      const p = this.pair(req.from_user, req.to_user);
      const existing = this.findFriendship(req.from_user, req.to_user);
      if (existing) {
        // Re-friending after an unfriend reuses the row rather than adding a
        // second one — friendships are append-only across the sync, so two rows
        // for one pair would both survive and contradict each other.
        existing.removed_at = null;
        existing.since = now;
      } else {
        friendships.push({ ...p, since: now, removed_at: null });
      }

      // R-SOC-2: acceptance used to be silent. The requester was left watching
      // a friends list, guessing.
      this.notify(req.from_user, userId, `<b>${me.user_name}</b> accepted your friend request.`);
      return { message: `You are now friends with ${requester.user_name}.`, status: 'accepted' };
    }

    req.status = 'rejected';
    req.responded_at = now;
    // R-SOC-2: the doc asks for this one explicitly.
    this.notify(req.from_user, userId, `<b>${me.user_name}</b> rejected your friend request.`);
    return { message: 'Friend request rejected.', status: 'rejected' };
  }

  /**
   * Remove a friend. Three things happen, all of them deliberate:
   *   1. the other person is TOLD,
   *   2. the friendship goes for BOTH sides (it is one row, so it cannot go
   *      for only one),
   *   3. the conversation is deleted for BOTH sides.
   *
   * That last point is what separates this from "delete conversation", which
   * clears one side only.
   */
  removeFriend(userId: number, friendId: number) {
    const me = this.userOrThrow(userId);
    this.userOrThrow(friendId);

    const f = this.findFriendship(userId, friendId);
    if (!f || f.removed_at) throw new BadRequestException('You are not friends with this player.');

    f.removed_at = new Date().toISOString();

    // Hard delete, both directions — the pair's history goes with the friendship.
    let removed = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const between =
        (Number(m.from_user) === Number(userId) && Number(m.to_user) === Number(friendId)) ||
        (Number(m.from_user) === Number(friendId) && Number(m.to_user) === Number(userId));
      if (between) {
        messages.splice(i, 1);
        removed++;
      }
    }

    this.notify(friendId, userId, `You have been removed as friend by <b>${me.user_name}</b>.`);

    return { message: 'Friend removed.', messages_deleted: removed };
  }

  // ── messages ──────────────────────────────────────────────

  getConversation(userId: number, withUserId: number) {
    this.userOrThrow(userId);
    this.userOrThrow(withUserId);

    return messages
      .filter(
        (m) =>
          (Number(m.from_user) === Number(userId) && Number(m.to_user) === Number(withUserId)) ||
          (Number(m.from_user) === Number(withUserId) && Number(m.to_user) === Number(userId)),
      )
      // R-SOC-4: rows I have cleared are hidden from ME and nobody else.
      .filter((m) => !(m.deleted_for ?? []).some((d) => Number(d) === Number(userId)))
      .sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))
      .map((m) => ({
        ...m,
        // Only the two states we can actually prove.
        status: m.delivered_at ? 'delivered' : 'sent',
      }));
  }

  sendMessage(fromUser: number, toUser: number, body: string) {
    this.userOrThrow(fromUser);
    this.userOrThrow(toUser);

    if (!this.areFriends(fromUser, toUser)) {
      throw new ForbiddenException('You can only message your friends.');
    }
    const text = String(body ?? '').trim();
    if (!text) throw new BadRequestException('Message cannot be empty.');

    const row = {
      id: this.nextId(messages),
      from_user: Number(fromUser),
      to_user: Number(toUser),
      body: text,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      deleted_for: [] as number[],
    };
    messages.push(row);
    return { ...row, status: 'sent' };
  }

  /**
   * The recipient's client acknowledging receipt.
   *
   * Deliberately the RECIPIENT's call to make. If the sender marked its own
   * messages delivered, "delivered" would mean nothing more than "sent", which
   * is exactly the kind of status the doc says not to show.
   */
  markDelivered(userId: number, fromUser?: number) {
    this.userOrThrow(userId);
    const now = new Date().toISOString();
    let n = 0;
    for (const m of messages) {
      if (Number(m.to_user) !== Number(userId)) continue;
      if (fromUser != null && Number(m.from_user) !== Number(fromUser)) continue;
      if (m.delivered_at) continue;
      m.delivered_at = now;
      n++;
    }
    return { delivered: n };
  }

  /** Clear a conversation for ME only. The other person keeps their copy. */
  deleteConversation(userId: number, withUserId: number) {
    this.userOrThrow(userId);
    this.userOrThrow(withUserId);

    let n = 0;
    for (const m of messages) {
      const between =
        (Number(m.from_user) === Number(userId) && Number(m.to_user) === Number(withUserId)) ||
        (Number(m.from_user) === Number(withUserId) && Number(m.to_user) === Number(userId));
      if (!between) continue;
      if (!Array.isArray(m.deleted_for)) m.deleted_for = [];
      if (!m.deleted_for.some((d) => Number(d) === Number(userId))) {
        m.deleted_for.push(Number(userId));
        n++;
      }
    }
    return { message: 'Conversation cleared for you only.', hidden: n };
  }
}
