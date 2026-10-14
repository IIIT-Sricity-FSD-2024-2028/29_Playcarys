import React from 'react';

export function LoadingState(props) {
  const { message = 'Loading...', minHeight = '150px' } = props;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        minHeight: minHeight,
        color: 'var(--text-secondary)',
        fontSize: '0.85rem'
      }}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          border: '3px solid rgba(0, 212, 255, 0.2)',
          borderTopColor: 'var(--accent-cyan)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span>{message}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoadingState;
