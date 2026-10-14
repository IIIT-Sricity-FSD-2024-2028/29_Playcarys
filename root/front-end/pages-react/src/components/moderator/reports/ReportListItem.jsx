import React from 'react';

function getInitials(name) {
  if (!name || name === 'Unknown' || name === '—') return '??';
  return name.slice(0, 2).toUpperCase();
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'badge-pending';
    case 'under-review':
      return 'badge-review';
    case 'resolved':
      return 'badge-resolved';
    case 'dismissed':
      return 'badge-dismissed';
    default:
      return 'badge-active';
  }
}

function getStatusLabel(status) {
  if (status === 'under-review') return 'Under Review';
  if (status === 'pending') return 'Pending';
  if (status === 'resolved') return 'Resolved';
  if (status === 'dismissed') return 'Dismissed';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
}

export function ReportListItem({ report, onReview, onTakeAction, onWarn }) {
  const rInitials = getInitials(report.reporterName);
  const dInitials = getInitials(report.reportedName);

  const canReview = report.status !== 'resolved' && report.status !== 'dismissed';
  const canActOrWarn = report.status === 'pending' || report.status === 'under-review';

  return (
    <div className="report-list-item list-item">
      <div className="report-item-info list-item-info">
        <div className="report-item-header">
          <span className="report-item-title list-item-title">Report #{report.id}</span>
          <span className={`badge ${getStatusBadgeClass(report.status)}`}>
            {getStatusLabel(report.status)}
          </span>
          <span className="tag">{report.type}</span>
          {report.isContact && (
            <span
              style={{
                fontSize: '0.7rem',
                background: 'rgba(0, 212, 255, 0.12)',
                color: '#22d3ee',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '99px',
                padding: '0.1rem 0.45rem',
                fontWeight: 700
              }}
            >
              📡 Direct Contact
            </span>
          )}
          {report.assigned && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              → <strong>{report.assigned}</strong>
            </span>
          )}
        </div>

        <div className="report-item-meta list-item-sub mt-1">
          <div className="avatar avatar-sm">{rInitials}</div>
          <strong>{report.reporterName}</strong>
          <span>{report.isContact ? 'contacted moderator' : 'reported'}</span>
          {!report.isContact && (
            <>
              <div className="avatar avatar-sm">{dInitials}</div>
              <strong>{report.reportedName}</strong>
            </>
          )}
          <span>· {report.time}</span>
        </div>

        <div className="report-item-desc text-sm text-muted mt-1">{report.desc}</div>
        <div className="report-item-session text-xs text-muted mt-1">Session: {report.session}</div>
      </div>

      <div className="report-item-actions list-item-actions">
        {canReview && (
          <button
            type="button"
            className="btn btn-yellow btn-sm"
            onClick={() => onReview(report.id)}
          >
            👁 Review
          </button>
        )}
        {canActOrWarn && (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onTakeAction(report.id)}
              style={{ borderColor: 'rgba(0, 212, 255, 0.4)', color: 'var(--accent-cyan)' }}
            >
              ⚡ Action
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onWarn(report.id)}
              style={{
                borderColor: 'rgba(245, 158, 11, 0.4)',
                color: 'var(--accent-yellow)',
                fontSize: '0.68rem'
              }}
            >
              ⚠️ Warn
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ReportListItem;
