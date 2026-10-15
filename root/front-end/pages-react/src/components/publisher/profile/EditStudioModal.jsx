import React, { useState, useEffect } from 'react';

export function EditStudioModal({
  isOpen,
  onClose,
  initialUser,
  initialProfile,
  onSave,
  isSaving = false
}) {
  const [studioName, setStudioName] = useState('');
  const [studioNameError, setStudioNameError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Prefill fields when modal opens or initial data changes
  useEffect(() => {
    if (isOpen) {
      setStudioName(
        initialProfile?.studio_name ||
        initialUser?.user_name ||
        initialUser?.username ||
        ''
      );
      setEmail(initialUser?.email || '');
      setPhone(initialUser?.phone_number || initialUser?.phone || '');
      setPassword('');
      setConfirmPassword('');
      setStudioNameError('');
      setEmailError('');
      setPhoneError('');
      setPasswordError('');
      setConfirmError('');
      setGeneralError('');
    }
  }, [isOpen, initialUser, initialProfile]);

  if (!isOpen) return null;

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (isSaving) return;

    let valid = true;
    setGeneralError('');

    // 1. Studio Name validation
    const trimmedName = studioName.trim();
    if (!trimmedName) {
      setStudioNameError('Studio name is required');
      valid = false;
    } else if (trimmedName.length < 3) {
      setStudioNameError('Minimum 3 characters required');
      valid = false;
    } else if (trimmedName.length > 30) {
      setStudioNameError('Maximum 30 characters allowed');
      valid = false;
    } else {
      setStudioNameError('');
    }

    // 2. Email validation
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      setEmailError('Email is required');
      valid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    // 3. Phone validation
    const trimmedPhone = phone.trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    if (!trimmedPhone) {
      setPhoneError('Phone number is required');
      valid = false;
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setPhoneError('Please enter a valid phone number (7-15 digits)');
      valid = false;
    } else {
      setPhoneError('');
    }

    // 4. Password validation (optional)
    if (password) {
      if (password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        valid = false;
      } else {
        setPasswordError('');
      }

      if (!confirmPassword) {
        setConfirmError('Please confirm your new password');
        valid = false;
      } else if (password !== confirmPassword) {
        setConfirmError('Passwords do not match');
        valid = false;
      } else {
        setConfirmError('');
      }
    } else {
      setPasswordError('');
      setConfirmError('');
    }

    if (!valid) return;

    onSave(
      {
        studioName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password: password ? password.trim() : ''
      },
      (err) => {
        if (err) {
          setGeneralError(err.message || 'Failed to update studio details');
        }
      }
    );
  }

  return (
    <div
      id="edit-studio-modal-overlay"
      className="modal-overlay show"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        opacity: 1,
        pointerEvents: 'all'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{
          maxWidth: '480px',
          width: '100%',
          position: 'relative',
          zIndex: 10000,
          transform: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Studio Details</h3>
          <span
            id="close-profile-modal-btn"
            className="modal-close"
            onClick={onClose}
            title="Close"
          >
            ✕
          </span>
        </div>

        {generalError && (
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-red)',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {generalError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Studio Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-studio-name">
              Studio Name <span className="required">*</span>
            </label>
            <input
              id="edit-studio-name"
              className="form-input"
              value={studioName}
              onChange={(e) => {
                setStudioName(e.target.value);
                if (studioNameError) setStudioNameError('');
              }}
              placeholder="e.g. IndieDevStudios"
              disabled={isSaving}
            />
            {studioNameError && <span className="form-error">{studioNameError}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-studio-email">
              Email <span className="required">*</span>
            </label>
            <input
              id="edit-studio-email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder="studio@example.com"
              disabled={isSaving}
            />
            {emailError && <span className="form-error">{emailError}</span>}
          </div>

          {/* Phone Number */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-studio-phone">
              Phone Number <span className="required">*</span>
            </label>
            <input
              id="edit-studio-phone"
              className="form-input"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              placeholder="+1 234 567 8900"
              disabled={isSaving}
            />
            {phoneError && <span className="form-error">{phoneError}</span>}
          </div>

          {/* Change Password Box (Optional) */}
          <div className="password-change-box">
            <div className="password-change-title">Change Password (Optional)</div>

            <div className="form-group mb-2">
              <label className="form-label" htmlFor="edit-studio-pass">
                New Password
              </label>
              <input
                id="edit-studio-pass"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Leave blank to keep current"
                disabled={isSaving}
              />
              {passwordError && <span className="form-error">{passwordError}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-studio-confirm">
                Confirm Password
              </label>
              <input
                id="edit-studio-confirm"
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError('');
                }}
                placeholder="Repeat new password"
                disabled={isSaving}
              />
              {confirmError && <span className="form-error">{confirmError}</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
          <button
            id="cancel-profile-btn"
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            id="save-profile-btn"
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditStudioModal;
