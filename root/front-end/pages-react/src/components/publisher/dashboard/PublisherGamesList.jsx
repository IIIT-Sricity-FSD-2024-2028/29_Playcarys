import React from 'react';
import PublisherGameRow from './PublisherGameRow';

export function PublisherGamesList(props) {
  const { games = [] } = props;

  function handleManageAll() {
    window.location.href = '/pages/publisher/mygames.html';
  }

  function handlePublishNew() {
    window.location.href = '/publisher/publish';
  }

  return (
    <div className="pub-main">
      <div className="section-hdr">
        <h2>
          🎮 Your Games{' '}
          {games.length > 0 && (
            <span className="count-chip" id="games-count">
              {games.length}
            </span>
          )}
        </h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleManageAll}
        >
          Manage all →
        </button>
      </div>

      <div className="game-rows" id="games-grid">
        {games.length > 0 ? (
          games.map((game, index) => (
            <PublisherGameRow
              key={game.id || game.game_id || index}
              game={game}
              index={index}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="icon">🎮</div>
            <h3>No games yet</h3>
            <p>Publish your first game to get started</p>
            <button
              className="btn btn-primary mt-2"
              onClick={handlePublishNew}
            >
              Publish Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublisherGamesList;
