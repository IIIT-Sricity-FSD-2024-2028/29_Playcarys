import React from 'react';
import { useNavigate } from 'react-router-dom';
import playerService, { getDatabase, formatDate, sameId, GAME_ASSETS } from '../../../services/playerService';
import GameAchievements from './GameAchievements';
import GameReviews from './GameReviews';

export function GameDetails({
  game,
  userId,
  isFav = false,
  onToggleFav,
  onBack,
  onLaunch,
  onReviewSubmitted,
  onShowToast
}) {
  const navigate = useNavigate();
  if (!game) return null;

  const gid = String(game.id || game.game_id);
  const db = getDatabase();

  // Related Tournaments: matching gameId and not completed
  const tourns = (db.tournaments || []).filter(
    (t) => sameId(t.gameId || t.game_id, gid) && t.status !== 'completed'
  );

  // Offline game modes (e.g. Chess supports AI and 2P local)
  const supportsAi = playerService.supportsAi(gid);

  // Icon visual
  const imgKey = game.img || '';
  const imgSrc = (imgKey.startsWith('data:image/') || imgKey.startsWith('http'))
    ? imgKey
    : (GAME_ASSETS.IMG_MAP[imgKey] || null);
  const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
  const idx = parseInt(gid.replace('g', ''), 10) || 0;
  const bgColor = GAME_ASSETS.COLORS[idx % GAME_ASSETS.COLORS.length];

  const viewsFormatted = game.views != null
    ? (Number(game.views) / 1000).toFixed(1)
    : '0.0';

  function getBadgeClass(status) {
    const map = {
      pending: 'badge-pending',
      'under-review': 'badge-review',
      resolved: 'badge-resolved',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      banned: 'badge-banned',
      active: 'badge-active',
      waiting: 'badge-waiting',
      'in-progress': 'badge-progress',
      upcoming: 'badge-upcoming',
      completed: 'badge-approved',
      player: 'badge-player',
      publisher: 'badge-publisher',
      moderator: 'badge-moderator',
      admin: 'badge-admin',
      superuser: 'badge-superuser',
      enabled: 'badge-enabled',
      disabled: 'badge-disabled',
      suspended: 'badge-pending'
    };
    return map[status] || 'badge-active';
  }

  function formatStatusLabel(status) {
    if (status === 'in-progress') return 'In Progress';
    if (status === 'under-review') return 'Under Review';
    if (!status) return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <div className="page-content" id="detail-view">
      <div
        className="back-btn"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          color: 'var(--accent-cyan)',
          fontWeight: 600,
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}
      >
        ← Back to Catalog
      </div>

      <div id="detail-content">
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: '1.5rem'
          }}
        >
          {imgSrc ? (
            <div
              style={{
                width: '88px',
                height: '88px',
                flexShrink: 0,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-primary)'
              }}
            >
              <img
                src={imgSrc}
                alt={game.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
              <div
                style={{
                  display: 'none',
                  width: '100%',
                  height: '100%',
                  background: bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem'
                }}
              >
                {emoji}
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '88px',
                height: '88px',
                background: bgColor,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem'
              }}
            >
              {emoji}
            </div>
          )}

          <div style={{ flex: 1, minWidth: '220px' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.3rem', fontFamily: "'Orbitron', monospace", color: '#fff' }}>
              {game.title || game.game_name || game.name || 'Game'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              {game.desc || game.game_description || game.description || ''}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
              <span className="tag" style={{ background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                {game.genre}
              </span>
              <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
                👥 {game.players}
              </span>
              <span style={{ color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>
                ⭐ {game.rating || '—'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              By {game.publisher || 'PlayCarys Studio'} · {viewsFormatted}K views
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={(e) => onLaunch(gid, e)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                type="button"
              >
                ▶ Play Now
              </button>

              {supportsAi && (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      window.location.href = '/games/chess/index.html?mode=ai';
                    }}
                    title="Play offline against the computer"
                    type="button"
                  >
                    🤖 Play vs AI
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      window.location.href = '/games/chess/index.html?mode=2p';
                    }}
                    title="Play offline with a friend on the same screen"
                    type="button"
                  >
                    👥 Local 2-Player
                  </button>
                </>
              )}

              <button
                className={`btn ${isFav ? 'btn-purple' : 'btn-ghost'}`}
                onClick={(e) => onToggleFav(gid, e)}
                type="button"
              >
                {isFav ? '♥ Favourited' : '♡ Favourite'}
              </button>
            </div>
          </div>
        </div>

        {/* Achievements Panel */}
        <GameAchievements gameId={gid} userId={userId} />

        {/* Related Tournaments */}
        {tourns.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="mb-2" style={{ fontSize: '1.1rem', fontFamily: "'Orbitron', monospace", marginBottom: '0.75rem' }}>
              🏆 Related Tournaments
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tourns.map((t) => (
                <div
                  key={t.id || t.tournament_id}
                  className="list-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div className="list-item-info">
                    <span style={{ fontWeight: 600, color: '#fff' }}>{t.name}</span>
                    <div className="text-xs text-muted" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Starts {formatDate(t.startDate || t.start_date)} · {t.participants || 0}/{t.maxParticipants || t.max_participants || 16} · Prize: {t.prize || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`badge ${getBadgeClass(t.status)}`}>
                      {formatStatusLabel(t.status)}
                    </span>
                    <button
                      className="btn btn-purple btn-sm"
                      onClick={() => {
                        navigate(`/player/tournaments?highlight=${t.id || t.tournament_id}`);
                      }}
                      type="button"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Reviews */}
        <GameReviews
          game={game}
          userId={userId}
          onReviewSubmitted={onReviewSubmitted}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
}

export default GameDetails;
