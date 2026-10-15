import React from 'react';

export function SuperuserHubKPIs(props) {
  const { stats = {}, activeSessions = 0, totalOnline = 0 } = props;

  const staffCount =
    (stats.admins || 0) + (stats.superusers || 0) + (stats.moderators || 0);

  const kpis = [
    {
      label: 'Total Users',
      val: stats.totalUsers ?? 0,
      sub: `${stats.players ?? 0} players`,
      icon: '👥',
      c: 'var(--accent-cyan)'
    },
    {
      label: 'Staff Accounts',
      val: staffCount,
      sub: `${stats.admins ?? 0} admin · ${stats.moderators ?? 0} mod`,
      icon: '👑',
      c: 'var(--accent-yellow)'
    },
    {
      label: 'Active Games',
      val: stats.activeGames ?? 0,
      sub: `of ${stats.totalGames ?? 0} total`,
      icon: '🎮',
      c: 'var(--accent-green)'
    },
    {
      label: 'Live Sessions',
      val: activeSessions,
      sub: `${totalOnline} online`,
      icon: '▶️',
      c: 'var(--accent-purple)'
    },
    {
      label: 'Pending Reports',
      val: stats.pendingReports ?? 0,
      sub: `${stats.activeBans ?? 0} bans active`,
      icon: '⚠️',
      c: 'var(--accent-red)'
    }
  ];

  return (
    <div className="kpi-grid" id="kpi-grid">
      {kpis.map((k) => (
        <div key={k.label} className="kpi-card" style={{ '--kc': k.c }}>
          <div className="kc-label">{k.label}</div>
          <div className="kc-val">{k.val}</div>
          <div className="kc-sub">{k.sub}</div>
          <div className="kc-icon">{k.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default SuperuserHubKPIs;
