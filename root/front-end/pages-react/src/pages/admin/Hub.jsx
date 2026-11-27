/*
 * Concepts used in this component:
 *  - Components, Props (data and callbacks passed to each section), State (which section is showing),
 *    Events (menu and button clicks), Hooks (useState, useRef, useEffect, useContext), Context
 *    (AuthContext for the signed-in admin, AdminContext for confirm / toast / redraw), Router
 *    (useAdminNav), Redux (fetchAuditLog, recordAuditLog, clearAuditLog)
 *
 * Mirrors pages/admin/hub.html (Admin Control Hub): a sidebar and seven sections — Overview, User
 * Management, Game Control, Tournaments, Platform Analytics, Audit Log and System Control.
 * All sections stay on the page and only the chosen one is visible.
 */
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuthContext from '../../context/AuthContext';
import AdminContext from '../../context/AdminContext';
import { useAdminNav } from '../../components/admin/common/adminPages';
import HubSidebar from '../../components/admin/hub/HubSidebar';
import OverviewSection from '../../components/admin/hub/OverviewSection';
import GamesSection from '../../components/admin/hub/GamesSection';
import TournamentsSection from '../../components/admin/hub/TournamentsSection';
import AnalyticsSection from '../../components/admin/hub/AnalyticsSection';
import AuditSection from '../../components/admin/hub/AuditSection';
import SystemSection from '../../components/admin/hub/SystemSection';
import { getDB } from '../../services/adminService';
import {
  fetchAuditLog,
  recordAuditLog,
  clearAuditLog
} from '../../features/platform/auditSlice';
import { selectAuditLogs } from '../../features/platform/selectors';
import '../../styles/admin/hub.css';

export function Hub() {
  const { user } = useContext(AuthContext);
  const { toast, confirmAction, refresh } = useContext(AdminContext);
  const go = useAdminNav();
  const dispatch = useDispatch();
  const [section, setSection] = useState('overview');

  // The audit log is kept by the server in shared Redux feature state.
  const auditLog = useSelector(selectAuditLogs);

  function loadAudit() {
    dispatch(fetchAuditLog());
  }

  useEffect(() => {
    document.title = 'PlayCarys — Admin Control Hub';
    loadAudit();
    // Other admins act too, so look again now and then.
    const timer = setInterval(loadAudit, 15000);
    return () => clearInterval(timer);
  }, [dispatch]);

  function addAudit(type, msg, detail) {
    dispatch(recordAuditLog({ type, msg, detail })).then(() => {
      loadAudit();
    });
  }

  function handleClearAuditLog() {
    confirmAction(
      'Clear Audit Log',
      'Clear the whole audit log? Only a note that it was cleared, and by whom, is kept.',
      async () => {
        try {
          await dispatch(clearAuditLog()).unwrap();
          toast.success('Audit log cleared');
        } catch (err) {
          toast.error('Could not clear the audit log');
        }
        loadAudit();
        refresh();
      }
    );
  }

  const db = getDB();
  const me = db && db.users ? db.users.find((u) => u.username === user.username) : null;
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
          <OverviewSection active={section === 'overview'} onShowSection={setSection} onNavigate={go} auditLog={auditLog} />
          <GamesSection
            active={section === 'games'}
            addAudit={addAudit}
            onNavigate={go}
          />
          <TournamentsSection active={section === 'tournaments'} addAudit={addAudit} />
          <AnalyticsSection active={section === 'analytics'} />
          <AuditSection active={section === 'audit'} auditLog={auditLog} onClear={handleClearAuditLog} onReload={loadAudit} canClear={user?.role === 'superuser'} />
          <SystemSection active={section === 'system'} auditLog={auditLog || []} addAudit={addAudit} />
        </div>
      </div>
    </div>
  );
}

export default Hub;
