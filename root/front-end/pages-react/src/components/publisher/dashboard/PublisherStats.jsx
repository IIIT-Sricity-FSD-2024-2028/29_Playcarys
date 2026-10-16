import React from 'react';
import { useNavigate } from 'react-router-dom';
import Money from '../../../utils/money';

export function PublisherStats(props) {
  const navigate = useNavigate();
  const {
    totalGames = 0,
    approvedCount = 0,
    pendingCount = 0,
    totalViews = 0,
    totalSessions = 0,
    liveCount = 0,
    revenuePcp = 0,
    earningsData = null,
    earningsLoading = false
  } = props;

  let earningsValue = '…';
  let earningsSub = `${revenuePcp.toLocaleString('en-IN')} Carys earned`;

  if (!earningsLoading && earningsData) {
    // Same figure as the Earnings page's "Available to withdraw".
    earningsValue = Money.formatINR(earningsData.available_paise);
    if (earningsData.withdraw) {
      earningsSub = earningsData.withdraw.can_withdraw
        ? 'Ready to withdraw'
        : earningsData.active_payout
          ? 'Withdrawal in progress'
          : `Withdraw from ${earningsData.min_payout_display}`;
    }
  } else if (!earningsLoading && !earningsData) {
    earningsValue = '—';
  }

  const avgViewsPerGame = totalGames > 0 ? Math.round(totalViews / totalGames) : 0;

  const stats = [
    {
      label: 'Total Games',
      value: totalGames,
      color: 'var(--accent-cyan)',
      icon: '🎮',
      sub: pendingCount > 0 ? `${pendingCount} awaiting review` : 'all reviewed'
    },
    {
      label: 'Approved',
      value: approvedCount,
      color: 'var(--accent-green)',
      icon: '✅',
      sub: `of ${totalGames} submitted`
    },
    {
      label: 'Total Views',
      value: totalViews.toLocaleString('en-IN'),
      color: 'var(--accent-purple)',
      icon: '👁️',
      sub: totalGames > 0 ? `~${avgViewsPerGame.toLocaleString('en-IN')} per game` : '—'
    },
    {
      label: 'Sessions Played',
      value: totalSessions.toLocaleString('en-IN'),
      color: 'var(--accent-cyan)',
      icon: '🕹️',
      sub: liveCount > 0 ? `across ${liveCount} live game${liveCount === 1 ? '' : 's'}` : 'nothing live yet'
    },
    {
      label: 'Earnings',
      value: earningsValue,
      color: 'var(--accent-yellow)',
      icon: '💰',
      sub: earningsSub,
      id: 'stat-earnings',
      href: '/publisher/earnings'
    }
  ];

  return (
    <div className="stats-row" id="stats-row">
      {stats.map((s, index) => {
        const isClickable = Boolean(s.href);
        return (
          <div
            key={index}
            className={`stat-premium ${isClickable ? 'stat-clickable' : ''}`}
            onClick={() => {
              if (s.href) {
                if (s.href.startsWith('/publisher/')) {
                  navigate(s.href);
                } else {
                  window.location.href = s.href;
                }
              }
            }}
            title={isClickable ? 'Open earnings' : ''}
          >
            <div className="sp-icon">{s.icon}</div>
            <div className="sp-label">{s.label}</div>
            <div
              className="sp-value"
              style={{ color: s.color }}
              id={s.id || undefined}
            >
              {s.value}
            </div>
            <div className="sp-trend">{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

export default PublisherStats;
