import React from 'react';
import { FEAT_BG_MAP, GAME_ASSETS } from '../../../services/playerService';

export function FeaturedGame(props) {
  const {
    game,
    currentIndex = 0,
    totalGames = 0,
    liveTournaments = 0,
    onNext,
    onSelectIndex,
    onPlay,
    onViewDetails
  } = props;

  if (!game) {
    return null;
  }

  const imgKey = game.img || '';
  const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
  const bg = FEAT_BG_MAP[imgKey] || 'linear-gradient(135deg, #050510 0%, #0a0a20 100%)';
  const imgSrc = GAME_ASSETS.IMG_MAP[imgKey] || null;

  const gameId = game.id || game.game_id;
  const title = game.game_name || game.title || 'Chess Pro';
  const genre = game.game_type || game.genre || 'Game';
  const desc =
    game.desc ||
    game.description ||
    'Compete in ranked matches, join live tournaments, and climb the global leaderboard in this intense multiplayer experience.';
  const rating = game.rating || '4.0';

  return (
    <div
      className="featured"
      id="featured-banner"
    >
      <div className="featured-bg" id="feat-bg" style={{ background: bg }} />
      <div className="featured-grain" />
      <div className="featured-overlay" />

      <div className="featured-visual" id="feat-emoji">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={title}
            style={{
              width: '140px',
              height: '140px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
            }}
          />
        ) : (
          emoji
        )}
      </div>

      <div className="featured-content">
        <div className="featured-eyebrow">
          <span className="eyebrow-dot" />
          <span id="feat-eyebrow">FEATURED GAME</span>
        </div>
        <h1 className="featured-title" id="feat-title">{title}</h1>
        <p className="featured-desc" id="feat-desc">{desc}</p>

        <div className="featured-chips" id="feat-chips">
          <span className="featured-chip">{emoji} {genre}</span>
          {liveTournaments > 0 && (
            <span
              className="featured-chip"
              style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}
            >
              🔴 {liveTournaments} Live
            </span>
          )}
          <span className="featured-chip">⭐ {rating}</span>
        </div>

        <div className="featured-actions">
          <button
            type="button"
            className="btn-play"
            onClick={(e) => {
              e.stopPropagation();
              if (onPlay) onPlay(gameId);
            }}
          >
            ▶ Play Now
          </button>
          <button
            type="button"
            className="btn-info"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) onViewDetails(gameId);
            }}
          >
            View Details
          </button>
        </div>
      </div>


    </div>
  );
}

export default FeaturedGame;
