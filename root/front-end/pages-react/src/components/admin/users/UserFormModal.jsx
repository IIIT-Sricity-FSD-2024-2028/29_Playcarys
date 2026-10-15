/*
 * Concepts used in this component:
 *  - Components, Props (open, mode, form values, errors, handlers), Forms (controlled inputs with
 *    error messages), Events (typing, button clicks), Hooks (useEffect), Callbacks,
 *    prop drilling (action handlers go on to UserActionsPanel)
 *
 * The Add / Edit user dialog of the old users.html (#user-modal). In edit mode the role
 * cannot be changed, the password box is hidden and the Administrative Actions appear.
 */
import React, { useEffect } from 'react';
import UserActionsPanel from './UserActionsPanel';

export function UserFormModal(props) {
  const { open, isEdit, editUser, form, errors, onFieldChange, onClose, onSave, actions } = props;

  // The old Modal.open() stopped the page behind the dialog from scrolling.
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
    <div className={'modal-overlay' + (open ? ' show' : '')} id="user-modal" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title" id="modal-title">{isEdit ? 'Edit User' : 'Add User'}</h3>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input
              className={'form-input' + (errors.username ? ' error' : '')}
              id="f-username"
              placeholder="Username"
              value={form.username}
              onChange={(e) => onFieldChange('username', e.target.value)}
            />
            <span className={'form-error' + (errors.username ? ' show' : '')}>{errors.username}</span>
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input
              className={'form-input' + (errors.email ? ' error' : '')}
              id="f-email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
            />
            <span className={'form-error' + (errors.email ? ' show' : '')}>{errors.email}</span>
          </div>
          <div className="form-group">
            <label className="form-label">Role <span className="required">*</span></label>
            <select
              className="form-select"
              id="f-role"
              value={form.role}
              onChange={(e) => onFieldChange('role', e.target.value)}
              disabled={isEdit}
            >
              <option value="player">Player</option>
              <option value="publisher">Publisher</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            <span className="form-error"></span>
          </div>
          {!isEdit ? (
            <div className="form-group" id="password-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                className={'form-input' + (errors.password ? ' error' : '')}
                id="f-password"
                type="password"
                placeholder="Min 8 chars, uppercase, number"
                value={form.password}
                onChange={(e) => onFieldChange('password', e.target.value)}
              />
              <span className={'form-error' + (errors.password ? ' show' : '')}>{errors.password}</span>
            </div>
          ) : null}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" id="f-status" value={form.status} disabled>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          {isEdit && editUser ? <UserActionsPanel user={editUser} {...actions} /> : null}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="save-btn" onClick={onSave}>{isEdit ? 'Save Changes' : 'Add User'}</button>
        </div>
      </div>
    </div>
  );
}

export default UserFormModal;
