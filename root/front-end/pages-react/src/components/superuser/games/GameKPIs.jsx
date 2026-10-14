import React from 'react';

export function GameKPIs({ stats }) {
  const {
    totalGames = 0,
    approvedGames = 0,
    pendingGames = 0,
    blacklistedGames = 0
  } = stats || {};

  const kpis = [
    { label: 'Total Games', val: totalGames, icon: '🎮', cls: 'text-cyan' },
    { label: 'Approved', val: approvedGames, icon: '✅', cls: 'text-green' },
    { label: 'Pending Review', val: pendingGames, icon: '⏳', cls: 'text-yellow' },
    { label: 'Blacklisted', val: blacklistedGames, icon: '⛔', cls: 'text-red' }
  ];

  return (
    <div className="stats-grid stats-grid-4 mt-2" id="game-kpis">
      {kpis.map((k) => (
        <div key={k.label} className="stat-card">
          <div className="label">{k.label}</div>
          <div className={`value ${k.cls}`}>{k.val}</div>
          <div className="icon">{k.icon}</div>
        </div>
      ))}
    </div>
  );
}

export default GameKPIs;
