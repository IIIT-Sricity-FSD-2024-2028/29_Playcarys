import React, { useState, useEffect } from 'react';

export function StaffActionsModal({
  isOpen,
  user,
  onClose,
  onDemoteClick,
  onPromoteClick,
  onSuspendClick,
  onReinstateClick,
  onError
}) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setReasonError('');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const role = (user.role || (user.role_id === 2 ? 'admin' : 'moderator')).toLowerCase();
  const isSuspended = user.status === 'suspended';
  const username = user.username || user.user_name || 'Staff';

  function handleSuspend() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('Action Reason is required.');
      if (onError) onError('Action Reason is required.');
      return;
    }
    setReasonError('');
    onSuspendClick(user, trimmed);
  }

  function handleReinstate() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError('Action Reason is required.');
      if (onError) onError('Action Reason is required.');
      return;
    }
    setReasonError('');
    onReinstateClick(user, trimmed);
  }

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" id="edit-modal-title">
            ⚙️ {username}
          </h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>

        <div id="edit-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Admin can be demoted to Moderator */}
          {role === 'admin' && (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                  color: 'var(--accent-yellow)'
                }}
              >
                ⬇️ Demote to Moderator
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}
              >
                This admin will become a Moderator with reduced privileges.
              </div>
              <button
                type="button"
                className="btn btn-yellow w-full"
                onClick={() => onDemoteClick(user)}
              >
                ⬇️ Demote to Moderator
              </button>
            </div>
          )}

          {/* Action Reason Field */}
          <div style={{ marginBottom: '0.85rem' }}>
            <label className="form-label">
              Action Reason (Sent to user) <span className="required">*</span>
            </label>
            <input
              className="form-input"
              id="admin-action-reason"
              placeholder="Required: Explain why this action is taken..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
            />
            {reasonError && (
              <span className="form-error" style={{ display: 'block', marginTop: '0.25rem' }}>
                {reasonError}
              </span>
            )}
          </div>

          {/* Suspend or Revoke Suspension */}
          {!isSuspended ? (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                  color: 'var(--accent-yellow)'
                }}
              >
                ⏸ Suspend Account
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}
              >
                Temporarily restricts access without permanent removal. Account can be reinstated at any time.
              </div>
              <button
                type="button"
                className="btn btn-yellow w-full"
                onClick={handleSuspend}
              >
                ⏸ Suspend {username}
              </button>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                  color: 'var(--accent-green)'
                }}
              >
                ▶️ Revoke Suspension
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}
              >
                Restore full access for this staff member.
              </div>
              <button
                type="button"
                className="btn btn-green w-full"
                onClick={handleReinstate}
              >
                ▶️ Revoke Suspension for {username}
              </button>
            </div>
          )}

          {/* Moderator can be promoted to Admin */}
          {role === 'moderator' && (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(0,212,255,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                  color: 'var(--accent-cyan)'
                }}
              >
                ⬆️ Promote to Admin
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}
              >
                Grant this moderator full Admin privileges.
              </div>
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => onPromoteClick(user)}
              >
                ⬆️ Promote to Admin
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffActionsModal;
