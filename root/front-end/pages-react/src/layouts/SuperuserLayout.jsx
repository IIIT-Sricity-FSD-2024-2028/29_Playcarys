import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SuperuserNavbar from '../components/superuser/common/SuperuserNavbar';

export function SuperuserLayout() {
  const location = useLocation();

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
