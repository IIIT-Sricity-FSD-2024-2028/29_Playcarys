import React from 'react';
import { formatActivityTime } from '../../../services/superuserService';

const ACTIVITY_COLORS = {
  publisher: 'var(--accent-green)',
  approval: 'var(--accent-yellow)',
  player: 'var(--accent-cyan)',
  tournament: 'var(--accent-purple)',
  ban: 'var(--accent-red)',
  system: 'var(--accent-yellow)'
};

export function SuperuserHubRecentActivity(props) {
  const { feed = [] } = props;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3>⚡ Recent Activity</h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            window.location.href = '/pages/superuser/reports.html';
          }}
        >
          All Reports →
        </button>
      </div>

      <div id="live-feed">
        {feed.length > 0 ? (
          feed.map((a, idx) => (
            <div key={idx} className="feed-entry">
              <div
                className="feed-dot"
                style={{
                  background: ACTIVITY_COLORS[a.type] || 'var(--accent-cyan)'
                }}
              />
              <div className="feed-msg">{a.msg}</div>
              <div className="feed-time">{formatActivityTime(a.at)}</div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '1.5rem 0' }}>
            <div className="icon">🗒️</div>
            <p>No recorded activity yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperuserHubRecentActivity;
