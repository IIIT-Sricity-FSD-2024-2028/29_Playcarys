import React from 'react';

export function ModeratorStatsRow(props) {
  const {
    pendingReports = 0,
    reviewReports = 0,
    totalResolved = 0,
    liveNow = 0,
    activeBans = 0,
    todayReports = 0
  } = props;

  const statsData = [
    {
      label: 'Pending Reports',
      value: pendingReports,
      color: 'var(--accent-yellow)',
      icon: '⚠️',
      sub: !pendingReports
        ? 'queue clear'
        : todayReports
        ? `${todayReports} filed today`
        : 'carried over from earlier',
      href: '/pages/moderator/reports.html',
      urgent: pendingReports > 0
    },
    {
      label: 'Under Review',
      value: reviewReports,
      color: 'var(--accent-purple)',
      icon: '🔍',
      sub: 'being handled now',
      href: '/pages/moderator/reports.html'
    },
    {
      label: 'Resolved Total',
      value: totalResolved,
      color: 'var(--accent-green)',
      icon: '✅',
      sub: 'all time'
    },
    {
      label: 'Active Sessions',
      value: liveNow,
      color: 'var(--accent-cyan)',
      icon: '🎮',
      sub: liveNow ? 'playing right now' : 'nothing live',
      href: '/pages/moderator/sessions.html'
    },
    {
      label: 'Banned Players',
      value: activeBans,
      color: 'var(--accent-red)',
      icon: '🚫',
      sub: 'bans in force',
      href: '/pages/moderator/bans.html'
    }
  ];

  return (
    <div className="mod-stats-row" id="mod-stats-row">
      {statsData.map((d, index) => {
        const isClickable = Boolean(d.href);
        const cardClasses = `mod-stat${isClickable ? ' stat-link' : ''}${d.urgent ? ' stat-urgent' : ''}`;

        const cardContent = (
          <>
            <div className="mod-stat-label">{d.label}</div>
            <div className="mod-stat-value" style={{ color: d.color }}>
              {d.value}
            </div>
            <div className="mod-stat-sub stat-sub">
              <span>{d.icon}</span> <span>{d.sub}</span>
            </div>
          </>
        );

        if (isClickable) {
          return (
            <div
              key={index}
              className={cardClasses}
              onClick={() => {
                window.location.href = d.href;
              }}
              title={`Open ${d.label.toLowerCase()}`}
            >
              {cardContent}
            </div>
          );
        }

        return (
          <div key={index} className={cardClasses}>
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}

export default ModeratorStatsRow;
