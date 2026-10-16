import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_ASSETS } from '../../../services/playerService';

export function GameLibrary(props) {
  const { games = [], onPlay, onViewDetails } = props;
  const navigate = useNavigate();

  return (
    <>
      <div className="sec-label">
        <div className="sec-label-title">Game Library</div>
        <span
          className="sec-label-link"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/player/games')}
          role="button"
          tabIndex={0}
        >
          Browse all →
        </span>
      </div>

      <div className="game-tiles" id="game-tiles">
        {games.map((g, i) => {
          const gameId = g.id || g.game_id;
          const imgKey = g.img || '';
          const imgSrc =
            imgKey.startsWith('data:image/') || imgKey.startsWith('http')
              ? imgKey
              : GAME_ASSETS.IMG_MAP[imgKey] || null;
          const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
          const bgColor = GAME_ASSETS.COLORS[i % GAME_ASSETS.COLORS.length];
          const isApproved =
            g.game_approval_status === 'approved' || g.status === 'approved';
          const title = g.game_name || g.title || 'Untitled Game';
          const genre = g.game_type || g.genre || 'Game';
          const ratingNum = Math.round(Number(g.rating) || 4);
          const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);

          return (
            <div
              key={gameId || i}
              className="game-tile"
              onClick={() => {
                if (onViewDetails) onViewDetails(gameId);
              }}
              title={`View ${title} details`}
            >
              {/* Visual Thumbnail */}
              <div
                className="game-tile-visual"
                style={{
                  background: imgSrc ? `url(${imgSrc})` : bgColor,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!imgSrc && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
                    }}
                  >
                    {emoji}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8) 100%)'
                  }}
                />
              </div>

              <div className="game-tile-overlay" />

              {/* Hover reveal play button */}
              <button
                type="button"
                className="tile-play-btn"
                style={!isApproved ? { background: 'rgba(100,100,100,0.7)' } : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPlay) onPlay(gameId, isApproved);
                }}
                title={isApproved ? `Play ${title}` : 'Game coming soon'}
              >
                {isApproved ? '▶' : '🔒'}
              </button>

              <div className="game-tile-body">
                <div className="tile-genre">{genre}</div>
                <div className="tile-name">{title}</div>
                <div className="tile-rating">
                  <span className="stars">{stars}</span>
                  <span>{g.rating || (isApproved ? '4.0' : 'Pending')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default GameLibrary;
