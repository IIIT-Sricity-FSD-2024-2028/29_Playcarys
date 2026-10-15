import React from 'react';

export function SuperuserDashboardStats(props) {
  const { stats = {} } = props;

  const statItems = [
    {
      label: 'Total Users',
      value: stats.totalUsers ?? 0,
      className: 'value text-cyan',
      icon: '👥'
    },
    {
      label: 'Active Games',
      value: stats.activeGames ?? 0,
      className: 'value text-green',
      icon: '🎮'
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingGames ?? 0,
      className: 'value text-yellow',
      icon: '✅'
    },
    {
      label: 'Moderators',
      value: stats.moderators ?? 0,
      className: 'value text-purple',
      icon: '🛡️'
    }
  ];

  return (
    <div className="stats-grid stats-grid-4" id="stats-grid">
      {statItems.map((item, index) => (
        <div key={index} className="stat-card">
          <div className="label">{item.label}</div>
          <div className={item.className}>{item.value}</div>
          <div className="icon">{item.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default SuperuserDashboardStats;
