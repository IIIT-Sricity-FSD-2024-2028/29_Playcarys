import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const DEFAULT_DASHBOARD_STATE = {
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
  activeMatches: [],
  activeBansList: [],
  chartData: {
    labels: [],
    incoming: [],
    resolved: []
  },
  users: []
};

export function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(DEFAULT_DASHBOARD_STATE);

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
      setData({
        ...DEFAULT_DASHBOARD_STATE,
        ...res,
        kpis: { ...DEFAULT_DASHBOARD_STATE.kpis, ...(res?.kpis || {}) },
        performance: { ...DEFAULT_DASHBOARD_STATE.performance, ...(res?.performance || {}) },
        chartData: {
          labels: res?.chartData?.labels || [],
          incoming: res?.chartData?.incoming || [],
          resolved: res?.chartData?.resolved || []
        },
        recentReports: res?.recentReports || [],
        logItems: res?.logItems || [],
        activeMatches: res?.activeMatches || [],
        activeBansList: res?.activeBansList || [],
        users: res?.users || []
      });
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
            navigate('/');
          }}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const username = session.username || 'Moderator';

  return (
    <div className="page-content">
      {/* Hero Banner */}
      <ModeratorHero
        username={username}
        onContactAdmin={() => setIsContactModalOpen(true)}
      />

      {/* Top Stats Row */}
      <ModeratorStatsRow
        pendingReports={data.kpis?.pendingReports || 0}
        reviewReports={data.kpis?.reviewReports || 0}
        totalResolved={data.kpis?.totalResolved || 0}
        liveNow={data.kpis?.liveNow || 0}
        activeBans={data.kpis?.activeBans || 0}
        todayReports={data.kpis?.todayReports || 0}
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
              labels={data.chartData?.labels || []}
              incoming={data.chartData?.incoming || []}
              resolved={data.chartData?.resolved || []}
            />
            <RecentReportsList reports={data.recentReports || []} />
          </div>

          {/* Right Column: Quick Actions + Performance + Activity Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <QuickActionsCard
              pendingReports={data.kpis?.pendingReports || 0}
              liveSessions={data.kpis?.liveNow || 0}
              activeBans={data.kpis?.activeBans || 0}
              onContactAdmin={() => setIsContactModalOpen(true)}
            />

            <ModeratorPerformanceCard
              actionsTaken={data.performance?.actionsTaken ?? data.performance?.totalByMe ?? 0}
              warnsByMe={data.performance?.warnsByMe || 0}
              bansByMe={data.performance?.bansByMe || 0}
              sharePercent={data.performance?.sharePercent || 0}
            />

            <ActivityLogCard logItems={data.logItems || []} />
          </div>
        </div>
      )}

      {/* Contact Admin Modal */}
      <ContactAdminModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleSendContactAdmin}
      />

      {/* Toast notifications */}
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
