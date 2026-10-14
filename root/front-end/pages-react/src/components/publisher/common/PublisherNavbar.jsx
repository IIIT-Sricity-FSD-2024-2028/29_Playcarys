import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';

export function PublisherNavbar(props) {
  const { activePage = 'dashboard' } = props;
  const { user, logout } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const publisherLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', isReactRoute: true, path: '/publisher/dashboard' },
    { id: 'publish', label: 'Publish Game', icon: '🎮', isReactRoute: true, path: '/publisher/publish' },
    { id: 'publish-tournament', label: 'Publish Tournament', icon: '🏆', isReactRoute: true, path: '/publisher/publish-tournament' },
    { id: 'mygames', label: 'My Games', icon: '🎮', isReactRoute: false, path: '/pages/publisher/mygames.html' },
    { id: 'earnings', label: 'Earnings', icon: '💰', isReactRoute: false, path: '/pages/publisher/earnings.html' },
    { id: 'profile', label: 'Profile', icon: '👤', isReactRoute: false, path: '/pages/publisher/profile.html' }
  ];

  const username = user?.username || 'Publisher';
  const avatarText = user?.avatar || username.slice(0, 2).toUpperCase();

  return (
    <>
      <div id="navbar" className="navbar" data-role="publisher">
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
            to="/publisher/dashboard"
            className="nav-brand"
            style={{ cursor: 'pointer', textDecoration: 'none' }}
            title="Go to Dashboard"
          >
            <span className="logo-icon">🎮</span>
            <span className="logo-text">PlayCarys</span>
            <span className="role-badge">PUBLISHER</span>
          </Link>
        </div>

        <nav className="nav-links">
          {publisherLinks.map((link) => {
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
          <div style={{ textTransform: 'capitalize', textAlign: 'right' }}>
            <div className="nav-username">{username}</div>
            <div className="nav-role">PUBLISHER</div>
          </div>
          <a
            href="/pages/publisher/profile.html"
            className="nav-avatar"
            id="pc-nav-avatar"
            title="View your profile"
            style={{ textDecoration: 'none' }}
          >
            {avatarText}
          </a>
          <span
            className="nav-logout"
            onClick={logout}
            title="Logout"
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
                to="/publisher/dashboard"
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
              {publisherLinks.map((link) => {
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PUBLISHER</div>
              </div>
              <span className="nav-logout" onClick={logout} title="Logout">⬅️</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PublisherNavbar;
