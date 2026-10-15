import React from 'react';
import { getPlayers } from '../../../services/moderatorService';

function getStatusBadgeClass(status) {
  switch (status) {
    case 'in-progress':
      return 'badge-progress';
    case 'completed':
      return 'badge-approved';
    default:
      return 'badge-active';
  }
}

function getStatusLabel(status) {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Match';
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin':
      return 'badge-admin';
    case 'moderator':
      return 'badge-moderator';
    case 'publisher':
      return 'badge-publisher';
    case 'superuser':
      return 'badge-superuser';
    default:
      return 'badge-player';
  }
}

function getUserAvatar(u) {
  if (!u) return '👤';
  if (u.avatar) return u.avatar;
  const name = u.user_name || u.username || 'U';
  return name.slice(0, 2).toUpperCase();
}

export function MonitorModal({
  isOpen,
  match,
  matchResults = [],
  users = [],
  onClose,
  onTerminate
}) {
  if (!isOpen || !match) return null;

  const plist = getPlayers(match, matchResults);
  const mid = String(match.match_id != null ? match.match_id : match.id);
  const gameTitle = match.game || 'Match';

  const formattedStarted = match.start_time
    ? new Date(match.start_time).toLocaleString()
    : '—';

  return (
    <div
      className="modal-overlay show"
      id="monitor-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-modal)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}
        >
          <h3 className="modal-title" id="monitor-title" style={{ margin: 0, fontSize: '1.15rem' }}>
            Monitoring: {gameTitle} #{mid}
          </h3>
          <span
            className="modal-close"
            style={{ cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-secondary)' }}
            onClick={onClose}
          >
            ✕
          </span>
        </div>

        <div id="monitor-content">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className={`badge ${getStatusBadgeClass(match.status)}`}>
              {getStatusLabel(match.status)}
            </span>
            <span className="tag">{match.mode || 'casual'}</span>
          </div>

          <div className="detail-grid mb-2 match-detail-grid">
            <div className="detail-field">
              <label>Game</label>
              <span>{match.game || 'Unknown'}</span>
            </div>
            <div className="detail-field">
              <label>Started</label>
              <span>{formattedStarted}</span>
            </div>
            <div className="detail-field">
              <label>Players</label>
              <span>{plist.length}</span>
            </div>
            <div className="detail-field">
              <label>Duration</label>
              <span>{match.duration || 0} seconds</span>
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              PLAYERS IN THIS MATCH
            </h4>

            {plist.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                No players recorded for this match.
              </p>
            ) : (
              <div className="match-players-list">
                {plist.map((pid) => {
                  const u = users.find(
                    (usr) => String(usr.user_id) === String(pid) || String(usr.id) === String(pid)
                  );
                  if (!u) {
                    return (
                      <div
                        key={pid}
                        className="list-item match-player-row"
                        style={{ padding: '0.6rem 0.9rem', marginBottom: '0.4rem' }}
                      >
                        <div className="avatar avatar-sm">??</div>
                        <div style={{ flex: 1, fontSize: '0.875rem' }}>
                          Player #{pid} <span className="badge badge-player">player</span>
                        </div>
                      </div>
                    );
                  }
                  const role = u.role || 'player';
                  return (
                    <div
                      key={pid}
                      className="list-item match-player-row"
                      style={{ padding: '0.6rem 0.9rem', marginBottom: '0.4rem' }}
                    >
                      <div className="avatar avatar-sm">{getUserAvatar(u)}</div>
                      <div style={{ flex: 1, fontSize: '0.875rem' }}>
                        <strong>{u.user_name || u.username}</strong>{' '}
                        <span className={`badge ${getRoleBadgeClass(role)}`}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      </div>
                      {u.status === 'banned' && (
                        <span className="badge badge-banned">Banned</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="alert alert-warning mt-2"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--accent-yellow)',
              fontSize: '0.85rem'
            }}
          >
            ⚠️ Terminating will disconnect all players immediately
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-primary)'
          }}
        >
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-red"
            id="terminate-btn"
            onClick={() => onTerminate(match)}
          >
            ⛔ Terminate Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default MonitorModal;
