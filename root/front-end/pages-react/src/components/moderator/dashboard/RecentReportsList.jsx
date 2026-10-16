import React from 'react';
import { Link } from 'react-router-dom';

export function RecentReportsList(props) {
  const { reports = [] } = props;

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}
      >
        <h3>⚠️ Recent Reports</h3>
        <Link to="/moderator/reports" className="btn btn-ghost btn-sm">
          View All →
        </Link>
      </div>

      <div id="recent-reports">
        {reports.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
            No reports yet
          </p>
        ) : (
          reports.map((raw) => {
            const rn = raw.reporterName || '??';
            const dn = raw.reportedName || '??';
            const initials = rn.slice(0, 2).toUpperCase();
            const status = raw.status || 'pending';
            const badgeCls =
              status === 'pending'
                ? 'badge-pending'
                : status === 'under-review'
                ? 'badge-review'
                : status === 'resolved'
                ? 'badge-resolved'
                : 'badge-active';
            const statusLabel =
              status === 'under-review'
                ? 'Under Review'
                : status.charAt(0).toUpperCase() + status.slice(1);

            return (
              <div
                key={raw.id}
                className="list-item"
                style={{
                  padding: '0.65rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderRadius: 0,
                  marginBottom: 0
                }}
              >
                <div className="avatar avatar-sm">{initials}</div>
                <div className="list-item-info">
                  <div style={{ fontSize: '0.82rem', fontBold: 600 }}>
                    {dn} reported for <span style={{ color: 'var(--accent-yellow)' }}>{raw.type}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    By {rn} · {raw.time}
                  </div>
                </div>
                <div>
                  <span className={`badge ${badgeCls}`}>{statusLabel}</span>
                </div>
                {(status === 'pending' || status === 'under-review') && (
                  <Link
                    to="/moderator/reports"
                    className="btn btn-outline btn-sm"
                    style={{ marginLeft: '0.5rem', fontSize: '0.68rem', padding: '0.25rem 0.5rem' }}
                  >
                    Review
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RecentReportsList;
