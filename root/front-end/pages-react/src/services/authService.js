// Authentication service compatible with legacy Auth contracts

const SESSION_KEY = 'playcarys_session';
const API_TOKEN_KEY = 'playcarys_api_token';

export const authService = {
  SESSION_KEY,
  API_TOKEN_KEY,

  getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse session from storage', e);
    }

    // In development mode, provide default session if not signed in yet
    // (Only on the publisher and player pages. The landing page and the admin pages need a real
    // login, never a made-up publisher.)
    if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV &&
      (window.location.pathname.startsWith('/publisher') || window.location.pathname.startsWith('/player'))) {
      if (window.location.pathname.startsWith('/player')) {
        const devPlayerSession = {
          userId: 7,
          role: 'player',
          username: 'DragonSlayer',
          avatar: 'DS',
          sessionToken: null
        };
        this.setSession(devPlayerSession);
        return devPlayerSession;
      }
      const devSession = {
        userId: 6,
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
    // Full reload (not a router jump) so every timer and page state of the signed-in user is dropped.
    window.location.href = '/';
  }
};

export default authService;
