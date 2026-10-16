/*
 * Concepts used in this component:
 *  - Components, Props (active, auditLog, addAudit), State (the four switches that are not stored in
 *    settings), Events (switch and button clicks), Hooks (useState, useEffect, useContext),
 *    Context (AdminContext for toast / confirm / redraw), prop drilling (on / onChange go to ToggleRow),
 *    Callbacks (confirmAction runs a Danger Zone action only after "Confirm")
 *
 * "System Control" section of the old hub.html: platform and security switches, CSV export, and the
 * Danger Zone. Four switches (maintenance, registrations, 2FA, strong passwords) are real settings;
 * the other four only show a message, exactly as in the old page.
 */
import React, { useState, useEffect, useContext } from 'react';
import AdminContext from '../../../context/AdminContext';
import ToggleRow from '../common/ToggleRow';
import { getSession, getDB } from '../../../services/adminService';
import { setSystemSetting, exportData, getDangerAction } from '../../../services/adminHubService';

// The four switches that are not saved anywhere, and where they start each time the section opens.
const LOCAL_DEFAULTS = { tournaments: true, publishing: true, ratelimit: true, ipwhitelist: false };

const DANGER_BUTTONS = [
  { action: 'purge-sessions', title: 'Purge All Sessions', text: 'Disconnect all active game sessions', icon: '⚡' },
  { action: 'reset-bans', title: 'Lift All Bans', text: 'Remove all active player bans', icon: '🔓' },
  { action: 'clear-reports', title: 'Archive All Reports', text: 'Mark all pending reports as resolved', icon: '📁' },
  { action: 'reset-platform', title: 'Reset Platform Data', text: 'Reset all mock data to defaults', icon: '♻️' }
];

export function SystemSection(props) {
  const { active, auditLog, addAudit } = props;
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const [local, setLocal] = useState(LOCAL_DEFAULTS);

  // Opening the section again puts those four switches back to where they started.
  useEffect(() => {
    if (active) setLocal(LOCAL_DEFAULTS);
  }, [active]);

  const settings = getDB().settings;
  const who = () => getSession().username;

  // A switch that is saved in settings.
  function handleSetting(key, value, audit, message) {
    setSystemSetting(key, value);
    if (audit) addAudit('system', audit.msg, `By ${who()}`);
    toast.info(message);
    refresh();
  }

  // A switch that only shows a message.
  function handleLocal(key, value, message) {
    setLocal({ ...local, [key]: value });
    toast.info(message);
  }

  function handleExport(type) {
    const label = exportData(type, auditLog, addAudit);
    toast.success(`${label} data exported!`);
  }

  function handleDanger(action) {
    const a = getDangerAction(action);
    if (!a) return;
    confirmAction(a.title, a.msg, () => {
      a.run({ addAudit: addAudit, toast: toast });
      refresh();
    });
  }

  return (
    <div className={'hub-section' + (active ? ' active' : '')} id="sec-system">
      <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>System Control</h2>

      <div className="control-panel">
        <div className="control-card">
          <h3>🔧 Platform Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ToggleRow
              id="sys-maintenance"
              title="Maintenance Mode"
              description="Lock platform access for all users"
              on={settings.maintenanceMode}
              onChange={(v) => handleSetting('maintenanceMode', v, { msg: `Maintenance mode ${v ? 'ON' : 'OFF'}` }, `Maintenance mode ${v ? 'enabled' : 'disabled'}`)}
            />
            <ToggleRow
              id="sys-registration"
              title="New Registrations"
              description="Allow new users to sign up"
              on={settings.registrationOpen}
              onChange={(v) => handleSetting('registrationOpen', v, { msg: `Registrations ${v ? 'opened' : 'closed'}` }, `Registrations ${v ? 'opened' : 'closed'}`)}
            />
            <ToggleRow
              id="sys-tournaments"
              title="Tournament Creation"
              description="Allow publishers to create tournaments"
              on={local.tournaments}
              onChange={(v) => handleLocal('tournaments', v, `Tournament creation ${v ? 'enabled' : 'disabled'}`)}
            />
            <ToggleRow
              id="sys-publishing"
              title="Game Publishing"
              description="Allow publishers to submit games"
              on={local.publishing}
              onChange={(v) => handleLocal('publishing', v, `Game publishing ${v ? 'enabled' : 'disabled'}`)}
            />
          </div>
        </div>

        <div className="control-card">
          <h3>🔐 Security Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ToggleRow
              id="sys-2fa"
              title="Two-Factor Auth"
              description="Require 2FA for admin accounts"
              on={settings.twoFactorAuth}
              onChange={(v) => handleSetting('twoFactorAuth', v, null, `2FA ${v ? 'enabled' : 'disabled'}`)}
            />
            <ToggleRow
              id="sys-passwords"
              title="Strong Passwords"
              description="Enforce password complexity rules"
              on={settings.strongPasswords}
              onChange={(v) => handleSetting('strongPasswords', v, null, `Strong passwords ${v ? 'enforced' : 'optional'}`)}
            />
            <ToggleRow
              id="sys-ratelimit"
              title="Rate Limiting"
              description="Limit API requests per user"
              on={local.ratelimit}
              onChange={(v) => handleLocal('ratelimit', v, `Rate limiting ${v ? 'on' : 'off'}`)}
            />
            <ToggleRow
              id="sys-ipwhitelist"
              title="IP Whitelist"
              description="Restrict admin access by IP"
              on={local.ipwhitelist}
              onChange={(v) => handleLocal('ipwhitelist', v, `IP whitelist ${v ? 'on' : 'off'}`)}
            />
          </div>
        </div>

        <div className="control-card">
          <h3>📊 Quick Export</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Download platform data reports</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button className="btn btn-ghost w-full" onClick={() => handleExport('users')}>⬇️ Export Users CSV</button>
            <button className="btn btn-ghost w-full" onClick={() => handleExport('games')}>⬇️ Export Games CSV</button>
            <button className="btn btn-ghost w-full" onClick={() => handleExport('reports')}>⬇️ Export Reports CSV</button>
            <button className="btn btn-ghost w-full" onClick={() => handleExport('audit')}>⬇️ Export Audit Log</button>
          </div>
        </div>

        <div className="control-card danger-zone">
          <h3>⚠️ Danger Zone</h3>
          {DANGER_BUTTONS.map((d) => (
            <div className="danger-btn" key={d.action} onClick={() => handleDanger(d.action)}>
              <div>
                <h4>{d.title}</h4>
                <p>{d.text}</p>
              </div>
              <span>{d.icon}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SystemSection;
