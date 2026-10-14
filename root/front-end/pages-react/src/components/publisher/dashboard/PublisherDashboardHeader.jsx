import React from 'react';

export function PublisherDashboardHeader(props) {
  const { username = 'Publisher', pendingCount = 0, liveCount = 0, totalGames = 0 } = props;

  let subtitle = '';
  const bits = [];
  if (pendingCount > 0) bits.push(`${pendingCount} awaiting review`);
  if (liveCount > 0) bits.push(`${liveCount} live`);

  if (bits.length > 0) {
    subtitle = bits.join(' · ');
  } else if (totalGames > 0) {
    subtitle = 'Everything is reviewed and live.';
  } else {
    subtitle = 'Publish your first game to get started.';
  }

  function handleNavigate(url) {
    window.location.href = url;
  }

  return (
    <div className="pub-head">
      <div className="pub-head-text">
        <div className="hero-greeting">Publisher Studio</div>
        <h1 className="pub-title">Welcome back, {username}</h1>
        <div className="pub-sub">{subtitle}</div>
      </div>
      <div className="pub-head-actions">
        <button
          className="btn btn-primary"
          onClick={() => handleNavigate('/publisher/publish')}
        >
          🎮 Publish Game
        </button>
        <button
          className="btn btn-purple"
          onClick={() => handleNavigate('/publisher/publish-tournament')}
        >
          🏆 New Tournament
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => handleNavigate('/pages/publisher/manage-genres.html')}
        >
          🏷️ Genres
        </button>
      </div>
    </div>
  );
}

export default PublisherDashboardHeader;
