import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  getSettings,
  saveSettings,
  fetchUsers,
  fetchGames,
  purgeSessions,
  liftAllBans,
  archiveAllReports,
  clearActivityLog,
  getDatabase
} from '../../services/superuserService';
import api from '../../services/api';
import ToggleSwitch from '../../components/superuser/settings/ToggleSwitch';
import PlatformRenameModal from '../../components/superuser/settings/PlatformRenameModal';
import DangerConfirmModal from '../../components/superuser/settings/DangerConfirmModal';
import Toast from '../../components/common/Toast';
import '../../styles/superuser/settings.css';

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeCSV(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function Settings() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Settings State
  const [persistedSettings, setPersistedSettings] = useState({
    platformName: 'PlayCarys',
    supportEmail: 'support@playcarys.com',
    sessionTimeout: 30,
    maintenanceMode: false,
    registrationOpen: true,
    twoFactorAuth: true,
    strongPasswords: true,
    emailNotifications: true,
    reportNotifications: true,
    approvalNotifications: true,
    maxGames: 10
  });

  // UI-only Toggles State
  const [uiToggles, setUiToggles] = useState({
    publishing: true,
    tournaments: true,
    reports: true,
    ratelimit: true,
    ipwhitelist: false,
    auditlog: true,
    tournreminders: true
  });

  // Form Fields State
  const [formName, setFormName] = useState('PlayCarys');
  const [formEmail, setFormEmail] = useState('support@playcarys.com');
  const [formTimeout, setFormTimeout] = useState(30);
  const [formMaxGames, setFormMaxGames] = useState(10);
  const [formErrors, setFormErrors] = useState({});

  // Modals & Toast State
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);
  const [dangerModal, setDangerModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    actionKey: null
  });
  const [toast, setToast] = useState(null);

  // System Stats
  const [dbStats, setDbStats] = useState({
    sizeKb: '0.0',
    usersCount: 0,
    gamesCount: 0
  });

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  async function loadInitialSettings() {
    const s = getSettings();
    setPersistedSettings(s);
    setFormName(s.platformName || 'PlayCarys');
    setFormEmail(s.supportEmail || 'support@playcarys.com');
    setFormTimeout(s.sessionTimeout || 30);
    setFormMaxGames(s.maxGames || 10);

    // Calculate DB Size info from live backend data
    try {
      const [users, games] = await Promise.all([fetchUsers(), fetchGames()]);
      const db = getDatabase();
      const str = JSON.stringify(db);
      const size = (str.length / 1024).toFixed(1);
      setDbStats({
        sizeKb: size,
        usersCount: users.length,
        gamesCount: games.length
      });
    } catch {
      const db = getDatabase();
      const str = JSON.stringify(db);
      const size = (str.length / 1024).toFixed(1);
      setDbStats({
        sizeKb: size,
        usersCount: (db.users || []).length,
        gamesCount: (db.games || []).length
      });
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Superuser · Settings';

    const currentSession = authService.requireAuth(['superuser']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    loadInitialSettings();
  }, []);

  // Handle Persisted Toggles
  async function handlePersistedToggle(key, val, toastMsg) {
    try {
      await saveSettings({ [key]: val });
      setPersistedSettings((prev) => ({ ...prev, [key]: val }));
      showToast(toastMsg, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to update setting', 'error');
    }
  }

  // Handle UI-Only Toggles
  function handleUiToggle(key, val, toastMsg) {
    setUiToggles((prev) => ({ ...prev, [key]: val }));
    showToast(toastMsg, 'info');
  }

  // Validate Platform Info Form
  function validateForm() {
    const errs = {};
    const n = formName.trim();
    const e = formEmail.trim();
    const t = Number(formTimeout);
    const m = Number(formMaxGames);

    if (!n) {
      errs.name = 'Platform name required';
      showToast('Platform name required', 'error');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!e) {
      errs.email = 'Support email required';
      showToast('Support email required', 'error');
    } else if (!emailRegex.test(e)) {
      errs.email = 'Valid support email required';
      showToast('Valid support email required', 'error');
    }

    if (isNaN(t) || t < 5 || t > 480) {
      errs.timeout = 'Session timeout must be between 5 and 480 minutes';
      showToast('Session timeout must be between 5 and 480 minutes', 'error');
    }

    if (isNaN(m) || m < 1 || m > 100) {
      errs.maxGames = 'Max games per publisher must be between 1 and 100';
      showToast('Max games per publisher must be between 1 and 100', 'error');
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Save Platform Info
  function handleSavePlatformInfo(e) {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const previousName = persistedSettings.platformName || 'PlayCarys';
    const trimmedName = formName.trim();

    const dataToSave = {
      platformName: trimmedName,
      supportEmail: formEmail.trim(),
      sessionTimeout: Number(formTimeout),
      maxGames: Number(formMaxGames)
    };

    // If platform name changed, request explicit confirmation
    if (trimmedName !== previousName) {
      setPendingSaveData(dataToSave);
      setRenameModalOpen(true);
      return;
    }

    executeSavePlatformInfo(dataToSave);
  }

  function executeSavePlatformInfo(data) {
    saveSettings(data);
    setPersistedSettings((prev) => ({ ...prev, ...data }));
    showToast('Platform info saved', 'success');
  }

  function handleCancelRename() {
    setRenameModalOpen(false);
    setPendingSaveData(null);
    setFormName(persistedSettings.platformName || 'PlayCarys');
  }

  function handleConfirmRename() {
    setRenameModalOpen(false);
    if (pendingSaveData) {
      executeSavePlatformInfo(pendingSaveData);
      setPendingSaveData(null);
    }
  }

  // CSV Data Exports
  async function handleExportCSV(type) {
    try {
      let csvContent = '';
      const db = getDatabase();

      if (type === 'users') {
        let users = [];
        try {
          users = await fetchUsers();
        } catch (e) {
          users = db.users || [];
        }
        const header = 'Username,Email,Role,Status,Join Date\n';
        const rows = users
          .map((u) =>
            [
              escapeCSV(u.username || u.user_name),
              escapeCSV(u.email),
              escapeCSV(u.role),
              escapeCSV(u.status),
              escapeCSV(u.joinDate)
            ].join(',')
          )
          .join('\n');
        csvContent = header + rows;
      } else if (type === 'games') {
        let games = [];
        try {
          games = await fetchGames();
        } catch (e) {
          games = db.games || [];
        }
        const header = 'Title,Publisher,Genre,Status,Enabled,Views\n';
        const rows = games
          .map((g) =>
            [
              escapeCSV(g.title),
              escapeCSV(g.publisher),
              escapeCSV(g.genre),
              escapeCSV(g.status),
              escapeCSV(g.enabled),
              escapeCSV(g.views)
            ].join(',')
          )
          .join('\n');
        csvContent = header + rows;
      } else if (type === 'reports') {
        let reports = [];
        try {
          reports = await api.get('/reports');
        } catch (e) {
          reports = db.reports || [];
        }
        const header = 'ID,Reporter,Reported User,Type,Status\n';
        const rows = reports
          .map((r) =>
            [
              escapeCSV(r.id != null ? r.id : r.report_id),
              escapeCSV(r.reporterName || r.reporter_id || 'User'),
              escapeCSV(r.reportedName || r.reported_user || 'User'),
              escapeCSV(r.type || r.report_type || 'Report'),
              escapeCSV(r.status)
            ].join(',')
          )
          .join('\n');
        csvContent = header + rows;
      } else if (type === 'bans') {
        const bans = db.bans || [];
        const header = 'Player,Duration,Reason,Banned By,Banned Date,Active\n';
        const rows = bans
          .map((b) =>
            [
              escapeCSV(b.playerName || b.player_name),
              escapeCSV(b.duration),
              escapeCSV(b.reason),
              escapeCSV(b.bannedBy || b.banned_by),
              escapeCSV(b.bannedDate || b.created_at),
              escapeCSV(b.active)
            ].join(',')
          )
          .join('\n');
        csvContent = header + rows;
      } else if (type === 'tournaments') {
        let tournaments = [];
        try {
          tournaments = await api.get('/tournaments');
        } catch (e) {
          tournaments = db.tournaments || [];
        }
        const header = 'Name,Game,Status,Participants,Prize\n';
        const rows = tournaments
          .map((t) =>
            [
              escapeCSV(t.name || t.tournament_name),
              escapeCSV(t.game || t.game_name || t.game_id),
              escapeCSV(t.status),
              escapeCSV(t.participants != null ? t.participants : (t.players ? t.players.length : 0)),
              escapeCSV(t.prize)
            ].join(',')
          )
          .join('\n');
        csvContent = header + rows;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playcarys_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`${capitalize(type)} exported`, 'success');
    } catch (err) {
      console.error(`Failed to export ${type}:`, err);
      showToast(`Failed to export ${type}`, 'error');
    }
  }

  // Danger Zone Actions
  function openDangerAction(actionKey) {
    const dangerMap = {
      'purge-sessions': {
        title: 'End All Live Matches',
        message: 'This immediately ends every match in progress. Match history is kept.',
        confirmText: 'End Matches'
      },
      'lift-bans': {
        title: 'Lift All Bans',
        message: 'This will restore access to ALL currently banned users.',
        confirmText: 'Lift All Bans'
      },
      'archive-reports': {
        title: 'Archive All Reports',
        message: 'All pending reports will be marked as resolved.',
        confirmText: 'Archive Reports'
      },
      'reset-data': {
        title: 'Clear Activity Log',
        message: '⚠️ The activity log will be cleared and every live match ended. Match history is NOT deleted.',
        confirmText: 'Clear Activity Log'
      }
    };

    const target = dangerMap[actionKey];
    if (!target) return;

    setDangerModal({
      isOpen: true,
      title: target.title,
      message: target.message,
      confirmText: target.confirmText,
      actionKey
    });
  }

  async function handleConfirmDangerAction() {
    const { actionKey } = dangerModal;
    setDangerModal((prev) => ({ ...prev, isOpen: false }));

    try {
      if (actionKey === 'purge-sessions') {
        const count = await purgeSessions();
        showToast(`${count} match(es) ended`, 'warning');
      } else if (actionKey === 'lift-bans') {
        await liftAllBans();
        showToast('All bans lifted', 'success');
      } else if (actionKey === 'archive-reports') {
        await archiveAllReports();
        showToast('All reports archived', 'info');
      } else if (actionKey === 'reset-data') {
        await clearActivityLog();
        showToast('Activity log cleared', 'warning');
      }
      loadInitialSettings();
    } catch (err) {
      console.error(`Failed to execute ${actionKey}:`, err);
      showToast('Action failed', 'error');
    }
  }

  if (unauthorized) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Superuser Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            The Superuser Settings page requires Superuser privileges.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/index.html';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1>⚙️ System Settings</h1>
        <p className="text-muted">Global platform configuration — Superuser only</p>
      </div>

      <div className="settings-grid">
        {/* Card A: Platform Controls */}
        <div className="settings-card">
          <h3>🔧 Platform Controls</h3>
          <div>
            <ToggleSwitch
              title="Maintenance Mode"
              description="Lock platform for all non-admin users"
              checked={Boolean(persistedSettings.maintenanceMode)}
              onChange={(v) =>
                handlePersistedToggle('maintenanceMode', v, `Maintenance ${v ? 'ON' : 'OFF'}`)
              }
            />
            <ToggleSwitch
              title="New Registrations"
              description="Allow new players and publishers to sign up"
              checked={Boolean(persistedSettings.registrationOpen)}
              onChange={(v) =>
                handlePersistedToggle('registrationOpen', v, `Registrations ${v ? 'open' : 'closed'}`)
              }
            />
            <ToggleSwitch
              title="Game Publishing"
              description="Allow publishers to submit new games"
              checked={uiToggles.publishing}
              onChange={(v) =>
                handleUiToggle('publishing', v, `Game publishing ${v ? 'enabled' : 'disabled'}`)
              }
            />
            <ToggleSwitch
              title="Tournament Creation"
              description="Allow publishers to create new tournaments"
              checked={uiToggles.tournaments}
              onChange={(v) =>
                handleUiToggle('tournaments', v, `Tournament creation ${v ? 'enabled' : 'disabled'}`)
              }
            />
            <ToggleSwitch
              title="Player Reports"
              description="Allow players to submit reports"
              checked={uiToggles.reports}
              onChange={(v) =>
                handleUiToggle('reports', v, `Player reports ${v ? 'enabled' : 'disabled'}`)
              }
            />
          </div>
        </div>

        {/* Card B: Security Controls */}
        <div className="settings-card">
          <h3>🔐 Security Controls</h3>
          <div>
            <ToggleSwitch
              title="Two-Factor Auth"
              description="Require 2FA for admin accounts"
              checked={Boolean(persistedSettings.twoFactorAuth)}
              onChange={(v) =>
                handlePersistedToggle('twoFactorAuth', v, `2FA ${v ? 'enabled' : 'disabled'}`)
              }
            />
            <ToggleSwitch
              title="Strong Passwords"
              description="Enforce uppercase + number requirement"
              checked={Boolean(persistedSettings.strongPasswords)}
              onChange={(v) =>
                handlePersistedToggle(
                  'strongPasswords',
                  v,
                  `Strong passwords ${v ? 'enforced' : 'optional'}`
                )
              }
            />
            <ToggleSwitch
              title="Rate Limiting"
              description="Limit API requests per user per minute"
              checked={uiToggles.ratelimit}
              onChange={(v) =>
                handleUiToggle('ratelimit', v, `Rate limiting ${v ? 'on' : 'off'}`)
              }
            />
            <ToggleSwitch
              title="IP Whitelist (Admin)"
              description="Restrict admin login to whitelisted IPs"
              checked={uiToggles.ipwhitelist}
              onChange={(v) =>
                handleUiToggle('ipwhitelist', v, `IP whitelist ${v ? 'enabled' : 'disabled'}`)
              }
            />
            <ToggleSwitch
              title="Audit Logging"
              description="Log all admin actions to audit trail"
              checked={uiToggles.auditlog}
              onChange={(v) =>
                handleUiToggle('auditlog', v, `Audit logging ${v ? 'on' : 'off'}`)
              }
            />
          </div>
        </div>

        {/* Card C: Platform Info */}
        <div className="settings-card">
          <h3>🏷️ Platform Info</h3>
          <form onSubmit={handleSavePlatformInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Platform Name</label>
              <input
                className="form-input"
                id="cfg-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Support Email</label>
              <input
                className="form-input"
                id="cfg-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              {formErrors.email && <span className="form-error">{formErrors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Session Timeout (minutes)</label>
              <input
                className="form-input"
                id="cfg-timeout"
                type="number"
                min="5"
                max="480"
                value={formTimeout}
                onChange={(e) => setFormTimeout(e.target.value)}
              />
              {formErrors.timeout && <span className="form-error">{formErrors.timeout}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Max Games per Publisher</label>
              <input
                className="form-input"
                id="cfg-maxgames"
                type="number"
                min="1"
                max="100"
                value={formMaxGames}
                onChange={(e) => setFormMaxGames(e.target.value)}
              />
              {formErrors.maxGames && <span className="form-error">{formErrors.maxGames}</span>}
            </div>
            <button type="submit" className="btn btn-primary w-full">
              💾 Save Platform Info
            </button>
          </form>
        </div>

        {/* Card D: Notification Settings */}
        <div className="settings-card">
          <h3>🔔 Notification Settings</h3>
          <div>
            <ToggleSwitch
              title="Email Notifications"
              description="Send transactional emails to users"
              checked={Boolean(persistedSettings.emailNotifications)}
              onChange={(v) =>
                handlePersistedToggle('emailNotifications', v, `Email notifications ${v ? 'on' : 'off'}`)
              }
            />
            <ToggleSwitch
              title="Report Alerts"
              description="Notify moderators of new reports"
              checked={Boolean(persistedSettings.reportNotifications)}
              onChange={(v) =>
                handlePersistedToggle('reportNotifications', v, `Report alerts ${v ? 'on' : 'off'}`)
              }
            />
            <ToggleSwitch
              title="Approval Alerts"
              description="Notify admins of pending game submissions"
              checked={Boolean(persistedSettings.approvalNotifications)}
              onChange={(v) =>
                handlePersistedToggle(
                  'approvalNotifications',
                  v,
                  `Approval alerts ${v ? 'on' : 'off'}`
                )
              }
            />
            <ToggleSwitch
              title="Tournament Reminders"
              description="Notify registered players before tournaments start"
              checked={uiToggles.tournreminders}
              onChange={(v) =>
                handleUiToggle('tournreminders', v, `Tournament reminders ${v ? 'on' : 'off'}`)
              }
            />
          </div>
        </div>

        {/* Card E: Data Export */}
        <div className="settings-card">
          <h3>📦 Data Export</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Download platform data as CSV files for external analysis
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => handleExportCSV('users')}
            >
              ⬇️ Export All Users
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => handleExportCSV('games')}
            >
              ⬇️ Export All Games
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => handleExportCSV('reports')}
            >
              ⬇️ Export All Reports
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => handleExportCSV('bans')}
            >
              ⬇️ Export Ban History
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => handleExportCSV('tournaments')}
            >
              ⬇️ Export Tournaments
            </button>
          </div>
        </div>

        {/* Card F: System Status */}
        <div className="settings-card">
          <h3>📡 System Status</h3>
          <div id="sys-services">
            {[
              ['API Server', 'on', 'Online'],
              ['Database', 'on', 'Online'],
              ['Auth Service', 'on', 'Online'],
              ['Matchmaking', 'warn', 'Degraded'],
              ['CDN', 'on', 'Online'],
              ['Email Service', 'on', 'Online']
            ].map(([n, s, label]) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0',
                  fontSize: '0.82rem',
                  borderBottom: '1px solid var(--border-primary)'
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{n}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: s === 'on' ? 'var(--accent-green)' : 'var(--accent-yellow)',
                      boxShadow: `0 0 5px ${s === 'on' ? 'var(--accent-green)' : 'var(--accent-yellow)'}`
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: s === 'on' ? 'var(--accent-green)' : 'var(--accent-yellow)'
                    }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-primary)' }}>
            <div className="form-group">
              <label className="form-label">Platform Version</label>
              <input
                className="form-input"
                value="v2.4.1"
                readOnly
                style={{ opacity: 0.6, cursor: 'default' }}
              />
            </div>
            <div className="form-group mt-2">
              <label className="form-label">DB Size (mock)</label>
              <input
                className="form-input"
                id="db-size"
                value={`${dbStats.sizeKb} KB (${dbStats.usersCount} users, ${dbStats.gamesCount} games)`}
                readOnly
                style={{ opacity: 0.6, cursor: 'default' }}
              />
            </div>
          </div>
        </div>

        {/* Card G: Danger Zone (full width) */}
        <div className="settings-card danger-zone section-full">
          <h3>⚠️ Danger Zone — Superuser Only</h3>
          <div className="danger-grid">
            <div className="danger-row" onClick={() => openDangerAction('purge-sessions')}>
              <div>
                <h4>Purge All Sessions</h4>
                <p>Immediately disconnect all active game sessions</p>
              </div>
              <span style={{ fontSize: '1.3rem' }}>⚡</span>
            </div>

            <div className="danger-row" onClick={() => openDangerAction('lift-bans')}>
              <div>
                <h4>Lift All Bans</h4>
                <p>Remove every active player ban platform-wide</p>
              </div>
              <span style={{ fontSize: '1.3rem' }}>🔓</span>
            </div>

            <div className="danger-row" onClick={() => openDangerAction('archive-reports')}>
              <div>
                <h4>Archive All Reports</h4>
                <p>Mark all pending reports as resolved</p>
              </div>
              <span style={{ fontSize: '1.3rem' }}>📁</span>
            </div>

            <div className="danger-row" onClick={() => openDangerAction('reset-data')}>
              <div>
                <h4>Reset Platform Data</h4>
                <p>Reset sessions and activity log to defaults</p>
              </div>
              <span style={{ fontSize: '1.3rem' }}>♻️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Confirmation Modal */}
      <PlatformRenameModal
        isOpen={renameModalOpen}
        previousName={persistedSettings.platformName}
        newName={formName.trim()}
        onConfirm={handleConfirmRename}
        onCancel={handleCancelRename}
      />

      {/* Danger Action Confirmation Modal */}
      <DangerConfirmModal
        isOpen={dangerModal.isOpen}
        title={dangerModal.title}
        message={dangerModal.message}
        confirmText={dangerModal.confirmText}
        onConfirm={handleConfirmDangerAction}
        onCancel={() => setDangerModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Settings;
