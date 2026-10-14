import React from 'react';

export function TodayActivity(props) {
  const { activities = [] } = props;

  return (
    <div className="sidebar-section">
      <div className="sid-title">⚡ Today's Activity</div>
      <div id="today-activity">
        {activities.length > 0 ? (
          activities.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: '0.78rem'
              }}
            >
              <span>{it.icon}</span>
              <span style={{ color: it.color, flex: 1 }}>{it.text}</span>
            </div>
          ))
        ) : (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '0.5rem 0'
            }}
          >
            No activity today yet — play something!
          </div>
        )}
      </div>
    </div>
  );
}

export default TodayActivity;
