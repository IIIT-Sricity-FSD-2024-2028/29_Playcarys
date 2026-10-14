import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {}
});

export function AuthProvider(props) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = authService.getSession();
    setUser(session);
    setLoading(false);
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
        login: handleLogin,
        logout: handleLogout
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
