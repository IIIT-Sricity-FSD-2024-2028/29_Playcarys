import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { key: 'dashboard', label: '🛡 Dashboard',  to: '/moderator/dashboard' },
  { key: 'reports',   label: '⚠️ Reports',     to: '/moderator/reports'  },
  { key: 'bans',      label: '🚫 Bans',         to: '/moderator/bans'     },
  { key: 'sessions',  label: '🎮 Sessions',     to: '/moderator/sessions' },
];

export default function ModeratorNavbar({ activePage }) {
  const navigate = useNavigate();

  function handleLogout() {
    try {
      sessionStorage.clear();
      localStorage.removeItem('playcarys_session');
    } catch(e) {}
    navigate('/login');
  }

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="nav-brand">
        <span className="logo-icon">🎮</span>
        <span className="logo-text">PLAYCARYS</span>
        <span className="role-badge">MODERATOR</span>
      </div>

      {/* Nav links */}
      <div className="nav-links">
        {NAV_LINKS.map(({ key, label, to }) => (
          <Link
            key={key}
            to={to}
            className={`nav-link${activePage === key ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* User area */}
      <div className="nav-user">
        <div>
          <div className="nav-username">Moderator</div>
          <div className="nav-role">Moderator</div>
        </div>
        <div className="nav-avatar">🛡</div>
        <span className="nav-logout" title="Logout" onClick={handleLogout}>⏻</span>
      </div>
    </nav>
  );
}
