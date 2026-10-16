/*
 * Concepts used in this component:
 *  - Components, Props (games, onReview), Lists (one row per pending game),
 *    prop drilling (onReview goes on to each row), Callbacks
 *
 * "⏳ Pending Approvals" card of the old approvals.html, with its "all caught up" message.
 */
import React from 'react';
import PendingGameRow from './PendingGameRow';

export function PendingApprovalsCard(props) {
  const { games, onReview } = props;

  return (
    <div className="card mb-2">
      <h3 className="mb-2">⏳ Pending Approvals</h3>
      <div id="pending-list">
        {games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', opacity: 0.4 }}>✅</div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>All caught up! No pending game approvals.</p>
          </div>
        ) : (
          games.map((g) => <PendingGameRow key={g.id} game={g} onReview={onReview} />)
        )}
      </div>
    </div>
  );
}

export default PendingApprovalsCard;
