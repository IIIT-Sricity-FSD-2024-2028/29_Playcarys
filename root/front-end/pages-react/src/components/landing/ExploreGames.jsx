/*
 * Concepts used in this component:
 *  - Components, Props (games, callbacks), Lists (one card per game with a key), Events (clicks),
 *    Callbacks (the page decides what "Play as Guest" and the picture click do)
 *
 * The "Explore Games" section: up to 8 approved games from the old database as cards.
 * Clicking a picture opens the player sign-in; the button signs in as a guest.
 */
import React from 'react';
import GameIcon from '../admin/common/GameIcon';

export function ExploreGames(props) {
  const { games, onSignIn, onGuest } = props;

  return (
    <section className="section" id="games">
      <h2 className="section-title">⭐ Explore Games ⭐</h2>
      <p className="section-sub">Discover games tailored for you and play instantly as a guest!</p>
      <div className="cards-grid-4" id="trending-grid" style={{ marginTop: '2.5rem' }}>
        {games.map((game, index) => (
          <div className="game-card" key={game.id || game.game_id || index}>
            <div className="game-card-img-wrap" onClick={onSignIn}>
              <GameIcon game={game} index={index} size="100%" extraStyle={{ position: 'absolute', inset: 0 }} />
              <div className="genre-badge">{game.genre}</div>
            </div>
            <div className="game-card-body">
              <div className="game-card-title">{game.title}</div>
              <p className="game-card-desc">{game.desc}</p>
              <div className="game-card-meta mb-2">
                <span>👥 {game.players}</span>
                <span style={{ color: 'var(--accent-yellow)' }}>⭐ {game.rating}</span>
              </div>
              <div className="game-card-actions">
                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={onGuest}
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                >
                  👤 Play as Guest
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ExploreGames;
