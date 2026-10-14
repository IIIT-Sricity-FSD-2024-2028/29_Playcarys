/*
 * Concepts used in this component:
 *  - Components, Props (open, isEdit, form, errors, handlers), Forms (controlled inputs with error
 *    messages), Events (typing, clicks), Hooks (useEffect), Callbacks
 *
 * The "Add User / Edit User" dialog of the Control Hub (#add-user-modal in the old hub.html).
 * Unlike the Users page, the hub lets you set the status here, and offers three roles only.
 */
import React, { useEffect } from 'react';

export function HubUserModal(props) {
  const { open, isEdit, form, errors, onFieldChange, onClose, onSave } = props;

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={'modal-overlay' + (open ? ' show' : '')} id="add-user-modal" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? '✏️ Edit User' : '👑 Add User'}</h3>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input
              className={'form-input' + (errors.username ? ' error' : '')}
              id="au-username"
              placeholder="Username (3–20 chars)"
              value={form.username}
              onChange={(e) => onFieldChange('username', e.target.value)}
            />
            <span className={'form-error' + (errors.username ? ' show' : '')}>{errors.username}</span>
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input
              className={'form-input' + (errors.email ? ' error' : '')}
              id="au-email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
            />
            <span className={'form-error' + (errors.email ? ' show' : '')}>{errors.email}</span>
          </div>
          <div className="cards-grid-2">
            <div className="form-group">
              <label className="form-label">Role <span className="required">*</span></label>
              <select
                className="form-select"
                id="au-role"
                value={form.role}
                onChange={(e) => onFieldChange('role', e.target.value)}
                disabled={isEdit}
              >
                <option value="player">Player</option>
                <option value="publisher">Publisher</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                id="au-status"
                value={form.status}
                onChange={(e) => onFieldChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>
          {!isEdit ? (
            <div className="form-group" id="au-pw-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                className={'form-input' + (errors.password ? ' error' : '')}
                id="au-password"
                type="password"
                placeholder="Min 8 chars, uppercase + number"
                value={form.password}
                onChange={(e) => onFieldChange('password', e.target.value)}
              />
              <span className={'form-error' + (errors.password ? ' show' : '')}>{errors.password}</span>
            </div>
          ) : null}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="au-save-btn" onClick={onSave}>{isEdit ? 'Save Changes' : 'Add User'}</button>
        </div>
      </div>
    </div>
  );
}

export default HubUserModal;
