import React, { useContext, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ModeratorNavbar from '../components/moderator/common/ModeratorNavbar';
import AuthContext from '../context/AuthContext';
import LoadingState from '../components/common/LoadingState';
import useIdleLogout from '../hooks/useIdleLogout';

const ALLOWED_ROLES = ['moderator', 'admin', 'superuser'];

export function ModeratorLayout() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  useIdleLogout();

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (!loading && !allowed) {
      navigate('/');
    }
  }, [loading, allowed, navigate]);

  let activePage = 'dashboard';
  if (location.pathname.includes('/moderator/bans')) {
    activePage = 'bans';
  } else if (location.pathname.includes('/moderator/sessions')) {
    activePage = 'sessions';
  } else if (location.pathname.includes('/moderator/reports')) {
    activePage = 'reports';
  } else if (location.pathname.includes('/moderator/dashboard')) {
    activePage = 'dashboard';
  }

  if (loading || !allowed) {
    return <LoadingState message="Verifying moderator authorization..." minHeight="60vh" />;
  }

  return (
    <div className="dash-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ModeratorNavbar activePage={activePage} />
      <main className="page-wrapper" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default ModeratorLayout;
