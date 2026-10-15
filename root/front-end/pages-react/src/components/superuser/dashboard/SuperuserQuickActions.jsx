import React from 'react';
import { useNavigate } from 'react-router-dom';

export function SuperuserQuickActions(props) {
  const { pendingGames = 0 } = props;
  const navigate = useNavigate();

  const navigateTo = (url) => {
    window.location.href = url;
  };

  return (
    <div className="section-cards mt-3" id="quick-actions">
      <div
        className="section-card"
        style={{
          borderColor: 'rgba(245,158,11,0.35)',
          background: 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(0,212,255,0.04))',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/superuser/hub')}
      >
        <div className="section-card-icon">👑</div>
        <h3 style={{ color: 'var(--accent-yellow)' }}>Control Hub</h3>
        <p>Full control panel — analytics, audit log, tournament control, system commands</p>
        <div className="section-card-badge">
          <span className="badge badge-admin">Full Access</span>
        </div>
      </div>

      <div
        className="section-card"
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/superuser/users')}
      >
        <div className="section-card-icon">👥</div>
        <h3>Manage Users</h3>
        <p>View, edit, and manage all user accounts and roles</p>
        <div className="section-card-badge">
          <span className="badge badge-active">Active</span>
        </div>
      </div>

      <div
        className="section-card"
        style={{ cursor: 'pointer' }}
        onClick={() => navigateTo('/pages/admin/approvals.html')}
      >
        <div className="section-card-icon">✅</div>
        <h3>Game Approvals</h3>
        <p>Review and approve games submitted by publishers</p>
        {pendingGames > 0 && (
          <div className="section-card-badge">
            <span className="badge badge-pending">{pendingGames} Pending</span>
          </div>
        )}
      </div>

      <div
        className="section-card"
        style={{ cursor: 'pointer' }}
        onClick={() => navigateTo('/pages/superuser/settings.html')}
      >
        <div className="section-card-icon">⚙️</div>
        <h3>System Settings</h3>
        <p>Configure platform-wide settings and preferences</p>
      </div>
    </div>
  );
}

export default SuperuserQuickActions;
