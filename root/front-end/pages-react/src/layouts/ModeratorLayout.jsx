import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ModeratorNavbar from '../components/moderator/common/ModeratorNavbar';
import '../styles/moderator/moderator.css';

export function ModeratorLayout() {
  const location = useLocation();

  let activePage = 'dashboard';
  if (location.pathname.includes('/moderator/reports')) {
    activePage = 'reports';
  } else if (location.pathname.includes('/moderator/bans')) {
    activePage = 'bans';
  } else if (location.pathname.includes('/moderator/sessions')) {
    activePage = 'sessions';
  }

  return (
    <div>
      <ModeratorNavbar activePage={activePage} />
      <div className="page-wrapper">
        <Outlet />
      </div>
    </div>
  );
}

export default ModeratorLayout;
