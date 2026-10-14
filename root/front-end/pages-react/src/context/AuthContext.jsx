import React, { createContext, useState, useEffect } from 'react';
import authService, { ENABLE_TEMP_DEV_IDENTITY } from '../services/authService';

// TEMPORARY DEVELOPMENT IDENTITY:
// Authentication integration is pending.
// Resolve the existing Dragon Slayer player from the backend.
// Replace this fallback with the authenticated user from AuthContext
// when the authentication pages and session flow are integrated.
// Do not hardcode player data or bypass backend authorization.

export const AuthContext = createContext({
  user: null,
  loading: true,
  devIdentityError: null,
  login: () => {},
  logout: () => {},
  refreshIdentity: () => {}
});

export function AuthProvider(props) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devIdentityError, setDevIdentityError] = useState(null);

  async function initIdentity() {
    try {
      setLoading(true);
      setDevIdentityError(null);

      // If a real authenticated session with a token exists, respect it!
      if (authService.hasAuthenticatedSession()) {
        const sess = authService.getSession();
        setUser(sess);
        return;
      }

      // If we are in development mode and on a player route (or unauthenticated)
      if (ENABLE_TEMP_DEV_IDENTITY) {
        const isPlayerRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/player');
        const existingSession = authService.getSession();

        if (existingSession && existingSession.role === 'player' && Number(existingSession.userId || existingSession.id) === 7) {
          // If we already have DragonSlayer in session, verify & refresh from backend
          try {
            const fresh = await authService.resolveDragonSlayerIdentity();
            setUser(fresh);
            return;
          } catch (e) {
            setDevIdentityError(e.message || 'Dragon Slayer profile does not exist in backend.');
            setUser(existingSession);
            return;
          }
        }

        if (isPlayerRoute || !existingSession || existingSession.role === 'player') {
          try {
            const resolved = await authService.resolveDragonSlayerIdentity();
            setUser(resolved);
          } catch (err) {
            setDevIdentityError(err.message || 'Dragon Slayer profile does not exist in backend.');
            setUser(null);
          }
          return;
        }

        // Publisher or other role session
        setUser(existingSession);
      } else {
        const sess = authService.getSession();
        setUser(sess);
      }
    } catch (err) {
      console.warn('Failed to initialize user session:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initIdentity();
  }, []);

  function handleLogin(sessionData, token) {
    authService.setSession(sessionData, token);
    setUser(sessionData);
  }

  function handleLogout() {
    authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user: user,
        loading: loading,
        devIdentityError,
        login: handleLogin,
        logout: handleLogout,
        refreshIdentity: initIdentity
      }}
    >
      {devIdentityError && (
        <div style={{
          background: '#ef4444',
          color: '#ffffff',
          padding: '0.75rem 1rem',
          textAlign: 'center',
          fontWeight: 700,
          position: 'sticky',
          top: 0,
          zIndex: 100000
        }}>
          ⚠️ Development Identity Error: {devIdentityError}
        </div>
      )}
      {props.children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
