import React from 'react';
import { useNavigate } from 'react-router-dom';

export function SuperuserHubQuickNavigation() {
  const navigate = useNavigate();

  const cards = [
    {
      icon: '👥',
      title: 'All Users',
      desc: 'Manage every user across all roles — create, edit, ban, promote',
      page: '/superuser/users',
      c: 'rgba(0,212,255,0.3)'
    },
    {
      icon: '🎮',
      title: 'Game Control',
      desc: 'Approve, reject, enable or remove any game on the platform',
      page: '/superuser/games',
      c: 'rgba(16,185,129,0.3)'
    },
    {
      icon: '⚠️',
      title: 'Reports & Bans',
      desc: 'Override moderator actions, resolve reports, lift or apply bans',
      page: '/superuser/reports',
      c: 'rgba(239,68,68,0.3)'
    },
    {
      icon: '👑',
      title: 'Admin Management',
      desc: 'Create, promote or demote Admin and Moderator accounts',
      page: '/superuser/admins',
      c: 'rgba(245,158,11,0.3)'
    },
    {
      icon: '⚙️',
      title: 'System Settings',
      desc: 'Configure all global platform settings and feature toggles',
      page: '/superuser/settings',
      c: 'rgba(124,58,237,0.3)'
    }
  ];

  return (
    <div className="quick-grid" id="quick-nav">
      {cards.map((q) => (
        <div
          key={q.title}
          className="quick-card"
          onClick={() => navigate(q.page)}
          style={{ '--qc': q.c }}
        >
          <div className="quick-card-icon">{q.icon}</div>
          <div>
            <h3>{q.title}</h3>
            <p>{q.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SuperuserHubQuickNavigation;
