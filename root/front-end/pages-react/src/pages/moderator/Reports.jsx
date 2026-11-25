import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import authService from '../../services/authService';
import { AsyncStatus } from '../../app/asyncUtils';
import {
  fetchReports,
  updateReportStatus
} from '../../features/moderation/reportSlice';
import { actOnReport } from '../../features/moderation/moderationSlice';
import {
  selectAllReports,
  selectReportsStatus,
  selectReportsError
} from '../../features/moderation/selectors';
import { fetchUsers } from '../../features/users/userSlice';
import { selectAllUsers } from '../../features/users/selectors';
import ReportsFilterBar from '../../components/moderator/reports/ReportsFilterBar';
import ReportListItem from '../../components/moderator/reports/ReportListItem';
import TakeActionView from '../../components/moderator/reports/TakeActionView';
import WarnPlayerModal from '../../components/moderator/reports/WarnPlayerModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/reports.css';

export function Reports() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Redux state selectors
  const reports = useSelector(selectAllReports);
  const reportsStatus = useSelector(selectReportsStatus);
  const reportsError = useSelector(selectReportsError);
  const users = useSelector(selectAllUsers);

  // Filtering state (kept local)
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // View state: 'list' | 'action' (kept local)
  const [view, setView] = useState('list');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Warn modal state (kept local)
  const [warnReport, setWarnReport] = useState(null);
  const [warnModalOpen, setWarnModalOpen] = useState(false);
  const [warnSubmitting, setWarnSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchReports()).unwrap(),
        dispatch(fetchUsers()).unwrap()
      ]);
    } catch (err) {
      console.error('Failed to load reports:', err);
      showToast('Failed to load reports', 'error');
    }
  }, [dispatch]);

  useEffect(() => {
    document.title = 'PlayCarys — Player Reports';
    const currentSession = authService.requireAuth(['moderator']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setSession(currentSession);
    loadData();
  }, [loadData]);

  // Filter logic
  const filteredReports = reports.filter((r) => {
    // Status filter
    if (statusFilter) {
      if (statusFilter === 'dismissed') {
        if (r.status !== 'dismissed' && r.status !== 'rejected') return false;
      } else if (r.status !== statusFilter) {
        return false;
      }
    }

    // Type filter: case-insensitive, matches exact, includes, or startsWith
    if (typeFilter) {
      const t = (r.type || '').toLowerCase();
      const f = typeFilter.toLowerCase();
      const matchesType = t === f || t.includes(f) || t.startsWith(f);
      if (!matchesType) return false;
    }

    // Search filter: reporter, reported, report ID, description
    if (searchFilter.trim()) {
      const term = searchFilter.trim().toLowerCase();
      const reporter = (r.reporterName || '').toLowerCase();
      const reported = (r.reportedName || '').toLowerCase();
      const idStr = String(r.id || '').toLowerCase();
      const desc = (r.desc || r.reason || '').toLowerCase();

      const matchesSearch =
        reporter.includes(term) ||
        reported.includes(term) ||
        idStr.includes(term) ||
        desc.includes(term);

      if (!matchesSearch) return false;
    }

    return true;
  });

  // Action: Review
  async function handleReview(id) {
    const target = reports.find((r) => String(r.id) === String(id));
    if (!target) {
      showToast('Report not found', 'error');
      return;
    }

    if (target.status === 'pending') {
      try {
        const requesterId = session?.userId != null ? Number(session.userId) : 3;
        const moderatorName = session?.username || 'ModeratorOne';
        await dispatch(
          updateReportStatus({
            id,
            requester_user_id: requesterId,
            status: 'under-review',
            actionNote: `Under review by Moderator ${moderatorName}`
          })
        ).unwrap();
        showToast('Report marked as Under Review', 'info');
      } catch (err) {
        console.error('Error reviewing report:', err);
        showToast('Failed to mark report as under review', 'error');
      }
    } else {
      showToast('Already under review or processed', 'info');
    }
  }

  // Action: Open Take Action View
  async function handleOpenTakeAction(id) {
    const target = reports.find((r) => String(r.id) === String(id));
    if (!target) return;

    setSelectedReportId(String(id));
    setView('action');

    // If report was pending, automatically transition to under-review
    if (target.status === 'pending') {
      try {
        const requesterId = session?.userId != null ? Number(session.userId) : 3;
        const moderatorName = session?.username || 'ModeratorOne';
        await dispatch(
          updateReportStatus({
            id,
            requester_user_id: requesterId,
            status: 'under-review',
            actionNote: `Under review by Moderator ${moderatorName}`
          })
        ).unwrap();
      } catch (err) {
        console.warn('Could not auto-update pending status:', err);
      }
    }
  }

  // Action: Resolve Report
  async function handleResolveDecision(payload) {
    if (!payload) {
      showToast('Minimum 10 characters required', 'error');
      return;
    }

    setActionSubmitting(true);
    try {
      const requesterId = session?.userId != null ? Number(session.userId) : 3;
      await dispatch(
        updateReportStatus({
          id: selectedReportId,
          requester_user_id: requesterId,
          status: 'resolved',
          actionNote: payload.notes
        })
      ).unwrap();
      showToast('Report resolved ✅', 'success');
      setView('list');
      setSelectedReportId(null);
    } catch (err) {
      console.error('Failed to resolve report:', err);
      showToast('Failed to resolve report', 'error');
    } finally {
      setActionSubmitting(false);
    }
  }

  // Action: Dismiss Report
  async function handleDismissDecision(payload) {
    if (!payload) {
      showToast('Minimum 5 characters required', 'error');
      return;
    }

    setActionSubmitting(true);
    try {
      const requesterId = session?.userId != null ? Number(session.userId) : 3;
      await dispatch(
        updateReportStatus({
          id: selectedReportId,
          requester_user_id: requesterId,
          status: 'rejected',
          actionNote: payload.notes
        })
      ).unwrap();
      showToast('Report dismissed', 'info');
      setView('list');
      setSelectedReportId(null);
    } catch (err) {
      console.error('Failed to dismiss report:', err);
      showToast('Failed to dismiss report', 'error');
    } finally {
      setActionSubmitting(false);
    }
  }

  // Action: Escalate to Ban
  function handleEscalateToBan(notesPayload) {
    const activeReport = reports.find((r) => String(r.id) === String(selectedReportId));
    if (!activeReport) {
      navigate('/moderator/bans');
      return;
    }

    const targetUserId = activeReport.reported_user != null
      ? activeReport.reported_user
      : activeReport.playerId != null
        ? activeReport.playerId
        : null;

    const targetPlayerName = activeReport.reportedName || activeReport.reported_name || '';

    // Look for matching user in users array
    const targetUser = (users || []).find((u) => {
      const uid = u.user_id != null ? u.user_id : u.id;
      if (targetUserId != null && String(uid) === String(targetUserId)) return true;
      const uname = (u.username || u.user_name || '').toLowerCase();
      if (targetPlayerName && uname === targetPlayerName.toLowerCase()) return true;
      return false;
    });

    const effectiveId = targetUser
      ? (targetUser.user_id != null ? targetUser.user_id : targetUser.id)
      : targetUserId;

    let banReason = '';
    if (notesPayload?.notes && notesPayload.notes.trim()) {
      banReason = `${notesPayload.notes.trim()} (Report #${activeReport.id}: ${activeReport.desc || activeReport.reason || activeReport.type})`;
    } else {
      banReason = activeReport.desc || activeReport.reason || `Escalated from Report #${activeReport.id}: ${activeReport.type || 'Community guidelines violation'}`;
    }

    const resolvedPlayer = targetUser || {
      user_id: effectiveId,
      id: effectiveId,
      username: targetPlayerName || `Player #${effectiveId}`,
      user_name: targetPlayerName || `Player #${effectiveId}`,
      level: 1,
      wins: 0,
      losses: 0
    };

    if (effectiveId != null) {
      navigate(`/moderator/bans/${effectiveId}?player=${effectiveId}`, {
        state: {
          player: resolvedPlayer,
          playerId: effectiveId,
          userId: effectiveId,
          initialReason: banReason,
          fromReport: activeReport
        }
      });
    } else if (targetPlayerName && targetPlayerName !== 'Anonymous' && targetPlayerName !== 'Unknown User') {
      navigate(`/moderator/bans?player=${encodeURIComponent(targetPlayerName)}`, {
        state: {
          player: resolvedPlayer,
          initialReason: banReason,
          fromReport: activeReport
        }
      });
    } else {
      navigate('/moderator/bans');
    }
  }

  // Action: Open Warn Player Modal
  function handleOpenWarn(id) {
    const target = reports.find((r) => String(r.id) === String(id));
    if (!target) return;
    setWarnReport(target);
    setWarnModalOpen(true);
  }

  // Action: Submit Warning
  async function handleSubmitWarning(customMsg) {
    if (!warnReport) return;
    setWarnSubmitting(true);

    const targetUserId = warnReport.isContact
      ? warnReport.reported_by
      : warnReport.reported_user;
    const targetPlayerName = warnReport.isContact ? warnReport.reporterName : warnReport.reportedName;
    const defaultMsg = `You received a warning regarding ${warnReport.type}. Please follow community guidelines.`;
    const msg = customMsg || defaultMsg;
    const moderatorId = session?.userId != null ? Number(session.userId) : 3;

    try {
      if (targetUserId && !isNaN(Number(targetUserId))) {
        await dispatch(
          actOnReport({
            moderator_id: moderatorId,
            report_id: Number(warnReport.id),
            action_type: 'warning',
            action_reason: msg,
            target_user_id: Number(targetUserId)
          })
        ).unwrap();
      }

      setWarnModalOpen(false);
      setWarnReport(null);
      showToast(`⚠️ Warning sent to ${targetPlayerName}`, 'success');
    } catch (err) {
      console.error('Failed to send warning:', err);
      showToast('Failed to send warning', 'error');
    } finally {
      setWarnSubmitting(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="reports-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You must be logged in as a Moderator to view this page.
        </p>
      </div>
    );
  }

  const activeActionReport = reports.find((r) => String(r.id) === String(selectedReportId));
  const isLoading = reportsStatus === AsyncStatus.LOADING && reports.length === 0;

  return (
    <div className="reports-container page-content">
      {/* Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Warn Player Modal */}
      <WarnPlayerModal
        isOpen={warnModalOpen}
        report={warnReport}
        onClose={() => {
          if (!warnSubmitting) {
            setWarnModalOpen(false);
            setWarnReport(null);
          }
        }}
        onSubmit={handleSubmitWarning}
        submitting={warnSubmitting}
      />

      {/* MAIN VIEW: LIST */}
      {view === 'list' && (
        <div id="main-view">
          <div className="page-header reports-header">
            <h1>Player Reports</h1>
            <p className="text-muted">Review and handle reported player behavior</p>
          </div>

          <ReportsFilterBar
            searchFilter={searchFilter}
            onSearchChange={setSearchFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
          />

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>Loading reports...</p>
            </div>
          ) : reportsError && reports.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>Failed to Load Reports</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{reportsError}</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={loadData}>
                Retry
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>No reports found</h3>
              <p>No reports match your current filters</p>
            </div>
          ) : (
            <div id="reports-list">
              {filteredReports.map((report) => (
                <ReportListItem
                  key={report.id}
                  report={report}
                  onReview={handleReview}
                  onTakeAction={handleOpenTakeAction}
                  onWarn={handleOpenWarn}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAKE ACTION VIEW */}
      {view === 'action' && activeActionReport && (
        <div id="action-view">
          <TakeActionView
            report={activeActionReport}
            onBack={() => {
              setView('list');
              setSelectedReportId(null);
            }}
            onResolve={handleResolveDecision}
            onDismiss={handleDismissDecision}
            onEscalate={handleEscalateToBan}
            submitting={actionSubmitting}
          />
        </div>
      )}
    </div>
  );
}

export default Reports;
