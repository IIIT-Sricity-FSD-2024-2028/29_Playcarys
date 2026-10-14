import React, { useState } from 'react';
import { getGameVisualInfo, getStatusBadgeData } from '../../../services/publisherService';

export function PublisherGameRow(props) {
  const { game, index = 0, onClick } = props;
  const [imgError, setImgError] = useState(false);

  const statusKey = game.game_approval_status || game.status || 'pending';
  const enabledKey = game.game_status || (game.enabled ? 'enabled' : 'disabled');
  const isLive = enabledKey === 'enabled' && statusKey === 'approved';

  let blocker = '';
  if (statusKey === 'pending' && !game.play_path && !game.game_url) {
    blocker = 'No build uploaded';
  } else if (statusKey === 'pending') {
    blocker = 'Waiting on review';
  } else if (statusKey === 'rejected') {
    blocker = 'Rejected — see notes';
  }

  const visual = getGameVisualInfo(game, index);
  const badgeData = getStatusBadgeData(statusKey);

  const title = game.title || game.game_name || 'Untitled Game';
  const genre = game.genre || game.game_type || '—';
  const sessions = game.sessions || 0;

  function handleClick() {
    if (onClick) {
      onClick(game);
    } else {
      window.location.href = '/pages/publisher/mygames.html';
    }
  }

  return (
    <div
      className="game-row"
      onClick={handleClick}
      title="Open in My Games"
    >
      <div className="game-row-thumb">
        {visual.imgSrc && !imgError ? (
          <img
            src={visual.imgSrc}
            alt={title}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: visual.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}
          >
            {visual.emoji}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="game-row-name">{title}</div>
        <div className="game-row-meta">
          <span>{genre}</span>
          <span>·</span>
          <span>🕹️ {sessions}</span>
          {blocker && <span className="game-row-blocked">· {blocker}</span>}
        </div>
      </div>

      <div className="game-row-right">
        <span className={`badge ${badgeData.className}`}>{badgeData.label}</span>
        <span
          className="badge"
          style={{
            fontSize: '0.62rem',
            background: isLive ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
            color: isLive ? 'var(--accent-green)' : 'var(--text-secondary)',
            borderColor: isLive ? 'rgba(16,185,129,0.25)' : 'var(--border-primary)'
          }}
        >
          {isLive ? '🟢 Live' : '⭕ Offline'}
        </span>
      </div>
    </div>
  );
}

export default PublisherGameRow;
