/*
 * Concepts used in this component:
 *  - Components, Props (values and handlers passed to each card), State (input values + error messages),
 *    Events (Save / Reset / toggle clicks), Hooks (useState, useEffect, useContext),
 *    Forms (controlled inputs with validation), Context (AuthContext for the role, AdminContext for
 *    toast / confirm / refresh), prop drilling (handlers go page → card → ToggleRow),
 *    Callbacks (handleToggle, and the function run when Reset is confirmed)
 *
 * Mirrors pages/admin/settings.html.
 */
import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import Button from '../../components/common/Button';
import PlatformSettingsCard from '../../components/admin/settings/PlatformSettingsCard';
import SecuritySettingsCard from '../../components/admin/settings/SecuritySettingsCard';
import NotificationSettingsCard from '../../components/admin/settings/NotificationSettingsCard';
import TournamentSettingsCard from '../../components/admin/settings/TournamentSettingsCard';
import { validateField } from '../../services/adminValidation';
import {
  getSettings,
  updateSetting,
  saveSettings,
  resetSettings
} from '../../services/adminService';

export function Settings() {
  const { user } = useContext(AuthContext);
  const { toast, confirmAction, refresh } = useContext(AdminContext);

  // Read on every draw; refresh() (from AdminContext) redraws after a change.
  const settings = getSettings();
  const isSuperuser = user.role === 'superuser';

  const [platformName, setPlatformName] = useState(settings.platformName);
  const [sessionTimeout, setSessionTimeout] = useState(settings.sessionTimeout);
  const [nameError, setNameError] = useState('');
  const [timeoutError, setTimeoutError] = useState('');

  useEffect(() => {
    document.title = 'PlayCarys — System Settings';
  }, []);

  // Typing clears that field's error, like the old page.
  function handleNameChange(value) {
    setPlatformName(value);
    setNameError('');
  }

  function handleTimeoutChange(value) {
    setSessionTimeout(value);
    setTimeoutError('');
  }

  // A toggle saves immediately.
  function handleToggle(key, value) {
    updateSetting(key, value);
    refresh();
  }

  function handleSave() {
    const nameMsg = validateField(platformName, [
      { type: 'required', msg: 'Platform name is required' },
      { type: 'minLen', n: 2, msg: 'Min 2 characters' }
    ]);
    const timeoutMsg = validateField(sessionTimeout, [
      { type: 'required' },
      { type: 'numeric' },
      { type: 'positive' },
      { type: 'custom', fn: (v) => v >= 5 && v <= 240, msg: 'Must be between 5 and 240 minutes' }
    ]);
    setNameError(nameMsg);
    setTimeoutError(timeoutMsg);
    if (nameMsg || timeoutMsg) return;

    saveSettings(platformName, sessionTimeout, isSuperuser);
    toast.success('Settings saved successfully!');
  }

  function handleReset() {
    confirmAction('Reset Settings', 'Reset all settings to default values?', () => {
      resetSettings(isSuperuser);
      const fresh = getSettings();
      setPlatformName(fresh.platformName);
      setSessionTimeout(fresh.sessionTimeout);
      refresh();
      toast.info('Settings reset to defaults');
    }, 'danger');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>System Settings</h1>
        <p className="text-muted">Configure platform-wide settings</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <PlatformSettingsCard
          settings={settings}
          platformName={platformName}
          onNameChange={handleNameChange}
          nameError={nameError}
          nameLocked={!isSuperuser}
          onToggle={handleToggle}
        />

        <SecuritySettingsCard
          settings={settings}
          sessionTimeout={sessionTimeout}
          onTimeoutChange={handleTimeoutChange}
          timeoutError={timeoutError}
          onToggle={handleToggle}
        />

        <NotificationSettingsCard settings={settings} onToggle={handleToggle} />

        <TournamentSettingsCard />

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Button variant="red" onClick={handleReset}>↺ Reset to Defaults</Button>
          <Button variant="primary" onClick={handleSave}>💾 Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
