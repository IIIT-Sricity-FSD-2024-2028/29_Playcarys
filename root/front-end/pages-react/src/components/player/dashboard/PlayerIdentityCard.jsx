import React, { useState, useEffect } from 'react';

export function PlayerIdentityCard(props) {
  const {
    user,
    pcp = 0,
    tierInfo = { name: 'Bronze', color: '#d97706' },
    xpProgress = 0,
    xpTierSize = 1000,
    level = 1,
    elo = 1200,
    matches = 0,
    wins = 0,
    winRate = 0,
    isGuest = false,
    pct = 0
  } = props;

  const [ringOffset, setRingOffset] = useState(226);

  useEffect(() => {
    // Animate progress ring on load / prop update
    const calculatedOffset = 226 - 226 * (pct / 100);
    const timer = setTimeout(() => {
      setRingOffset(calculatedOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [pct]);

  const username = user?.username || (isGuest ? 'Guest Player' : 'Player');
  const avatarText = user?.avatar || username.slice(0, 2).toUpperCase();

  return (
    <div className="sidebar-section player-id-card">
      <div className="pid-glow" />

      <div
        style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          margin: '0 auto 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* SVG Ring */}
        <svg
          width="80"
          height="80"
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <circle
            id="sid-xp-ring"
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={tierInfo.color || 'var(--accent-purple)'}
            strokeWidth="4"
            strokeDasharray="226"
            strokeDashoffset={ringOffset}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              strokeLinecap: 'round'
            }}
          />
        </svg>

        <div
          className="pid-avatar"
          id="sid-avatar"
          style={{
            width: '60px',
            height: '60px',
            margin: 0,
            position: 'relative',
            zIndex: 2,
            fontSize: '1.5rem'
          }}
        >
          {avatarText}
          <div
            className="pid-online"
            style={{ bottom: '-2px', right: '-2px', width: '14px', height: '14px', borderWidth: '3px' }}
          />
        </div>
      </div>

      <div className="pid-name" id="sid-name">{username}</div>
      <div className="pid-sub" id="sid-sub" style={{ fontWeight: 700 }}>
        {isGuest ? (
          'Guest Progression'
        ) : (
          <span style={{ color: tierInfo.color }}>❖ {tierInfo.name} Tier</span>
        )}
      </div>

      {/* PCP */}
      <div className="pcp-block">
        <div className="pcp-icon">💎</div>
        <div>
          <div className="pcp-val-txt" id="sid-pcp">
            {pcp.toLocaleString()}
          </div>
          <div className="pcp-lbl-txt">PlayCarys Points</div>
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          margin: '0 auto 1rem',
          letterSpacing: '0.05em',
          fontFamily: "'Orbitron', monospace"
        }}
      >
        <span id="sid-xp-now">{xpProgress.toLocaleString()}</span> /{' '}
        <span id="sid-xp-next">{xpTierSize.toLocaleString()}</span> XP TO LEVEL{' '}
        <span id="sid-level-next">{level + 1}</span>
      </div>

      {/* Stats grid */}
      <div className="pid-stats" id="sid-stats">
        <div className="pid-stat" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="pid-stat-val text-cyan" id="sid-level">{level}</div>
          <div className="pid-stat-lbl">Level</div>
        </div>
        <div className="pid-stat" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="pid-stat-val text-yellow" id="sid-elo">
            <span style={{ color: tierInfo.color }}>{elo}</span>
          </div>
          <div className="pid-stat-lbl">Elo Score</div>
        </div>
        <div className="pid-stat" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="pid-stat-val" id="sid-matches">{matches}</div>
          <div className="pid-stat-lbl">Matches</div>
        </div>
        <div className="pid-stat" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="pid-stat-val text-green" id="sid-wins">{wins}</div>
          <div className="pid-stat-lbl">Wins</div>
        </div>
        <div className="pid-stat" style={{ background: 'rgba(0,0,0,0.3)', gridColumn: 'span 2' }}>
          <div className="pid-stat-val" id="sid-winrate" style={{ color: '#a78bfa' }}>
            {winRate}%
          </div>
          <div className="pid-stat-lbl">📈 Win Rate</div>
        </div>
      </div>
    </div>
  );
}

export default PlayerIdentityCard;
