import React from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../../../context/ChatContext';

export function QuickAccess() {
  const { openFriendsPanel, unreadTotal } = useChat();

  const quickLinks = [
    { label: 'Tournaments', icon: '🏆', path: '/player/tournaments', isReact: true },
    { label: 'My Events', icon: '🎯', path: '/player/my-tournaments', isReact: true },
    { label: 'Leaderboard', icon: '👑', path: '/player/leaderboard', isReact: true },
    { label: 'Profile', icon: '👤', path: '/player/profile', isReact: true },
    { label: 'Match History', icon: '📊', path: '/player/match-history', isReact: true },
    { label: 'Notifications', icon: '🔔', path: '/player/notifications', isReact: true },
    { label: 'Chat', icon: '💬', isChat: true }
  ];

  // Chat opens the friends panel, where the player picks WHO to talk to.
  // It used to open a chat with whichever friend happened to be first in a
  // locally cached list — an arbitrary person, not the one the player wanted.
  function handleChatClick() {
    openFriendsPanel();
  }

  return (
    <div className="sidebar-section">
      <div className="sid-title">Quick Access</div>
      <div className="sid-nav">
        {quickLinks.map((link) => (
          link.isChat ? (
            <div
              key={link.label}
              className="sid-btn"
              title="Open your friends and chats"
              onClick={handleChatClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="sid-btn-icon">{link.icon}</div>
              <div className="sid-btn-lbl">
                {link.label}
                {unreadTotal > 0 ? ` (${unreadTotal})` : ''}
              </div>
            </div>
          ) : link.isReact ? (
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
