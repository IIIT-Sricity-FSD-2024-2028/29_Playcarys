import React from 'react';

export function SuperuserHubPlatformRatios(props) {
  const { stats = {}, reportsCount = 0, tournaments = [] } = props;

  const tournamentParticipants = (tournaments || []).reduce(
    (a, t) => a + (t.participants || 0),
    0
  );
  const tournamentMaxParticipants = (tournaments || []).reduce(
    (a, t) => a + (t.maxParticipants || 0),
    0
  );

  const healths = [
    [
      'Player Accounts',
      Math.round(((stats.players || 0) / Math.max(stats.totalUsers || 0, 1)) * 100),
      'var(--accent-cyan)'
    ],
    [
      'Catalogue Live',
      Math.round(((stats.activeGames || 0) / Math.max(stats.totalGames || 0, 1)) * 100),
      'var(--accent-green)'
    ],
    [
      'Reports Open',
      Math.round(((stats.pendingReports || 0) / Math.max(reportsCount || 0, 1)) * 100),
      'var(--accent-yellow)'
    ],
    [
      'Players Banned',
      Math.round(((stats.activeBans || 0) / Math.max(stats.players || 0, 1)) * 100),
      'var(--accent-red)'
    ],
    [
      'Tournament Fill',
      Math.round((tournamentParticipants / Math.max(tournamentMaxParticipants, 1)) * 100),
      'var(--accent-purple)'
    ]
  ];

  return (
    <div id="health-bars">
      {healths.map(([l, p, c]) => (
        <div key={l} className="health-row">
          <span className="health-label">{l}</span>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${p}%`, background: c }}
            />
          </div>
          <span className="health-pct" style={{ color: c }}>
            {p}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default SuperuserHubPlatformRatios;
