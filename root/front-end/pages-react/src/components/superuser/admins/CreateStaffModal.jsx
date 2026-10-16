import React, { useState, useEffect } from 'react';

export function CreateStaffModal({ isOpen, onClose, onCreateStaff, users = [] }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('moderator');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setEmail('');
      setRole('moderator');
      setPassword('');
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function validate() {
    const errs = {};
    const uTrim = username.trim();
    const eTrim = email.trim();

    // Username validation
    if (!uTrim) {
      errs.username = 'Username is required';
    } else if (uTrim.length < 3) {
      errs.username = 'Username must be at least 3 characters';
    } else if (uTrim.length > 20) {
      errs.username = 'Username cannot exceed 20 characters';
    } else {
      const exists = users.some(
        (u) => (u.username || u.user_name || '').toLowerCase() === uTrim.toLowerCase()
      );
      if (exists) {
        errs.username = 'Username already taken';
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!eTrim) {
      errs.email = 'Email is required';
    } else if (!emailRegex.test(eTrim)) {
      errs.email = 'Please enter a valid email address';
    } else {
      const emailExists = users.some(
        (u) => (u.email || '').toLowerCase() === eTrim.toLowerCase()
      );
      if (emailExists) {
        errs.email = 'Email already registered';
      }
    }

    // Password validation (min 8 chars, uppercase + number)
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errs.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errs.password = 'Password must contain at least one number';
    }

    // Safety guard against superuser role
    if (role === 'superuser') {
      errs.role = 'Superuser is a singular role and cannot be created here';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onCreateStaff({
        username: username.trim(),
        email: email.trim(),
        role,
        password
      });
      onClose();
    } catch (err) {
      console.error('Failed to create staff account:', err);
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to create account'
      }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay show" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Create Staff Account</h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cards-grid-2">
              <div className="form-group">
                <label className="form-label">
                  Username <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  id="ca-username"
                  placeholder="Staff username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors((prev) => ({ ...prev, username: null }));
                  }}
                />
                {errors.username && <span className="form-error">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  id="ca-email"
                  type="email"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Role <span className="required">*</span>
              </label>
              {/* No superuser option — only Moderator and Admin allowed */}
              <select
                className="form-select"
                id="ca-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (errors.role) setErrors((prev) => ({ ...prev, role: null }));
                }}
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>
                ℹ️ Superuser is a singular platform role and cannot be created here.
              </span>
              {errors.role && <span className="form-error">{errors.role}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Password <span className="required">*</span>
              </label>
              <input
                className="form-input"
                id="ca-password"
                type="password"
                placeholder="Min 8 chars, uppercase + number"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            {errors.submit && <div className="form-error" style={{ fontSize: '0.85rem' }}>{errors.submit}</div>}
          </div>

          <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateStaffModal;
