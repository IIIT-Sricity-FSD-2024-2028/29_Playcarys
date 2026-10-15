import React from 'react';
import {
  getGameVisualInfo,
  getStatusBadgeData,
  formatDate,
  publisherService
} from '../../../services/publisherService';

export function PublisherGameRow({ game, index, onEdit, onAnalytics }) {
  const gid = String(game.game_id || game.id);
  const statusKey = (game.game_approval_status || game.status || 'pending').toLowerCase();
  const isEnabled = game.game_status === 'enabled' || !!game.enabled;
  const isSelfHosted = (game.hosting_type || game.hostingType) === 'selfhosted';
  const visual = getGameVisualInfo(game, index);
  const badgeInfo = getStatusBadgeData(statusKey);

  // Review outcome message
  function renderReviewOutcome() {
    const note = game.review_note;

    if (statusKey === 'rejected') {
      return (
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-red)', marginTop: '0.3rem' }}>
          ❌ {note ? `Reviewer: ${note}` : 'Rejected — edit and resubmit to send it back for review.'}
        </div>
      );
    }

    if (statusKey === 'pending' && game.review_required_reason) {
      return (
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-yellow)', marginTop: '0.3rem' }}>
          ↺ Back in review — {game.review_required_reason} It goes live again once an admin approves the new build.
        </div>
      );
    }

    if (statusKey === 'pending') {
      const hasBuild = game.play_path || game.playPath || isSelfHosted;
      return (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          {hasBuild
            ? '⏳ Waiting for an admin to review your build.'
            : '⚠️ No build uploaded yet — a reviewer has nothing to look at, so this cannot be approved.'}
        </div>
      );
    }

    if (statusKey === 'approved' && note) {
      return (
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-green)', marginTop: '0.3rem' }}>
          ✅ Reviewer: {note}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="game-row">
      {/* Thumbnail */}
      <div className="game-row-thumb" style={{ background: visual.bgColor }}>
        {visual.imgSrc ? (
          <img
            src={visual.imgSrc}
            alt={game.game_name || game.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<span style="font-size:2rem">${visual.emoji}</span>`;
            }}
          />
        ) : (
          <span style={{ fontSize: '2rem' }}>{visual.emoji}</span>
        )}
      </div>

      {/* Info */}
      <div className="game-row-info">
        <div className="game-row-title">{game.game_name || game.title}</div>

        <div className="game-row-badges">
          <span className={`badge ${badgeInfo.className}`}>{badgeInfo.label}</span>

          {statusKey === 'approved' && (
            <span className={`badge ${isEnabled ? 'badge-enabled' : 'badge-disabled'}`}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          )}

          {isSelfHosted ? (
            <span className="hbadge-selfhosted">🔧 Self-Hosted</span>
          ) : (
            <span className="hbadge-hosted">🏠 Hosted</span>
          )}

          {game.maintenance && (
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(245,158,11,0.12)',
                color: 'var(--accent-yellow)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '99px',
                padding: '0.1rem 0.45rem'
              }}
            >
              ⚠️ Maintenance
            </span>
          )}
        </div>

        <div className="game-row-meta">
          <span className="tag">{game.game_type || game.genre || 'Game'}</span>
          <span>👥 {game.players || '1-4'}</span>
          <span>⭐ {game.rating || 'N/A'}</span>
          <span>👁️ {publisherService.fmtViews(game.views)}</span>
          <span>🕹️ {game.sessions || 0} sessions</span>
          <span style={{ color: 'var(--text-muted)' }}>📅 {formatDate(game.submittedDate)}</span>
        </div>

        {renderReviewOutcome()}
      </div>

      {/* Actions */}
      <div className="game-row-actions">
        {statusKey === 'approved' && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onAnalytics(game)}
          >
            📊 Analytics
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onEdit(game)}
        >
          ✏️ Edit
        </button>
      </div>
    </div>
  );
}

export default PublisherGameRow;
