// Authentication service compatible with legacy Auth contracts and backend tokens
import { getDevelopmentIdentity } from '../config/developmentIdentity.js';

const SESSION_KEY = 'playcarys_session';
const API_TOKEN_KEY = 'playcarys_api_token';

/*
 * ============================================================
 * TEMPORARY DEVELOPMENT IDENTITY — AUTHENTICATION NOT CONNECTED.
 *
 * This identity is selected from an existing backend user solely to allow
 * Superuser pages to be developed and tested before real authentication
 * is integrated.
 *
 * Selected backend user ID: 0
 * Selected backend username: GodMode
 * Selected backend role: superuser (role_id: 1)
 *
 * FUTURE AUTHENTICATION INTEGRATION:
 * Remove this temporary identity selection and obtain the authenticated
 * user from the real authentication/session/token mechanism.
 *
 * Do not treat this temporary identity as proof of authentication.
 * Do not use it as a security boundary.
 * ============================================================
 *
 * TEMPORARY DEVELOPMENT IDENTITY — AUTHENTICATION NOT CONNECTED.
 *
 * This identity is selected from an existing backend user solely to allow
 * Moderator pages to be developed and tested before real authentication
 * is integrated.
 *
 * Selected backend user ID: 3
 * Selected backend username: ModeratorOne
 * Selected backend role: moderator (role_id: 3)
 *
 * FUTURE AUTHENTICATION INTEGRATION:
 * Remove this temporary identity selection and obtain the authenticated
 * user from the real authentication/session/token mechanism.
 *
 * Do not treat this temporary identity as proof of authentication.
 * Do not use it as a security boundary.
 * ============================================================
 */

export const authService = {
  SESSION_KEY,
  API_TOKEN_KEY,

  getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        const isDevSession =
          session &&
          (session.isDev ||
            (!session.sessionToken && (session.username === 'IndieDevStudios' || session.username === 'GodMode')));

        // If this is a genuine user session (not a dev default), return it
        if (!isDevSession && session && session.role) {
          return session;
        }

        // If it's a dev session and we are in dev mode, provide the appropriate dev session for the route
        if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
          const path = window.location.pathname;
          if (path.startsWith('/superuser')) {
            if (session && (session.role === 'superuser' || session.role === 'admin') && session.username === 'GodMode') {
              return session;
            }
            return this.getDevSession('superuser');
          } else if (path.startsWith('/moderator')) {
            if (session && session.role === 'moderator' && session.username === 'ModeratorOne') {
              return session;
            }
            return this.getDevSession('moderator');
          } else if (path.startsWith('/publisher')) {
            if (session && session.role === 'publisher' && session.username === 'IndieDevStudios') {
              return session;
            }
            return this.getDevSession('publisher');
          }
        }

        return session;
      }
    } catch (e) {
      console.warn('Failed to parse session from storage', e);
    }

    // In development mode, provide default session if not signed in yet
    if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/superuser')) {
        return this.getDevSession('superuser');
      } else if (path.startsWith('/moderator')) {
        return this.getDevSession('moderator');
      }
      return this.getDevSession('publisher');
    }

    return null;
  },

  getDevSession(role) {
    const devIdentity = getDevelopmentIdentity(role);
    if (devIdentity) {
      const devSession = {
        userId: devIdentity.userId,
        user_id: devIdentity.user_id,
        id: devIdentity.id,
        role: devIdentity.role,
        role_id: devIdentity.role_id,
        role_name: devIdentity.role_name,
        username: devIdentity.username,
        user_name: devIdentity.user_name,
        email: devIdentity.email,
        avatar: devIdentity.avatar,
        sessionToken: devIdentity.sessionToken,
        isDev: true
      };
      this.setSession(devSession, devIdentity.apiToken);
      return devSession;
    }

    // Publisher default fallback for other parts of the application
    const publisherSession = {
      userId: 6,
      user_id: 6,
      id: '6',
      role: 'publisher',
      role_id: 5,
      username: 'IndieDevStudios',
      avatar: 'ID',
      sessionToken: null,
      isDev: true
    };
    this.setSession(publisherSession);
    return publisherSession;
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
