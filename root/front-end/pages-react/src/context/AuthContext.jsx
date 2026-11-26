import React, { createContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  initSession,
  logoutUser,
  establishSession
} from '../features/auth/authSlice';
import {
  selectAuthUser,
  selectAuthStatus,
  selectDevIdentityError
} from '../features/auth/selectors';

export const AuthContext = createContext({
  user: null,
  loading: true,
  devIdentityError: null,
  login: () => {},
  logout: () => {},
  refreshIdentity: () => {}
});

export function AuthProvider(props) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const status = useAppSelector(selectAuthStatus);
  const devIdentityError = useAppSelector(selectDevIdentityError);
  const loading = (status === 'loading' || status === 'idle') && !user;

  useEffect(() => {
    dispatch(initSession());
  }, [dispatch, location?.pathname]);

  // Sync-looking for callers (LoginPanel / Landing don't await it): the session is
  // written to storage by the slice, and Redux is updated in the same step.
  function handleLogin(sessionData, token) {
    return dispatch(establishSession({ session: sessionData, token }));
  }

  async function handleLogout() {
    await dispatch(logoutUser());
    navigate('/');
  }

  function handleRefreshIdentity() {
    dispatch(initSession());
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        devIdentityError,
        login: handleLogin,
        logout: handleLogout,
        refreshIdentity: handleRefreshIdentity
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
