import React from 'react';
import { Link } from 'react-router-dom';

export function QuickAccess() {
  const quickLinks = [
    { label: 'Tournaments', icon: '🏆', path: '/player/tournaments', isReact: true },
    { label: 'My Events', icon: '🎯', path: '/player/my-tournaments', isReact: true },
    { label: 'Leaderboard', icon: '👑', path: '/player/leaderboard', isReact: true },
    { label: 'Profile', icon: '👤', path: '/player/profile', isReact: true },
    { label: 'Match History', icon: '📊', path: '/player/match-history', isReact: true },
    { label: 'Notifications', icon: '🔔', path: '/player/notifications', isReact: true }
  ];

  return (
    <div className="sidebar-section">
      <div className="sid-title">Quick Access</div>
      <div className="sid-nav">
        {quickLinks.map((link) => (
          link.isReact ? (
            <Link
              key={link.label}
              to={link.path}
              className="sid-btn"
              title={`Go to ${link.label}`}
            >
              <div className="sid-btn-icon">{link.icon}</div>
              <div className="sid-btn-lbl">{link.label}</div>
            </Link>
          ) : (
            <a
              key={link.label}
              href={link.path}
              className="sid-btn"
              title={`Go to ${link.label}`}
            >
              <div className="sid-btn-icon">{link.icon}</div>
              <div className="sid-btn-lbl">{link.label}</div>
            </a>
          )
        ))}
      </div>
    </div>
  );
}

export default QuickAccess;
