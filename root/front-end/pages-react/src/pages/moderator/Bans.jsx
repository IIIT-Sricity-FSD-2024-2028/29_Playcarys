import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  isPlayer,
  fetchModeratorBansData,
  issueModeratorBan,
  liftModeratorBan
} from '../../services/moderatorService';
import BanKpiCards from '../../components/moderator/bans/BanKpiCards';
import BannedPlayerItem from '../../components/moderator/bans/BannedPlayerItem';
import ActivePlayerItem from '../../components/moderator/bans/ActivePlayerItem';
import BanPlayerView from '../../components/moderator/bans/BanPlayerView';
import ConfirmUnbanModal from '../../components/moderator/bans/ConfirmUnbanModal';
import Toast from '../../components/common/Toast';
import '../../styles/moderator/bans.css';

export function Bans() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Raw data from server/DB
  const [users, setUsers] = useState([]);
  const [bans, setBans] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'main' | 'ban'
  const [view, setView] = useState('main');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Unban modal state
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

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchModeratorBansData();
      setUsers(data.users || []);
      setBans(data.bans || []);
      setProfiles(data.playerProfiles || data.profiles || []);
    } catch (err) {
      console.error('Failed to load ban management data:', err);
      setLoadError('Failed to load player and ban records.');
      showToast('Failed to load player and ban records', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Ban Management';
    const currentSession = authService.requireAuth(['moderator']);
    if (!currentSession) {
      setUnauthorized(true);
      return;
    }
    setSession(currentSession);
    loadData();
  }, []);

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
    setView('ban');
  }

  // Action: Submit Ban
  async function handleIssueBan({ duration, reason }) {
    if (!selectedPlayer) return;
    const targetUserId = selectedPlayer.user_id != null ? selectedPlayer.user_id : selectedPlayer.id;
    setBanSubmitting(true);

    try {
      const res = await issueModeratorBan({
        targetUserId,
        duration,
        reason,
        session
      });
      showToast(`${res.playerName} has been banned for ${duration}`, 'success');
      setView('main');
      setSelectedPlayer(null);
      await loadData();
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
    setUnbanSubmitting(true);

    try {
      const res = await liftModeratorBan({
        targetUserId,
        session
      });
      showToast(`${res.playerName} has been unbanned`, 'success');
      setIsUnbanModalOpen(false);
      setUnbanPlayerTarget(null);
      await loadData();
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>Loading player and ban records...</p>
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
              <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>Failed to Load Data</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{loadError}</p>
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
          onBack={() => {
            setView('main');
            setSelectedPlayer(null);
          }}
          onIssueBan={handleIssueBan}
          submitting={banSubmitting}
        />
      )}
    </div>
  );
}

export default Bans;
