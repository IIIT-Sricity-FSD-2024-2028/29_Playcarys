/*
 * Concepts used in this component:
 *  - Components, Router (Outlet + useNavigate), Context (AuthContext + AdminProvider),
 *    State (database ready?), Hooks (useState, useEffect, useContext), API calls (the heartbeat),
 *    Callbacks (what to do if the account is taken by another device)
 *
 * Wraps the staff pages (/staff/*): checks the user is a signed-in staff account (admin, superuser,
 * moderator or publisher, the old Auth.requireAuth), waits for the old DB to load, tells the server
 * every 5 seconds that this person is still here, then shows the navbar of THEIR role, the page, and
 * the toasts. The navbar is the one each role already has: AdminNavbar for admins, PublisherNavbar
 * for publishers, StaffNavbar for moderators and superusers.
 */
import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { AdminProvider } from '../context/AdminContext';
import AdminNavbar from '../components/admin/common/AdminNavbar';
import PublisherNavbar from '../components/publisher/common/PublisherNavbar';
import StaffNavbar from '../components/staff/common/StaffNavbar';
import AdminToastContainer from '../components/admin/common/AdminToastContainer';
import LoadingState from '../components/common/LoadingState';
import { waitForDb, installAuthShim } from '../services/adminService';
import { sendHeartbeat } from '../services/adminLiveService';
// The shared stylesheet is imported first so it comes BEFORE the staff CSS below, as in the old
// pages (<link> first, page <style> after). Page rules then win ties, like before.
import '../styles/global.css';
import '../styles/staff/inbox.css';

const ALLOWED_ROLES = ['admin', 'superuser', 'moderator', 'publisher'];

export function StaffLayout() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dbState, setDbState] = useState('loading');

  const allowed = !!user && ALLOWED_ROLES.includes(user.role);

  // Not signed in as staff: back to the landing page.
  useEffect(() => {
    if (!loading && !allowed) {
      navigate('/');
    }
  }, [loading, allowed]);

  useEffect(() => {
    installAuthShim();
    waitForDb().then((ok) => setDbState(ok ? 'ready' : 'failed'));
  }, []);

  // Every 5 seconds, tell the server this account is still here. If it was taken by another
  // device, sign this tab out and say why on the landing page.
  useEffect(() => {
    if (!allowed || dbState !== 'ready') return undefined;
    function beat() {
      sendHeartbeat(user, () => {
        try {
          sessionStorage.setItem('pc_logout_reason', 'Your account was signed in on another device.');
        } catch (e) {
          // storage blocked: the landing page just will not show the reason
        }
        logout();
      });
    }
    beat();
    const timer = setInterval(beat, 5000);
    return () => clearInterval(timer);
  }, [allowed, dbState, user]);

  if (loading || !allowed) {
    return <LoadingState message="Checking your account..." minHeight="60vh" />;
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

  let navbar = <StaffNavbar activePage="inbox" />;
  if (user.role === 'admin') {
    navbar = <AdminNavbar activePage="inbox" />;
  } else if (user.role === 'publisher') {
    navbar = <PublisherNavbar activePage="inbox" />;
  }

  return (
    <AdminProvider>
      {/* staff-root only carries the CSS scope for the staff pages; it adds no box of its own */}
      <div className="staff-root" style={{ display: 'contents' }}>
        {navbar}
        <Outlet />
        <AdminToastContainer />
      </div>
    </AdminProvider>
  );
}

export default StaffLayout;
