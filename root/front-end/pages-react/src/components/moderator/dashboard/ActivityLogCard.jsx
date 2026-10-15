import React from 'react';

export function ActivityLogCard(props) {
  const { logItems = [] } = props;

  return (
    <div className="card" style={{ flex: 1 }}>
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
        🕐 Activity Log
      </div>
      <div
        className="timeline"
        id="activity-log"
        style={{ maxHeight: '260px', overflowY: 'auto' }}
      >
        {logItems.length === 0 ? (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '1rem'
            }}
          >
            No recent activity
          </p>
        ) : (
          logItems.map((l, index) => (
            <div className="tl-item" key={index}>
              <div className="tl-dot" style={{ background: l.color }}>
                {l.icon}
              </div>
              <div className="tl-body">
                <div className="tl-title">{l.text}</div>
                <div className="tl-time">{l.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActivityLogCard;
