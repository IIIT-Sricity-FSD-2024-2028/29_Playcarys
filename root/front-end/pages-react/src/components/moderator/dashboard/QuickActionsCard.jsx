import React from 'react';

export function QuickActionsCard(props) {
  const { pendingReports = 0, liveSessions = 0, activeBans = 0, onContactAdmin } = props;

  return (
    <div className="card">
      <div
        className="sid-title"
        style={{
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 900,
          color: 'var(--text-muted)',
          marginBottom: '0.85rem'
        }}
      >
        ⚡ Quick Actions
      </div>
      <div className="qa-grid">
        <div
          className="qa-btn"
          onClick={() => {
            window.location.href = '/pages/moderator/reports.html';
          }}
          title="Open Reports"
        >
          <div className="qa-btn-icon">📋</div>
          <div className="qa-btn-text">
            <div className="title">Reports</div>
            <div className="sub" id="qa-reports-sub">
              {pendingReports} pending
            </div>
          </div>
        </div>

        <div
          className="qa-btn"
          onClick={() => {
            window.location.href = '/pages/moderator/sessions.html';
          }}
          title="Open Sessions"
        >
          <div className="qa-btn-icon">🎮</div>
          <div className="qa-btn-text">
            <div className="title">Sessions</div>
            <div className="sub" id="qa-sessions-sub">
              {liveSessions} active
            </div>
          </div>
        </div>

        <div
          className="qa-btn"
          onClick={() => {
            window.location.href = '/pages/moderator/bans.html';
          }}
          title="Open Bans"
        >
          <div className="qa-btn-icon">🚫</div>
          <div className="qa-btn-text">
            <div className="title">Bans</div>
            <div className="sub" id="qa-bans-sub">
              {activeBans} total
            </div>
          </div>
        </div>

        <div className="qa-btn" onClick={onContactAdmin} title="Contact Admin">
          <div className="qa-btn-icon">📨</div>
          <div className="qa-btn-text">
            <div className="title">Escalate</div>
            <div className="sub">Contact admin</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickActionsCard;
