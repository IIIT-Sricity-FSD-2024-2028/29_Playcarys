import React, { useState, useEffect } from 'react';
import authService from '../../services/authService';
import {
  fetchGames,
  toggleGameStatus,
  deleteGameRecord
} from '../../services/superuserService';
import GameKPIs from '../../components/superuser/games/GameKPIs';
import GamesTable from '../../components/superuser/games/GamesTable';
import GameDetailsModal from '../../components/superuser/games/GameDetailsModal';
import ConfirmDeleteModal from '../../components/superuser/games/ConfirmDeleteModal';
import Toast from '../../components/common/Toast';
import '../../styles/superuser/games.css';

export function Games() {
  const [session, setSession] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');

  // Modals & Toast
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  // Load games from backend / local DB
  async function loadData() {
    try {
      const list = await fetchGames();
      setGames(list);
    } catch (err) {
      console.error('Failed to load games:', err);
      showToast('Failed to load games', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'PlayCarys — Superuser · Games';

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
  const totalGames = games.length;
  const approvedGames = games.filter((g) => g.status === 'approved').length;
  const pendingGames = games.filter((g) => g.status === 'pending').length;
  const blacklistedGames = games.filter((g) => g.status === 'approved' && !g.enabled).length;

  const stats = {
    totalGames,
    approvedGames,
    pendingGames,
    blacklistedGames
  };

  // Filter games based on search, status, and genre
  let filteredGames = [...games];
  const q = search.trim().toLowerCase();
  if (q) {
    filteredGames = filteredGames.filter(
      (g) =>
        (g.title || '').toLowerCase().includes(q) ||
        (g.publisher || '').toLowerCase().includes(q)
    );
  }
  if (statusFilter) {
    filteredGames = filteredGames.filter((g) => g.status === statusFilter);
  }
  if (genreFilter) {
    filteredGames = filteredGames.filter((g) => g.genre === genreFilter);
  }

  // Review workflow: navigate to shared admin game-review console
  function handleOpenReview(game) {
    setSelectedGame(null);
    const id = game.id ?? game.game_id;
    window.location.href = `/pages/admin/game-review.html?gameId=${encodeURIComponent(id)}`;
  }

  // Toggle Blacklist / Enable
  async function handleToggleGame(game) {
    try {
      const id = game.id ?? game.game_id;
      const updated = await toggleGameStatus(id);
      const isNowEnabled = updated.enabled;
      showToast(`"${game.title}" ${isNowEnabled ? 'enabled' : 'blacklisted'}`, 'info');
      await loadData();
      if (selectedGame && String(selectedGame.id ?? selectedGame.game_id) === String(id)) {
        setSelectedGame({
          ...selectedGame,
          enabled: isNowEnabled,
          game_status: isNowEnabled ? 'enabled' : 'disabled'
        });
      }
    } catch (err) {
      console.error('Failed to toggle game status:', err);
      showToast(err.message || 'Failed to update game status', 'error');
    }
  }

  // Delete Game
  async function handleConfirmDelete() {
    if (!gameToDelete) return;
    const target = gameToDelete;
    setGameToDelete(null);
    try {
      const id = target.id ?? target.game_id;
      await deleteGameRecord(id);
      showToast('Game deleted', 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to delete game:', err);
      showToast(err.message || 'Failed to delete game', 'error');
    }
  }

  if (unauthorized) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Superuser Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            The Superuser Game Control page requires Superuser privileges.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/index.html';
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1>🎮 Game Control</h1>
          <p className="text-muted">
            Approve, reject, enable, disable or permanently delete any game on the platform
          </p>
        </div>
        <select
          className="form-select"
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* KPI Cards */}
      <GameKPIs stats={stats} />

      {/* Games Table with Search and Genre Filter */}
      <GamesTable
        games={filteredGames}
        search={search}
        onSearchChange={setSearch}
        genreFilter={genreFilter}
        onGenreFilterChange={setGenreFilter}
        onView={(g) => setSelectedGame(g)}
        onReview={handleOpenReview}
        onToggle={handleToggleGame}
        onDelete={(g) => setGameToDelete(g)}
      />

      {/* Game Details Modal */}
      <GameDetailsModal
        isOpen={!!selectedGame}
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onReview={handleOpenReview}
        onToggle={handleToggleGame}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!gameToDelete}
        game={gameToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setGameToDelete(null)}
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

export default Games;
