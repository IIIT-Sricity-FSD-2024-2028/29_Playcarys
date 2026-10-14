/*
 * Concepts used in this component:
 *  - Components, Props (stats, totalGames), Lists (one bar row per role / per game figure)
 *
 * "User Distribution" and "Games Overview" cards of the old dashboard.html.
 */
import React from 'react';

export function DashboardOverview(props) {
  const { stats, totalGames } = props;

  const userRows = [
    ['Players', stats.players, stats.totalUsers, 'var(--accent-cyan)'],
    ['Publishers', stats.publishers, stats.totalUsers, 'var(--accent-green)'],
    ['Moderators', stats.moderators, stats.totalUsers, 'var(--accent-purple)'],
    ['Admins', stats.admins, stats.totalUsers, 'var(--accent-yellow)']
  ];

  const gameRows = [
    ['Total Games', totalGames, 'var(--text-primary)'],
    ['Approved', stats.approvedGames, 'var(--accent-green)'],
    ['Pending Approval', stats.pendingGames, 'var(--accent-yellow)'],
    ['Active', stats.activeGames, 'var(--accent-cyan)']
  ];

  return (
    <div className="cards-grid-2 mt-3" id="overview-section">
      <div className="card">
        <h3 className="mb-2">User Distribution</h3>
        {userRows.map(([name, count, total, color]) => {
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div className="analytics-bar-row" key={name}>
              <div className="analytics-bar-label">{name}</div>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill" style={{ width: pct + '%', background: color }}></div>
              </div>
              <span style={{ width: '60px', textAlign: 'right', fontSize: '0.82rem' }}>
                {count} <span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="card">
        <h3 className="mb-2">Games Overview</h3>
        {gameRows.map(([label, val, color]) => (
          <div className="analytics-bar-row" key={label}>
            <div className="analytics-bar-label">{label}</div>
            <div style={{ flex: 1 }}></div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: color }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardOverview;
