import React, { useState, useEffect } from 'react';

export function ResolveReportModal(props) {
  const { isOpen, report, actionType, onClose, onSubmit } = props;

  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, report, actionType]);

  if (!isOpen || !report) return null;

  const isResolve = actionType === 'resolve';
  const modalTitle = isResolve ? '✓ Resolve Report' : '✕ Dismiss Report';

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

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const trimmed = notes.trim();
    if (!trimmed) {
      setError('Notes required');
      return;
    }
    if (trimmed.length < 5) {
      setError('Min 5 characters');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit(report, actionType, trimmed);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{modalTitle}</h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>

        {/* Report Summary */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}
          >
            <span style={{ fontWeight: 700 }}>Report #{report.id}</span>
            <span className={`badge ${badgeCls}`}>{statusLabel}</span>
            <span className="tag">{report.type}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {report.desc || report.reason}
          </div>
        </div>

        {/* Form Group */}
        <div className="form-group mt-2">
          <label className="form-label">
            Action Notes <span className="required">*</span>
          </label>
          <textarea
            className={`form-textarea ${error ? 'has-error' : ''}`}
            placeholder="Explain your decision as Superuser..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (error) setError('');
            }}
            rows={3}
            disabled={submitting}
          />
          {error && <span className="form-error" style={{ display: 'block', color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{error}</span>}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-${isResolve ? 'green' : 'ghost'}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isResolve ? '✓ Mark Resolved' : '✕ Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResolveReportModal;
