/*
 * Concepts used in this file:
 *  - Components, Props (open, onClose, onRegistered), State (one value per field and one error
 *    message per field), Forms (controlled inputs + validation on submit), Events (typing, clicks,
 *    Enter key), Hooks (useState, useEffect), Callbacks (the page decides what happens after sign-up)
 *
 * The two sign-up boxes of the old index.html: "Join PlayCarys" (player) and "Collaborate With Us"
 * (publisher). The rules and the saved account are in landingAuthService (registerPlayer /
 * registerPublisher), copied from the old doRegister / doPublisherRegister.
 */
import React, { useState, useEffect } from 'react';
import { registerPlayer, registerPublisher } from '../../services/landingAuthService';

const COUNTRY_CODES = [
  ['+1', '🇺🇸 US (+1)'], ['+44', '🇬🇧 UK (+44)'], ['+61', '🇦🇺 AU (+61)'], ['+7', '🇷🇺 RU (+7)'],
  ['+33', '🇫🇷 FR (+33)'], ['+49', '🇩🇪 DE (+49)'], ['+81', '🇯🇵 JP (+81)'], ['+82', '🇰🇷 KR (+82)'],
  ['+86', '🇨🇳 CN (+86)'], ['+91', '🇮🇳 IN (+91)'], ['+351', '🇵🇹 PT (+351)'], ['+353', '🇮🇪 IE (+353)'],
  ['+358', '🇫🇮 FI (+358)'], ['+39', '🇮🇹 IT (+39)'], ['+34', '🇪🇸 ES (+34)'], ['+55', '🇧🇷 BR (+55)'],
  ['+52', '🇲🇽 MX (+52)'], ['+27', '🇿🇦 ZA (+27)'], ['+65', '🇸🇬 SG (+65)'], ['+971', '🇦🇪 AE (+971)']
];

// While a box is open the page behind it does not scroll (the old Modal.open / Modal.close).
function useLockScroll(open) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
}

// One labelled input with its red error line underneath.
function Field(props) {
  const { label, id, type, placeholder, value, error, onChange, onEnter, style } = props;
  return (
    <div className="form-group mb-2">
      <label className="form-label">{label} <span className="required">*</span></label>
      <input
        className={'form-input' + (error ? ' error' : '')}
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        style={style}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      <span className={'form-error' + (error ? ' show' : '')}>{error}</span>
    </div>
  );
}

export function PlayerRegisterModal(props) {
  const { open, onClose, onRegistered } = props;
  const [values, setValues] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  useLockScroll(open);

  function setField(name, value) {
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '' });
  }

  function submit() {
    const result = registerPlayer(values);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    onRegistered(result.user, result.sessionToken);
  }

  return (
    <div
      className={'modal-overlay' + (open ? ' show' : '')}
      id="register-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">🎮 Join PlayCarys</h3>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Create your player account and start your gaming journey
        </p>
        <div id="reg-form-wrap">
          <Field label="Username" id="reg-username" type="text" placeholder="Choose a username"
            value={values.username} error={errors.username} onChange={(v) => setField('username', v)} onEnter={submit} />
          <Field label="Email" id="reg-email" type="email" placeholder="your@email.com"
            value={values.email} error={errors.email} onChange={(v) => setField('email', v)} onEnter={submit} />
          <Field label="Password" id="reg-password" type="password" placeholder="Min 8 chars, uppercase, number"
            value={values.password} error={errors.password} onChange={(v) => setField('password', v)} onEnter={submit} />
          <Field label="Confirm Password" id="reg-confirm" type="password" placeholder="Repeat password"
            value={values.confirm} error={errors.confirm} onChange={(v) => setField('confirm', v)} onEnter={submit} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Create Account</button>
        </div>
      </div>
    </div>
  );
}

export function PublisherRegisterModal(props) {
  const { open, onClose, onRegistered } = props;
  const [values, setValues] = useState({
    username: '', email: '', countryCode: '+91', phone: '', password: '', confirm: ''
  });
  const [errors, setErrors] = useState({});
  useLockScroll(open);

  function setField(name, value) {
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '' });
  }

  function submit() {
    const result = registerPublisher(values);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    onRegistered(result.user, result.sessionToken);
  }

  return (
    <div
      className={'modal-overlay' + (open ? ' show' : '')}
      id="pub-register-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">🤝 Collaborate With Us</h3>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Register your studio as a Publisher and start showcasing your games to thousands of active players on PlayCarys.
        </p>
        <div>
          <Field label="Studio / Publisher Name" id="pub-reg-username" type="text" placeholder="e.g. EpicGamesStudio"
            value={values.username} error={errors.username} onChange={(v) => setField('username', v)} onEnter={submit} />
          <Field label="Email" id="pub-reg-email" type="email" placeholder="studio@example.com"
            value={values.email} error={errors.email} onChange={(v) => setField('email', v)} onEnter={submit} />

          <div className="form-group mb-2">
            <label className="form-label">Phone Number <span className="required">*</span></label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="form-select"
                id="pub-reg-cc"
                style={{ width: '130px', flexShrink: 0 }}
                value={values.countryCode}
                onChange={(e) => setField('countryCode', e.target.value)}
              >
                {COUNTRY_CODES.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <input
                className={'form-input' + (errors.phone ? ' error' : '')}
                id="pub-reg-phone"
                type="tel"
                placeholder="9876543210"
                style={{ flex: 1 }}
                value={values.phone}
                onChange={(e) => setField('phone', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
            </div>
            <span className={'form-error' + (errors.phone ? ' show' : '')}>{errors.phone}</span>
          </div>

          <Field label="Password" id="pub-reg-password" type="password" placeholder="Min 8 chars, uppercase, number"
            value={values.password} error={errors.password} onChange={(v) => setField('password', v)} onEnter={submit} />
          <Field label="Confirm Password" id="pub-reg-confirm" type="password" placeholder="Repeat password"
            value={values.confirm} error={errors.confirm} onChange={(v) => setField('confirm', v)} onEnter={submit} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-purple" onClick={submit}>🚀 Register Studio</button>
        </div>
      </div>
    </div>
  );
}
