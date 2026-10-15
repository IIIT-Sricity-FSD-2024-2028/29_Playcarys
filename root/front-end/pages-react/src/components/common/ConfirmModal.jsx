import React, { useEffect } from 'react';

export function ConfirmModal({
  isOpen,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'danger',
  loading = false,
  loadingText,
  onConfirm,
  onCancel,
}) {
  // Close on Escape key press if not loading
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const isDanger = confirmStyle === 'danger';
  const confirmBtnClass = `btn ${isDanger ? 'btn-red' : 'btn-primary'}`;

  return (
    <div
      className="modal-overlay"
      onClick={loading ? undefined : onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card, #111520)',
          border: '1px solid var(--border-primary, #1e2336)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-primary, #1e2336)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            className="modal-title"
            style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#fff',
              margin: 0,
            }}
          >
            {title}
          </h3>
          <span
            className="modal-close"
            onClick={loading ? undefined : onCancel}
            title="Close"
            style={{
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted, #8b9bb4)',
              fontSize: '1.4rem',
              lineHeight: 1,
              userSelect: 'none',
              padding: '0.2rem',
            }}
          >
            &times;
          </span>
        </div>

        <div
          style={{
            padding: '1.5rem',
            fontSize: '0.92rem',
            color: 'var(--text-secondary, #8b9bb4)',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </div>

        <div
          className="modal-footer"
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-primary, #1e2336)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={confirmBtnClass}
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              background: isDanger ? 'var(--accent-red, #ef4444)' : undefined,
              borderColor: isDanger ? 'rgba(239, 68, 68, 0.4)' : undefined,
              color: '#fff',
            }}
          >
            {loading ? (loadingText || 'Processing...') : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
