import React, { useState } from 'react';

export function BanPlayerView({ player, onBack, onIssueBan, submitting }) {
  const [duration, setDuration] = useState('7 Days');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!player) return null;

  const username = player.username || player.user_name || 'Unknown';
  const avatarText = player.avatar || username.slice(0, 2).toUpperCase();
  const level = player.level || 1;
  const wins = player.wins || 0;
  const losses = player.losses || 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!reason || reason.trim().length === 0) {
      setError('Ban reason is required');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (min 10 characters)');
      return;
    }
    setError('');
    onIssueBan({ duration, reason: reason.trim() });
  }

  return (
    <div id="ban-view">
      <div className="back-btn" onClick={onBack}>
        ← Back
      </div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.6rem', fontWeight: 800 }}>
        Ban Player
      </h1>
      <p className="text-muted mb-2">Issue a temporary or permanent ban</p>

      {/* Card 1: Player Information */}
      <div className="detail-card">
        <h3>Player Information</h3>
        <div className="ban-player-info-box">
          <div className="avatar avatar-lg">{avatarText}</div>
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.1rem', fontWeight: 700 }}>
              {username}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Level {level}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {wins}W / {losses}L · games played
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Ban Details */}
      <div className="detail-card">
        <h3>
          🚫 Ban Details{' '}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'Inter', textTransform: 'none', letterSpacing: 'normal' }}>
            Configure the ban settings for this player
          </span>
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="ban-duration">
              Ban Duration
            </label>
            <select
              className="form-select"
              id="ban-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={submitting}
            >
              <option value="1 Day">1 Day</option>
              <option value="3 Days">3 Days</option>
              <option value="7 Days">7 Days</option>
              <option value="14 Days">14 Days</option>
              <option value="30 Days">30 Days</option>
              <option value="Permanent">Permanent</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ban-reason">
              Reason <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <textarea
              className="form-textarea"
              id="ban-reason"
              rows="3"
              placeholder="Explain the reason for the ban..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              disabled={submitting}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: error ? '1px solid var(--accent-red)' : '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
            {error && (
              <span className="form-error" style={{ color: 'var(--accent-red)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                {error}
              </span>
            )}
            <span className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
              This reason will be visible to the player and stored in the moderation log
            </span>
          </div>

          <div
            className="alert alert-danger"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--accent-red)',
              fontSize: '0.85rem'
            }}
          >
            🚫 This action will prevent <strong>{username}</strong> from accessing the platform for the selected duration
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onBack}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-red"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Banning...' : '🚫 Issue Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BanPlayerView;
