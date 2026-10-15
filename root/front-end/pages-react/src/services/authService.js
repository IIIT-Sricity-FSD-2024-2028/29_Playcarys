import api from './api';

// Authentication service compatible with legacy Auth contracts

const SESSION_KEY = 'playcarys_session';
const API_TOKEN_KEY = 'playcarys_api_token';

// TEMPORARY DEVELOPMENT IDENTITY:
// Authentication integration is pending.
// Resolve the existing Dragon Slayer player from the backend.
// Replace this fallback with the authenticated user from AuthContext
// when the authentication pages and session flow are integrated.
// Do not hardcode player data or bypass backend authorization.
export const ENABLE_TEMP_DEV_IDENTITY = true;
export const DRAGON_SLAYER_ID = 7;

export const authService = {
  SESSION_KEY,
  API_TOKEN_KEY,
  ENABLE_TEMP_DEV_IDENTITY,
  DRAGON_SLAYER_ID,

  hasAuthenticatedSession() {
    try {
      const token = sessionStorage.getItem(API_TOKEN_KEY) || localStorage.getItem(API_TOKEN_KEY);
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (token && raw) {
        const parsed = JSON.parse(raw);
        if (parsed && !parsed.isDevFallback) return true;
      }
    } catch (e) {}
    return false;
  },

  async resolveDragonSlayerIdentity() {
    if (!ENABLE_TEMP_DEV_IDENTITY) return null;
    try {
      const [userRes, profRes] = await Promise.all([
        api.get(`/users/${DRAGON_SLAYER_ID}`),
        api.get(`/player-profiles/${DRAGON_SLAYER_ID}`).catch(() => null)
      ]);

      if (!userRes || (!userRes.user_id && !userRes.id)) {
        throw new Error(`Development Identity Error: Dragon Slayer (ID ${DRAGON_SLAYER_ID}) does not exist in backend.`);
      }

      const uName = userRes.user_name || userRes.username;
      const devPlayerSession = {
        id: DRAGON_SLAYER_ID,
        user_id: DRAGON_SLAYER_ID,
        userId: DRAGON_SLAYER_ID,
        username: uName || 'DragonSlayer',
        user_name: uName || 'DragonSlayer',
        role: 'player',
        role_id: userRes.role_id || 4,
        role_name: 'player',
        email: userRes.email || 'dragon@example.com',
        avatar: userRes.avatar || 'DS',
        status: userRes.status || 'active',
        carys_points: profRes?.carys_points ?? 0,
        matches_won: profRes?.matches_won ?? 0,
        play_time: profRes?.play_time ?? 0,
        sessionToken: null,
        isDevFallback: true
      };

      this.setSession(devPlayerSession);
      return devPlayerSession;
    } catch (err) {
      console.error('[authService] Failed to resolve Dragon Slayer identity:', err);
      throw err;
    }
  },

  getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse session from storage', e);
    }

    // In development mode, provide default publisher session if not signed in yet
    // Defaulting to user 6 (IndieDevStudios) who owns Hill Climbing (game 8)
    if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      if (window.location.pathname.startsWith('/player')) {
        const devPlayerSession = {
          userId: DRAGON_SLAYER_ID,
          id: DRAGON_SLAYER_ID,
          user_id: DRAGON_SLAYER_ID,
          role: 'player',
          username: 'DragonSlayer',
          user_name: 'DragonSlayer',
          avatar: 'DS',
          sessionToken: null,
          isDevFallback: true
        };
        this.setSession(devPlayerSession);
        return devPlayerSession;
      }
      const devSession = {
        userId: 6,
        id: 6,
        user_id: 6,
        role: 'publisher',
        username: 'IndieDevStudios',
        avatar: 'ID',
        sessionToken: null
      };
      this.setSession(devSession);
      return devSession;
    }

    return null;
  },

  setSession(session, token = null) {
    try {
      const raw = JSON.stringify(session);
      sessionStorage.setItem(SESSION_KEY, raw);
      localStorage.setItem(SESSION_KEY, raw);
      if (token) {
        sessionStorage.setItem(API_TOKEN_KEY, token);
        localStorage.setItem(API_TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to save session to storage', e);
    }
  },

  getApiToken() {
    try {
      return sessionStorage.getItem(API_TOKEN_KEY) || localStorage.getItem(API_TOKEN_KEY) || null;
    } catch (e) {
      return null;
    }
  },

  requireAuth(allowedRoles = []) {
    const session = this.getSession();
    if (!session) {
      return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      return null;
    }
    return session;
  },

  logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(API_TOKEN_KEY);
      localStorage.removeItem(API_TOKEN_KEY);
    } catch (e) {
      // ignore storage errors
    }
    window.location.href = '/index.html';
  }
};

export default authService;
