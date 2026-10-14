import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  fetchModeratorDashboardData,
  sendContactAdminNotification
} from '../../services/moderatorService';
import ModeratorHero from '../../components/moderator/dashboard/ModeratorHero';
import ModeratorStatsRow from '../../components/moderator/dashboard/ModeratorStatsRow';
import ReportActivityChart from '../../components/moderator/dashboard/ReportActivityChart';
import RecentReportsList from '../../components/moderator/dashboard/RecentReportsList';
import QuickActionsCard from '../../components/moderator/dashboard/QuickActionsCard';
import ModeratorPerformanceCard from '../../components/moderator/dashboard/ModeratorPerformanceCard';
import ActivityLogCard from '../../components/moderator/dashboard/ActivityLogCard';
import ContactAdminModal from '../../components/moderator/dashboard/ContactAdminModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/dashboard.css';

export function Dashboard() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState({
    kpis: {
      pendingReports: 0,
      reviewReports: 0,
      totalResolved: 0,
      liveNow: 0,
      activeBans: 0,
      todayReports: 0
    },
    performance: {
      actionsTaken: 0,
      warnsByMe: 0,
      bansByMe: 0,
      sharePercent: 0
    },
    recentReports: [],
    logItems: [],
    chartData: {
      labels: [],
      incoming: [],
      resolved: []
    },
    users: []
  });

  // Modal & Toast State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }

  async function loadDashboard(userId) {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchModeratorDashboardData(userId);
      setData(res);
    } catch (err) {
      console.error('Failed to load moderator dashboard data:', err);
      setLoadError('Failed to load dashboard data.');
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Moderator Dashboard';

    const currentSession = authService.requireAuth(['moderator']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    const userId = currentSession.userId != null ? currentSession.userId : 3;
    loadDashboard(userId);
  }, []);

  async function handleSendContactAdmin({ subject, msg, priority }) {
    try {
      const result = await sendContactAdminNotification({
        subject,
        msg,
        priority,
        session,
        users: data.users
      });
      showToast(`📨 Message sent to Admin ${result.targetAdminName || 'team'}`, 'success');
    } catch (err) {
      console.error('Failed to send message to admin:', err);
      showToast(err.message || 'Failed to send message to admin', 'error');
      throw err;
    }
  }

  if (unauthorized) {
    return (
      <div className="page-content" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p className="text-muted">You must be signed in as a Moderator to access this dashboard.</p>
        <button
          className="btn btn-primary mt-3"
          onClick={() => {
            window.location.href = '/pages/auth/login.html';
          }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  const username = session?.username || 'ModeratorOne';

  return (
    <div className="page-content">
      {/* Hero Header */}
      <ModeratorHero
        username={username}
        onContactAdmin={() => setIsContactModalOpen(true)}
      />

      {/* Top Stats Row */}
      <ModeratorStatsRow
        pendingReports={data.kpis.pendingReports}
        reviewReports={data.kpis.reviewReports}
        totalResolved={data.kpis.totalResolved}
        liveNow={data.kpis.liveNow}
        activeBans={data.kpis.activeBans}
        todayReports={data.kpis.todayReports}
      />

      {/* Main Grid Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading moderation data...
        </div>
      ) : loadError ? (
        <div className="empty-state">
          <div className="icon">⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>{loadError}</p>
          <button
            type="button"
            className="btn btn-ghost mt-2"
            onClick={() => {
              const uid = session?.userId != null ? session.userId : 3;
              loadDashboard(uid);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="mod-grid">
          {/* Left Column: Chart + Recent Reports */}
          <div>
            <ReportActivityChart
              labels={data.chartData.labels}
              incoming={data.chartData.incoming}
              resolved={data.chartData.resolved}
            />
            <RecentReportsList reports={data.recentReports} />
          </div>

          {/* Right Column: Quick Actions + Performance + Activity Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <QuickActionsCard
              pendingReports={data.kpis.pendingReports}
              liveSessions={data.kpis.liveNow}
              activeBans={data.kpis.activeBans}
              onContactAdmin={() => setIsContactModalOpen(true)}
            />

            <ModeratorPerformanceCard
              actionsTaken={data.performance.actionsTaken}
              warnsByMe={data.performance.warnsByMe}
              bansByMe={data.performance.bansByMe}
              sharePercent={data.performance.sharePercent}
            />

            <ActivityLogCard logItems={data.logItems} />
          </div>
        </div>
      )}

      {/* Contact Admin Modal */}
      <ContactAdminModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleSendContactAdmin}
      />

      {/* Toast Notifications */}
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

export default Dashboard;
