import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  onClose,
}) {
  const handleCancel = onCancel || onClose;

  // Close on Escape key press if not loading
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading && handleCancel) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, handleCancel]);

  if (!isOpen) return null;

  const isDanger = confirmStyle === 'danger';
  const confirmBtnClass = `btn ${isDanger ? 'btn-red' : 'btn-primary'}`;

  const modalNode = (
    <div
      className="modal-overlay show"
      onClick={loading ? undefined : handleCancel}
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        opacity: 1,
        pointerEvents: 'all',
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
            onClick={loading ? undefined : handleCancel}
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
            onClick={handleCancel}
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

  return typeof document !== 'undefined'
    ? createPortal(modalNode, document.body)
    : modalNode;
}

export default ConfirmModal;
