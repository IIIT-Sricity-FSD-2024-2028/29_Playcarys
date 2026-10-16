/*
 * Concepts used in this component:
 *  - Components, Props (activePage), State (drawer open/closed, a counter that redraws the badge),
 *    Events (clicks), Lists (nav links), Hooks (useState, useEffect, useContext), Context
 *    (AuthContext for the user, AdminContext so it redraws when DB changes),
 *    Router (useAdminNav wraps useNavigate), API calls (the live poll), Callbacks (onChanged is
 *    handed to the drawer so reading a message updates the badge)
 *
 * Same markup as the navbar built by buildNavbar('admin', page) in js/utils.js, including the red
 * unread count on ☰. Every few seconds it asks the server for new data, so a new message shows up
 * without refreshing. Which links open a React page is decided in adminPages.js.
 */
import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../../context/AuthContext';
import AdminContext from '../../../context/AdminContext';
import AdminDrawer from './AdminDrawer';
import { ADMIN_PAGES, NAV_IDS, useAdminNav } from './adminPages';
import { unreadNotifications } from '../../../services/adminNotifService';
import { pullServerState, releaseSession } from '../../../services/adminLiveService';

const ROLE_BADGE = { superuser: 'SUPERUSER', admin: 'ADMIN' };

export function AdminNavbar(props) {
  const { activePage = 'dashboard' } = props;
  const { user, logout } = useContext(AuthContext);
  const { refresh } = useContext(AdminContext); // also redraws this component when refresh() is called
  const go = useAdminNav();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setTick] = useState(0); // bumping it redraws the navbar and the drawer from DB
  const [countUpdated, setCountUpdated] = useState(false);

  // Something changed in DB (a message was read, or new data arrived): recount, and redraw the page
  // too. The server sync swaps in fresh rows, so a page that is not redrawn would keep acting on
  // old row objects (a click would change nothing) and would not show what other admins changed.
  function handleChanged() {
    setTick((t) => t + 1);
    setCountUpdated(true);
    refresh();
  }

  // Ask the server for news every 5 seconds while this tab is visible (the old PlayCarysLive poll).
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      if (await pullServerState()) handleChanged();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Hand the account back to the server, then sign out.
  function handleLogout() {
    releaseSession(user);
    logout();
  }

  const unread = unreadNotifications(user.userId, user.role).length;

  // One entry per navbar link: { id, label, icon }
  const links = NAV_IDS.map((id) => ({ id: id, label: ADMIN_PAGES[id].label, icon: ADMIN_PAGES[id].icon }));

  // The logo goes to the admin dashboard.
  function goToDashboard() {
    go('dashboard');
  }

  const username = user.username;
  const roleLabel = ROLE_BADGE[user.role] || user.role.toUpperCase();
  const avatarText = user.avatar || username.slice(0, 2).toUpperCase();

  return (
    <>
      <div id="navbar" className="navbar" data-role="admin">
        <div
          className="nav-brand"
          style={{ cursor: 'pointer' }}
          onClick={goToDashboard}
          title="Go to Dashboard"
        >
          <span
            className="hamburger-btn"
            style={{ position: 'relative' }}
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(!drawerOpen);
            }}
            title="Notifications & Menu"
          >
            ☰
            <span
              id="nav-badge"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--accent-red)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 800,
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: unread > 0 ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Orbitron',monospace",
                border: '2px solid var(--bg-primary)'
              }}
            >
              {unread}
            </span>
          </span>
          <span className="logo-icon">🎮</span>
          <span className="logo-text">PlayCarys</span>
          <span className="role-badge">{roleLabel}</span>
        </div>

        <nav className="nav-links">
          {links.map((link) => (
            <div
              key={link.id}
              className={'nav-link' + (activePage === link.id ? ' active' : '')}
              data-page={link.id}
              onClick={() => go(link.id)}
            >
              {link.icon} {link.label}
            </div>
          ))}
        </nav>

        <div className="nav-user">
          <div style={{ textAlign: 'right' }}>
            <div className="nav-username">{username}</div>
            <div className="nav-role">{roleLabel}</div>
          </div>
          {/* Not clickable on purpose: the old profile card shows player data (points, matches),
              which is empty for an admin, so the admin pages do not open it. */}
          <div className="nav-avatar" id="pc-nav-avatar">
            {avatarText}
          </div>
          <span className="nav-logout" onClick={handleLogout} title="Logout">⬅️</span>
        </div>
      </div>

      <AdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        links={links}
        activePage={activePage}
        onNavigate={(link) => go(link.id)}
        session={user}
        unreadLabel={countUpdated ? unread + ' new' : String(unread)}
        onChanged={handleChanged}
      />
    </>
  );
}

export default AdminNavbar;
