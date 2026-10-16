import React from 'react';

export function SuperuserGamesOverview(props) {
  const { stats = {}, totalGames = 0 } = props;

  const rows = [
    { label: 'Total Games', val: totalGames, color: 'var(--text-primary)' },
    { label: 'Approved', val: stats.approvedGames || 0, color: 'var(--accent-green)' },
    { label: 'Pending Approval', val: stats.pendingGames || 0, color: 'var(--accent-yellow)' },
    { label: 'Active', val: stats.activeGames || 0, color: 'var(--accent-cyan)' }
  ];

  return (
    <div className="card">
      <h3 className="mb-2">Games Overview</h3>
      {rows.map((row) => (
        <div key={row.label} className="analytics-bar-row">
          <div className="analytics-bar-label">{row.label}</div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: row.color }}>
            {row.val}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SuperuserGamesOverview;
