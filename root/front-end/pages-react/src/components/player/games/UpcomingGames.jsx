import React from 'react';
import { GAME_ASSETS } from '../../../services/playerService';

export function UpcomingGames({ games = [] }) {
  if (!games || !games.length) return null;

  return (
    <div id="upcoming-section" style={{ marginTop: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: '4px',
            height: '28px',
            background: 'linear-gradient(180deg, var(--accent-purple), var(--accent-cyan))',
            borderRadius: '99px'
          }}
        />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: "'Orbitron', monospace", color: '#fff' }}>
            🚀 Upcoming Games
          </h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Games in development — coming to PlayCarys soon
          </p>
        </div>
      </div>

      <div className="cards-grid-4" id="upcoming-grid">
        {games.map((g, i) => {
          const imgKey = g.img || '';
          const imgSrc = (imgKey.startsWith('data:image/') || imgKey.startsWith('http'))
            ? imgKey
            : (GAME_ASSETS.IMG_MAP[imgKey] || null);
          const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
          const bg = GAME_ASSETS.COLORS[i % GAME_ASSETS.COLORS.length];
          const heroBg = imgSrc
            ? { backgroundImage: `url('${imgSrc}')`, backgroundPosition: 'center', backgroundSize: 'cover' }
            : { background: bg };

          return (
            <div
              key={g.id || g.game_id || i}
              style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                opacity: 0.85,
                position: 'relative',
                transition: 'all .25s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
              }}
            >
              <div
                style={{
                  height: '130px',
                  ...heroBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3.5rem',
                  position: 'relative'
                }}
              >
                {!imgSrc ? emoji : null}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
                <div
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    background: 'rgba(139,92,246,0.8)',
                    color: '#fff',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '99px',
                    letterSpacing: '0.08em'
                  }}
                >
                  COMING SOON
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '99px'
                  }}
                >
                  {g.genre || g.game_type || 'Arcade'}
                </div>
              </div>

              <div style={{ padding: '0.85rem 0.9rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.3rem', color: '#fff' }}>
                  {g.title || g.game_name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                    marginBottom: '0.75rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {g.desc}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>👥 {g.players}</span>
                  <span
                    style={{
                      background: 'rgba(139,92,246,0.15)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139,92,246,0.25)',
                      borderRadius: '99px',
                      padding: '0.15rem 0.6rem'
                    }}
                  >
                    In Development
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UpcomingGames;
