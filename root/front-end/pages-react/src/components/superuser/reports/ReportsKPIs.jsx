import React from 'react';

export function ReportsKPIs(props) {
  const { pendingReports = 0, underReviewReports = 0, resolvedReports = 0, activeBans = 0 } = props;

  const kpis = [
    { label: 'Pending Reports', val: pendingReports, icon: '🔴', cls: 'text-red' },
    { label: 'Under Review', val: underReviewReports, icon: '🟡', cls: 'text-yellow' },
    { label: 'Resolved', val: resolvedReports, icon: '✅', cls: 'text-green' },
    { label: 'Active Bans', val: activeBans, icon: '🚫', cls: 'text-red' }
  ];

  return (
    <div className="stats-grid stats-grid-4 mt-2 mb-3" id="rb-kpis">
      {kpis.map((k, index) => (
        <div className="stat-card" key={index}>
          <div className="label">{k.label}</div>
          <div className={`value ${k.cls}`}>{k.val}</div>
          <div className="icon">{k.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default ReportsKPIs;
