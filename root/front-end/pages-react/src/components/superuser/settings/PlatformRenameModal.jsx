import React from 'react';

export function PlatformRenameModal({ isOpen, previousName, newName, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onCancel}>
      <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🌐</span> Rename the platform?
          </h3>
          <span className="modal-close" onClick={onCancel}>
            ✕
          </span>
        </div>
        <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1rem' }}>
            This name appears on every page and in every email the platform sends. Every user sees it immediately.
          </p>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.35rem 0',
                borderBottom: '1px solid var(--border-primary)',
                fontSize: '0.85rem'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Currently:</span>
              <span style={{ fontWeight: 600 }}>{previousName || '—'}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.35rem 0',
                fontSize: '0.85rem'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>New name:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{newName}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-red" onClick={onConfirm}>
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlatformRenameModal;
