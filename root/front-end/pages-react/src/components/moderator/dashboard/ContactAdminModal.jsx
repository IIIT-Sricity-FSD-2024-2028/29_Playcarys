import React, { useState, useEffect } from 'react';

const PRIORITY_OPTIONS = [
  {
    id: 'low',
    icon: '🟡',
    title: 'Low',
    subtitle: 'General query',
    border: 'rgba(234,179,8,0.4)',
    bg: 'rgba(234,179,8,0.1)',
    color: '#fde047'
  },
  {
    id: 'medium',
    icon: '🟠',
    title: 'Medium',
    subtitle: 'Needs attention',
    border: 'rgba(245,158,11,0.5)',
    bg: 'rgba(245,158,11,0.12)',
    color: '#fbbf24'
  },
  {
    id: 'high',
    icon: '🔴',
    title: 'High',
    subtitle: 'Urgent issue',
    border: 'rgba(239,68,68,0.5)',
    bg: 'rgba(239,68,68,0.12)',
    color: '#f87171'
  },
  {
    id: 'critical',
    icon: '🚨',
    title: 'Critical',
    subtitle: 'Platform at risk',
    border: 'rgba(220,38,38,0.7)',
    bg: 'rgba(220,38,38,0.2)',
    color: '#ff4444'
  }
];

export function ContactAdminModal(props) {
  const { isOpen, onClose, onSubmit } = props;

  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPriority('medium');
      setSubject('');
      setMessage('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setError('Message is required');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        priority,
        subject: subject.trim(),
        msg: trimmedMsg
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      id="contact-admin-modal"
      onClick={onClose}
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          background: '#111520',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg,#f59e0b,#00d4ff)',
            borderRadius: '1rem 1rem 0 0'
          }}
        />
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: 'var(--text-secondary)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem'
            }}
          >
            📨
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 800, fontSize: '1rem' }}>
              Contact Administrator
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Escalate an issue or request support
            </div>
          </div>
        </div>

        {/* Priority Selector */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: '0.6rem',
              display: 'block'
            }}
          >
            Priority Level
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }} id="priority-btns">
            {PRIORITY_OPTIONS.map((opt) => {
              const isSelected = priority === opt.id;
              const borderStyle = isSelected ? `1px solid ${opt.border}` : '1px solid rgba(255,255,255,0.12)';
              const bgStyle = isSelected ? opt.bg : 'rgba(255,255,255,0.04)';
              const colorStyle = isSelected ? opt.color : '#e5e7eb';
              const fontWeight = isSelected ? 800 : 600;
              const transformStyle = isSelected ? 'scale(1.03)' : '';

              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPriority(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: borderStyle,
                    background: bgStyle,
                    color: colorStyle,
                    fontSize: '0.82rem',
                    fontWeight: fontWeight,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    transform: transformStyle
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                  <span>
                    {opt.title}
                    <br />
                    <span style={{ fontSize: '0.68rem', opacity: isSelected ? 0.7 : 0.6 }}>
                      {opt.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: '0.4rem',
              display: 'block'
            }}
          >
            Subject
          </label>
          <input
            id="contact-subject"
            placeholder="Brief description of the issue…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.5rem',
              padding: '0.65rem 0.75rem',
              color: '#fff',
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Message */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: '0.4rem',
              display: 'block'
            }}
          >
            Message <span style={{ color: 'var(--accent-red)' }}>*</span>
          </label>
          <textarea
            id="contact-message"
            rows={4}
            placeholder="Describe the issue in detail. Include player names, session IDs, or any relevant context…"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError('');
            }}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: error ? '1px solid var(--accent-red)' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: '#fff',
              fontSize: '0.88rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <span
              style={{
                display: 'block',
                color: 'var(--accent-red)',
                fontSize: '0.8rem',
                marginTop: '0.3rem'
              }}
            >
              {error}
            </span>
          )}
        </div>

        {/* Notice */}
        <div
          style={{
            background: 'rgba(0,212,255,0.05)',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: '0.5rem',
            padding: '0.7rem',
            marginBottom: '1.25rem',
            fontSize: '0.76rem',
            color: 'rgba(0,212,255,0.85)'
          }}
        >
          🔔 This message will be sent as a notification to an available administrator.
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg,#f59e0b,#00d4ff)',
              color: '#000',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.7rem 1.5rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {submitting ? 'Sending...' : '📨 Send to Admin'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              padding: '0.7rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContactAdminModal;
