/*
 * Concepts used in this component:
 *  - Components, Props (history), Lists (one entry per earlier decision)
 *
 * "Review history" card: who decided what about earlier builds of this game.
 */
import React from 'react';
import StatusBadge from '../common/StatusBadge';

export function ReviewHistory(props) {
  const { history } = props;

  return (
    <div className="card mb-2" id="history-card">
      <p className="sec-title">Review history</p>
      <div id="history">
        {!history.length ? (
          <p className="text-muted" style={{ fontSize: '.82rem' }}>First submission — no prior decisions.</p>
        ) : (
          history.map((r, i) => (
            <div className="hist" key={i}>
              <StatusBadge status={r.decision} /> by <strong>{r.reviewer_name}</strong>
              {r.override ? <>{' '}<span className="badge badge-rejected">override</span></> : null}
              <div className="when">
                {String(r.decided_at).replace('T', ' ').slice(0, 16)}
                {r.bundle_hash ? ' · build ' + r.bundle_hash.slice(0, 10) : ''}
              </div>
              {r.note ? <div style={{ color: 'var(--text-secondary)', marginTop: '.2rem' }}>{r.note}</div> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ReviewHistory;
