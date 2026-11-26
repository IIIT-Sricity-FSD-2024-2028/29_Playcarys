/*
 * Concepts used in this component:
 *  - Components, Props (data and callbacks passed to children), Events (card and button clicks),
 *    Hooks (useContext, useEffect), Context (AdminContext for toast / redraw),
 *    Router (useAdminNav), Redux (fetchAuditLog, selectAuditLogs)
 *
 * Mirrors pages/admin/dashboard.html.
 */
import React, { useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdminContext from '../../context/AdminContext';
import { useAdminNav } from '../../components/admin/common/adminPages';
import DashboardStats from '../../components/admin/dashboard/DashboardStats';
import DashboardOverview from '../../components/admin/dashboard/DashboardOverview';
import RecentActivity from '../../components/admin/dashboard/RecentActivity';
import QuickActions from '../../components/admin/dashboard/QuickActions';
import { fetchAuditLog } from '../../features/platform/auditSlice';
import { selectAuditLogs } from '../../features/platform/selectors';
import {
  getDB,
  getSession,
  getPlatformStats,
  getSuperusers,
  getModerators,
  sendAdminEscalation,
  sendModeratorBroadcast
} from '../../services/adminService';

export function Dashboard() {
  const { toast } = useContext(AdminContext);
  const go = useAdminNav();
  const dispatch = useDispatch();

  // Recent activity comes from the shared Redux audit log feature state.
  const activity = useSelector(selectAuditLogs);

  useEffect(() => {
    document.title = 'PlayCarys — Admin Dashboard';
    dispatch(fetchAuditLog());
    const timer = setInterval(() => dispatch(fetchAuditLog()), 15000);
    return () => clearInterval(timer);
  }, [dispatch]);

  const db = getDB();
  const stats = getPlatformStats();

  // Ask for a message, then send it privately to one random super admin.
  function contactSuperAdmin() {
    const session = getSession();
    if (!session) return;
    const superusers = getSuperusers();
    if (!superusers.length) {
      toast.error('No super admins available.');
      return;
    }
    const target = superusers[Math.floor(Math.random() * superusers.length)];
    const msg = prompt('Message to Super Admin (describe the policy issue or escalation):');
    if (!msg || !msg.trim()) return;
    sendAdminEscalation(session, target, msg);
    toast.success('Escalation sent to ' + (target.user_name || target.username) + ' (Super Admin).');
  }

  // Ask for a message, then send it to every moderator.
  function contactModerators() {
    const session = getSession();
    if (!session) return;
    const moderators = getModerators();
    if (!moderators.length) {
      toast.error('No moderators found.');
      return;
    }
    const msg = prompt('Broadcast message to ALL Moderators:');
    if (!msg || !msg.trim()) return;
    sendModeratorBroadcast(session, moderators, msg);
    toast.success('Broadcast sent to ' + moderators.length + ' moderator(s).');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform administration and management</p>
      </div>

      <DashboardStats stats={stats} onOpen={go} />

      <DashboardOverview stats={stats} totalGames={db && db.games ? db.games.length : 0} />

      <RecentActivity activity={activity} onViewApprovals={() => go('approvals')} />

      <QuickActions
        pendingGames={stats.pendingGames}
        onOpen={go}
        onContactSuperAdmin={contactSuperAdmin}
        onContactModerators={contactModerators}
      />
    </div>
  );
}

export default Dashboard;
