import api from './api';
import { getDatabase, saveDatabase, sameId, getTierFromPoints } from './playerService';

export const socialService = {
  /**
   * Search players by substring match with relationship and stats
   */
  async searchPlayers(query, viewerId) {
    const term = String(query || '').trim();
    if (term.length < 2) return [];

    try {
      const data = await api.get(`/players/search?q=${encodeURIComponent(term)}&viewerId=${viewerId}`);
      if (Array.isArray(data)) return data;
    } catch (err) {
      console.warn('[socialService] Failed to search players via API, using local DB:', err);
    }

    // Local DB fallback
    const db = getDatabase();
    const allUsers = (db?.users || []).filter(
      (u) =>
        (u.role === 'player' || !u.role || u.role_id === 4) &&
        !sameId(u.id || u.user_id, viewerId) &&
        (u.user_name || u.username || '').toLowerCase().includes(term.toLowerCase())
    );

    return allUsers.map((u) => {
      const uid = u.id || u.user_id;
      const uName = u.user_name || u.username || 'Player';
      const isFriend = (db?.friendships || []).some(
        (f) =>
          ((sameId(f.user_a, viewerId) && sameId(f.user_b, uid)) ||
           (sameId(f.user_a, uid) && sameId(f.user_b, viewerId))) &&
          !f.removed_at
      );

      const hasSent = (db?.notifications || []).some(
        (n) => n.type === 'friend_request' && sameId(n.fromUserId, viewerId) && sameId(n.toUser, uid) && !n.read
      );

      const hasReceived = (db?.notifications || []).some(
        (n) => n.type === 'friend_request' && sameId(n.fromUserId, uid) && sameId(n.toUser, viewerId) && !n.read
      );

      const relationship = isFriend ? 'friends' : hasSent ? 'sent' : hasReceived ? 'received' : 'none';

      const liveMatch = (db?.matches || []).find(
        (m) =>
          m.status === 'in-progress' &&
          ((m.participants || []).some((p) => sameId(p, uid)) || sameId(m.created_by, uid))
      );

      return {
        user_id: uid,
        id: uid,
        user_name: uName,
        username: uName,
        avatar: u.avatar || uName.slice(0, 2).toUpperCase(),
        matches: u.matches || 0,
        wins: u.wins || 0,
        win_rate: u.matches > 0 ? Math.round(((u.wins || 0) / u.matches) * 100) : 0,
        presence: liveMatch
          ? { state: 'playing', game: liveMatch.game_name || 'Chess Pro', match_id: liveMatch.id }
          : { state: 'online', game: null },
        relationship
      };
    });
  },

  /**
   * Send a friend request. Throws if the server refuses (already friends,
   * cooldown after a rejection ...) — the caller shows the reason. There is no
   * local fallback: a request stored only in this browser reaches nobody.
   */
  async sendFriendRequest(fromUserId, toUserId) {
    return api.post('/friends/request', {
      from_user: Number(fromUserId),
      to_user: Number(toUserId)
    });
  },

  /** Accounts the player is friends with, from the server (presence, unread, last message). */
  async listFriends(userId) {
    const rows = await api.get(`/friends/${userId}`);
    return (Array.isArray(rows) ? rows : []).map((f) => {
      const p = f.presence || {};
      const playing = p.state === 'playing';
      return {
        id: f.user_id,
        user_id: f.user_id,
        name: f.user_name,
        username: f.user_name,
        avatar: f.avatar || String(f.user_name || '?').slice(0, 2).toUpperCase(),
        presence: playing
          ? { label: `Playing ${p.game || ''}`.trim(), color: '#00d4ff', state: 'playing' }
          : { label: 'Offline', color: '#72809b', state: 'offline' },
        unread: f.unread || 0,
        lastMessage: f.last_message || null
      };
    });
  },

  /** Pending friend requests in both directions. */
  async listRequests(userId) {
    const data = await api.get(`/friends/${userId}/requests`);
    return { incoming: data?.incoming || [], outgoing: data?.outgoing || [] };
  },

  /** Answer a friend request: action is 'accept' or 'reject'. */
  async respondToRequest(requestId, userId, action) {
    return api.post(`/friends/requests/${requestId}/respond`, {
      user_id: Number(userId),
      action
    });
  },

  /**
   * Fetch 1-on-1 conversation messages between two users
   */
  async getConversation(userId, friendId) {
    if (!userId || !friendId) return [];
    // Errors propagate: showing a stale local copy as if it were the
    // conversation hid the fact that the server could not be reached.
    const data = await api.get(`/messages/${userId}/${friendId}`);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Send a message to a friend
   */
  async sendMessage(fromUserId, toUserId, body) {
    const text = String(body || '').trim();
    if (!text) throw new Error('Message cannot be empty.');

    // No local fallback. The old one stored the message in this browser and
    // returned it as if it had been sent, so the sender saw a delivered-looking
    // message that the recipient could never receive.
    return api.post('/messages', {
      from_user: Number(fromUserId),
      to_user: Number(toUserId),
      body: text
    });
  },

  /**
   * Acknowledge messages received
   */
  async markDelivered(userId, fromUserId) {
    try {
      return await api.post('/messages/delivered', {
        user_id: Number(userId),
        from_user: Number(fromUserId)
      });
    } catch (err) {
      // Not fatal
    }
  },

  /**
   * Clear conversation for current user
   */
  async deleteConversation(userId, friendId) {
    return api.delete(`/messages/${userId}/${friendId}`);
  },

  /**
   * Remove friend
   */
  async removeFriend(userId, friendId) {
    // Throws if the server refuses. The old version swallowed that and edited
    // the local copy anyway, so the UI said "removed" while the server still
    // had the two as friends (and kept delivering messages between them).
    const apiResult = await api.delete(`/friends/${userId}/${friendId}`);

    // The server agreed: bring the local cache in line so nothing else shows a stale friend
    const db = getDatabase();
    if (db && Array.isArray(db.friendships)) {
      const f = db.friendships.find(
        (row) =>
          (sameId(row.user_a, userId) && sameId(row.user_b, friendId)) ||
          (sameId(row.user_a, friendId) && sameId(row.user_b, userId))
      );
      if (f) {
        f.removed_at = new Date().toISOString();
      }
    }

    // Delete conversation for both sides
    if (db && Array.isArray(db.messages)) {
      db.messages = db.messages.filter(
        (m) =>
          !(
            (sameId(m.from_user, userId) && sameId(m.to_user, friendId)) ||
            (sameId(m.from_user, friendId) && sameId(m.to_user, userId))
          )
      );
    }

    saveDatabase(db);
    return apiResult || { message: 'Friend removed.' };
  },

  /**
   * Compile full user profile stats for UserProfileModal
   */
  getUserFullProfile(identifier) {
    if (!identifier) return null;
    const db = getDatabase();
    const isId = typeof identifier === 'number' || !isNaN(Number(identifier));

    const user = (db?.users || []).find((u) =>
      isId
        ? sameId(u.id || u.user_id, identifier)
        : (u.username || u.user_name || '').toLowerCase() === String(identifier).toLowerCase()
    );

    if (!user) return null;

    const uid = user.id || user.user_id;
    const name = user.username || user.user_name || 'Player';
    const prof = (db?.player_profiles || []).find((p) => sameId(p.user_id, uid));
    const pcp = prof?.carys_points || 0;
    const tierInfo = getTierFromPoints(pcp);

    const myResults = (db?.match_results || []).filter((r) => sameId(r.player_id, uid));
    const matches = new Set(myResults.map((r) => String(r.session_id))).size || user.matches || 0;
    const wins = myResults.filter((r) => r.result === 'win').length || user.wins || 0;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

    // Presence calculation
    const liveMatch = (db?.matches || []).find(
      (m) =>
        m.status === 'in-progress' &&
        ((m.participants || []).some((p) => sameId(p, uid)) || sameId(m.created_by, uid))
    );

    const presence = liveMatch
      ? { label: 'Playing', color: 'var(--accent-cyan, #00d4ff)', canSpectate: true, session: liveMatch }
      : { label: 'Online', color: '#10b981', canSpectate: false, session: null };

    return {
      id: uid,
      user_id: uid,
      username: name,
      user_name: name,
      avatar: user.avatar || name.slice(0, 2).toUpperCase(),
      role: (user.role || 'PLAYER').toUpperCase(),
      bio: prof?.bio || 'A mysterious contender in the PlayCarys arena.',
      pcp,
      tierInfo,
      matches,
      wins,
      winRate,
      presence
    };
  }
};

export default socialService;
