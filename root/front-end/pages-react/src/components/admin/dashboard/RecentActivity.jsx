/*
 * Concepts used in this component:
 *  - Components, Props (activity list, onViewApprovals), Lists (one row per activity),
 *    Events (button click), Callbacks
 *
 * "Recent Activity" card of the old dashboard.html.
 */
import React from 'react';
import { timeAgo } from '../../../services/adminAuditService';

const ACTIVITY_ICONS = { user: '👤', game: '🎮', system: '⚙️', publisher: '🟢', approval: '🟡', player: '🔵', tournament: '🏆', ban: '🔴' };

export function RecentActivity(props) {
  const { activity, onViewApprovals } = props;

  return (
    <div className="card mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3>Recent Activity</h3>
        <button className="btn btn-ghost btn-sm" onClick={onViewApprovals}>View Approvals →</button>
      </div>
      <div id="activity-list">
        {activity === null ? (
          <div className="text-muted" style={{ padding: '1.25rem' }}>Could not load recent activity. Check that the backend is running.</div>
        ) : activity.length ? activity.slice(0, 6).map((a) => (
          <div className="list-item" style={{ padding: '0.85rem 1.25rem' }} key={a.id}>
            <span style={{ fontSize: '1.1rem' }}>{ACTIVITY_ICONS[a.type] || '📌'}</span>
            <div className="list-item-info">
              <span style={{ fontSize: '0.875rem' }}>{a.msg}</span>
              <div className="text-sm text-muted mt-1">{timeAgo(a.at)} · {a.actor}</div>
            </div>
          </div>
        )) : (
          <div className="text-muted" style={{ padding: '1.25rem' }}>No activity yet.</div>
        )}
      </div>
    </div>
  );
}

export default RecentActivity;
