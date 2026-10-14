/*
 * Concepts used in this component:
 *  - Components, Props (which panel, callbacks to the page), State (typed values, error message,
 *    button label, staff tab, "sign in here?" box), Events (typing, clicks, Enter key),
 *    Forms (controlled inputs), Hooks (useState, useRef, useContext), Context (AuthContext.login),
 *    API calls (POST /auth/login through landingAuthService), Callbacks (onClose, onSignedIn)
 *
 * The sign-in panel of the old index.html. One component draws all four panels: Player,
 * Publisher, Moderator and the Staff panel (Admin / Superuser tabs). The password is checked by
 * the server; this component only collects the form and shows what came back.
 */
import React, { useState, useRef, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import {
  PANEL_CONFIGS,
  STAFF_TABS,
  demoPassword,
  findLoginUser,
  serverLogin,
  resolveSessionConflict,
  buildSession,
  runForgotPassword
} from '../../services/landingAuthService';

const STAFF_COLUMN = {
  icon: '🎮',
  iconBg: 'rgba(16,185,129,0.15)',
  title: 'Staff Sign In',
  inputId: 'adm-username',
  passId: 'adm-password'
};

export function LoginPanel(props) {
  const { type, onClose, onSignedIn, onOpenRegister, showToast } = props;
  const { login } = useContext(AuthContext);

  const isStaff = type === 'admin';
  const [staffTab, setStaffTab] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [userBad, setUserBad] = useState(false);
  const [passBad, setPassBad] = useState(false);
  const [busy, setBusy] = useState('');            // '' | 'signing' | 'waiting'
  const [askResolver, setAskResolver] = useState(null);

  const userRef = useRef(null);
  const passRef = useRef(null);
  // What the last "Use →" chip put into the form, so switching tabs can tell a chip-filled
  // form from one typed by hand (chip values belong to the tab they were filled on).
  const lastDemoFill = useRef(null);

  // Everything that differs between the panels.
  const staff = STAFF_TABS[staffTab];
  const col = isStaff
    ? {
        ...STAFF_COLUMN,
        role: staff.loginRole,
        btnLabel: staff.btnLabel,
        btnClass: staff.btnClass,
        demos: staff.demos
      }
    : PANEL_CONFIGS[type];

  if (!col) {
    return null;
  }

  function fillDemo(user) {
    const pass = demoPassword(user);
    setUsername(user);
    if (!pass) {
      showToast('error', 'Demo credentials for ' + user + ' are missing. Enter the password manually.');
      return;
    }
    setPassword(pass);
    lastDemoFill.current = { user: user, pass: pass };
  }

  function switchStaffTab(tab) {
    // Hand-typed values come along to the other tab; values from a demo chip do not.
    const fromChip = lastDemoFill.current &&
      username === lastDemoFill.current.user &&
      password === lastDemoFill.current.pass;
    if (fromChip) {
      lastDemoFill.current = null;
      setUsername('');
      setPassword('');
    }
    setError('');
    setStaffTab(tab);
  }

  // Shows the "Sign In Here?" box and waits for the answer.
  function askToSignInHere() {
    return new Promise((resolve) => {
      setAskResolver(() => resolve);
    });
  }

  function answerAsk(answer) {
    if (askResolver) {
      askResolver(answer);
    }
    setAskResolver(null);
  }

  async function doLogin() {
    setError('');
    if (!username.trim()) {
      if (userRef.current) userRef.current.focus();
      return;
    }

    const found = findLoginUser(username.trim(), col.role);
    if (found.error) {
      if (found.badUsername) setUserBad(true);
      setError(found.error);
      return;
    }
    if (!password) {
      if (passRef.current) passRef.current.focus();
      setError('Please enter your password.');
      return;
    }

    const user = found.user;
    const body = { password: password };
    if (user.email) {
      body.email = user.email;
    } else {
      body.username = found.username;
    }
    // Narrows the match when one email holds both a player and a studio account.
    if (user.role_id != null) {
      body.role_id = Number(user.role_id);
    }

    setBusy('signing');
    let result;
    try {
      result = await serverLogin(body);
    } finally {
      setBusy('');
    }

    if (result.status === 'offline') {
      setError('Cannot reach the server to verify your password. Check your connection and try again.');
      return;
    }
    if (result.status === 'banned') {
      setError('Your account has been banned. You cannot login.');
      return;
    }
    if (result.status === 'bad') {
      setPassBad(true);
      setError('Incorrect password.');
      return;
    }

    if (result.status === 'conflict') {
      // Another device holds the account: ask it to approve (up to 15s), or ask this person.
      setBusy('waiting');
      let handoff;
      try {
        handoff = await resolveSessionConflict(user, askToSignInHere);
      } finally {
        setBusy('');
      }

      if (!handoff.ok) {
        const messages = {
          cooldown: `Request declined. Please wait ${handoff.retryInSec}s before trying again.`,
          denied: 'Sign-in request was declined on the other device.',
          timeout: 'No response from the other device. Please wait 15s and try again.',
          cancelled: null
        };
        const msg = messages[handoff.reason];
        if (msg) setError(msg);
        return;
      }

      result = await serverLogin({ ...body, force: true });
      if (result.status !== 'ok') {
        setError('Could not sign in. Please try again.');
        return;
      }
    }

    // Signed in: keep the session and the signed API token, then let the page move on.
    const session = buildSession(result.data.user, result.data.session_token);
    login(session, result.data.token);
    showToast('success', `Welcome back, ${found.username}!`);
    onSignedIn(found.role);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // Username box: staff panel logs in on Enter, the others jump to the password box.
  function handleUserKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (isStaff) {
      doLogin();
    } else if (passRef.current) {
      passRef.current.focus();
    }
  }

  function handlePassKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doLogin();
    }
  }

  let buttonLabel = col.btnLabel;
  if (busy === 'signing') buttonLabel = 'Signing in…';
  if (busy === 'waiting') buttonLabel = 'Waiting for approval…';

  const tabButtonStyle = {
    flex: 1,
    padding: '0.45rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 700,
    transition: 'all 0.2s'
  };

  return (
    <div
      className={'login-panel-overlay' + (props.open ? ' show' : '')}
      id="login-panel-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="login-panel"
        id="login-panel"
        style={{ position: 'relative', maxWidth: isStaff ? '460px' : '420px', margin: '0 auto' }}
      >
        <div className="lp-close" onClick={onClose}>✕</div>
        <div className="login-panel-inner" id="login-panel-inner" style={{ gridTemplateColumns: '1fr' }}>
          <div className="lp-col" style={isStaff ? { minWidth: 0 } : undefined}>
            <div className="lp-col-header">
              <div className="lp-col-icon" style={{ background: col.iconBg }}>{col.icon}</div>
              <div className="lp-col-title">{col.title}</div>
            </div>

            {isStaff && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.4rem',
                  marginBottom: '1.25rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.3rem'
                }}
              >
                <button
                  onClick={() => switchStaffTab('admin')}
                  style={{
                    ...tabButtonStyle,
                    background: staffTab === 'admin' ? 'var(--accent-green)' : 'transparent',
                    color: staffTab === 'admin' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  🎮 Admin
                </button>
                <button
                  onClick={() => switchStaffTab('superuser')}
                  style={{
                    ...tabButtonStyle,
                    background: staffTab === 'superuser' ? 'var(--gradient-brand)' : 'transparent',
                    color: staffTab === 'superuser' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  ⚡ Superuser
                </button>
              </div>
            )}

            <div
              id="login-error-msg"
              style={{
                display: error ? 'block' : 'none',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--accent-red)',
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                textAlign: 'center',
                fontWeight: 600
              }}
            >
              {error}
            </div>

            <div className="form-group mb-2">
              <label className="form-label">{col.inputLabel || 'Username'}</label>
              <input
                className={'form-input' + (userBad ? ' error' : '')}
                id={col.inputId}
                type="text"
                placeholder={col.inputPlaceholder || 'Enter username'}
                value={username}
                ref={userRef}
                onChange={(e) => { setUsername(e.target.value); setUserBad(false); }}
                onKeyDown={handleUserKey}
              />
              <span className="form-error"></span>
            </div>
            <div className="form-group mb-2">
              <label className="form-label">Password</label>
              <input
                className={'form-input' + (passBad ? ' error' : '')}
                id={col.passId}
                type="password"
                placeholder="Enter password"
                value={password}
                ref={passRef}
                onChange={(e) => { setPassword(e.target.value); setPassBad(false); }}
                onKeyDown={handlePassKey}
              />
              <span className="form-error"></span>
            </div>
            <button
              className={'btn ' + col.btnClass + ' w-full mt-1'}
              disabled={busy !== ''}
              onClick={doLogin}
            >
              {buttonLabel}
            </button>

            <div className="demo-accounts" style={{ marginTop: '1rem' }}>
              <h4>Demo Accounts</h4>
              {col.demos.map((d) => (
                <div className="demo-row" key={d.user}>
                  <span className="demo-role">{d.label}</span>
                  <span className="demo-fill" onClick={() => fillDemo(d.user)}>Use →</span>
                </div>
              ))}
            </div>

            {type === 'player' && (
              <>
                <div style={{ textAlign: 'center', marginTop: '0.9rem', fontSize: '0.82rem' }}>
                  <span
                    style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={runForgotPassword}
                  >
                    Forgot your password?
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Don't have an account?{' '}
                  <span
                    style={{ color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={onOpenRegister}
                  >
                    Register →
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {askResolver && (
        <div
          className="modal-overlay show"
          style={{ zIndex: 10000 }}
          onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) answerAsk(false); }}
        >
          <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.25rem', marginBottom: '.5rem' }}>🔐</div>
            <h3 className="modal-title" style={{ marginBottom: '.6rem' }}>Sign In Here?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '.875rem', marginBottom: '1.5rem' }}>
              Your other device isn't responding. You can sign in here — that will end the session on the other device.
            </p>
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => answerAsk(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => answerAsk(true)}>Sign In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPanel;
