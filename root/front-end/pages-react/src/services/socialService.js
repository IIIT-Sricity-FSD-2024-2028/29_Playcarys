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
   * Send a friend request
   */
  async sendFriendRequest(fromUserId, toUserId) {
    try {
      return await api.post('/friends/request', {
        from_user: Number(fromUserId),
        to_user: Number(toUserId)
      });
    } catch (err) {
      console.warn('[socialService] Fallback local sendFriendRequest:', err);
      const db = getDatabase();
      if (!db.notifications) db.notifications = [];
      const fromUser = (db.users || []).find((u) => sameId(u.id || u.user_id, fromUserId));
      db.notifications.push({
        id: Date.now(),
        type: 'friend_request',
        fromUserId: Number(fromUserId),
        from: fromUser?.user_name || fromUser?.username || 'Player',
        toUser: Number(toUserId),
        msg: `${fromUser?.user_name || 'A player'} sent you a friend request.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      });
      saveDatabase(db);
      return { message: 'Friend request sent.' };
    }
  },
  /**
   * Fetch 1-on-1 conversation messages between two users
   */
  async getConversation(userId, friendId) {
    if (!userId || !friendId) return [];
    try {
      const data = await api.get(`/messages/${userId}/${friendId}`);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn('[socialService] Failed to fetch conversation from API, falling back to local store:', err);
    }

    // Local fallback
    const db = getDatabase();
    const msgs = (db?.messages || []).filter(
      (m) =>
        (sameId(m.from_user, userId) && sameId(m.to_user, friendId)) ||
        (sameId(m.from_user, friendId) && sameId(m.to_user, userId))
    );
    return msgs
      .filter((m) => !(m.deleted_for || []).some((d) => sameId(d, userId)))
      .sort((a, b) => new Date(a.sent_at || 0) - new Date(b.sent_at || 0))
      .map((m) => ({
        ...m,
        status: m.delivered_at ? 'delivered' : 'sent'
      }));
  },

  /**
   * Send a message to a friend
   */
  async sendMessage(fromUserId, toUserId, body) {
    const text = String(body || '').trim();
    if (!text) throw new Error('Message cannot be empty.');

    try {
      return await api.post('/messages', {
        from_user: Number(fromUserId),
        to_user: Number(toUserId),
        body: text
      });
    } catch (err) {
      console.warn('[socialService] Failed to post message via API, storing locally:', err);
      const db = getDatabase();
      if (!db.messages) db.messages = [];
      const newMsg = {
        id: Date.now(),
        from_user: Number(fromUserId),
        to_user: Number(toUserId),
        body: text,
        sent_at: new Date().toISOString(),
        delivered_at: null,
        status: 'sent',
        deleted_for: []
      };
      db.messages.push(newMsg);
      return newMsg;
    }
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
    try {
      return await api.delete(`/messages/${userId}/${friendId}`);
    } catch (err) {
      console.warn('[socialService] Fallback local delete conversation:', err);
      const db = getDatabase();
      (db?.messages || []).forEach((m) => {
        const isBetween =
          (sameId(m.from_user, userId) && sameId(m.to_user, friendId)) ||
          (sameId(m.from_user, friendId) && sameId(m.to_user, userId));
        if (isBetween) {
          if (!m.deleted_for) m.deleted_for = [];
          if (!m.deleted_for.some((d) => sameId(d, userId))) {
            m.deleted_for.push(Number(userId));
          }
        }
      });
      return { message: 'Conversation cleared for you.' };
    }
  },

  /**
   * Remove friend
   */
  async removeFriend(userId, friendId) {
    let apiResult = null;
    try {
      apiResult = await api.delete(`/friends/${userId}/${friendId}`);
    } catch (err) {
      console.warn('[socialService] Fallback local remove friend:', err);
    }

    // Always update local database and persist so UI reflects removal immediately
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
