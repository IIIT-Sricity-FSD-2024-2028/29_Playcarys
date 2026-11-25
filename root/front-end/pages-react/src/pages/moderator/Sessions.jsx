import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import authService from '../../services/authService';
import {
  fetchSessions,
  fetchSessionById,
  endSession,
  setSessionStatusFilter,
  setSessionModeFilter,
  openSessionMonitor,
  closeSessionMonitor,
  openConfirmEndSession,
  closeConfirmEndSession,
  setSessionCopiedId,
  setSessionToast,
  clearSessionToast
} from '../../features/sessions/gameSessionSlice';
import {
  fetchSessionMatchResults,
  clearSessionMatchResults
} from '../../features/sessions/matchResultSlice';
import {
  selectAllSessions,
  selectSessionsStatus,
  selectSessionsError,
  selectSessionMatchResults,
  selectSessionMatchResultsStatus,
  selectSessionMatchResultsError,
  selectGameSessionUI
} from '../../features/sessions/selectors';
import { fetchUsers } from '../../features/users/userSlice';
import { selectAllUsers } from '../../features/users/selectors';
import { fetchGames } from '../../features/games/gameSlice';
import { selectAllGames } from '../../features/games/selectors';
import SessionKpiCards from '../../components/moderator/sessions/SessionKpiCards';
import SessionTrendsChart from '../../components/moderator/sessions/SessionTrendsChart';
import SessionsFilterBar from '../../components/moderator/sessions/SessionsFilterBar';
import SessionListItem from '../../components/moderator/sessions/SessionListItem';
import MonitorModal from '../../components/moderator/sessions/MonitorModal';
import ConfirmEndMatchModal from '../../components/moderator/sessions/ConfirmEndMatchModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/sessions.css';

export function Sessions() {
  const dispatch = useAppDispatch();
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Redux store selectors
  const rawSessions = useAppSelector(selectAllSessions);
  const users = useAppSelector(selectAllUsers);
  const games = useAppSelector(selectAllGames);
  const sessionsStatus = useAppSelector(selectSessionsStatus);
  const sessionsError = useAppSelector(selectSessionsError);

  // Normalized matches for moderator view
  const matches = useMemo(() => {
    return (rawSessions || []).map((s) => ({
      ...s,
      match_id: s.session_id ?? s.match_id ?? s.id,
      id: s.session_id ?? s.id ?? s.match_id,
      status: s.status === 'in-progress' || s.status === 'active' ? 'in-progress' : s.status
    }));
  }, [rawSessions]);

  // Session UI state from Redux
  const sessionUI = useAppSelector(selectGameSessionUI);
  const statusFilter = sessionUI.statusFilter || '';
  const modeFilter = sessionUI.modeFilter || '';
  const isMonitorOpen = sessionUI.monitorModalOpen || false;
  const isConfirmOpen = sessionUI.confirmEndModalOpen || false;

  // Modals & action states
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isEnding, setIsEnding] = useState(false);

  // Redux match results for the selected session
  const selectedSessionId = selectedMatch
    ? String(selectedMatch.match_id ?? selectedMatch.id)
    : null;
  const sessionMatchResults = useAppSelector((state) =>
    selectSessionMatchResults(state, selectedSessionId)
  );
  const matchResultsStatus = useAppSelector((state) =>
    selectSessionMatchResultsStatus(state, selectedSessionId)
  );
  const matchResultsError = useAppSelector((state) =>
    selectSessionMatchResultsError(state, selectedSessionId)
  );
  const isLoadingResults = matchResultsStatus === 'loading';

  // Toast
  const toast = useAppSelector((state) => state.gameSessions?.ui?.toast || null);

  function showToast(message, type = 'success') {
    dispatch(setSessionToast({ message, type }));
    setTimeout(() => {
      dispatch(clearSessionToast());
    }, 4500);
  }

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.allSettled([
        dispatch(fetchSessions()),
        dispatch(fetchUsers()),
        dispatch(fetchGames())
      ]);
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
  }, [dispatch]);

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
  async function handleOpenMonitor(match) {
    const id = match.match_id != null ? match.match_id : match.id;
    const prevId = selectedMatch ? (selectedMatch.match_id ?? selectedMatch.id) : null;

    // Clear previous session's match results when another session is opened
    if (prevId != null && String(prevId) !== String(id)) {
      dispatch(clearSessionMatchResults(prevId));
    }

    setSelectedMatch(match);
    dispatch(openSessionMonitor(id));

    try {
      await Promise.allSettled([
        dispatch(fetchSessionById(id))
          .unwrap()
          .then((freshSession) => {
            setSelectedMatch((current) =>
              String(current?.match_id ?? current?.id) === String(id)
                ? {
                    ...current,
                    ...freshSession,
                    match_id: freshSession.session_id ?? freshSession.match_id ?? id,
                    id: freshSession.session_id ?? freshSession.id ?? id,
                    game: freshSession.game_name || freshSession.game || current?.game,
                    status:
                      freshSession.status === 'in-progress' || freshSession.status === 'active'
                        ? 'in-progress'
                        : freshSession.status
                  }
                : current
            );
          }),
        dispatch(fetchSessionMatchResults(id))
      ]);
    } catch (err) {
      console.warn('Could not refresh session details or results:', err);
      showToast('Showing the latest available session details.', 'info');
    }
  }

  function handleCloseMonitor() {
    if (selectedMatch) {
      const id = selectedMatch.match_id != null ? selectedMatch.match_id : selectedMatch.id;
      dispatch(clearSessionMatchResults(id));
    }
    dispatch(closeSessionMonitor());
    setSelectedMatch(null);
  }

  // Action: Request Terminate (opens confirmation)
  function handleRequestTerminate(match) {
    const mid = match.match_id != null ? match.match_id : match.id;
    setSelectedMatch(match);
    dispatch(openConfirmEndSession(mid));
  }

  // Action: Confirm End Match
  async function handleConfirmEndMatch() {
    if (!selectedMatch) return;
    const mid = selectedMatch.match_id != null ? selectedMatch.match_id : selectedMatch.id;
    setIsEnding(true);

    try {
      const hostId = Number(selectedMatch.hostId ?? selectedMatch.created_by) || 1;
      let results = [];
      if (Array.isArray(sessionMatchResults) && sessionMatchResults.length > 0) {
        results = sessionMatchResults.map((r, idx) => ({
          player_id: Number(r.player_id) || Number(r.id) || hostId,
          score: Number(r.score ?? r.game_score ?? 0),
          player_rank: Number(r.player_rank ?? (idx + 1))
        }));
      }

      await dispatch(
        endSession({
          id: mid,
          data: {
            host_id: hostId,
            ...(results.length > 0 ? { results } : {})
          }
        })
      ).unwrap();

      showToast('Match ended', 'success');
      dispatch(clearSessionMatchResults(mid));
      dispatch(closeConfirmEndSession());
      dispatch(closeSessionMonitor());
      setSelectedMatch(null);
      await loadData();
    } catch (err) {
      console.error('Failed to end match:', err);
      showToast(typeof err === 'string' ? err : 'Failed to end match', 'error');
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
          onClose={() => dispatch(clearSessionToast())}
        />
      )}

      {/* Monitor Modal */}
      <MonitorModal
        isOpen={isMonitorOpen}
        match={selectedMatch}
        matchResults={sessionMatchResults}
        isLoadingResults={isLoadingResults}
        resultsError={matchResultsError}
        onRetryResults={() => {
          if (selectedSessionId != null) dispatch(fetchSessionMatchResults(selectedSessionId));
        }}
        users={users}
        games={games}
        onClose={handleCloseMonitor}
        onTerminate={handleRequestTerminate}
      />

      {/* End Match Confirmation Dialog */}
      <ConfirmEndMatchModal
        isOpen={isConfirmOpen}
        onConfirm={handleConfirmEndMatch}
        onCancel={() => dispatch(closeConfirmEndSession())}
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
        onStatusChange={(val) => dispatch(setSessionStatusFilter(val))}
        modeFilter={modeFilter}
        onModeChange={(val) => dispatch(setSessionModeFilter(val))}
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
                matchResults={[]}
                users={users}
                games={games}
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
