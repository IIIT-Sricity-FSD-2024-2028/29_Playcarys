import React from 'react';

export function TournamentTabs({ activeTab = 'tab-overview', onTabChange }) {
  const tabs = [
    { id: 'tab-overview', label: '📁 Overview' },
    { id: 'tab-bracket', label: '🎯 Bracket' },
    { id: 'tab-format', label: '📜 Format & Rules' },
    { id: 'tab-leaderboard', label: '🏆 Leaderboard & Participants' }
  ];

  return (
    <div className="t-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`t-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}

export default TournamentTabs;
