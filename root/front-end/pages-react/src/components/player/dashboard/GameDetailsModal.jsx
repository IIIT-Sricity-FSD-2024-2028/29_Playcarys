import React from 'react';
import { GAME_ASSETS, formatDate } from '../../../services/playerService';

export function GameDetailsModal(props) {
  const { isOpen = false, game = null, publisherName = 'PlayCarys', onClose, onPlay } = props;

  if (!isOpen || !game) {
    return null;
  }

  const title = game.game_name || game.title || 'Game';
  const genre = game.game_type || game.genre || 'Game';
  const desc = game.desc || game.description || 'No description available.';
  const ratingNum = Math.round(Number(game.rating) || 4);
  const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
  const ratingText = game.rating || '4.0';
  const joinedDate = formatDate(game.submittedDate || game.created_at);
  const players = game.players || 'Unknown';
  const imgKey = game.img || '';
  const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
  const gameId = game.id || game.game_id;

  return (
    <div
      className="modal-overlay"
      id="biodata-modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: '550px',
          width: '90%',
          textAlign: 'left',
          padding: '2.5rem',
          backgroundColor: 'var(--bg-modal, #0e1118)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          boxShadow: 'var(--shadow-modal)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.25rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div id="bio-icon" style={{ fontSize: '3.5rem', lineHeight: 1, flexShrink: 0 }}>
            {emoji}
          </div>
          <div>
            <h2
              id="bio-title"
              style={{
                marginBottom: '0.25rem',
                fontFamily: "'Orbitron', monospace",
                fontSize: '1.8rem',
                color: '#fff'
              }}
            >
              {title}
            </h2>
            <div
              id="bio-genre"
              className="tag"
              style={{
                marginBottom: '0.5rem',
                display: 'inline-block',
                background: 'rgba(0, 212, 255, 0.1)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '99px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {genre}
            </div>
          </div>
        </div>

        <div
          id="bio-desc"
          style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}
        >
          {desc}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.25rem'
              }}
            >
              Rating
            </div>
            <div id="bio-rating" style={{ fontSize: '1.1rem', color: 'var(--accent-yellow)', fontWeight: 800 }}>
              <span style={{ color: 'var(--accent-yellow)', marginRight: '0.4rem' }}>{stars}</span>
              {ratingText}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.25rem'
              }}
            >
              Capacity
            </div>
            <div id="bio-players" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {players}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.25rem'
              }}
            >
              Publisher Studio
            </div>
            <div id="bio-publisher" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {publisherName}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.25rem'
              }}
            >
              Platform Joined
            </div>
            <div id="bio-joined" style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
              {joinedDate}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            id="bio-play-btn"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)' }}
            onClick={() => {
              if (onPlay) onPlay(gameId);
            }}
          >
            ▶ Play Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameDetailsModal;
