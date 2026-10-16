/*
 * Concepts used in this component:
 *  - Components, Props (values + handlers from the page), Events (typing, toggles),
 *    Forms (controlled number input with an error message), prop drilling (onToggle goes to ToggleRow),
 *    Callbacks (onTimeoutChange / onToggle)
 *
 * "🛡️ Security Settings" card of the old settings.html.
 */
import React from 'react';
import ToggleRow from '../common/ToggleRow';

export function SecuritySettingsCard(props) {
  const { settings, sessionTimeout, onTimeoutChange, timeoutError, onToggle } = props;

  return (
    <div className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>🛡️ Security Settings <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'Inter' }}>Security and privacy controls</span></h3>
      <ToggleRow
        id="toggle-2fa"
        title="Two-Factor Authentication"
        description="Require 2FA for all admin accounts"
        on={settings.twoFactorAuth}
        onChange={(v) => onToggle('twoFactorAuth', v)}
      />
      <div className="form-group" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 500 }}>Session Timeout</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Auto-logout after inactivity (minutes)</p>
          </div>
          <input
            className={'form-input' + (timeoutError ? ' error' : '')}
            id="session-timeout"
            type="number"
            min="5"
            max="240"
            value={sessionTimeout}
            onChange={(e) => onTimeoutChange(e.target.value)}
            style={{ width: '90px', textAlign: 'center' }}
          />
        </div>
        <span className={'form-error' + (timeoutError ? ' show' : '')}>{timeoutError}</span>
      </div>
      <ToggleRow
        id="toggle-passwords"
        title="Password Requirements"
        description="Enforce strong passwords"
        on={settings.strongPasswords}
        onChange={(v) => onToggle('strongPasswords', v)}
      />
    </div>
  );
}

export default SecuritySettingsCard;
