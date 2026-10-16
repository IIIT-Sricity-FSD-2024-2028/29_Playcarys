import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  fetchModeratorSessionsData,
  endModeratorMatch
} from '../../services/moderatorService';
import SessionKpiCards from '../../components/moderator/sessions/SessionKpiCards';
import SessionTrendsChart from '../../components/moderator/sessions/SessionTrendsChart';
import SessionsFilterBar from '../../components/moderator/sessions/SessionsFilterBar';
import SessionListItem from '../../components/moderator/sessions/SessionListItem';
import MonitorModal from '../../components/moderator/sessions/MonitorModal';
import ConfirmEndMatchModal from '../../components/moderator/sessions/ConfirmEndMatchModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/sessions.css';

export function Sessions() {
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Raw data from server/DB
  const [matches, setMatches] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // Modals & action states
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchModeratorSessionsData();
      setMatches(data.matches || []);
      setMatchResults(data.matchResults || []);
      setUsers(data.users || []);
      setGames(data.games || []);
    } catch (err) {
      console.error('Failed to load moderator sessions data:', err);
      setLoadError('Failed to load live match data.');
      showToast('Failed to load live match data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Live Matches';
    const currentSession = authService.requireAuth(['moderator']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    loadData();
  }, []);

  // Filter and sort matches
  // Include only records with a valid match_id, newest first (start_time || created_at)
  const filteredMatches = matches
    .filter((m) => m && (m.match_id != null || m.id != null))
    .filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (modeFilter && m.mode !== modeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = Date.parse(a.start_time || a.created_at || 0) || 0;
      const timeB = Date.parse(b.start_time || b.created_at || 0) || 0;
      return timeB - timeA;
    });

  // Action: Open Monitor
  function handleOpenMonitor(match) {
    setSelectedMatch(match);
    setIsMonitorOpen(true);
  }

  // Action: Request Terminate (opens confirmation)
  function handleRequestTerminate(match) {
    setSelectedMatch(match);
    setIsConfirmOpen(true);
  }

  // Action: Confirm End Match
  async function handleConfirmEndMatch() {
    if (!selectedMatch) return;
    const mid = selectedMatch.match_id != null ? selectedMatch.match_id : selectedMatch.id;
    setIsEnding(true);

    try {
      await endModeratorMatch(mid);
      showToast('Match ended', 'success');
      setIsConfirmOpen(false);
      setIsMonitorOpen(false);
      setSelectedMatch(null);
      await loadData();
    } catch (err) {
      console.error('Failed to end match:', err);
      showToast('Failed to end match', 'error');
    } finally {
      setIsEnding(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="sessions-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You must be logged in as a Moderator to view Live Matches.
        </p>
      </div>
    );
  }

  return (
    <div className="sessions-container page-content">
      {/* Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Monitor Modal */}
      <MonitorModal
        isOpen={isMonitorOpen}
        match={selectedMatch}
        matchResults={matchResults}
        users={users}
        onClose={() => {
          setIsMonitorOpen(false);
          setSelectedMatch(null);
        }}
        onTerminate={handleRequestTerminate}
      />

      {/* End Match Confirmation Dialog */}
      <ConfirmEndMatchModal
        isOpen={isConfirmOpen}
        onConfirm={handleConfirmEndMatch}
        onCancel={() => setIsConfirmOpen(false)}
        submitting={isEnding}
      />

      {/* Page Header */}
      <div className="page-header sessions-header">
        <h1>Live Matches</h1>
        <p className="text-muted">Monitor matches being played, in real time</p>
      </div>

      {/* Statistics Cards */}
      <SessionKpiCards matches={matches} />

      {/* Platform Session Trends Chart */}
      <SessionTrendsChart matches={matches} />

      {/* Filter Bar */}
      <SessionsFilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        modeFilter={modeFilter}
        onModeChange={setModeFilter}
      />

      {/* Match List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading live matches...</p>
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
          <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>Failed to Load Matches</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{loadError}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎮</div>
          <h3>No matches found</h3>
          <p>No matches match your filters</p>
        </div>
      ) : (
        <div id="sessions-list">
          {filteredMatches.map((m) => {
            const keyId = m.match_id != null ? m.match_id : m.id;
            return (
              <SessionListItem
                key={keyId}
                match={m}
                matchResults={matchResults}
                users={users}
                onMonitor={handleOpenMonitor}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Sessions;
