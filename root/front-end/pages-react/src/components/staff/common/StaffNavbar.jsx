/*
 * Concepts used in this component:
 *  - Components, Props (activePage), State (drawer open/closed, a counter that redraws the badge),
 *    Events (clicks), Lists (nav links), Hooks (useState, useEffect, useContext), Context
 *    (AuthContext for the user, AdminContext so it redraws when DB changes),
 *    API calls (the live poll), Callbacks (onChanged is handed to the drawer)
 *
 * The top bar for the moderator and the superuser, same markup as buildNavbar(role, page) in
 * js/utils.js. Those two roles have no React pages yet, so their links open the older .html pages.
 * Admin and publisher use their own navbars (AdminNavbar, PublisherNavbar). The ☰ drawer is the
 * one built for the admin pages: notifications, replies and messages work for any staff role.
 */
import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../../context/AuthContext';
import AdminContext from '../../../context/AdminContext';
import AdminDrawer from '../../admin/common/AdminDrawer';
import { unreadNotifications } from '../../../services/adminNotifService';
import { pullServerState, releaseSession } from '../../../services/adminLiveService';

const ROLE_BADGE = { superuser: 'SUPERUSER', moderator: 'MODERATOR' };

// The links of each role (PC_NAV_LINKS in js/utils.js). `page` is the old .html file name.
const NAV_LINKS = {
  moderator: [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
    { id: 'reports', label: 'Reports', icon: '⚠️', page: 'reports' },
    { id: 'sessions', label: 'Sessions', icon: '🎮', page: 'sessions' },
    { id: 'bans', label: 'Bans', icon: '🛡️', page: 'bans' }
  ],
  superuser: [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
    { id: 'hub', label: 'Control Hub', icon: '⚡', page: 'hub' },
    { id: 'users', label: 'All Users', icon: '👥', page: 'users' },
    { id: 'admins', label: 'Admins', icon: '👑', page: 'admins' },
    { id: 'games', label: 'Games', icon: '🎮', page: 'games' },
    { id: 'settings', label: 'Settings', icon: '⚙️', page: 'settings' }
  ]
};

export function StaffNavbar(props) {
  const { activePage = 'inbox' } = props;
  const { user, logout } = useContext(AuthContext);
  const { refresh } = useContext(AdminContext); // also redraws this component when refresh() is called
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setTick] = useState(0); // bumping it redraws the navbar and the drawer from DB
  const [countUpdated, setCountUpdated] = useState(false);

  // Something changed in DB (a message was read, or new data arrived): recount and redraw the page.
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

  const links = NAV_LINKS[user.role] || [];
  const unread = unreadNotifications(user.userId, user.role).length;

  // These roles have no React pages yet, so a link opens the older page (the old navigate()).
  function openOldPage(page) {
    window.location.href = '/pages/' + user.role + '/' + page + '.html';
  }

  // The logo goes to your own home: the superuser's is the control hub (Auth.gotoDashboard).
  function goToDashboard() {
    openOldPage(user.role === 'superuser' ? 'hub' : 'dashboard');
  }

  const username = user.username;
  const roleLabel = ROLE_BADGE[user.role] || user.role.toUpperCase();
  const avatarText = user.avatar || username.slice(0, 2).toUpperCase();

  return (
    <>
      <div id="navbar" className="navbar" data-role={user.role}>
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
              onClick={() => openOldPage(link.page)}
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
          {/* Not clickable on purpose: the old profile card shows player data, which is empty for staff. */}
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
        onNavigate={(link) => openOldPage(link.page)}
        session={user}
        unreadLabel={countUpdated ? unread + ' new' : String(unread)}
        onChanged={handleChanged}
      />
    </>
  );
}

export default StaffNavbar;
