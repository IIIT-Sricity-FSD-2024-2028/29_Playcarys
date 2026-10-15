import React, { useState } from 'react';

export function LiftBanConfirmModal(props) {
  const { isOpen, ban, onClose, onConfirm } = props;
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !ban) return null;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm(ban);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Lift Ban</h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            margin: '1rem 0'
          }}
        >
          Remove ban from <strong style={{ color: 'var(--text-primary)' }}>{ban.playerName}</strong>?
        </p>
        <div className="modal-footer">
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
            className="btn btn-green"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Lifting...' : '🔓 Lift Ban'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiftBanConfirmModal;
