/*
 * Concepts used in this component:
 *  - Components, Props (values and handlers passed to each card), State (input values + error messages),
 *    Events (toggle clicks, leaving a field), Hooks (useState, useEffect, useContext),
 *    Forms (controlled inputs with validation), Context (AuthContext for the role, AdminContext for
 *    toast / confirm / refresh), Redux (fetchPlatformSettings, updatePlatformSettings, recordAuditLog)
 *
 * Mirrors pages/admin/settings.html, except there is no Save button: every change is applied
 * only after the admin confirms a warning, and then it is saved straight away.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import Button from '../../components/common/Button';
import PlatformSettingsCard from '../../components/admin/settings/PlatformSettingsCard';
import SecuritySettingsCard from '../../components/admin/settings/SecuritySettingsCard';
import NotificationSettingsCard from '../../components/admin/settings/NotificationSettingsCard';
import TournamentSettingsCard from '../../components/admin/settings/TournamentSettingsCard';
import { validateField } from '../../services/adminValidation';
import { DEFAULT_SETTINGS } from '../../services/adminService';
import {
  fetchPlatformSettings,
  updatePlatformSettings
} from '../../features/platform/platformSlice';
import { recordAuditLog } from '../../features/platform/auditSlice';
import { selectPlatformSettings } from '../../features/platform/selectors';

// What each switch is called, and what the warning says when it is turned on or off.
const TOGGLES = {
  maintenanceMode: {
    label: 'Maintenance Mode',
    on: 'Turning ON maintenance mode stops players, publishers and moderators from signing in, and stops new registrations, until you turn it off. Admins can still sign in.',
    off: 'Turning OFF maintenance mode lets everyone sign in again.'
  },
  registrationOpen: {
    label: 'Registration',
    on: 'Reopening registration lets new players and publishers create accounts again.',
    off: 'Closing registration stops new players and publishers from creating accounts.'
  },
  twoFactorAuth: {
    label: 'Two-Factor Authentication',
    on: 'Turn ON two-factor authentication for admin accounts?',
    off: 'Turn OFF two-factor authentication for admin accounts? Accounts become easier to take over.'
  },
  strongPasswords: {
    label: 'Password Requirements',
    on: 'Turn ON strong password enforcement?',
    off: 'Turn OFF strong password enforcement? Weaker passwords will be accepted.'
  },
  emailNotifications: {
    label: 'Email Notifications',
    on: 'Turn ON email alerts to admins?',
    off: 'Turn OFF email alerts to admins?'
  },
  reportNotifications: {
    label: 'Report Notifications',
    on: 'Turn ON alerts to moderators for new reports?',
    off: 'Turn OFF alerts to moderators for new reports? Moderators will not hear about new reports.'
  },
  approvalNotifications: {
    label: 'Approval Notifications',
    on: 'Turn ON notifications to publishers about game approvals?',
    off: 'Turn OFF notifications to publishers about game approvals?'
  }
};

export function Settings() {
  const { user } = useContext(AuthContext);
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const dispatch = useDispatch();

  const rawSettings = useSelector(selectPlatformSettings);
  const settings = {
    platformName: 'PlayCarys',
    sessionTimeout: 30,
    ...DEFAULT_SETTINGS,
    ...rawSettings
  };
  const isSuperuser = user.role === 'superuser';

  const [platformName, setPlatformName] = useState(settings.platformName);
  const [sessionTimeout, setSessionTimeout] = useState(settings.sessionTimeout);
  const [nameError, setNameError] = useState('');
  const [timeoutError, setTimeoutError] = useState('');

  useEffect(() => {
    document.title = 'PlayCarys — System Settings';
    dispatch(fetchPlatformSettings());
  }, [dispatch]);

  useEffect(() => {
    if (rawSettings.platformName !== undefined) {
      setPlatformName(rawSettings.platformName);
    }
    if (rawSettings.sessionTimeout !== undefined) {
      setSessionTimeout(rawSettings.sessionTimeout);
    }
  }, [rawSettings.platformName, rawSettings.sessionTimeout]);

  // Typing clears that field's error, like the old page.
  function handleNameChange(value) {
    setPlatformName(value);
    setNameError('');
  }

  function handleTimeoutChange(value) {
    setSessionTimeout(value);
    setTimeoutError('');
  }

  // One change, after the admin has confirmed it: save, tell the audit log, redraw.
  async function applyChange(key, value, auditMsg) {
    try {
      const nextSettings = { ...settings, [key]: value };
      await dispatch(updatePlatformSettings(nextSettings)).unwrap();
      dispatch(
        recordAuditLog({
          type: 'system',
          msg: auditMsg,
          detail: 'Changed by ' + user.username
        })
      );
      toast.success('Setting saved');
      refresh();
    } catch (err) {
      toast.error('Failed to save setting');
    }
  }

  // A toggle asks first, then saves. Cancelling leaves it as it was.
  function handleToggle(key, value) {
    const info = TOGGLES[key];
    confirmAction(
      '⚠️ Change Setting',
      info[value ? 'on' : 'off'],
      () => applyChange(key, value, `${info.label} turned ${value ? 'ON' : 'OFF'}`),
      'danger'
    );
  }

  // Leaving the name field (or pressing Enter) asks to confirm the rename.
  function commitName() {
    if (!isSuperuser) return;
    const next = platformName.trim();
    if (next === settings.platformName) {
      setPlatformName(settings.platformName);
      return;
    }
    const msg = validateField(next, [
      { type: 'required', msg: 'Platform name is required' },
      { type: 'minLen', n: 2, msg: 'Min 2 characters' }
    ]);
    setNameError(msg);
    if (msg) return;

    confirmAction(
      '⚠️ Rename Platform',
      `Rename the platform from "${settings.platformName}" to "${next}"? The new name is shown to everyone on the platform.`,
      () => applyChange('platformName', next, `Platform renamed to ${next}`),
      'danger',
      () => {
        setPlatformName(settings.platformName);
        setNameError('');
      }
    );
  }

  // Same for the session timeout.
  function commitTimeout() {
    const minutes = parseInt(sessionTimeout, 10);
    if (String(sessionTimeout).trim() !== '' && minutes === Number(settings.sessionTimeout)) {
      setSessionTimeout(settings.sessionTimeout);
      return;
    }
    const msg = validateField(sessionTimeout, [
      { type: 'required' },
      { type: 'numeric' },
      { type: 'positive' },
      { type: 'custom', fn: (v) => Number.isInteger(Number(v)) && v >= 5 && v <= 240, msg: 'Must be a whole number between 5 and 240 minutes' }
    ]);
    setTimeoutError(msg);
    if (msg) return;

    confirmAction(
      '⚠️ Change Session Timeout',
      `Change the session timeout from ${settings.sessionTimeout} to ${minutes} minutes? Admins, moderators and superusers will be signed out after ${minutes} minutes without activity. Players and publishers are not affected.`,
      () => applyChange('sessionTimeout', minutes, `Session timeout changed to ${minutes} minutes (was ${settings.sessionTimeout})`),
      'danger',
      () => {
        setSessionTimeout(settings.sessionTimeout);
        setTimeoutError('');
      }
    );
  }

  function handleReset() {
    confirmAction('⚠️ Reset Settings', 'Reset all settings to default values?', async () => {
      const resetObj = {
        ...DEFAULT_SETTINGS,
        ...(isSuperuser ? { platformName: 'PlayCarys' } : {})
      };
      try {
        await dispatch(updatePlatformSettings(resetObj)).unwrap();
        setPlatformName(resetObj.platformName || settings.platformName);
        setSessionTimeout(resetObj.sessionTimeout || 30);
        setNameError('');
        setTimeoutError('');
        dispatch(
          recordAuditLog({
            type: 'system',
            msg: 'Settings reset to defaults',
            detail: 'Changed by ' + user.username
          })
        );
        refresh();
        toast.info('Settings reset to defaults');
      } catch (err) {
        toast.error('Failed to reset settings');
      }
    }, 'danger');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>System Settings</h1>
        <p className="text-muted">Configure platform-wide settings. Each change asks you to confirm, then saves straight away.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <PlatformSettingsCard
          settings={settings}
          platformName={platformName}
          onNameChange={handleNameChange}
          onNameCommit={commitName}
          nameError={nameError}
          nameLocked={!isSuperuser}
          onToggle={handleToggle}
        />

        <SecuritySettingsCard
          settings={settings}
          sessionTimeout={sessionTimeout}
          onTimeoutChange={handleTimeoutChange}
          onTimeoutCommit={commitTimeout}
          timeoutError={timeoutError}
          onToggle={handleToggle}
        />

        <NotificationSettingsCard settings={settings} onToggle={handleToggle} />

        <TournamentSettingsCard />

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Button variant="red" onClick={handleReset}>↺ Reset to Defaults</Button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
