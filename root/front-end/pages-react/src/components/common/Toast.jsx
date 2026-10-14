import React from 'react';

export function Toast(props) {
  const { message, type = 'info', onClose } = props;

  if (!message) return null;

  const bgMap = {
    info: 'rgba(0, 212, 255, 0.15)',
    success: 'rgba(16, 185, 129, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)'
  };

  const borderMap = {
    info: 'rgba(0, 212, 255, 0.4)',
    success: 'rgba(16, 185, 129, 0.4)',
    error: 'rgba(239, 68, 68, 0.4)',
    warning: 'rgba(245, 158, 11, 0.4)'
  };

  const textMap = {
    info: 'var(--accent-cyan)',
    success: 'var(--accent-green)',
    error: 'var(--accent-red)',
    warning: 'var(--accent-yellow)'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        background: bgMap[type] || bgMap.info,
        border: `1px solid ${borderMap[type] || borderMap.info}`,
        backdropFilter: 'blur(16px)',
        color: textMap[type] || textMap.info,
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-card)',
        fontSize: '0.875rem',
        fontWeight: 600
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0 0.2rem'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default Toast;
