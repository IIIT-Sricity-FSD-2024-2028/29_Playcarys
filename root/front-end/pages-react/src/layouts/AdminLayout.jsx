/*
 * Concepts used in this component:
 *  - Components, Router (Outlet + useLocation), Context (AuthContext + AdminProvider),
 *    State (database ready?), Hooks (useState, useEffect, useContext), API calls (the heartbeat),
 *    Callbacks (what to do if the account is taken by another device)
 *
 * Wraps every /admin/* page: checks the user is an admin or superuser (the old
 * Auth.requireAuth(['admin','superuser'])), waits for the old DB to load, tells the server every
 * 5 seconds that this admin is still here, then shows the navbar, the page, the toasts and the
 * confirm dialog.
 */
import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { AdminProvider } from '../context/AdminContext';
import AdminNavbar from '../components/admin/common/AdminNavbar';
import AdminToastContainer from '../components/admin/common/AdminToastContainer';
import AdminConfirmModal from '../components/admin/common/AdminConfirmModal';
import LoadingState from '../components/common/LoadingState';
import { waitForDb, installAuthShim } from '../services/adminService';
import { sendHeartbeat } from '../services/adminLiveService';
// The shared stylesheet is imported here first so it comes BEFORE the admin CSS below, as in
// the old pages (<link> first, page <style> after). Page rules then win ties, like before.
import '../styles/global.css';
import '../styles/admin/admin-overlay.css';

export function AdminLayout() {
  const { user, loading, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [dbState, setDbState] = useState('loading');

  const allowed = !!user && (user.role === 'admin' || user.role === 'superuser');

  // Not signed in as admin/superuser: back to the login page, like the old pages.
  useEffect(() => {
    if (!loading && !allowed) {
      navigate('/');
    }
  }, [loading, allowed]);

  useEffect(() => {
    installAuthShim();
    waitForDb().then((ok) => setDbState(ok ? 'ready' : 'failed'));
  }, []);

  // Every 5 seconds, tell the server this admin is still here. If the account was taken by another
  // device, sign this tab out and say why on the login page (the old Presence heartbeat).
  useEffect(() => {
    if (!allowed || dbState !== 'ready') return undefined;
    function beat() {
      sendHeartbeat(user, () => {
        try {
          sessionStorage.setItem('pc_logout_reason', 'Your account was signed in on another device.');
        } catch (e) {
          // storage blocked: the login page just will not show the reason
        }
        logout();
      });
    }
    beat();
    const timer = setInterval(beat, 5000);
    return () => clearInterval(timer);
  }, [allowed, dbState, user]);

  // Which navbar link is lit. Game Review belongs to Approvals.
  let activePage = 'dashboard';
  if (location.pathname.includes('/admin/hub')) {
    activePage = 'hub';
  } else if (location.pathname.includes('/admin/users')) {
    activePage = 'users';
  } else if (
    location.pathname.includes('/admin/approvals') ||
    location.pathname.includes('/admin/game-review')
  ) {
    activePage = 'approvals';
  } else if (location.pathname.includes('/admin/settings')) {
    activePage = 'settings';
  }

  if (loading || !allowed) {
    return <LoadingState message="Checking admin credentials..." minHeight="60vh" />;
  }

  if (dbState === 'loading') {
    return <LoadingState message="Loading platform data..." minHeight="60vh" />;
  }

  if (dbState === 'failed') {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <h2>Could not load platform data</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            The data script (/data/db.js) did not load. Check that the front-end server is running.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider>
      {/* admin-root only carries the CSS scope for the admin dialogs; it adds no box of its own */}
      <div className="admin-root" style={{ display: 'contents' }}>
        <div className="dash-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <AdminNavbar activePage={activePage} />
          <main className="page-wrapper" style={{ flex: 1 }}>
            <Outlet />
          </main>
        </div>
        <AdminToastContainer />
        <AdminConfirmModal />
      </div>
    </AdminProvider>
  );
}

export default AdminLayout;
