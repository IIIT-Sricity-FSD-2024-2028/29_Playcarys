import React, { useState, useEffect } from 'react';

export function IssueBanModal(props) {
  const { isOpen, targetUser, onClose, onSubmit } = props;

  const [duration, setDuration] = useState('7 Days');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDuration('7 Days');
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, targetUser]);

  if (!isOpen || !targetUser) return null;

  const userName = targetUser.username || targetUser.user_name || `User #${targetUser.id ?? targetUser.user_id}`;

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Reason required');
      return;
    }
    if (trimmed.length < 10) {
      setError('Min 10 characters');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit(targetUser, duration, trimmed);
    } catch (err) {
      setError(err.message || 'Failed to issue ban');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">🚫 Issue Ban</h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Target Player: <strong style={{ color: 'var(--text-primary)' }}>{userName}</strong>
          </div>

          <div className="form-group">
            <label className="form-label">
              Ban Duration <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={submitting}
            >
              <option value="1 Day">1 Day</option>
              <option value="3 Days">3 Days</option>
              <option value="7 Days">7 Days</option>
              <option value="30 Days">30 Days</option>
              <option value="Permanent">Permanent</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Reason <span className="required">*</span>
            </label>
            <textarea
              className={`form-textarea ${error ? 'has-error' : ''}`}
              placeholder="Reason for this ban..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              disabled={submitting}
            />
            {error && (
              <span
                className="form-error"
                style={{
                  display: 'block',
                  color: 'var(--accent-red)',
                  fontSize: '0.8rem',
                  marginTop: '0.3rem'
                }}
              >
                {error}
              </span>
            )}
          </div>
        </div>

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
            className="btn btn-red"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Banning...' : '🚫 Issue Ban'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default IssueBanModal;
