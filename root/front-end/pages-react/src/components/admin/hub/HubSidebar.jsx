/*
 * Concepts used in this component:
 *  - Components, Props (session, email, activeSection, onSelect, onOpenSettings), Events (menu clicks),
 *    Lists (menu items), Callbacks (onSelect gets the section name)
 *
 * The left column of the Control Hub: who is signed in, the section menu, and the system status lights.
 */
import React from 'react';

const MENU = [
  { label: 'Control Panels', items: [
    { id: 'overview', icon: '🏠', text: 'Overview' },
    { id: 'users', icon: '👥', text: 'User Management' },
    { id: 'games', icon: '🎮', text: 'Game Control' },
    { id: 'tournaments', icon: '🏆', text: 'Tournaments' }
  ] },
  { label: 'Analytics & Logs', items: [
    { id: 'analytics', icon: '📊', text: 'Platform Analytics' },
    { id: 'audit', icon: '📋', text: 'Audit Log' }
  ] },
  { label: 'System', items: [
    { id: 'system', icon: '⚙️', text: 'System Control' },
    { id: 'settings', icon: '🔧', text: 'Settings' }
  ] }
];

const STATUS_LIGHTS = [
  ['API Server', false],
  ['Database', false],
  ['Auth Service', false],
  ['Matchmaking', true],
  ['CDN', false]
];

export function HubSidebar(props) {
  const { session, email, activeSection, onSelect, onOpenSettings } = props;

  return (
    <div className="hub-sidebar">
      <div className="sidebar-profile">
        <div className="su-avatar" id="sb-avatar">{session.avatar}</div>
        <h3 id="sb-name">{session.username}</h3>
        <p id="sb-email">{email}</p>
        <span className="access-badge">🛡️ Full System Access</span>
      </div>

      <div className="sidebar-menu">
        {MENU.map((group) => (
          <React.Fragment key={group.label}>
            <div className="menu-section-label">{group.label}</div>
            {group.items.map((item) => (
              <div
                key={item.id}
                className={'menu-item' + (activeSection === item.id ? ' active' : '')}
                id={'mi-' + item.id}
                onClick={() => (item.id === 'settings' ? onOpenSettings() : onSelect(item.id))}
              >
                <span className="mi-icon">{item.icon}</span> {item.text}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="sidebar-system">
        <h4>System Status</h4>
        {STATUS_LIGHTS.map(([name, warn]) => (
          <div className="sys-indicator" key={name}>
            <span>{name}</span>
            <div className={'dot' + (warn ? ' warn' : '')}></div>
          </div>
        ))}
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-primary)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Last checked: just now
        </div>
      </div>
    </div>
  );
}

export default HubSidebar;
