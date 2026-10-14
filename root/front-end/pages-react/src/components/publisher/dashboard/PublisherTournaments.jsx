import React from 'react';
import { getStatusBadgeData } from '../../../services/publisherService';

export function PublisherTournaments(props) {
  const { tournaments = [] } = props;

  return (
    <div className="card">
      <h3 className="side-h">🏆 Live Tournaments</h3>
      <div id="tournaments-list">
        {tournaments.length > 0 ? (
          tournaments.map((t, index) => {
            const name = t.tournament_name || t.name || 'Tournament';
            const count = t.participants || t.currentParticipants || 0;
            const max = t.maxParticipants || t.max_participants || '?';
            const badgeData = getStatusBadgeData(t.status);

            return (
              <div className="tourn-item" key={t.id || t.tournament_id || index}>
                <div>
                  <div className="tourn-name">{name}</div>
                  <div className="tourn-sub">
                    Participants: {count}/{max}
                  </div>
                </div>
                <span className={`badge ${badgeData.className}`}>
                  {badgeData.label}
                </span>
              </div>
            );
          })
        ) : (
          <p
            style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '1rem',
              fontSize: '0.875rem'
            }}
          >
            No tournaments hosted yet
          </p>
        )}
      </div>
    </div>
  );
}

export default PublisherTournaments;
