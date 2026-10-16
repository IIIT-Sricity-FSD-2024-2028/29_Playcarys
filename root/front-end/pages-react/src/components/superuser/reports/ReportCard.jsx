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

  const reporterName =
    report.reporterName ||
    report.reporter_name ||
    report.reporter ||
    (report.reported_by ? `Player #${report.reported_by}` : 'Anonymous');

  const reportedName =
    report.reportedName ||
    report.reported_name ||
    report.reported ||
    (report.reported_user ? `Player #${report.reported_user}` : 'Unknown User');

  const reporterInitials = (reporterName || '??').slice(0, 2).toUpperCase();
  const reportedInitials = (reportedName || '??').slice(0, 2).toUpperCase();

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
          <strong>{reporterName}</strong>
          <span>reported</span>
          <div className="avatar avatar-sm">{reportedInitials}</div>
          <strong>{reportedName}</strong>
          <span>· {report.time}</span>
        </div>
        <div className="text-sm text-muted mt-1">{report.desc || report.reason}</div>
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
