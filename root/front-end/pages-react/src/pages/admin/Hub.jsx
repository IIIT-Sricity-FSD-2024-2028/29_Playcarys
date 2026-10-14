/*
 * Concepts used in this component:
 *  - Components, Props (data and callbacks passed to each section), State (which section is showing),
 *    Events (menu and button clicks), Hooks (useState, useRef, useEffect, useContext), Context
 *    (AuthContext for the signed-in admin, AdminContext for confirm / toast / redraw), Router
 *    (useAdminNav), Callbacks (addAudit is handed to every section that changes something),
 *    prop drilling (go, addAudit and auditLog flow page → section)
 *
 * Mirrors pages/admin/hub.html (Admin Control Hub): a sidebar and seven sections — Overview, User
 * Management, Game Control, Tournaments, Platform Analytics, Audit Log and System Control.
 * All sections stay on the page and only the chosen one is visible, as in the old page.
 */
import React, { useState, useRef, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import { useAdminNav } from '../../components/admin/common/adminPages';
import HubSidebar from '../../components/admin/hub/HubSidebar';
import OverviewSection from '../../components/admin/hub/OverviewSection';
import UsersSection from '../../components/admin/hub/UsersSection';
import GamesSection from '../../components/admin/hub/GamesSection';
import TournamentsSection from '../../components/admin/hub/TournamentsSection';
import AnalyticsSection from '../../components/admin/hub/AnalyticsSection';
import AuditSection from '../../components/admin/hub/AuditSection';
import SystemSection from '../../components/admin/hub/SystemSection';
import { getDB } from '../../services/adminService';
import { INITIAL_AUDIT_LOG, addAuditEntry } from '../../services/adminHubService';
import '../../styles/admin/hub.css';

export function Hub() {
  const { user } = useContext(AuthContext);
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const go = useAdminNav();
  const [section, setSection] = useState('overview');

  // The audit list lives only while this page is open (it starts over on every visit, like the old page).
  const auditRef = useRef(null);
  if (auditRef.current === null) {
    auditRef.current = INITIAL_AUDIT_LOG.map((e) => ({ ...e }));
  }

  useEffect(() => {
    document.title = 'PlayCarys — Admin Control Hub';
  }, []);

  function addAudit(type, msg, detail) {
    addAuditEntry(auditRef.current, type, msg, detail);
  }

  function clearAuditLog() {
    confirmAction('Clear Audit Log', 'Archive and clear the current audit log?', () => {
      auditRef.current.length = 0;
      addAudit('system', 'Audit log cleared', 'Manual clear by admin');
      toast.success('Audit log cleared');
      refresh();
    });
  }

  const me = getDB().users.find((u) => u.username === user.username);
  const email = (me && me.email) || '';

  return (
    <div className="page-content admin-hub">
      <div className="page-header-row mb-3">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Admin Control Hub
          </h1>
          <p className="text-muted">Full system-level access and platform governance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge badge-admin" style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}>ADMIN</span>
          <button className="btn btn-ghost btn-sm" onClick={() => go('dashboard')}>← Dashboard</button>
        </div>
      </div>

      <div className="hub-grid">
        <HubSidebar
          session={user}
          email={email}
          activeSection={section}
          onSelect={setSection}
          onOpenSettings={() => go('settings')}
        />

        <div className="hub-main">
          <OverviewSection active={section === 'overview'} onShowSection={setSection} onNavigate={go} />
          <UsersSection active={section === 'users'} addAudit={addAudit} onNavigate={go} />
          <GamesSection
            active={section === 'games'}
            addAudit={addAudit}
            onReview={(id) => go('game-review', '?gameId=' + encodeURIComponent(id))}
          />
          <TournamentsSection active={section === 'tournaments'} addAudit={addAudit} />
          <AnalyticsSection active={section === 'analytics'} />
          <AuditSection active={section === 'audit'} auditLog={auditRef.current} onClear={clearAuditLog} />
          <SystemSection active={section === 'system'} auditLog={auditRef.current} addAudit={addAudit} />
        </div>
      </div>
    </div>
  );
}

export default Hub;
