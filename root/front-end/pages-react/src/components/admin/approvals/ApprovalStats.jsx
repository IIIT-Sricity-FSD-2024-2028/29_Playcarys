/*
 * Concepts used in this component:
 *  - Components, Props (total, pending, approved)
 *
 * The three number cards at the top of the old approvals.html.
 */
import React from 'react';

export function ApprovalStats(props) {
  const { total, pending, approved } = props;

  return (
    <div className="stats-grid stats-grid-3 mb-2">
      <div className="stat-card">
        <div className="label">Total Games</div>
        <div className="value" id="s-total">{total}</div>
        <div className="icon">🎮</div>
      </div>
      <div className="stat-card">
        <div className="label">Pending</div>
        <div className="value text-yellow" id="s-pending">{pending}</div>
        <div className="icon">⏳</div>
      </div>
      <div className="stat-card">
        <div className="label">Approved</div>
        <div className="value text-green" id="s-approved">{approved}</div>
        <div className="icon">✅</div>
      </div>
    </div>
  );
}

export default ApprovalStats;
