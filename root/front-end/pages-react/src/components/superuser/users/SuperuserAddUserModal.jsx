import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { isEmailTakenForRole } from '../../../services/superuserService';

export function SuperuserAddUserModal(props) {
  const { isOpen, onClose, onAddUser, users = [] } = props;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('player');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setEmail('');
      setRole('player');
      setPassword('');
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  function validate() {
    const errs = {};
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();

    // Username validation
    if (!trimmedUser) {
      errs.username = 'Username is required';
    } else if (trimmedUser.length < 3 || trimmedUser.length > 20) {
      errs.username = 'Username must be between 3 and 20 characters';
    } else if (users.some((u) => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
      errs.username = 'Username already taken';
    }

    // Email validation
    if (!trimmedEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Enter a valid email address';
    } else if (isEmailTakenForRole(users, trimmedEmail, role)) {
      errs.email = `A ${role} account already uses this email`;
    }

    // Role validation: Superuser creation strictly forbidden
    if (!role || role === 'superuser') {
      errs.role = 'Please select a valid role';
    }

    // Password validation
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      errs.password = 'Password must be 8+ chars with uppercase, lowercase and number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onAddUser({
        username: username.trim(),
        email: email.trim(),
        role,
        password
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.message || 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="➕ Add User" maxWidth="520px">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {errors.form && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>{errors.form}</div>
          )}

          <div className="cards-grid-2">
            <div className="form-group">
              <label className="form-label">
                Username <span className="required">*</span>
              </label>
              <input
                className={`form-input ${errors.username ? 'error' : ''}`}
                id="a-username"
                placeholder="3–20 characters"
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
                id="a-email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
              />
              {errors.email && <span className="form-error show">{errors.email}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Role <span className="required">*</span>
            </label>
            <select
              className="form-select"
              id="a-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
            >
              <option value="player">Player</option>
              <option value="publisher">Publisher</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <span className="form-error show">{errors.role}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Password <span className="required">*</span>
            </label>
            <input
              className={`form-input ${errors.password ? 'error' : ''}`}
              id="a-password"
              type="password"
              placeholder="Min 8 chars, uppercase + number"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
            />
            {errors.password && <span className="form-error show">{errors.password}</span>}
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default SuperuserAddUserModal;
