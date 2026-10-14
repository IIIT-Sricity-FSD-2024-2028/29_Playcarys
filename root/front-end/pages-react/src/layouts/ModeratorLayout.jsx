import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ModeratorNavbar from '../components/moderator/common/ModeratorNavbar';

export function ModeratorLayout() {
  const location = useLocation();

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
