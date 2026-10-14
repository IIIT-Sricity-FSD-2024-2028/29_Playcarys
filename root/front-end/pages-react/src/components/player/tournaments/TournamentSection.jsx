import React from 'react';
import TournamentCard from './TournamentCard';

export function TournamentSection({
  title,
  isLive = false,
  tournaments = [],
  emptyIcon = '🏆',
  emptyMessage = 'No tournaments found',
  userId,
  db,
  onSelect,
  onRegister,
  onWithdraw
}) {
  const count = tournaments.length;

  return (
    <div className="tournament-section-wrap">
      <div className="sec-label">
        <div className="sec-label-title">
          {isLive && <span className="live-dot" />}
          {title}
        </div>
        {count > 0 && <span className="sec-count">{count}</span>}
      </div>

      <div className="tournament-section-list">
        {count > 0 ? (
          tournaments.map((t) => (
            <TournamentCard
              key={t.id || t.tournament_id}
              tournament={t}
              userId={userId}
              db={db}
              onSelect={onSelect}
              onRegister={onRegister}
              onWithdraw={onWithdraw}
            />
          ))
        ) : (
          <div className="tempty">
            <span className="ico">{emptyIcon}</span>
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default TournamentSection;
