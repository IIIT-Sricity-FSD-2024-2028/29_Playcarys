import React from 'react';
import GameCard from './GameCard';

export function GamesGrid({
  games = [],
  favs = [],
  showingFavs = false,
  onToggleFav,
  onSelectGame,
  onLaunch,
  offlineMap = {}
}) {
  if (!games.length) {
    return (
      <div
        className="empty-state"
        style={{
          padding: '3.5rem 1rem',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-primary)',
          marginTop: '1rem'
        }}
      >
        <div className="icon" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
          🎮
        </div>
        <h3 style={{ marginBottom: '0.4rem', fontFamily: "'Orbitron', monospace", color: '#fff' }}>
          {showingFavs ? 'No favourites yet' : 'No games found'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          {showingFavs ? 'Add games to favourites to see them here' : 'Try adjusting your filters'}
        </p>
      </div>
    );
  }

  return (
    <div className="cards-grid-4" id="games-grid">
      {games.map((g, i) => {
        const gid = String(g.id || g.game_id);
        const isFav = favs.includes(gid);
        const isOffline = !!offlineMap[gid];
        return (
          <GameCard
            key={gid}
            game={g}
            index={i}
            isFav={isFav}
            onToggleFav={onToggleFav}
            onSelectGame={onSelectGame}
            onLaunch={onLaunch}
            isOffline={isOffline}
          />
        );
      })}
    </div>
  );
}

export default GamesGrid;
