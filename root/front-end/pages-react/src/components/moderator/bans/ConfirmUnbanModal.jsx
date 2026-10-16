import React from 'react';

export function ConfirmUnbanModal({
  isOpen,
  player,
  onConfirm,
  onCancel,
  submitting = false
}) {
  if (!isOpen || !player) return null;

  const username = player.username || player.user_name || 'this player';

  return (
    <div
      className="modal-overlay show"
      id="confirm-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        className="modal card"
        style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid rgba(0, 212, 255, 0.35)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}
        >
          <h3 className="modal-title" style={{ margin: 0, color: 'var(--accent-cyan)' }}>
            Unban Player
          </h3>
          <span
            className="modal-close"
            style={{
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              color: 'var(--text-secondary)'
            }}
            onClick={() => {
              if (!submitting) onCancel();
            }}
          >
            ✕
          </span>
        </div>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}
        >
          Remove ban from <strong>{username}</strong>?
        </p>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-primary)'
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Unbanning...' : 'Unban'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmUnbanModal;
