/*
 * Concepts used in this component:
 *  - Components, Props (stats, onOpen), Events (card clicks), Callbacks (onOpen gets the page to open)
 *
 * The four clickable number cards at the top of the old dashboard.html.
 */
import React from 'react';

export function DashboardStats(props) {
  const { stats, onOpen } = props;

  return (
    <div className="stats-grid stats-grid-4" id="stats-grid">
      <div className="stat-card stat-link" onClick={() => onOpen('users')} title="Open user management">
        <div className="label">Total Users</div><div className="value text-cyan">{stats.totalUsers}</div>
        <div className="stat-sub">{stats.players} players · {stats.publishers} studios</div><div className="icon">👥</div>
      </div>
      <div className="stat-card stat-link" onClick={() => onOpen('approvals')} title="Open approvals">
        <div className="label">Active Games</div><div className="value text-green">{stats.activeGames}</div>
        <div className="stat-sub">of {stats.totalGames} in the catalogue</div><div className="icon">🎮</div>
      </div>
      <div
        className={'stat-card stat-link' + (stats.pendingGames ? ' stat-urgent' : '')}
        onClick={() => onOpen('approvals')}
        title="Review pending builds"
      >
        <div className="label">Pending Approvals</div><div className="value text-yellow">{stats.pendingGames}</div>
        <div className="stat-sub">{stats.pendingGames ? 'waiting on you' : 'queue clear'}</div><div className="icon">✅</div>
      </div>
      <div className="stat-card stat-link" onClick={() => onOpen('users')} title="Open user management">
        <div className="label">Moderators</div><div className="value text-purple">{stats.moderators}</div>
        <div className="stat-sub">{stats.moderators ? '1 per ' + Math.round(stats.players / stats.moderators) + ' players' : 'none assigned'}</div><div className="icon">🛡️</div>
      </div>
    </div>
  );
}

export default DashboardStats;
