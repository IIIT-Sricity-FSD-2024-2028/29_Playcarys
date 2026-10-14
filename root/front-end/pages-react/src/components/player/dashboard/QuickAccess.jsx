import React from 'react';

export function QuickAccess() {
  const quickLinks = [
    { label: 'Tournaments', icon: '🏆', path: '/pages/player/tournaments.html' },
    { label: 'My Events', icon: '🎯', path: '/pages/player/my-tournaments.html' },
    { label: 'Leaderboard', icon: '👑', path: '/pages/player/leaderboard.html' },
    { label: 'Profile', icon: '👤', path: '/pages/player/profile.html' },
    { label: 'Match History', icon: '📊', path: '/pages/player/match-history.html' },
    { label: 'Notifications', icon: '🔔', path: '/pages/player/notifications.html' }
  ];

  return (
    <div className="sidebar-section">
      <div className="sid-title">Quick Access</div>
      <div className="sid-nav">
        {quickLinks.map((link) => (
          <a
            key={link.label}
            href={link.path}
            className="sid-btn"
            title={`Go to ${link.label}`}
          >
            <div className="sid-btn-icon">{link.icon}</div>
            <div className="sid-btn-lbl">{link.label}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default QuickAccess;
