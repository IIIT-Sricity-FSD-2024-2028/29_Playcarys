import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import authService from '../../services/authService';
import { isPlayer } from '../../services/moderatorService';
import { AsyncStatus } from '../../app/asyncUtils';
import {
  fetchBans,
  actOnReport,
  liftBan
} from '../../features/moderation/moderationSlice';
import {
  selectBans,
  selectModerationStatus,
  selectModerationError
} from '../../features/moderation/selectors';
import { fetchUsers } from '../../features/users/userSlice';
import { selectAllUsers, selectUsersStatus } from '../../features/users/selectors';
import { fetchPlayerProfiles } from '../../features/profiles/playerProfileSlice';
import { selectAllPlayerProfiles } from '../../features/profiles/selectors';
import BanKpiCards from '../../components/moderator/bans/BanKpiCards';
import BannedPlayerItem from '../../components/moderator/bans/BannedPlayerItem';
import ActivePlayerItem from '../../components/moderator/bans/ActivePlayerItem';
import BanPlayerView from '../../components/moderator/bans/BanPlayerView';
import ConfirmUnbanModal from '../../components/moderator/bans/ConfirmUnbanModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/bans.css';

export function Bans() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Redux state selectors
  const users = useSelector(selectAllUsers);
  const bans = useSelector(selectBans);
  const moderationStatus = useSelector(selectModerationStatus);
  const moderationError = useSelector(selectModerationError);
  const usersStatus = useSelector(selectUsersStatus);

  // Player profiles from Redux store for display (level, carys points)
  const profiles = useSelector(selectAllPlayerProfiles);

  // Search filter (kept local)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');

  // View state: 'main' | 'ban' (kept local)
  const [view, setView] = useState(() => {
    if (location.state?.player) return 'ban';
    if (params.playerId || searchParams.get('player') || searchParams.get('playerId') || searchParams.get('userId')) return 'ban';
    return 'main';
  });
  const [selectedPlayer, setSelectedPlayer] = useState(() => location.state?.player || null);
  const [initialReason, setInitialReason] = useState(() => location.state?.initialReason || '');
  const [fromReport, setFromReport] = useState(() => location.state?.fromReport || null);
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Unban modal state (kept local)
  const [unbanPlayerTarget, setUnbanPlayerTarget] = useState(null);
  const [isUnbanModalOpen, setIsUnbanModalOpen] = useState(false);
  const [unbanSubmitting, setUnbanSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchBans()).unwrap(),
        dispatch(fetchUsers()).unwrap(),
        dispatch(fetchPlayerProfiles()).unwrap()
      ]);
    } catch (err) {
      console.error('Failed to load ban management data:', err);
      showToast('Failed to load player and ban records', 'error');
    }
  }, [dispatch]);

  useEffect(() => {
    document.title = 'PlayCarys — Ban Management';
    const currentSession = authService.requireAuth(['moderator']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setSession(currentSession);
    loadData();
  }, [loadData]);

  // When url param or search param is present, locate player in users list
  useEffect(() => {
    const targetParam = params.playerId || searchParams.get('player') || searchParams.get('playerId') || searchParams.get('userId');
    if (!targetParam) return;

    if (users.length > 0) {
      const match = users.find((u) => {
        const uid = u.user_id != null ? u.user_id : u.id;
        if (String(uid) === String(targetParam)) return true;
        const uname = (u.username || u.user_name || '').toLowerCase();
        if (uname === String(targetParam).toLowerCase()) return true;
        return false;
      });

      if (match) {
        setSelectedPlayer(match);
        setView('ban');
      } else if (!selectedPlayer) {
        setSelectedPlayer({
          user_id: targetParam,
          id: targetParam,
          username: `Player #${targetParam}`,
          user_name: `Player #${targetParam}`
        });
        setView('ban');
      }
    }
  }, [params.playerId, searchParams, users, selectedPlayer]);

  // Synchronize state if navigated from Reports or external link
  useEffect(() => {
    if (location.state?.initialReason) {
      setInitialReason(location.state.initialReason);
    }
    if (location.state?.fromReport) {
      setFromReport(location.state.fromReport);
    }
    if (location.state?.player) {
      setSelectedPlayer(location.state.player);
      setView('ban');
    }
  }, [location.state]);

  // Filter player lists based on role and search query
  const q = searchQuery.trim().toLowerCase();

  const allPlayers = users.filter(isPlayer);

  const bannedPlayers = allPlayers.filter((u) => {
    if (u.status !== 'banned') return false;
    if (!q) return true;
    const name = (u.username || u.user_name || '').toLowerCase();
    return name.includes(q);
  });

  const activePlayers = allPlayers.filter((u) => {
    if (u.status === 'banned') return false;
    if (!q) return true;
    const name = (u.username || u.user_name || '').toLowerCase();
    return name.includes(q);
  });

  // Action: Open Ban Player View
  function handleOpenBanView(player) {
    setSelectedPlayer(player);
    setInitialReason('');
    setFromReport(null);
    setView('ban');
  }

  function handleBackToMain() {
    setView('main');
    setSelectedPlayer(null);
    setInitialReason('');
    setFromReport(null);
    navigate('/moderator/bans', { replace: true });
  }

  // Action: Submit Ban
  async function handleIssueBan({ duration, reason }) {
    if (!selectedPlayer) return;
    const targetUserId = selectedPlayer.user_id != null ? selectedPlayer.user_id : selectedPlayer.id;
    const playerName = selectedPlayer.username || selectedPlayer.user_name || `Player #${targetUserId}`;
    const moderatorId = session?.userId != null ? Number(session.userId) : 3;
    setBanSubmitting(true);

    try {
      await dispatch(
        actOnReport({
          moderator_id: moderatorId,
          report_id: fromReport?.id ? Number(fromReport.id) : undefined,
          action_type: 'ban',
          action_reason: reason.trim(),
          target_user_id: Number(targetUserId),
          ban_duration: duration
        })
      ).unwrap();

      showToast(`${playerName} has been banned for ${duration}`, 'success');
      setView('main');
      setSelectedPlayer(null);
      setInitialReason('');
      setFromReport(null);
      navigate('/moderator/bans', { replace: true });
    } catch (err) {
      console.error('Failed to issue ban:', err);
      showToast(err.message || 'Failed to issue ban', 'error');
    } finally {
      setBanSubmitting(false);
    }
  }

  // Action: Request Unban
  function handleRequestUnban(player) {
    setUnbanPlayerTarget(player);
    setIsUnbanModalOpen(true);
  }

  // Action: Confirm Unban
  async function handleConfirmUnban() {
    if (!unbanPlayerTarget) return;
    const targetUserId = unbanPlayerTarget.user_id != null ? unbanPlayerTarget.user_id : unbanPlayerTarget.id;
    const playerName = unbanPlayerTarget.username || unbanPlayerTarget.user_name || `Player #${targetUserId}`;
    const moderatorId = session?.userId != null ? Number(session.userId) : 3;
    setUnbanSubmitting(true);

    try {
      await dispatch(
        liftBan({
          playerId: Number(targetUserId),
          moderatorId
        })
      ).unwrap();

      showToast(`${playerName} has been unbanned`, 'success');
      setIsUnbanModalOpen(false);
      setUnbanPlayerTarget(null);
    } catch (err) {
      console.error('Failed to unban player:', err);
      showToast(err.message || 'Failed to unban player', 'error');
    } finally {
      setUnbanSubmitting(false);
    }
  }

  if (unauthorized) {
    return (
      <div className="bans-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You must be logged in as a Moderator to manage bans.
        </p>
      </div>
    );
  }

  const isLoading =
    (moderationStatus === AsyncStatus.LOADING || usersStatus === AsyncStatus.LOADING) &&
    users.length === 0 &&
    bans.length === 0;

  return (
    <div className="bans-container page-content">
      {/* Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Unban Confirmation Modal */}
      <ConfirmUnbanModal
        isOpen={isUnbanModalOpen}
        player={unbanPlayerTarget}
        onConfirm={handleConfirmUnban}
        onCancel={() => {
          if (!unbanSubmitting) {
            setIsUnbanModalOpen(false);
            setUnbanPlayerTarget(null);
          }
        }}
        submitting={unbanSubmitting}
      />

      {/* MAIN VIEW */}
      {view === 'main' && (
        <div id="main-view">
          <div className="page-header bans-header">
            <h1>Ban Management</h1>
            <p className="text-muted">Manage player bans and restrictions</p>
          </div>

          {/* Statistics Cards */}
          <BanKpiCards users={users} />

          {/* Search Input */}
          <div className="bans-search-wrapper">
            <span className="bans-search-icon">🔍</span>
            <input
              id="player-search"
              type="text"
              className="form-input bans-search-input"
              placeholder="Search player name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>Loading player and ban records...</p>
            </div>
          ) : moderationError && users.length === 0 ? (
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
              <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>Failed to Load Data</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{moderationError}</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={loadData}>
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Banned Players Section */}
              <div id="banned-section" className="mb-4">
                <h2 className="bans-section-title mb-2">Banned Players</h2>
                <div id="banned-list">
                  {bannedPlayers.length === 0 ? (
                    <div className="bans-empty-box">
                      <p>No banned players</p>
                    </div>
                  ) : (
                    bannedPlayers.map((player) => {
                      const pid = player.user_id != null ? player.user_id : player.id;
                      const activeBan = bans.find(
                        (b) => (String(b.playerId) === String(pid) || String(b.playerId) === String(player.id)) && b.active
                      );
                      const prof = profiles.find(
                        (p) => String(p.user_id) === String(pid)
                      );
                      return (
                        <BannedPlayerItem
                          key={pid}
                          player={player}
                          ban={activeBan}
                          profile={prof}
                          onUnban={handleRequestUnban}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Players Section */}
              <div className="mt-4">
                <h2 className="bans-section-title mb-2">Active Players</h2>
                {activePlayers.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No players found
                  </p>
                ) : (
                  <div className="cards-grid-2" id="active-list">
                    {activePlayers.map((player) => {
                      const pid = player.user_id != null ? player.user_id : player.id;
                      const prof = profiles.find(
                        (p) => String(p.user_id) === String(pid)
                      );
                      return (
                        <ActivePlayerItem
                          key={pid}
                          player={player}
                          profile={prof}
                          onBan={handleOpenBanView}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* BAN PLAYER VIEW */}
      {view === 'ban' && selectedPlayer && (
        <BanPlayerView
          player={selectedPlayer}
          onBack={handleBackToMain}
          onIssueBan={handleIssueBan}
          submitting={banSubmitting}
          initialReason={initialReason}
          fromReport={fromReport}
        />
      )}
    </div>
  );
}

export default Bans;
