import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  fetchModeratorReports,
  reviewReportAction,
  resolveReportAction,
  dismissReportAction,
  submitPlayerWarning
} from '../../services/moderatorService';
import ReportsFilterBar from '../../components/moderator/reports/ReportsFilterBar';
import ReportListItem from '../../components/moderator/reports/ReportListItem';
import TakeActionView from '../../components/moderator/reports/TakeActionView';
import WarnPlayerModal from '../../components/moderator/reports/WarnPlayerModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/reports.css';

export function Reports() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Data & loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);

  // Filtering state
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // View state: 'list' | 'action'
  const [view, setView] = useState('list');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Warn modal state
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

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchModeratorReports();
      setReports(data.reports);
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load moderator reports:', err);
      setLoadError('Failed to load reports. Please try again.');
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Player Reports';
    const currentSession = authService.requireAuth(['moderator']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setSession(currentSession);
    loadData();
  }, []);

  // Filter logic
  const filteredReports = reports.filter((r) => {
    // Status filter
    if (statusFilter && r.status !== statusFilter) {
      return false;
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
      const desc = (r.desc || '').toLowerCase();

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
        const res = await reviewReportAction(id, session, target);
        showToast(res.message || 'Report marked as Under Review', 'info');
        await loadData();
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
        await reviewReportAction(id, session, target);
        await loadData();
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
    const activeReport = reports.find((r) => String(r.id) === String(selectedReportId));
    try {
      await resolveReportAction({
        reportId: selectedReportId,
        notes: payload.notes,
        severity: payload.severity,
        session,
        report: activeReport
      });
      showToast('Report resolved ✅', 'success');
      setView('list');
      setSelectedReportId(null);
      await loadData();
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
    const activeReport = reports.find((r) => String(r.id) === String(selectedReportId));
    try {
      await dismissReportAction({
        reportId: selectedReportId,
        notes: payload.notes,
        session,
        report: activeReport
      });
      showToast('Report dismissed', 'info');
      setView('list');
      setSelectedReportId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to dismiss report:', err);
      showToast('Failed to dismiss report', 'error');
    } finally {
      setActionSubmitting(false);
    }
  }

  // Action: Escalate to Ban
  function handleEscalateToBan() {
    window.location.href = '/pages/moderator/bans.html';
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
    try {
      const res = await submitPlayerWarning({
        reportId: warnReport.id,
        customMsg,
        session,
        report: warnReport,
        users
      });
      setWarnModalOpen(false);
      setWarnReport(null);
      showToast(`⚠️ Warning sent to ${res.targetPlayerName}`, 'success');
      await loadData();
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>Loading reports...</p>
            </div>
          ) : loadError ? (
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
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{loadError}</p>
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
