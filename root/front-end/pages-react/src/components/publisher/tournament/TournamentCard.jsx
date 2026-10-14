import React from 'react';
import { formatDate, getStatusBadgeData } from '../../../services/publisherService';

export function TournamentCard({
  tournament,
  gameName = 'Unknown',
  isMulti = false,
  onManage,
  onEdit,
  onDelete
}) {
  const t = tournament;
  const statusInfo = getStatusBadgeData(t.status || 'upcoming');
  const tid = t.tournament_id || t.id;

  const stageChain =
    isMulti && t.stage_games && t.stage_games.length > 0
      ? t.stage_games.map((s) => s.game_name).join(' → ')
      : null;

  return (
    <div className="tourn-card">
      <div style={{ fontSize: '2.2rem', opacity: 0.8 }}>
        {isMulti ? '🏅' : '🏆'}
      </div>

      <div className="tourn-info">
        <div className="tourn-title">{t.tournament_name || t.name}</div>
        <div className="tourn-meta">
          {isMulti ? (
            <span>🏅 {stageChain || 'Multi-Game Stages'}</span>
          ) : (
            <span>🎮 {gameName}</span>
          )}
          <span>
            👥 {t.participants || 0}/{t.maxParticipants || 32}
          </span>
          <span style={{ color: 'var(--accent-yellow)' }}>💰 {t.prize}</span>
          <span>📅 {formatDate(t.start_date || t.startDate)}</span>
          {t.visibility === 'private' && <span>🔒 Private</span>}
          <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
        </div>
      </div>

      <div className="tourn-actions">
        <button
          className="btn btn-purple btn-sm"
          onClick={() => onManage(tid)}
        >
          ⚙️ Manage
        </button>
        {!isMulti && onEdit && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onEdit(tid)}
          >
            ✏️ Edit
          </button>
        )}
        {!isMulti && onDelete && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--accent-red)' }}
            onClick={() => onDelete(tid)}
            title="Delete tournament"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

export default TournamentCard;
