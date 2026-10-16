import React, { useState, useEffect } from 'react';

export function WarnPlayerModal({ isOpen, report, onClose, onSubmit, submitting }) {
  const [customMsg, setCustomMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCustomMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !report) return null;

  const targetPlayer = report.isContact ? report.reporterName : report.reportedName;

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    onSubmit(customMsg);
  }

  return (
    <div
      className="warn-modal-overlay"
      id="warn-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="warn-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: 'var(--text-secondary)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0
            }}
          >
            ⚠️
          </div>
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 800, fontSize: '1rem' }}>
              Issue Warning
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              To: <strong style={{ color: 'var(--accent-yellow)' }}>{targetPlayer}</strong>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Custom message (optional — leave blank for default)
        </div>

        <textarea
          id="warn-message"
          rows="4"
          placeholder="e.g. Please follow community guidelines. Repeated violations may result in a ban."
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          disabled={submitting}
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            color: '#fff',
            fontSize: '0.88rem',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginTop: '0.75rem',
            fontSize: '0.78rem',
            color: 'rgba(245, 158, 11, 0.9)',
            lineHeight: 1.4
          }}
        >
          ⚠️ The player will receive this warning as a notification. It will be logged in moderation records.
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.7rem 1.5rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Sending...' : '⚠️ Send Warning'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              padding: '0.7rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default WarnPlayerModal;
