/*
 * Concepts used in this component:
 *  - Components, Props (settings, onToggle), Events (toggle clicks),
 *    prop drilling (onToggle goes to ToggleRow), Callbacks (onToggle)
 *
 * "🔔 Notification Settings" card of the old settings.html.
 */
import React from 'react';
import ToggleRow from '../common/ToggleRow';

export function NotificationSettingsCard(props) {
  const { settings, onToggle } = props;

  return (
    <div className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>🔔 Notification Settings <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'Inter' }}>Configure system notifications</span></h3>
      <ToggleRow
        id="toggle-email"
        title="Email Notifications"
        description="Send email alerts to admins"
        on={settings.emailNotifications}
        onChange={(v) => onToggle('emailNotifications', v)}
      />
      <ToggleRow
        id="toggle-reports"
        title="Report Notifications"
        description="Alert moderators of new reports"
        on={settings.reportNotifications}
        onChange={(v) => onToggle('reportNotifications', v)}
      />
      <ToggleRow
        id="toggle-approvals"
        title="Approval Notifications"
        description="Notify publishers of game approvals"
        on={settings.approvalNotifications}
        onChange={(v) => onToggle('approvalNotifications', v)}
      />
    </div>
  );
}

export default NotificationSettingsCard;
