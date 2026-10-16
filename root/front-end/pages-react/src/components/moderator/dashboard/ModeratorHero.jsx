import React from 'react';
import { Link } from 'react-router-dom';

export function ModeratorHero(props) {
  const { username = 'Moderator', onContactAdmin } = props;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="mod-hero" id="mod-hero">
      <div className="mod-hero-shield">🛡️</div>
      <div className="mod-hero-body">
        <div className="mod-hero-name" id="mod-name">
          🛡 {username}
        </div>
        <div className="mod-hero-sub" id="mod-sub">
          PlayCarys Moderation Team · <span id="mod-date">{dateStr}</span>
        </div>
      </div>
      <div className="mod-hero-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onContactAdmin}
        >
          📨 Contact Admin
        </button>
        <Link
          to="/moderator/reports"
          className="btn btn-ghost btn-sm"
        >
          ⚠️ View Reports
        </Link>
      </div>
    </div>
  );
}

export default ModeratorHero;
