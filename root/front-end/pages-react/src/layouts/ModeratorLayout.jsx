import React from 'react';
import { Outlet } from 'react-router-dom';

export function ModeratorLayout() {
  return (
    <div className="dash-shell">
      <main className="page-wrapper">
        <Outlet />
      </main>
    </div>
  );
}

export default ModeratorLayout;
