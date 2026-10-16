/*
 * Concepts used in this component:
 *  - Components, Props (games), Lists (one card per approved game)
 *
 * "Recently Approved" grid of the old approvals.html.
 */
import React from 'react';
import GameIcon from '../common/GameIcon';
import StatusBadge from '../common/StatusBadge';

export function ApprovedGamesGrid(props) {
  const { games } = props;

  return (
    <div>
      <h2 className="mb-2">Recently Approved</h2>
      <div className="cards-grid-3" id="approved-grid">
        {games.map((g, i) => (
          <div className="game-card" key={g.id}>
            <GameIcon
              game={g}
              index={i}
              size="100%"
              extraStyle={{
                height: '140px',
                display: 'block',
                borderBottom: '1px solid var(--border-primary)',
                borderRadius: 0
              }}
            />
            <div className="game-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <StatusBadge status="approved" />
                {g.enabled ? <StatusBadge status="enabled" /> : <StatusBadge status="disabled" />}
              </div>
              <div className="game-card-title mt-1">{g.title}</div>
              <div className="game-card-meta"><span>By {g.publisher}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApprovedGamesGrid;
