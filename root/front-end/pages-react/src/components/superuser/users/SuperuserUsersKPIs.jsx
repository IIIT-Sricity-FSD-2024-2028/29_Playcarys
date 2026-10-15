import React from 'react';

export function SuperuserUsersKPIs(props) {
  const { stats = {} } = props;

  const kpis = [
    { label: 'Admins', val: stats.admins || 0, icon: '👑', cls: 'text-yellow' },
    { label: 'Moderators', val: stats.moderators || 0, icon: '🛡️', cls: 'text-purple' },
    { label: 'Publishers', val: stats.publishers || 0, icon: '⬆️', cls: 'text-green' },
    { label: 'Players', val: stats.players || 0, icon: '🎮', cls: 'text-cyan' }
  ];

  return (
    <div className="stats-grid stats-grid-4 mt-2" id="role-kpis">
      {kpis.map((k) => (
        <div key={k.label} className="stat-card">
          <div className="label">{k.label}</div>
          <div className={`value ${k.cls}`}>{k.val}</div>
          <div className="icon">{k.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default SuperuserUsersKPIs;
