import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  fetchReports,
  fetchBans,
  fetchUsers,
  resolveReportRecord,
  reopenReportRecord,
  issueBanRecord,
  liftBanRecord
} from '../../services/superuserService';
import ReportsKPIs from '../../components/superuser/reports/ReportsKPIs';
import ReportList from '../../components/superuser/reports/ReportList';
import ActiveBansList from '../../components/superuser/reports/ActiveBansList';
import ResolveReportModal from '../../components/superuser/reports/ResolveReportModal';
import IssueBanModal from '../../components/superuser/reports/IssueBanModal';
import LiftBanConfirmModal from '../../components/superuser/reports/LiftBanConfirmModal';
import Toast from '../../components/common/Toast';
import '../../styles/superuser/reports.css';

export function Reports() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Data states
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Tab state: 'reports' | 'bans'
  const [activeTab, setActiveTab] = useState('reports');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolveActionType, setResolveActionType] = useState('resolve'); // 'resolve' | 'dismiss'
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const [banTargetUser, setBanTargetUser] = useState(null);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);

  const [banToLift, setBanToLift] = useState(null);
  const [isLiftModalOpen, setIsLiftModalOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }

  // Load all reports, bans, and users
  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [reportsData, bansData, usersData] = await Promise.all([
        fetchReports(),
        fetchBans(),
        fetchUsers()
      ]);
      setReports(reportsData);
      setBans(bansData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load reports and bans data:', err);
      setLoadError('Failed to load reports and bans data from server.');
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Superuser · Reports & Bans';

    const currentSession = authService.requireAuth(['superuser']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setUnauthorized(false);
    setSession(currentSession);

    loadData();
  }, []);

  // Compute live KPIs
  const pendingReports = reports.filter((r) => r.status === 'pending').length;
  const underReviewReports = reports.filter((r) => r.status === 'under-review').length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;
  const activeBans = bans.filter((b) => b.active).length;

  // Filter reports
  let filteredReports = [...reports];
  if (statusFilter) {
    filteredReports = filteredReports.filter((r) => r.status === statusFilter);
  }
  if (typeFilter) {
    filteredReports = filteredReports.filter((r) => r.type === typeFilter);
  }

  // Handlers for Resolve / Dismiss Modal
  function handleOpenResolveModal(report, action) {
    setSelectedReport(report);
    setResolveActionType(action);
    setIsResolveModalOpen(true);
  }

  function handleCloseResolveModal() {
    setIsResolveModalOpen(false);
    setSelectedReport(null);
  }

  async function handleSubmitResolve(report, action, notes) {
    try {
      const requesterUserId = session?.userId != null ? session.userId : 0;
      await resolveReportRecord(report.id, action, notes, requesterUserId);
      showToast(action === 'resolve' ? 'Report resolved' : 'Report dismissed', 'success');
      handleCloseResolveModal();
      await loadData();
    } catch (err) {
      console.error('Resolve/dismiss failed:', err);
      showToast(err.message || 'Operation failed', 'error');
      throw err;
    }
  }

  // Handler for Reopen Report
  async function handleReopenReport(report) {
    const requesterUserId = session?.userId != null ? session.userId : 0;
    try {
      await reopenReportRecord(report.id, requesterUserId);
      showToast('Report reopened', 'info');
      await loadData();
    } catch (err) {
      console.warn('Reopen report error from server:', err);
      showToast(
        err.message || 'Reopening reports is not permitted by server policy.',
        'error'
      );
    }
  }

  // Handlers for Issue Ban Modal
  function handleOpenBanModal(report) {
    const targetIdStr = String(report.reportedId || report.reported_user || '');
    const user = users.find(
      (u) => String(u.user_id ?? u.id) === targetIdStr
    );

    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    setBanTargetUser(user);
    setIsBanModalOpen(true);
  }

  function handleCloseBanModal() {
    setIsBanModalOpen(false);
    setBanTargetUser(null);
  }

  async function handleSubmitBan(user, duration, reason) {
    const moderatorId = session?.userId != null ? session.userId : 0;
    const moderatorName = session?.username || 'GodMode';
    const targetUserId = user.user_id != null ? user.user_id : user.id;

    try {
      await issueBanRecord({
        targetUserId,
        duration,
        reason,
        moderatorId,
        moderatorName
      });
      showToast(`${user.username || user.user_name} banned for ${duration}`, 'success');
      handleCloseBanModal();
      await loadData();
    } catch (err) {
      console.error('Issue ban failed:', err);
      showToast(err.message || 'Failed to issue ban', 'error');
      throw err;
    }
  }

  // Handlers for Lift Ban Modal
  function handleOpenLiftModal(ban) {
    setBanToLift(ban);
    setIsLiftModalOpen(true);
  }

  function handleCloseLiftModal() {
    setIsLiftModalOpen(false);
    setBanToLift(null);
  }

  async function handleConfirmLiftBan(ban) {
    const moderatorId = session?.userId != null ? session.userId : 0;
    try {
      await liftBanRecord(ban.id, ban.playerId, moderatorId);
      showToast(`Ban lifted for ${ban.playerName}`, 'success');
      handleCloseLiftModal();
      await loadData();
    } catch (err) {
      console.error('Lift ban failed:', err);
      showToast(err.message || 'Failed to lift ban', 'error');
    }
  }

  if (unauthorized) {
    return (
      <div className="page-content" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p className="text-muted">You must be logged in as a Superuser to view this page.</p>
        <button
          className="btn btn-primary mt-3"
          onClick={() => (window.location.href = '/pages/auth/login.html')}
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Page Header Row */}
      <div className="page-header-row mb-2">
        <div>
          <h1>⚠️ Reports &amp; Bans</h1>
          <p className="text-muted">
            Override moderator decisions — resolve, dismiss or escalate any report. Manage all bans.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <ReportsKPIs
        pendingReports={pendingReports}
        underReviewReports={underReviewReports}
        resolvedReports={resolvedReports}
        activeBans={activeBans}
      />

      {/* Tab Switcher */}
      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          id="tab-reports"
          onClick={() => setActiveTab('reports')}
        >
          ⚠️ Reports
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'bans' ? 'active' : ''}`}
          id="tab-bans"
          onClick={() => setActiveTab('bans')}
        >
          🚫 Active Bans
        </button>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading reports and bans...
        </div>
      ) : loadError ? (
        <div className="empty-state">
          <div className="icon">⚠️</div>
          <h3>Failed to load data</h3>
          <p>{loadError}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Reports Panel */}
          {activeTab === 'reports' && (
            <div id="panel-reports">
              {/* Filter Bar */}
              <div className="filter-bar reports-filter-bar">
                <select
                  className="form-select"
                  id="rep-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '170px' }}
                >
                  <option value="">All Reports</option>
                  <option value="pending">Pending</option>
                  <option value="under-review">Under Review</option>
                  <option value="resolved">Resolved</option>
                </select>

                <select
                  className="form-select"
                  id="rep-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ width: '170px' }}
                >
                  <option value="">All Types</option>
                  <option value="Toxic Behavior">Toxic Behavior</option>
                  <option value="Cheating">Cheating</option>
                  <option value="Griefing">Griefing</option>
                </select>
              </div>

              {/* Reports List */}
              <ReportList
                reports={filteredReports}
                onResolve={(r) => handleOpenResolveModal(r, 'resolve')}
                onDismiss={(r) => handleOpenResolveModal(r, 'dismiss')}
                onReopen={handleReopenReport}
                onBan={handleOpenBanModal}
              />
            </div>
          )}

          {/* Bans Panel */}
          {activeTab === 'bans' && (
            <div id="panel-bans">
              <ActiveBansList bans={bans} onLiftBan={handleOpenLiftModal} />
            </div>
          )}
        </>
      )}

      {/* Resolve / Dismiss Modal */}
      <ResolveReportModal
        isOpen={isResolveModalOpen}
        report={selectedReport}
        actionType={resolveActionType}
        onClose={handleCloseResolveModal}
        onSubmit={handleSubmitResolve}
      />

      {/* Issue Ban Modal */}
      <IssueBanModal
        isOpen={isBanModalOpen}
        targetUser={banTargetUser}
        onClose={handleCloseBanModal}
        onSubmit={handleSubmitBan}
      />

      {/* Lift Ban Confirmation Modal */}
      <LiftBanConfirmModal
        isOpen={isLiftModalOpen}
        ban={banToLift}
        onClose={handleCloseLiftModal}
        onConfirm={handleConfirmLiftBan}
      />

      {/* Toast Notification */}
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

export default Reports;
