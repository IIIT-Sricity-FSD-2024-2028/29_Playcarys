import React from 'react';

export function ReviewSubmitStep({
  title,
  description,
  selectedGenre,
  minPlayers,
  maxPlayers,
  gameMode,
  ageRating,
  tournamentFormat,
  maxCarys,
  achievements = [],
  hostingMode,
  gameUrl,
  thumbnailDataUrl,
  isSubmitting,
  onBack,
  onSubmit
}) {
  const tFmt = parseInt(tournamentFormat, 10);

  const achievementsText =
    achievements.length > 0
      ? achievements
          .filter((a) => a.code && a.name)
          .map((a) => `${a.icon || '🏆'} ${a.name} (${a.carys_reward || 0})`)
          .join(', ') || 'None'
      : 'None';

  return (
    <div id="step-3">
      <div className="pub-section">
        <h3 style={{ marginBottom: '1.25rem' }}>📋 Review Your Submission</h3>

        <div className="review-card">
          <div className="review-game-header">
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {thumbnailDataUrl ? (
                <img
                  src={thumbnailDataUrl}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '2.5rem' }}>🎮</span>
              )}
            </div>

            <div>
              <div
                style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  marginBottom: '0.4rem'
                }}
              >
                {title}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="tag">{selectedGenre}</span>
                <span className="badge badge-pending">Pending</span>
                {hostingMode === 'hosted' ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(0, 212, 255, 0.12)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: '99px',
                      padding: '0.15rem 0.55rem',
                      fontWeight: 700
                    }}
                  >
                    🏠 Hosted
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: 'var(--accent-yellow)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '99px',
                      padding: '0.15rem 0.55rem',
                      fontWeight: 700
                    }}
                  >
                    🔧 Self-Hosted
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-field">
              <label>Description</label>
              <span style={{ fontSize: '0.82rem', whiteSpace: 'normal' }}>
                {description}
              </span>
            </div>
            <div className="detail-field">
              <label>Players</label>
              <span>{minPlayers} – {maxPlayers}</span>
            </div>
            <div className="detail-field">
              <label>Game Mode</label>
              <span>{gameMode}</span>
            </div>
            <div className="detail-field">
              <label>Tournament</label>
              <span>{tFmt > 0 ? `${tFmt} players/match` : 'Not Supported'}</span>
            </div>
            <div className="detail-field">
              <label>Age Rating</label>
              <span>{ageRating}</span>
            </div>
            <div className="detail-field">
              <label>Max Carys / match</label>
              <span>{maxCarys}</span>
            </div>
            <div className="detail-field">
              <label>Achievements</label>
              <span>{achievementsText}</span>
            </div>
            <div className="detail-field">
              <label>Hosting</label>
              <span>{hostingMode === 'hosted' ? '🏠 PlayCarys Hosted' : '🔧 Self-Hosted'}</span>
            </div>
            {hostingMode === 'selfhosted' && gameUrl && (
              <div className="detail-field">
                <label>Game URL</label>
                <span style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{gameUrl}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
        ℹ️ Your game will be reviewed by our admin team before going live. This typically takes 1–3 business days.
      </div>

      <div className="pub-nav">
        <button className="btn btn-ghost" onClick={onBack} disabled={isSubmitting}>
          ← Back
        </button>
        <button
          className="btn btn-green btn-lg"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? '⏳ Submitting...' : '⬆️ Submit for Review'}
        </button>
      </div>
    </div>
  );
}

export default ReviewSubmitStep;
