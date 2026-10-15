import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../../../context/ChatContext';
import AuthContext from '../../../context/AuthContext';
import { getDatabase, sameId } from '../../../services/playerService';

export function QuickAccess() {
  const { openChat } = useChat();
  const { user } = useContext(AuthContext);
  const currentUid = user?.userId ?? user?.id ?? 7;

  const quickLinks = [
    { label: 'Tournaments', icon: '🏆', path: '/player/tournaments', isReact: true },
    { label: 'My Events', icon: '🎯', path: '/player/my-tournaments', isReact: true },
    { label: 'Leaderboard', icon: '👑', path: '/player/leaderboard', isReact: true },
    { label: 'Profile', icon: '👤', path: '/player/profile', isReact: true },
    { label: 'Match History', icon: '📊', path: '/player/match-history', isReact: true },
    { label: 'Notifications', icon: '🔔', path: '/player/notifications', isReact: true },
    { label: 'Chat', icon: '💬', isChat: true }
  ];

  function handleChatClick() {
    const db = getDatabase();
    const firstFriendRow = (db?.friendships || []).find(
      (f) => (sameId(f.user_a, currentUid) || sameId(f.user_b, currentUid)) && !f.removed_at
    );
    if (firstFriendRow) {
      const friendId = sameId(firstFriendRow.user_a, currentUid) ? firstFriendRow.user_b : firstFriendRow.user_a;
      const fu = (db?.users || []).find((u) => sameId(u.id || u.user_id, friendId));
      openChat({
        id: friendId,
        name: fu?.username || fu?.user_name || 'Friend',
        avatar: fu?.avatar
      });
    } else {
      const el = document.getElementById('friends-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
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
              title="Open Friend Chat"
              onClick={handleChatClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="sid-btn-icon">{link.icon}</div>
              <div className="sid-btn-lbl">{link.label}</div>
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
