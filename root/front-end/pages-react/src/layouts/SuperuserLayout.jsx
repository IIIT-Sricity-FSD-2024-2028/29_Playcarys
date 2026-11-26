import React, { useContext, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import SuperuserNavbar from '../components/superuser/common/SuperuserNavbar';
import AuthContext from '../context/AuthContext';
import LoadingState from '../components/common/LoadingState';
import useIdleLogout from '../hooks/useIdleLogout';

export function SuperuserLayout() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  useIdleLogout();

  const allowed = !!user && user.role === 'superuser';

  useEffect(() => {
    if (!loading && !allowed) {
      navigate('/');
    }
  }, [loading, allowed, navigate]);

  let activePage = 'dashboard';
  if (location.pathname.includes('/superuser/hub')) {
    activePage = 'hub';
  } else if (location.pathname.includes('/superuser/users')) {
    activePage = 'users';
  } else if (location.pathname.includes('/superuser/admins')) {
    activePage = 'admins';
  } else if (location.pathname.includes('/superuser/games')) {
    activePage = 'games';
  } else if (location.pathname.includes('/superuser/reports')) {
    activePage = 'reports';
  } else if (location.pathname.includes('/superuser/settings')) {
    activePage = 'settings';
  }

  if (loading || !allowed) {
    return <LoadingState message="Verifying superuser credentials..." minHeight="60vh" />;
  }

  return (
    <div className="dash-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SuperuserNavbar activePage={activePage} />
      <main className="page-wrapper" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default SuperuserLayout;
