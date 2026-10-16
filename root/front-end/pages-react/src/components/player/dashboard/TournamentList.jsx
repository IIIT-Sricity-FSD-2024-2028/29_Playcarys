import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../services/playerService';

export function TournamentList(props) {
  const { tournaments = [] } = props;
  const navigate = useNavigate();

  function getBadgeClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'in-progress') return 'badge-progress';
    if (s === 'upcoming') return 'badge-upcoming';
    if (s === 'completed') return 'badge-approved';
    return 'badge-active';
  }

  function getBadgeLabel(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'in-progress') return 'In Progress';
    if (s === 'upcoming') return 'Upcoming';
    if (s === 'completed') return 'Completed';
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Live';
  }

  function handleCardClick(id) {
    navigate(`/player/tournaments?highlight=${id}`);
  }

  return (
    <>
      <div className="sec-label">
        <div className="sec-label-title">Live Events</div>
        <span
          className="sec-label-link"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/player/tournaments')}
          role="button"
          tabIndex={0}
        >
          View all →
        </span>
      </div>

      <div className="tourn-strip" id="tourn-strip">
        {tournaments.length > 0 ? (
          tournaments.map((t) => {
            const tId = t.tournament_id || t.id;
            const tName = t.tournament_name || t.name || 'Tournament';
            const gName = t.gameName || 'Game';
            const dateStr = formatDate(t.start_date || t.startDate);
            const participants = t.participants || 0;
            const maxParticipants = t.maxParticipants || t.max_participants || '?';
            const badgeClass = getBadgeClass(t.status);
            const badgeLabel = getBadgeLabel(t.status);

            return (
              <div
                key={tId}
                className="tourn-strip-card"
                onClick={() => handleCardClick(tId)}
                title="View tournament details"
              >
                <div className="ts-icon">🏆</div>
                <div className="ts-info">
                  <div className="ts-name">{tName}</div>
                  <div className="ts-meta">
                    {gName} · {dateStr} · {participants}/{maxParticipants} players
                  </div>
                </div>
                <div>
                  {t.prize && <div className="ts-prize">{t.prize}</div>}
                  <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.5rem' }}>
            No events scheduled
          </div>
        )}
      </div>
    </>
  );
}

export default TournamentList;
