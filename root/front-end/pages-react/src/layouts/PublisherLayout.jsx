import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublisherNavbar from '../components/publisher/common/PublisherNavbar';

export function PublisherLayout() {
  const location = useLocation();

  // Determine active page from current path
  let activePage = 'dashboard';
  if (location.pathname.includes('/publisher/mygames')) {
    activePage = 'mygames';
  } else if (location.pathname.includes('/publisher/earnings')) {
    activePage = 'earnings';
  } else if (location.pathname.includes('/publisher/profile')) {
    activePage = 'profile';
  } else if (location.pathname.includes('/publisher/publish-tournament')) {
    activePage = 'publish-tournament';
  } else if (location.pathname.includes('/publisher/publish')) {
    activePage = 'publish';
  }

  return (
    <div className="dash-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublisherNavbar activePage={activePage} />
      <main className="page-wrapper" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default PublisherLayout;
