import React from 'react';

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmStyle = 'primary' }) {
  if (!isOpen) return null;

  const btnClass =
    confirmStyle === 'danger'
      ? 'btn btn-red'
      : confirmStyle === 'warning'
      ? 'btn btn-yellow'
      : 'btn btn-primary';

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <span className="modal-close" onClick={onCancel}>
            ✕
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={btnClass} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
