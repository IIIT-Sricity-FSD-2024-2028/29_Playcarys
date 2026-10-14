import React from 'react';

export function ModeratorPerformanceCard(props) {
  const { actionsTaken = 0, warnsByMe = 0, bansByMe = 0, sharePercent = 0 } = props;

  const perfRows = [
    {
      label: 'Actions Taken',
      val: actionsTaken,
      displayVal: actionsTaken,
      max: Math.max(actionsTaken, 5),
      color: '#00d4ff'
    },
    {
      label: 'Warnings Issued',
      val: warnsByMe,
      displayVal: warnsByMe,
      max: Math.max(warnsByMe, 3),
      color: '#f59e0b'
    },
    {
      label: 'Bans Issued',
      val: bansByMe,
      displayVal: bansByMe,
      max: Math.max(bansByMe, 2),
      color: '#ef4444'
    },
    {
      label: 'Team Share (%)',
      val: sharePercent,
      displayVal: `${sharePercent}%`,
      max: 100,
      color: '#7c3aed'
    }
  ];

  return (
    <div className="card">
      <div
        className="sid-title"
        style={{
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 900,
          color: 'var(--text-muted)',
          marginBottom: '0.85rem'
        }}
      >
        🏆 Your Moderation Record
      </div>
      <div className="perf-stat-list" id="perf-list">
        {perfRows.map((r, index) => {
          const pct = Math.min(100, Math.max(0, ((parseInt(r.val, 10) || 0) / r.max) * 100));

          return (
            <div className="perf-row" key={index}>
              <span
                style={{
                  minWidth: '110px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}
              >
                {r.label}
              </span>
              <div className="perf-bar-wrap">
                <div
                  className="perf-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: r.color
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: r.color,
                  minWidth: '36px',
                  textAlign: 'right'
                }}
              >
                {r.displayVal}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ModeratorPerformanceCard;
