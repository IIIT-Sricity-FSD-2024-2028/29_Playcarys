import React from 'react';
import GameIcon from './GameIcon';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return <span className="badge badge-approved">Approved</span>;
  if (s === 'rejected') return <span className="badge badge-rejected">Rejected</span>;
  return <span className="badge badge-pending">Pending</span>;
}

export function GameDetailsModal({ isOpen, game, onClose, onReview, onToggle }) {
  if (!isOpen || !game) return null;

  const isApproved = game.status === 'approved';
  const isPending = game.status === 'pending';
  const isEnabled = Boolean(game.enabled);

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title" id="gm-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GameIcon game={game} size="32px" />
            <span>{game.title}</span>
          </h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>

        {/* Modal Body */}
        <div id="gm-body">
          <div className="detail-grid" style={{ marginBottom: '1rem' }}>
            <div className="detail-field">
              <label>Publisher</label>
              <span>{game.publisher}</span>
            </div>
            <div className="detail-field">
              <label>Genre</label>
              <span>{game.genre}</span>
            </div>
            <div className="detail-field">
              <label>Players</label>
              <span>{game.players}</span>
            </div>
            <div className="detail-field">
              <label>Status</label>
              <span>
                <StatusBadge status={game.status} />
              </span>
            </div>
            <div className="detail-field">
              <label>Sessions</label>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{game.sessions}</span>
            </div>
            <div className="detail-field">
              <label>Views</label>
              <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                {Number(game.views || 0).toLocaleString()}
              </span>
            </div>
            <div className="detail-field">
              <label>Rating</label>
              <span>{game.rating ? `⭐ ${game.rating}` : '—'}</span>
            </div>
            <div className="detail-field">
              <label>Submitted</label>
              <span>{formatDate(game.submittedDate)}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'var(--text-secondary)'
              }}
            >
              {game.desc || 'No description provided.'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" id="gm-footer" style={{ marginTop: '1.25rem' }}>
          {isPending && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onReview(game)}
            >
              🔍 Review Build
            </button>
          )}
          {isApproved && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onToggle(game)}
            >
              {isEnabled ? '⛔ Blacklist' : '✅ Enable'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameDetailsModal;
