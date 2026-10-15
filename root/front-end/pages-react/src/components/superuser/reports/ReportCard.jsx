import React from 'react';

export function ReportCard(props) {
  const { report, onResolve, onDismiss, onReopen, onBan } = props;

  const status = report.status || 'pending';
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

  const reporterInitials = (report.reporterName || '??').slice(0, 2).toUpperCase();
  const reportedInitials = (report.reportedName || '??').slice(0, 2).toUpperCase();

  return (
    <div className="list-item">
      <div className="list-item-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="list-item-title">Report #{report.id}</span>
          <span className={`badge ${badgeCls}`}>{statusLabel}</span>
          <span className="tag">{report.type}</span>
        </div>
        <div className="list-item-sub mt-1">
          <div className="avatar avatar-sm">{reporterInitials}</div>
          <strong>{report.reporterName}</strong>
          <span>reported</span>
          <div className="avatar avatar-sm">{reportedInitials}</div>
          <strong>{report.reportedName}</strong>
          <span>· {report.time}</span>
        </div>
        <div className="text-sm text-muted mt-1">{report.desc}</div>
        {report.actionNote ? (
          <div className="text-xs text-muted mt-1">📝 Note: {report.actionNote}</div>
        ) : null}
      </div>
      <div className="list-item-actions">
        {status !== 'resolved' ? (
          <>
            <button
              type="button"
              className="btn btn-yellow btn-sm"
              onClick={() => onResolve(report)}
            >
              ✓ Resolve
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onDismiss(report)}
            >
              ✕ Dismiss
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onReopen(report)}
          >
            ↩ Reopen
          </button>
        )}
        <button
          type="button"
          className="btn btn-red btn-sm"
          onClick={() => onBan(report)}
        >
          🚫 Ban
        </button>
      </div>
    </div>
  );
}

export default ReportCard;
