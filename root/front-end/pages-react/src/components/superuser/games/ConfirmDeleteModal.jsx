import React from 'react';

export function ConfirmDeleteModal({ isOpen, game, onConfirm, onCancel }) {
  if (!isOpen || !game) return null;

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Delete Game</h3>
          <span className="modal-close" onClick={onCancel}>
            ✕
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: '1rem 0' }}>
          Permanently delete &ldquo;{game.title}&rdquo;?
        </p>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-red" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;
