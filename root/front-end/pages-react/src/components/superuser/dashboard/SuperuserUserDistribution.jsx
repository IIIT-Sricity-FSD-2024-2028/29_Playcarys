import React from 'react';

export function SuperuserUserDistribution(props) {
  const { stats = {} } = props;

  const totalUsers = stats.totalUsers || 0;

  const categories = [
    { name: 'Players', count: stats.players || 0, color: 'var(--accent-cyan)' },
    { name: 'Publishers', count: stats.publishers || 0, color: 'var(--accent-green)' },
    { name: 'Moderators', count: stats.moderators || 0, color: 'var(--accent-purple)' },
    { name: 'Admins', count: stats.admins || 0, color: 'var(--accent-yellow)' }
  ];

  return (
    <div className="card">
      <h3 className="mb-2">User Distribution</h3>
      {categories.map((cat) => {
        const pct = totalUsers ? Math.round((cat.count / totalUsers) * 100) : 0;
        return (
          <div key={cat.name} className="analytics-bar-row">
            <div className="analytics-bar-label">{cat.name}</div>
            <div className="analytics-bar-track">
              <div
                className="analytics-bar-fill"
                style={{ width: `${pct}%`, background: cat.color }}
              />
            </div>
            <span
              style={{
                minWidth: '56px',
                textAlign: 'right',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {cat.count} <span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default SuperuserUserDistribution;
