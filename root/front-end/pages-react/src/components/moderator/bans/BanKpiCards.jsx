import React from 'react';
import { isPlayer } from '../../../services/moderatorService';

export function BanKpiCards({ users = [] }) {
  const players = users.filter(isPlayer);
  const totalPlayers = players.length;
  const bannedPlayers = players.filter((u) => u.status === 'banned').length;
  const activePlayers = players.filter((u) => u.status !== 'banned').length;

  return (
    <div className="stats-grid stats-grid-3 mb-3">
      <div className="stat-card">
        <div className="label">Total Players</div>
        <div className="value" id="s-total">
          {totalPlayers}
        </div>
        <div className="icon">👥</div>
      </div>
      <div className="stat-card">
        <div className="label">Banned</div>
        <div className="value text-red" id="s-banned">
          {bannedPlayers}
        </div>
        <div className="icon">🚫</div>
      </div>
      <div className="stat-card">
        <div className="label">Active</div>
        <div className="value text-green" id="s-active">
          {activePlayers}
        </div>
        <div className="icon">✅</div>
      </div>
    </div>
  );
}

export default BanKpiCards;
