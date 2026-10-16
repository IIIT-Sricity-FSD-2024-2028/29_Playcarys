import React, { useState } from 'react';
import playerService, { getDatabase, formatDate, sameId } from '../../../services/playerService';

export function GameReviews({ game, userId, onReviewSubmitted, onShowToast }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const gameId = String(game?.id || game?.game_id);
  const db = getDatabase();
  const reviews = (db.reviews || [])
    .filter((r) => sameId(r.gameId, gameId))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const hasPlayed = playerService.hasPlayedGame(gameId, userId);
  const hasReviewed = reviews.some((r) => sameId(r.playerId, userId));

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : null;

  function handleSubmitReview(e) {
    e.preventDefault();
    if (selectedRating === 0) {
      if (onShowToast) onShowToast('Please select a star rating.', 'error');
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length < 5) {
      if (onShowToast) onShowToast('Please provide a comment.', 'error');
      return;
    }

    setSubmitting(true);
    const result = playerService.submitReview(gameId, userId, selectedRating, trimmed);
    setSubmitting(false);

    if (result.success) {
      setSelectedRating(0);
      setComment('');
      if (onShowToast) onShowToast('Review submitted successfully!', 'success');
      if (onReviewSubmitted) onReviewSubmitted();
    }
  }

  const activeStarRating = hoverRating || selectedRating;

  return (
    <div className="card" id="game-reviews-wrapper" style={{ marginTop: '1.5rem' }}>
      <h3 className="mb-2" style={{ fontSize: '1.1rem', fontFamily: "'Orbitron', monospace", marginBottom: '0.75rem' }}>
        ⭐ Player Reviews
      </h3>

      {reviews.length > 0 ? (
        <>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--accent-yellow)',
              marginBottom: '1rem',
              fontFamily: "'Orbitron', monospace"
            }}
          >
            {avgRating}{' '}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              / 5.0 ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          <div className="reviews-list">
            {reviews.map((r, i) => {
              const u = (db.users || []).find((user) => sameId(user.id || user.user_id, r.playerId));
              const username = u?.username || u?.user_name || 'Player';
              const avatar = u?.avatar || username.substring(0, 2).toUpperCase();
              const ratingNum = Math.max(0, Math.min(5, Number(r.rating) || 0));
              const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);

              return (
                <div
                  key={r.id || i}
                  style={{
                    padding: '1rem 0',
                    borderBottom: '1px solid var(--border-primary)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.4rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        className="avatar avatar-sm"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#fff'
                        }}
                      >
                        {avatar}
                      </div>
                      <span>{username}</span>
                    </div>
                    <div style={{ color: 'var(--accent-yellow)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                      {stars}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.45 }}>
                    {r.comment}
                  </p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {formatDate(r.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          No reviews yet. Be the first to share your thoughts!
        </p>
      )}

      {hasPlayed && !hasReviewed ? (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-primary)' }}>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>Write a Review</h4>
          <div
            style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.75rem' }}
            id="star-selector"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((starVal) => {
              const isFilled = starVal <= activeStarRating;
              return (
                <span
                  key={starVal}
                  className="star-selector-item"
                  style={{
                    color: isFilled ? 'var(--accent-yellow)' : 'var(--text-muted)'
                  }}
                  onMouseEnter={() => setHoverRating(starVal)}
                  onClick={() => setSelectedRating(starVal)}
                >
                  {isFilled ? '★' : '☆'}
                </span>
              );
            })}
          </div>

          <textarea
            id="new-review-comment"
            className="form-textarea mb-1"
            placeholder="What did you think of the game?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              resize: 'vertical',
              marginBottom: '0.75rem',
              boxSizing: 'border-box'
            }}
          />

          <button
            className="btn btn-primary"
            onClick={handleSubmitReview}
            disabled={submitting}
            type="button"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      ) : !hasPlayed ? (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}
        >
          You need to play this game at least once before you can leave a review.
        </div>
      ) : (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(16,185,129,0.1)',
            color: 'var(--accent-green)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            textAlign: 'center',
            fontWeight: 600
          }}
        >
          You have already reviewed this game.
        </div>
      )}
    </div>
  );
}

export default GameReviews;
