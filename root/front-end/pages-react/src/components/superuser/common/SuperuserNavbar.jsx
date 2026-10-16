import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';

export function SuperuserNavbar(props) {
  const { activePage = 'dashboard' } = props;
  const { user, logout } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const role = user?.role || 'superuser';
  const roleUpper = role === 'admin' ? 'ADMIN' : 'SUPERUSER';

  const superuserLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', isReactRoute: true, path: '/superuser/dashboard' },
    { id: 'hub', label: 'Control Hub', icon: '⚡', isReactRoute: true, path: '/superuser/hub' },
    { id: 'users', label: 'All Users', icon: '👥', isReactRoute: true, path: '/superuser/users' },
    { id: 'admins', label: 'Admins', icon: '👑', isReactRoute: true, path: '/superuser/admins' },
    { id: 'games', label: 'Games', icon: '🎮', isReactRoute: true, path: '/superuser/games' },
    { id: 'reports', label: 'Reports', icon: '⚠️', isReactRoute: true, path: '/superuser/reports' },
    { id: 'settings', label: 'Settings', icon: '⚙️', isReactRoute: true, path: '/superuser/settings' }
  ];

  const adminLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', isReactRoute: true, path: '/admin/dashboard' },
    { id: 'hub', label: 'Control Hub', icon: '⚡', isReactRoute: true, path: '/admin/hub' },
    { id: 'users', label: 'Users', icon: '👥', isReactRoute: true, path: '/admin/users' },
    { id: 'approvals', label: 'Approvals', icon: '✅', isReactRoute: true, path: '/admin/approvals' },
    { id: 'settings', label: 'Settings', icon: '⚙️', isReactRoute: true, path: '/admin/settings' }
  ];

  const links = role === 'admin' ? adminLinks : superuserLinks;
  const username = user?.username || (role === 'admin' ? 'Admin' : 'Superuser');
  const avatarText = user?.avatar || username.slice(0, 2).toUpperCase();

  return (
    <>
      <div id="navbar" className="navbar" data-role={role}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            className="hamburger-btn"
            style={{ position: 'relative', cursor: 'pointer', marginRight: '0.4rem' }}
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(!drawerOpen);
            }}
            title="Menu"
          >
            ☰
          </span>
          <Link
            to="/superuser/dashboard"
            className="nav-brand"
            style={{ cursor: 'pointer', textDecoration: 'none' }}
            title="Go to Dashboard"
          >
            <span className="logo-icon">🎮</span>
            <span className="logo-text">PlayCarys</span>
            <span className="role-badge">{roleUpper}</span>
          </Link>
        </div>

        <nav className="nav-links">
          {links.map((link) => {
            const isActive = activePage === link.id;
            const className = `nav-link ${isActive ? 'active' : ''}`;

            if (link.isReactRoute) {
              return (
                <Link
                  key={link.id}
                  to={link.path}
                  className={className}
                  data-page={link.id}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <a
                key={link.id}
                href={link.path}
                className={className}
                data-page={link.id}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="nav-user">
          <div style={{ textAlign: 'right' }}>
            <div className="nav-username">{username}</div>
            <div className="nav-role">{roleUpper}</div>
          </div>
          <div
            className="nav-avatar"
            id="pc-nav-avatar"
            title="View your profile"
          >
            {avatarText}
          </div>
          <span
            className="nav-logout"
            onClick={logout}
            title="Logout"
            style={{ cursor: 'pointer' }}
          >
            ⬅️
          </span>
        </div>
      </div>

      {/* Mobile drawer if toggled */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9998
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '260px',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-primary)',
              padding: '1.5rem',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <Link
                to="/superuser/dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                onClick={() => setDrawerOpen(false)}
              >
                <span style={{ fontSize: '1.4rem' }}>🎮</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 800, color: 'var(--accent-cyan)' }}>PlayCarys</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {links.map((link) => {
                const isActive = activePage === link.id;
                const className = `nav-link ${isActive ? 'active' : ''}`;

                if (link.isReactRoute) {
                  return (
                    <Link
                      key={link.id}
                      to={link.path}
                      className={className}
                      style={{ padding: '0.75rem 1rem' }}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                }

                return (
                  <a
                    key={link.id}
                    href={link.path}
                    className={className}
                    style={{ padding: '0.75rem 1rem' }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{username}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{roleUpper}</div>
              </div>
              <span className="nav-logout" onClick={logout} title="Logout" style={{ cursor: 'pointer' }}>⬅️</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SuperuserNavbar;
