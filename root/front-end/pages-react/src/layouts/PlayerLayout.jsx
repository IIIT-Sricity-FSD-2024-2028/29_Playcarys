import React from 'react';
import { Outlet } from 'react-router-dom';

export function PlayerLayout() {
  return (
    <div className="dash-shell">
      <main className="page-wrapper">
        <Outlet />
      </main>
    </div>
  );
}

export default PlayerLayout;
