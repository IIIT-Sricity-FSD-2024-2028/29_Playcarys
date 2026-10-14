import React from 'react';
import playerService, { GAME_ASSETS } from '../../../services/playerService';

export function GameCard({
  game,
  index = 0,
  isFav = false,
  onToggleFav,
  onSelectGame,
  onLaunch,
  isOffline = false
}) {
  const gameId = String(game.id || game.game_id);
  const hasEngine = playerService.hasEngine(gameId);
  const isSoon = !hasEngine;
  const genre = game.game_type || game.genre || game.gameType || 'Game';
  const title = game.title || game.game_name || game.name || 'Game';

  // Resolve visual assets
  const imgKey = game.img || '';
  const imgSrc = (imgKey.startsWith('data:image/') || imgKey.startsWith('http'))
    ? imgKey
    : (GAME_ASSETS.IMG_MAP[imgKey] || null);
  const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
  const bgColor = GAME_ASSETS.COLORS[index % GAME_ASSETS.COLORS.length];

  return (
    <div
      className={`game-card ${isSoon ? 'card-soon' : ''}`}
      onClick={() => onSelectGame(gameId)}
      style={{ cursor: 'pointer' }}
    >
      <div className="game-card-img-wrap">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={title}
            className="game-card-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: bgColor,
            display: imgSrc ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3.5rem'
          }}
        >
          {emoji}
        </div>

        <div className="genre-badge">{genre}</div>

        <button
          className={`fav-btn ${isFav ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(gameId, e);
          }}
          title={isFav ? 'Remove from favourites' : 'Add to favourites'}
          type="button"
        >
          {isFav ? '♥' : '♡'}
        </button>
      </div>

      <div className="game-card-body">
        <div className="game-card-title">{game.title || game.game_name || game.name || 'Game'}</div>
        <div className="game-card-desc">{game.desc || game.game_description || game.description || ''}</div>
        <div className="game-card-meta">
          <span>👥 {game.players || (game.min_players ? `${game.min_players}-${game.max_players}` : '1')}</span>
          <span style={{ color: 'var(--accent-yellow)' }}>⭐ {game.rating || '—'}</span>
        </div>

        <div
          className="game-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {isSoon ? (
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, pointerEvents: 'none', opacity: 0.6 }}
              type="button"
            >
              ⏳ Coming Soon
            </button>
          ) : isOffline ? (
            <button
              className="btn btn-primary btn-sm"
              disabled
              style={{
                flex: 1,
                fontSize: '0.72rem',
                padding: '0.5rem 0.2rem',
                opacity: 0.55,
                cursor: 'not-allowed'
              }}
              title="This game runs on its own server, which is not responding right now."
              type="button"
            >
              ⛔ Server offline
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch(gameId, e);
              }}
              title={`Play ${game.title}`}
              style={{ flex: 1, fontSize: '0.72rem', padding: '0.5rem 0.2rem' }}
              type="button"
            >
              ▶ Play Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameCard;
