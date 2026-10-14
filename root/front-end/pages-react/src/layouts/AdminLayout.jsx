import React from 'react';
import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="dash-shell">
      <main className="page-wrapper">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
