import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function SuperuserEditUserModal(props) {
  const {
    user,
    isOpen,
    onClose,
    onSave,
    onSuspend,
    onReinstate,
    onBan,
    onUnban,
    users = []
  } = props;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [errors, setErrors] = useState({});
  const [reasonError, setReasonError] = useState('');
  const [confirmingAction, setConfirmingAction] = useState(null); // 'suspend' | 'ban' | null
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setActionReason('');
      setErrors({});
      setReasonError('');
      setConfirmingAction(null);
      setSubmitting(false);
    }
  }, [user, isOpen]);

  if (!user) return null;

  const isSuperuser = user.role === 'superuser';
  const isStaff = user.role === 'admin' || user.role === 'moderator';
  const isPlayerOrPublisher = user.role === 'player' || user.role === 'publisher';
  const isSuspended = user.status === 'suspended';
  const isBanned = user.status === 'banned';

  function validateBasic() {
    const errs = {};
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();
    const currentId = String(user.user_id ?? user.id);

    if (!trimmedUser) {
      errs.username = 'Username is required';
    } else if (trimmedUser.length < 3 || trimmedUser.length > 20) {
      errs.username = 'Username must be between 3 and 20 characters';
    } else if (
      users.some(
        (x) =>
          x.username.toLowerCase() === trimmedUser.toLowerCase() &&
          String(x.user_id ?? x.id) !== currentId
      )
    ) {
      errs.username = 'Username already taken';
    }

    if (!trimmedEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Enter a valid email address';
    } else if (
      users.some(
        (x) =>
          x.email.toLowerCase() === trimmedEmail.toLowerCase() &&
          String(x.user_id ?? x.id) !== currentId
      )
    ) {
      errs.email = 'Email already registered';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function requireReason() {
    if (!actionReason.trim()) {
      setReasonError('Action Reason is required.');
      return false;
    }
    setReasonError('');
    return true;
  }

  async function handleSaveBasic(e) {
    if (e) e.preventDefault();
    if (!validateBasic()) return;

    setSubmitting(true);
    try {
      await onSave(user, {
        username: username.trim(),
        email: email.trim(),
        role: user.role
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.message || 'Failed to update user' });
    } finally {
      setSubmitting(false);
    }
  }

  async function executeSuspend() {
    setSubmitting(true);
    try {
      await onSuspend(user, actionReason.trim());
      onClose();
    } catch (err) {
      setReasonError(err.message || 'Failed to suspend user');
    } finally {
      setSubmitting(false);
    }
  }

  async function executeReinstate() {
    if (!requireReason()) return;
    setSubmitting(true);
    try {
      await onReinstate(user, actionReason.trim());
      onClose();
    } catch (err) {
      setReasonError(err.message || 'Failed to reinstate user');
    } finally {
      setSubmitting(false);
    }
  }

  async function executeBan() {
    setSubmitting(true);
    try {
      await onBan(user, actionReason.trim());
      onClose();
    } catch (err) {
      setReasonError(err.message || 'Failed to ban user');
    } finally {
      setSubmitting(false);
    }
  }

  async function executeUnban() {
    if (!requireReason()) return;
    setSubmitting(true);
    try {
      await onUnban(user, actionReason.trim());
      onClose();
    } catch (err) {
      setReasonError(err.message || 'Failed to lift ban');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✏️ ${user.username}`}
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {errors.form && (
          <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>{errors.form}</div>
        )}

        {/* Basic edit fields */}
        <div className="cards-grid-2">
          <div className="form-group">
            <label className="form-label">
              Username <span className="required">*</span>
            </label>
            <input
              className={`form-input ${errors.username ? 'error' : ''}`}
              id="eu-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) setErrors({ ...errors, username: null });
              }}
            />
            {errors.username && <span className="form-error show">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              className={`form-input ${errors.email ? 'error' : ''}`}
              id="eu-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
            />
            {errors.email && <span className="form-error show">{errors.email}</span>}
          </div>
        </div>

        {/* Role field */}
        {!isSuperuser ? (
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" id="eu-role" value={user.role} disabled>
              <option value="player">Player</option>
              <option value="publisher">Publisher</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ) : (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}
          >
            ⚡ Superuser role cannot be changed.
          </div>
        )}

        {/* Action Reason input for sensitive actions */}
        {!isSuperuser && (
          <div style={{ marginTop: '0.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>
              Action Reason (Sent to user) <span className="required">*</span>
            </label>
            <input
              className={`form-input ${reasonError ? 'error' : ''}`}
              id="eu-action-reason"
              placeholder="Required: Explain why this action is taken..."
              value={actionReason}
              onChange={(e) => {
                setActionReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
            />
            {reasonError && <span className="form-error show">{reasonError}</span>}
          </div>
        )}

        {/* Confirmation prompt for destructive actions */}
        {confirmingAction && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: confirmingAction === 'ban' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${confirmingAction === 'ban' ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
              textAlign: 'center'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: confirmingAction === 'ban' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
              {confirmingAction === 'ban' ? '⚠️ Confirm Ban User' : '⚠️ Confirm Suspend Account'}
            </div>
            <p style={{ fontSize: '0.82rem', marginBottom: '0.85rem', color: 'var(--text-secondary)' }}>
              {confirmingAction === 'ban'
                ? `Ban ${user.username} from the platform? This is a serious action.`
                : `Suspend ${user.username}? They will lose access until reinstated.`}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmingAction(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${confirmingAction === 'ban' ? 'btn-red' : 'btn-yellow'}`}
                onClick={confirmingAction === 'ban' ? executeBan : executeSuspend}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : confirmingAction === 'ban' ? 'Confirm Ban' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        )}

        {/* Staff Suspend / Reinstate (Admin & Moderator) */}
        {isStaff && !confirmingAction && (
          <div>
            {!isSuspended ? (
              <div className="action-block" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
                <div className="action-block-title" style={{ color: 'var(--accent-yellow)' }}>
                  ⏸ Suspend Account
                </div>
                <div className="action-block-sub">
                  Temporarily restrict platform access. Can be reinstated at any time.
                </div>
                <button
                  type="button"
                  className="btn btn-yellow w-full btn-sm"
                  onClick={() => {
                    if (requireReason()) setConfirmingAction('suspend');
                  }}
                  disabled={submitting}
                >
                  ⏸ Suspend {user.username}
                </button>
              </div>
            ) : (
              <div className="action-block" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                <div className="action-block-title" style={{ color: 'var(--accent-green)' }}>
                  ▶️ Reinstate Account
                </div>
                <div className="action-block-sub">
                  Restore full platform access for this staff member.
                </div>
                <button
                  type="button"
                  className="btn btn-green w-full btn-sm"
                  onClick={executeReinstate}
                  disabled={submitting}
                >
                  ▶️ Reinstate {user.username}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Player & Publisher Ban / Lift Ban */}
        {isPlayerOrPublisher && !confirmingAction && (
          <div>
            {!isBanned ? (
              <div className="danger-zone">
                <div className="danger-zone-title">🚫 Danger Zone</div>
                <div className="action-block">
                  <div className="action-block-title" style={{ color: 'var(--accent-red)' }}>
                    🚫 Ban User
                  </div>
                  <div className="action-block-sub">
                    Permanently bans this user from the platform. Use only for serious violations.
                  </div>
                  <button
                    type="button"
                    className="btn btn-red w-full btn-sm"
                    onClick={() => {
                      if (requireReason()) setConfirmingAction('ban');
                    }}
                    disabled={submitting}
                  >
                    🚫 Ban {user.username}
                  </button>
                </div>
              </div>
            ) : (
              <div className="action-block" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                <div className="action-block-title" style={{ color: 'var(--accent-green)' }}>
                  ✅ Lift Ban
                </div>
                <div className="action-block-sub">Restore this user's access to the platform.</div>
                <button
                  type="button"
                  className="btn btn-green w-full btn-sm"
                  onClick={executeUnban}
                  disabled={submitting}
                >
                  ✅ Unban {user.username}
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className="modal-footer"
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border-primary)',
            paddingTop: '1rem'
          }}
        >
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            id="edit-save-btn"
            onClick={handleSaveBasic}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SuperuserEditUserModal;
