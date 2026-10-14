import React from 'react';

export function Modal(props) {
  const { isOpen, onClose, title, children, maxWidth = '500px' } = props;

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay show"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: maxWidth,
          position: 'relative',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-modal)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem'
          }}
        >
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
