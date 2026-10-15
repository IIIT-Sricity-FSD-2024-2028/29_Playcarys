/*
 * Concepts used in this component:
 *  - Components, Props (activity list, onViewApprovals), Lists (one row per activity),
 *    Events (button click), Callbacks
 *
 * "Recent Activity" card of the old dashboard.html.
 */
import React from 'react';

const ACTIVITY_ICONS = { publisher: '🟢', approval: '🟡', player: '🔵', tournament: '🏆', ban: '🔴' };

export function RecentActivity(props) {
  const { activity, onViewApprovals } = props;

  return (
    <div className="card mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3>Recent Activity</h3>
        <button className="btn btn-ghost btn-sm" onClick={onViewApprovals}>View Approvals →</button>
      </div>
      <div id="activity-list">
        {activity.map((a, i) => (
          <div className="list-item" style={{ padding: '0.85rem 1.25rem' }} key={i}>
            <span style={{ fontSize: '1.1rem' }}>{ACTIVITY_ICONS[a.type] || '📌'}</span>
            <div className="list-item-info">
              <span style={{ fontSize: '0.875rem' }}>{a.msg}</span>
              <div className="text-sm text-muted mt-1">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentActivity;
