import React, { useState } from 'react';
import SeveritySelector from './SeveritySelector';

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

export function TakeActionView({
  report,
  onBack,
  onResolve,
  onDismiss,
  onEscalate,
  submitting,
  validationError
}) {
  const [severity, setSeverity] = useState('medium');
  const [actionNotes, setActionNotes] = useState('');
  const [localError, setLocalError] = useState('');

  if (!report) return null;

  function handleResolve() {
    if (!actionNotes || actionNotes.trim().length < 10) {
      setLocalError('Minimum 10 characters required for notes');
      onResolve(null); // Triggers parent toast/validation
      return;
    }
    setLocalError('');
    onResolve({ notes: actionNotes.trim(), severity });
  }

  function handleDismiss() {
    if (!actionNotes || actionNotes.trim().length < 5) {
      setLocalError('Minimum 5 characters required for notes');
      onDismiss(null); // Triggers parent toast/validation
      return;
    }
    setLocalError('');
    onDismiss({ notes: actionNotes.trim() });
  }

  return (
    <div className="take-action-view">
      <div className="back-btn" onClick={onBack}>
        ← Back to Reports
      </div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.5rem', fontWeight: 800 }}>
        Take Action on Report
      </h1>
      <p className="text-muted mb-2">Review and decide on this report</p>

      {/* CARD A: REPORT DETAILS */}
      <div className="detail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700 }}>
            Report #{report.id}
          </span>
          <span className={`badge ${getStatusBadgeClass(report.status)}`}>
            {getStatusLabel(report.status)}
          </span>
          <span className="tag">{report.type}</span>
          {report.isContact && (
            <span style={{ fontSize: '0.72rem', color: '#22d3ee', fontWeight: 700 }}>
              📡 Direct Contact
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: report.isContact ? '1fr' : '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}
            >
              Reported By
            </div>
            <div style={{ fontWeight: 700 }}>{report.reporterName}</div>
          </div>
          {!report.isContact && (
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.25rem'
                }}
              >
                Reported Player
              </div>
              <div style={{ fontWeight: 700 }}>{report.reportedName}</div>
            </div>
          )}
        </div>

        <div className="form-group mt-2">
          <label className="form-label">Report Description</label>
          <div
            style={{
              background: 'var(--bg-input)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              color: '#d1d5db'
            }}
          >
            {report.desc || 'No description provided.'}
          </div>
        </div>

        <div className="form-group mt-2">
          <label className="form-label">Session · Time</label>
          <div
            style={{
              background: 'var(--bg-input)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}
          >
            {report.session}
            <br />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{report.time}</span>
          </div>
        </div>

        {report.assigned && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Assigned to: <strong>{report.assigned}</strong>
          </div>
        )}
      </div>

      {/* CARD B: YOUR DECISION */}
      <div className="detail-card">
        <h3>⚡ Your Decision</h3>

        <SeveritySelector value={severity} onChange={setSeverity} />

        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">
            Action Notes <span style={{ color: 'var(--accent-red)' }}>*</span>
          </label>
          <textarea
            id="action-notes"
            className="form-textarea"
            rows="3"
            placeholder="Write detailed notes about your decision…"
            value={actionNotes}
            onChange={(e) => {
              setActionNotes(e.target.value);
              if (localError) setLocalError('');
            }}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: localError || validationError ? '1px solid var(--accent-red)' : '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              color: '#fff',
              fontSize: '0.875rem'
            }}
          />
          {(localError || validationError) && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
              {localError || validationError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-green"
            style={{ flex: 1, minWidth: '120px' }}
            onClick={handleResolve}
            disabled={submitting}
          >
            {submitting ? 'Resolving...' : '✓ Resolve'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1, minWidth: '120px' }}
            onClick={handleDismiss}
            disabled={submitting}
          >
            {submitting ? 'Dismissing...' : '✕ Dismiss'}
          </button>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm w-full mt-2"
          onClick={onEscalate}
          disabled={submitting}
          style={{
            borderColor: 'rgba(239, 68, 68, 0.4)',
            color: 'var(--accent-red)',
            width: '100%',
            marginTop: '0.75rem'
          }}
        >
          🚫 Escalate to Ban →
        </button>
      </div>
    </div>
  );
}

export default TakeActionView;
