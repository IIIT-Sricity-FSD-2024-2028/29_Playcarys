import React from 'react';

export function DailyStreak(props) {
  const { streak = 0, bonusMsg = null } = props;

  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const today = new Date().getDay();

  return (
    <div className="sidebar-section">
      <div className="sid-title">🔥 Daily Streak</div>
      <div id="streak-widget">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '0.65rem'
          }}
        >
          {days.map((d, i) => {
            const active = i <= today && streak > today - i;
            return (
              <div
                key={d}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: active
                      ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
                      : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: active ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  {active ? '🔥' : d}
                </div>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                  {d}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-yellow)' }}>
            🔥 {streak}-day streak
          </span>
          {bonusMsg && (
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(245,158,11,0.15)',
                color: 'var(--accent-yellow)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '99px',
                padding: '0.1rem 0.5rem'
              }}
            >
              {bonusMsg} bonus!
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '0.68rem',
            color: 'var(--text-secondary)',
            marginTop: '0.3rem'
          }}
        >
          Log in daily to keep your streak &amp; earn bonus PCP
        </div>
      </div>
    </div>
  );
}

export default DailyStreak;
