/*
 * Concepts used in this component:
 *  - Components, Props (stats)
 *
 * The four number cards under the title of the old users.html.
 */
import React from 'react';

export function UserStats(props) {
  const { stats } = props;

  return (
    <div className="stats-grid stats-grid-4 mt-2" id="stats-row">
      <div className="stat-card"><div className="label">Players</div><div className="value text-cyan">{stats.players}</div><div className="icon">🎮</div></div>
      <div className="stat-card"><div className="label">Publishers</div><div className="value text-green">{stats.publishers}</div><div className="icon">⬆️</div></div>
      <div className="stat-card"><div className="label">Moderators</div><div className="value text-purple">{stats.moderators}</div><div className="icon">🛡️</div></div>
      <div className="stat-card"><div className="label">Total Users</div><div className="value">{stats.totalUsers}</div><div className="icon">👥</div></div>
    </div>
  );
}

export default UserStats;
