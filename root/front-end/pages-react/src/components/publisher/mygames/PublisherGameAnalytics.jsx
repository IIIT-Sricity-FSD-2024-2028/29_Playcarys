import React from 'react';
import {
  getStatusBadgeData,
  formatDate,
  publisherService
} from '../../../services/publisherService';

export function PublisherGameAnalytics({
  game,
  tournaments = [],
  matches = [],
  onBack,
  onEdit
}) {
  if (!game) return null;

  const gid = String(game.game_id || game.id);
  const statusKey = (game.game_approval_status || game.status || 'pending').toLowerCase();
  const isEnabled = game.game_status === 'enabled' || !!game.enabled;
  const isSelfHosted = (game.hosting_type || game.hostingType) === 'selfhosted';
  const badgeInfo = getStatusBadgeData(statusKey);

  const sessionCount = game.sessions || matches.length;
  const revPerSession = 15;
  const estRevenue = sessionCount * revPerSession;

  return (
    <div>
      {/* Back button */}
      <div className="back-row" onClick={onBack}>
        ← Back to My Games
      </div>

      {/* Header */}
      <div className="page-header-row mb-3">
        <div>
          <h1>{game.game_name || game.title}</h1>
          <p className="text-muted">Game Performance Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className={`badge ${badgeInfo.className}`}>{badgeInfo.label}</span>
          <span className={`badge ${isEnabled ? 'badge-enabled' : 'badge-disabled'}`}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* 5 KPI Stat Cards */}
      <div className="analytics-stat-row">
        <div className="stat-card">
          <div className="label">Total Views</div>
          <div className="value text-cyan">{publisherService.fmtViews(game.views)}</div>
          <div className="icon">👁️</div>
        </div>

        <div className="stat-card">
          <div className="label">Sessions</div>
          <div className="value text-green">{sessionCount}</div>
          <div className="icon">🎮</div>
        </div>

        <div className="stat-card">
          <div className="label">Tournaments</div>
          <div className="value text-yellow">{tournaments.length}</div>
          <div className="icon">🏆</div>
        </div>

        <div className="stat-card">
          <div className="label">Rating</div>
          <div className="value text-purple">{game.rating || 'N/A'}</div>
          <div className="icon">⭐</div>
        </div>

        <div className="stat-card">
          <div className="label">Est. Revenue</div>
          <div className="value" style={{ color: 'var(--accent-yellow)' }}>
            {estRevenue} PCP
          </div>
          <div className="icon">💰</div>
        </div>
      </div>

      {/* 2 Detail Cards */}
      <div className="cards-grid-2">
        {/* Game Details */}
        <div className="card">
          <h3 className="mb-2">📋 Game Details</h3>
          <div className="detail-grid">
            <div className="detail-field">
              <label>Genre</label>
              <span>{game.game_type || game.genre || 'General'}</span>
            </div>
            <div className="detail-field">
              <label>Players</label>
              <span>{game.players || '1-4'}</span>
            </div>
            <div className="detail-field">
              <label>Hosting</label>
              <span>{isSelfHosted ? '🔧 Self-Hosted' : '🏠 PlayCarys Hosted'}</span>
            </div>
            <div className="detail-field">
              <label>Published</label>
              <span>{formatDate(game.submittedDate)}</span>
            </div>
          </div>
        </div>

        {/* Tournaments List */}
        <div className="card">
          <h3 className="mb-2">🏆 Tournaments</h3>
          {tournaments.length > 0 ? (
            tournaments.map((t, idx) => {
              const tStatus = (t.status || 'upcoming').toLowerCase();
              const tBadge = getStatusBadgeData(tStatus);
              return (
                <div
                  key={t.tournament_id || t.id || idx}
                  style={{
                    padding: '0.6rem 0',
                    borderBottom: '1px solid var(--border-primary)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{t.tournament_name || t.name}</span>
                  <span className={`badge ${tBadge.className}`}>{tBadge.label}</span>
                </div>
              );
            })
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              No tournaments yet
            </p>
          )}
        </div>
      </div>

      {/* Action */}
      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onEdit(game)}
        >
          ✏️ Edit This Game
        </button>
      </div>
    </div>
  );
}

export default PublisherGameAnalytics;
