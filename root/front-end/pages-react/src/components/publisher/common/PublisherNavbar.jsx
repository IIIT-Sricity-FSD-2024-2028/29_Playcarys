import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePublisherAuth } from '../../../hooks/usePublisherAuth';

export function PublisherNavbar(props) {
  const { activePage = 'dashboard' } = props;
  const { user, logout } = usePublisherAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerBtnRef = useRef(null);
  const drawerRef = useRef(null);

  // Parent Navigation Sections for Top Navbar
  const primaryNavSections = [
    { id: 'dashboard', label: 'Overview', icon: '🏠', path: '/publisher/dashboard' },
    { id: 'my-games', label: 'Games', icon: '🎮', path: '/publisher/my-games' },
    { id: 'publish-tournament', label: 'Tournaments', icon: '🏆', path: '/publisher/publish-tournament' },
    { id: 'earnings', label: 'Finance & Ledger', icon: '💰', path: '/publisher/finance' },
    { id: 'profile', label: 'Studio & Trust', icon: '🛡️', path: '/publisher/profile' },
  ];

  // Grouped Navigation for Mobile Drawer
  const drawerGroups = [
    {
      heading: 'Console Overview',
      links: [
        { id: 'dashboard', label: 'Dashboard & Telemetry', icon: '🏠', path: '/publisher/dashboard' },
      ],
    },
    {
      heading: 'Games & Titles',
      links: [
        { id: 'my-games', label: 'My Games & Analytics', icon: '🎮', path: '/publisher/my-games' },
        { id: 'publish', label: '+ Submit New Game', icon: '🚀', path: '/publisher/publish' },
      ],
    },
    {
      heading: 'Tournaments & Brackets',
      links: [
        { id: 'publish-tournament', label: 'Host Tournament', icon: '🏆', path: '/publisher/publish-tournament' },
      ],
    },
    {
      heading: 'Finance & Earnings',
      links: [
        { id: 'earnings', label: 'Royalties & Statements', icon: '💰', path: '/publisher/earnings' },
      ],
    },
    {
      heading: 'Studio & Compliance',
      links: [
        { id: 'profile', label: 'Studio Profile & API Keys', icon: '🛡️', path: '/publisher/profile' },
      ],
    },
  ];

  // Accessibility: Focus trap & Escape key handler
  useEffect(() => {
    if (!drawerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrawerOpen(false);
        hamburgerBtnRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on close button
    const closeBtn = drawerRef.current?.querySelector('.drawer-close-btn');
    closeBtn?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    hamburgerBtnRef.current?.focus();
  };

  const username = user?.username || 'Publisher';
  const avatarText = user?.avatar || username.slice(0, 2).toUpperCase();

  return (
    <>
      <header id="navbar" className="navbar" data-role="publisher">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            ref={hamburgerBtnRef}
            type="button"
            className="hamburger-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.4rem',
              cursor: 'pointer',
              marginRight: '0.5rem',
              padding: '0.2rem 0.4rem',
            }}
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-expanded={drawerOpen}
            aria-label="Toggle publisher navigation drawer"
            title="Menu"
          >
            ☰
          </button>
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

        {/* Primary Desktop Navigation Links */}
        <nav className="nav-links" aria-label="Publisher Primary Navigation">
          {primaryNavSections.map((section) => {
            const isActive =
              activePage === section.id ||
              (section.id === 'my-games' && activePage === 'publish') ||
              (section.id === 'publish-tournament' && activePage === 'publish-tournament');

            return (
              <Link
                key={section.id}
                to={section.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                data-page={section.id}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Logout */}
        <div className="nav-user">
          <div style={{ textTransform: 'capitalize', textAlign: 'right' }}>
            <div className="nav-username">{username}</div>
            <div className="nav-role">PUBLISHER</div>
          </div>
          <Link
            to="/publisher/profile"
            className="nav-avatar"
            id="pc-nav-avatar"
            title="View studio profile"
            style={{ textDecoration: 'none' }}
          >
            {avatarText}
          </Link>
          <span
            className="nav-logout"
            onClick={logout}
            title="Logout"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && logout()}
          >
            ⬅️
          </span>
        </div>
      </header>

      {/* Accessible Responsive Navigation Drawer */}
      {drawerOpen && (
        <div
          className="drawer-overlay show"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9998,
          }}
          onClick={handleCloseDrawer}
        >
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Publisher Navigation Menu"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '290px',
              maxWidth: '85vw',
              background: '#0f172a',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '1.25rem',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.6)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
              <Link
                to="/publisher/dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                onClick={handleCloseDrawer}
              >
                <span style={{ fontSize: '1.4rem' }}>🎮</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 800, color: '#00d4ff', fontSize: '1.1rem' }}>PlayCarys</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm drawer-close-btn"
                onClick={handleCloseDrawer}
                aria-label="Close menu"
                style={{ fontSize: '1rem', padding: '0.3rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            {/* Hierarchical Group Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {drawerGroups.map((group, gIdx) => (
                <div key={gIdx} className="drawer-nav-group">
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.35rem', paddingLeft: '0.5rem' }}>
                    {group.heading}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {group.links.map((link) => {
                      const isActive = activePage === link.id;
                      return (
                        <Link
                          key={link.id}
                          to={link.path}
                          className={`nav-link ${isActive ? 'active' : ''}`}
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            fontSize: '0.82rem',
                            color: isActive ? '#00d4ff' : '#cbd5e1',
                            background: isActive ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
                            textDecoration: 'none',
                          }}
                          onClick={handleCloseDrawer}
                        >
                          <span>{link.icon}</span>
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{username}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PUBLISHER ACCOUNT</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={logout}
                title="Sign out"
                style={{ fontSize: '0.8rem', color: '#ef4444' }}
              >
                Sign out ⬅️
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default PublisherNavbar;
