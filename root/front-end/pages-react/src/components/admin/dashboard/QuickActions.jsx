/*
 * Concepts used in this component:
 *  - Components, Props (pendingGames, onOpen, onContactSuperAdmin, onContactModerators),
 *    Events (card clicks), Callbacks
 *
 * The six action cards at the bottom of the old dashboard.html.
 */
import React from 'react';
import StatusBadge from '../common/StatusBadge';

export function QuickActions(props) {
  const { pendingGames, onOpen, onContactSuperAdmin, onContactModerators } = props;

  return (
    <div className="section-cards mt-3" id="quick-actions">
      <div
        className="section-card"
        style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(0,212,255,0.04))' }}
        onClick={() => onOpen('hub')}
      >
        <div className="section-card-icon">👑</div>
        <h3 style={{ color: 'var(--accent-yellow)' }}>Admin Hub</h3>
        <p>Full control panel — analytics, audit log, tournament control, system commands</p>
        <div className="section-card-badge"><span className="badge badge-admin">Full Access</span></div>
      </div>
      <div className="section-card" onClick={() => onOpen('users')}>
        <div className="section-card-icon">👥</div>
        <h3>Manage Users</h3>
        <p>View, edit, and manage all user accounts and roles</p>
        <div className="section-card-badge"><StatusBadge status="active" /></div>
      </div>
      <div className="section-card" onClick={() => onOpen('approvals')}>
        <div className="section-card-icon">✅</div>
        <h3>Game Approvals</h3>
        <p>Review and approve games submitted by publishers</p>
        {pendingGames > 0 ? (
          <div className="section-card-badge"><span className="badge badge-pending">{pendingGames} Pending</span></div>
        ) : null}
      </div>
      <div className="section-card" onClick={() => onOpen('settings')}>
        <div className="section-card-icon">⚙️</div>
        <h3>System Settings</h3>
        <p>Configure platform-wide settings and preferences</p>
      </div>
      <div
        className="section-card"
        style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(0,212,255,0.04))' }}
        onClick={onContactSuperAdmin}
      >
        <div className="section-card-icon">🚨</div>
        <h3 style={{ color: 'var(--accent-purple)' }}>Contact Super Admin</h3>
        <p>Escalate a policy decision or critical issue to a Super Administrator</p>
        <div className="section-card-badge">
          <span className="badge" style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-purple)', border: '1px solid rgba(124,58,237,0.3)' }}>Escalate Up</span>
        </div>
      </div>
      <div
        className="section-card"
        style={{ borderColor: 'rgba(0,212,255,0.35)', background: 'linear-gradient(135deg,rgba(0,212,255,0.06),rgba(124,58,237,0.04))' }}
        onClick={onContactModerators}
      >
        <div className="section-card-icon">📡</div>
        <h3 style={{ color: 'var(--accent-cyan)' }}>Broadcast to Moderators</h3>
        <p>Send a message to all moderators on duty — directives, alerts, or announcements</p>
        <div className="section-card-badge">
          <span className="badge" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>Broadcast</span>
        </div>
      </div>
    </div>
  );
}

export default QuickActions;
