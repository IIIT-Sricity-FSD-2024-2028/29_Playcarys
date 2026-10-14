import React from 'react';

export function ConfirmStaffModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmStyle = 'primary' }) {
  if (!isOpen) return null;

  const btnClass =
    confirmStyle === 'danger'
      ? 'btn btn-red'
      : confirmStyle === 'warning'
      ? 'btn btn-yellow'
      : 'btn btn-primary';

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <span className="modal-close" onClick={onCancel}>
            ✕
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: '1rem 0' }}>
          {message}
        </p>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={btnClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmStaffModal;
