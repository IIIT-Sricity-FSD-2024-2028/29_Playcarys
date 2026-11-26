import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublisherAuth } from '../../hooks/usePublisherAuth';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  deletePublisherGame,
  fetchPublisherGameAnalytics,
  fetchPublisherGameWorkspace,
  savePublisherGameEdit
} from '../../features/games/gameSlice';
import PublisherGameRow from '../../components/publisher/mygames/PublisherGameRow';
import PublisherGameEdit from '../../components/publisher/mygames/PublisherGameEdit';
import PublisherGameAnalytics from '../../components/publisher/mygames/PublisherGameAnalytics';
import ConfirmModal from '../../components/publisher/tournament/ConfirmModal';
import Toast from '../../components/common/Toast';
import LoadingState from '../../components/common/LoadingState';
import '../../styles/publisher/mygames.css';

export function MyGames() {
  const dispatch = useAppDispatch();
  const {
    user,
    publisherId,
    isPublisher,
    authLoading
  } = usePublisherAuth();
  const navigate = useNavigate();
  const userId = user?.userId || user?.id;
  const games = useAppSelector((state) => {
    const ids = state.games?.publisherGameIdsByPublisherId?.[String(userId)] || [];
    return ids.map((id) => state.games.entities[id]).filter(Boolean);
  });
  const genres = useAppSelector((state) => state.games?.publisherGenres || []);
  const workspaceStatus = useAppSelector((state) => state.games?.publisherWorkspaceStatus);

  // Active view: 'main' | 'edit' | 'analytics'
  const [view, setView] = useState('main');
  const [isSaving, setIsSaving] = useState(false);

  // Filter tab: '' | 'approved' | 'pending' | 'rejected'
  const [statusFilter, setStatusFilter] = useState('');

  // Data
  const [selectedGame, setSelectedGame] = useState(null);
  const analyticsData = useAppSelector((state) => state.games?.analyticsByGameId?.[String(selectedGame?.game_id || selectedGame?.id)] || null);

  // Toast & Modal
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    confirmStyle: 'primary'
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const openConfirm = (title, message, onConfirm, confirmText = 'Confirm', confirmStyle = 'primary') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      confirmText,
      confirmStyle
    });
  };

  // Load publisher games
  const loadGames = async () => {
    if (!isPublisher) return;
    await dispatch(fetchPublisherGameWorkspace(userId));
  };

  useEffect(() => {
    if (!authLoading && isPublisher) {
      loadGames();
    }
  }, [authLoading, isPublisher, userId]);

  // Filtered games list
  const filteredGames = games.filter((g) => {
    if (!statusFilter) return true;
    const st = (g.game_approval_status || g.status || 'pending').toLowerCase();
    return st === statusFilter;
  });

  // Action handlers
  const handleOpenEdit = (game) => {
    setSelectedGame(game);
    setView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setSelectedGame(null);
    setView('main');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEdit = async (editData) => {
    if (!selectedGame || isSaving) return;
    setIsSaving(true);

    try {
      const gid = selectedGame.game_id || selectedGame.id;
      const statusKey = (selectedGame.game_approval_status || selectedGame.status || 'pending').toLowerCase();

      await dispatch(savePublisherGameEdit({ gameId: gid, publisherId: userId, data: editData })).unwrap();

      if (statusKey === 'rejected') {
        showToast('Game resubmitted for review 📋', 'info');
      } else {
        showToast('Game updated! ✅', 'success');
      }

      await loadGames();
      setSelectedGame(null);
      setView('main');
    } catch (err) {
      console.error('Failed to save game edit:', err);
      showToast(err.message || 'Failed to update game details', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGame = () => {
    if (!selectedGame) return;
    const gid = selectedGame.game_id || selectedGame.id;
    const title = selectedGame.game_name || selectedGame.title || 'Game';

    openConfirm(
      'Delete Game',
      `Permanently delete "${title}"? This cannot be undone.`,
      async () => {
        try {
          await dispatch(deletePublisherGame({ gameId: gid, publisherId: userId })).unwrap();
          showToast('Game deleted', 'success');
          await loadGames();
          setSelectedGame(null);
          setView('main');
        } catch (err) {
          console.error('Failed to delete game:', err);
          showToast(err.message || 'Failed to delete game', 'error');
        }
      },
      'Delete Game',
      'danger'
    );
  };

  const handleOpenAnalytics = (game) => {
    setSelectedGame(game);
    dispatch(fetchPublisherGameAnalytics(game.game_id || game.id));
    setView('analytics');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromAnalytics = () => {
    setSelectedGame(null);
    setView('main');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth guards
  if (authLoading) {
    return <LoadingState message="Checking publisher credentials…" minHeight="60vh" />;
  }

  if (!isPublisher) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Publisher Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You must be signed in with a publisher account to manage studio games.
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

  return (
    <div className="page-content">
      {/* Toast Notification */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmStyle={confirmModal.confirmStyle}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ══ MAIN VIEW ════════════════════════════════════════ */}
      {view === 'main' && (
        <div>
          <div className="page-header-row mb-3">
            <div>
              <h1>My Games</h1>
              <p className="text-muted">Manage and monitor your published games</p>
            </div>
            <button
              type="button"
              className="btn btn-green"
              onClick={() => navigate('/publisher/publish')}
            >
              ⬆️ Publish New Game
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              All Games
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              ✅ Approved
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              ⏳ Pending
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              ❌ Rejected
            </button>
          </div>

          {/* Games List Content */}
          {workspaceStatus === 'loading' ? (
            <LoadingState message="Loading your game catalogue…" minHeight="40vh" />
          ) : filteredGames.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🎮</div>
              <h3>No games found</h3>
              <p>
                {statusFilter
                  ? `No ${statusFilter} games found.`
                  : "You haven't published any games yet."}
              </p>
              <button
                type="button"
                className="btn btn-primary mt-2"
                onClick={() => navigate('/publisher/publish')}
              >
                Publish Your First Game
              </button>
            </div>
          ) : (
            <div id="games-list">
              {filteredGames.map((game, index) => (
                <PublisherGameRow
                  key={game.game_id || game.id || index}
                  game={game}
                  index={index}
                  onEdit={handleOpenEdit}
                  onAnalytics={handleOpenAnalytics}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ EDIT VIEW ════════════════════════════════════════ */}
      {view === 'edit' && selectedGame && (
        <div>
          <div className="back-row" onClick={handleCancelEdit}>
            ← Cancel & Back
          </div>
          <PublisherGameEdit
            game={selectedGame}
            genres={genres}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            onDelete={handleDeleteGame}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* ══ ANALYTICS VIEW ══════════════════════════════════ */}
      {view === 'analytics' && selectedGame && (
        <PublisherGameAnalytics
          game={selectedGame}
          tournaments={analyticsData?.tourns || []}
          matches={analyticsData?.matches || []}
          onBack={handleBackFromAnalytics}
          onEdit={handleOpenEdit}
        />
      )}
    </div>
  );
}

export default MyGames;
