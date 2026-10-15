import React from 'react';
import ReportCard from './ReportCard';

export function ReportList(props) {
  const { reports = [], onResolve, onDismiss, onReopen, onBan } = props;

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">✅</div>
        <h3>No reports found</h3>
        <p>No reports match your filters</p>
      </div>
    );
  }

  return (
    <div id="reports-list">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onResolve={onResolve}
          onDismiss={onDismiss}
          onReopen={onReopen}
          onBan={onBan}
        />
      ))}
    </div>
  );
}

export default ReportList;
