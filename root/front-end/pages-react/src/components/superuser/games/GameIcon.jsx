import React, { useState } from 'react';
import { getGameVisualInfo } from '../../../services/publisherService';

export function GameIcon({ game, size = '40px', index = 0, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const visual = getGameVisualInfo(game, index);
  const title = game.title || game.game_name || 'Game';

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-primary)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: visual.bgColor,
        position: 'relative'
      }}
    >
      {visual.imgSrc && !imgError ? (
        <img
          src={visual.imgSrc}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{ fontSize: `calc(${size} * 0.5)` }}>{visual.emoji}</span>
      )}
    </div>
  );
}

export default GameIcon;
