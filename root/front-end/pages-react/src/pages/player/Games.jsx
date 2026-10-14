import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import playerService, { getDatabase, sameId, hydrateFromServer } from '../../services/playerService';
import GameFilters from '../../components/player/games/GameFilters';
import GamesGrid from '../../components/player/games/GamesGrid';
import UpcomingGames from '../../components/player/games/UpcomingGames';
import GameDetails from '../../components/player/games/GameDetails';
import '../../styles/player/games.css';

export function Games() {
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?.user_id || 7;

  // Catalog State
  const [showingFavs, setShowingFavs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [offlineMap, setOfflineMap] = useState({});
  const [dbVersion, setDbVersion] = useState(0);
  const [toast, setToast] = useState(null);

  // Trigger toast with auto-hide
  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  // Hydrate game catalog from backend on mount
  useEffect(() => {
    hydrateFromServer(['games', 'users'])
      .then(() => setDbVersion((v) => v + 1))
      .catch(() => {});
  }, []);

  // Live storage and visibility change listener
  useEffect(() => {
    let lastSignature = '';
    const getSignature = () => {
      const db = getDatabase();
      return (db.games || [])
        .filter((g) => (g.status === 'approved' || g.game_approval_status === 'approved') && g.enabled !== false)
        .map((g) => String(g.id || g.game_id))
        .join(',');
    };

    lastSignature = getSignature();

    const refreshIfChanged = () => {
      const current = getSignature();
      if (current !== lastSignature) {
        lastSignature = current;
        setDbVersion((v) => v + 1);
      }
    };

    window.addEventListener('storage', refreshIfChanged);
    const onVisibilityChange = () => {
      if (!document.hidden) refreshIfChanged();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('storage', refreshIfChanged);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const db = getDatabase();

  // Suspended Account Guard
  const dbUser = (db.users || []).find((u) => sameId(u.id || u.user_id, userId));
  const isSuspended = dbUser && dbUser.status === 'suspended';

  // Favourites list for current player
  const favs = playerService.getFavorites(userId);
  const genres = playerService.getGenres();

  // Probe self-hosted games
  useEffect(() => {
    const approved = (db.games || []).filter(
      (g) => (g.status === 'approved' || g.game_approval_status === 'approved') && g.enabled !== false
    );
    approved.forEach((g) => {
      const gid = String(g.id || g.game_id);
      const mode = playerService.getMultiplayerMode(gid);
      if (mode === 'self') {
        playerService.probeSelfHosted(gid).then((alive) => {
          if (!alive) {
            setOfflineMap((prev) => ({ ...prev, [gid]: true }));
          }
        });
      }
    });
  }, [dbVersion]);

  // Handle favourites toggle
  function handleToggleFav(gameId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    playerService.toggleFavorite(gameId, userId);
    setDbVersion((v) => v + 1);
  }

  // Handle game launch
  function handleLaunchGame(gameId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const result = playerService.launchGame(gameId, userId);
    if (!result.success) {
      showToast(result.reason || 'Could not launch game', 'error');
    }
  }

  // Filter available games
  let availableGames = (db.games || []).filter(
    (g) => (g.status === 'approved' || g.game_approval_status === 'approved') && g.enabled !== false
  );

  if (showingFavs) {
    availableGames = availableGames.filter((g) => favs.includes(String(g.id || g.game_id)));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    availableGames = availableGames.filter(
      (g) =>
        (g.title || g.game_name || '').toLowerCase().includes(q) ||
        (g.genre || '').toLowerCase().includes(q) ||
        (g.desc || '').toLowerCase().includes(q)
    );
  }

  if (selectedGenre) {
    availableGames = availableGames.filter((g) => g.genre === selectedGenre);
  }

  // Non-mutating sort
  const sortedGames = [...availableGames].sort((a, b) => {
    if (sortBy === 'rating') {
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    } else if (sortBy === 'views') {
      return (Number(b.views) || 0) - (Number(a.views) || 0);
    } else if (sortBy === 'newest') {
      return new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0);
    }
    return 0;
  });

  // Upcoming games: only games still in development (status !== approved)
  // Hidden when in favourites view or when search/genre filter is active
  const showUpcoming = !showingFavs && !searchQuery.trim() && !selectedGenre;
  const upcomingGames = showUpcoming
    ? (db.games || []).filter(
        (g) => g.status !== 'approved' && g.game_approval_status !== 'approved'
      )
    : [];

  // Selected game for details view
  const selectedGame = selectedGameId
    ? (db.games || []).find((g) => sameId(g.id || g.game_id, selectedGameId))
    : null;

  if (isSuspended) {
    return (
      <div className="page-wrapper">
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏸</div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", marginBottom: '0.5rem', color: '#fff' }}>
            Account Suspended
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto', lineHeight: 1.5 }}>
            Your account is currently suspended. You cannot access the game catalog, but you can still access your messages via the menu to contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {selectedGame ? (
        <GameDetails
          game={selectedGame}
          userId={userId}
          isFav={favs.includes(String(selectedGame.id || selectedGame.game_id))}
          onToggleFav={handleToggleFav}
          onBack={() => setSelectedGameId(null)}
          onLaunch={handleLaunchGame}
          onReviewSubmitted={() => setDbVersion((v) => v + 1)}
          onShowToast={showToast}
        />
      ) : (
        <div className="page-content" id="catalog-view">
          <GameFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            sortBy={sortBy}
            onSortChange={setSortBy}
            genres={genres}
            showingFavs={showingFavs}
            favCount={favs.length}
            onToggleFavView={() => setShowingFavs(!showingFavs)}
          />

          <GamesGrid
            games={sortedGames}
            favs={favs}
            showingFavs={showingFavs}
            onToggleFav={handleToggleFav}
            onSelectGame={(gid) => setSelectedGameId(gid)}
            onLaunch={handleLaunchGame}
            offlineMap={offlineMap}
          />

          {showUpcoming && <UpcomingGames games={upcomingGames} />}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`page-toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Games;
