import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatActivityTime } from '../../../services/superuserService';

const ACTIVITY_ICONS = {
  publisher: '🟢',
  approval: '🟡',
  player: '🔵',
  tournament: '🏆',
  ban: '🔴'
};

export function SuperuserRecentActivity(props) {
  const { activity = [], onViewApprovals } = props;
  const navigate = useNavigate();

  const handleViewApprovals = () => {
    if (onViewApprovals) {
      onViewApprovals();
    } else {
      navigate('/admin/approvals');
    }
  };

  return (
    <div className="card mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3>Recent Activity</h3>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleViewApprovals}
        >
          View Approvals →
        </button>
      </div>

      <div id="activity-list">
        {activity.length > 0 ? (
          activity.map((a, idx) => (
            <div
              key={idx}
              className="list-item"
              style={{ padding: '0.7rem 1.25rem' }}
            >
              <span style={{ fontSize: '1.1rem' }}>
                {ACTIVITY_ICONS[a.type] || '📌'}
              </span>
              <div className="list-item-info">
                <span style={{ fontSize: '0.875rem' }}>{a.msg}</span>
              </div>
              <span className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                {formatActivityTime(a.at)}
              </span>
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

export default SuperuserRecentActivity;
