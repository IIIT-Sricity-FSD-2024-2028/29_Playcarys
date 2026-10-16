import React from 'react';

export function AdminKPIs({ stats }) {
  const { admins = 0, moderators = 0, suspended = 0 } = stats || {};

  const kpis = [
    { label: 'Admins', val: admins, icon: '👑', cls: 'text-cyan' },
    { label: 'Moderators', val: moderators, icon: '🛡️', cls: 'text-purple' },
    { label: 'Suspended', val: suspended, icon: '⏸', cls: 'text-yellow' }
  ];

  return (
    <div className="stats-grid stats-grid-3 mt-2 mb-3" id="admin-kpis">
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

export default AdminKPIs;
