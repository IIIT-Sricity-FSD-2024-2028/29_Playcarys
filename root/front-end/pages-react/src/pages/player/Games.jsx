import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchGames, recordGameView } from '../../features/games/gameSlice';
import {
  selectAllGames,
  selectGamesStatus,
  selectGamesError
} from '../../features/games/selectors';
import { selectAuthUser } from '../../features/auth/selectors';
import playerService, { sameId } from '../../services/playerService';
import GameFilters from '../../components/player/games/GameFilters';
import GamesGrid from '../../components/player/games/GamesGrid';
import UpcomingGames from '../../components/player/games/UpcomingGames';
import GameDetails from '../../components/player/games/GameDetails';
import '../../styles/player/games.css';

export function Games() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const allGames = useAppSelector(selectAllGames);
  const gamesStatus = useAppSelector(selectGamesStatus);
  const gamesError = useAppSelector(selectGamesError);

  const location = useLocation();
  const navigate = useNavigate();
  const { gameId: routeGameId } = useParams();
  const userId = user?.id ?? user?.userId ?? user?.user_id ?? 7;

  // Catalog State (local component UI state)
  const [showingFavs, setShowingFavs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [offlineMap, setOfflineMap] = useState({});
  const [toast, setToast] = useState(null);
  const [localUpdateTick, setLocalUpdateTick] = useState(0);

  // Sync selectedGameId from URL search param (?id=, ?gameId=, ?highlight=) or route param (:gameId)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qId = params.get('id') || params.get('gameId') || params.get('highlight') || routeGameId;
    if (qId) {
      setSelectedGameId(qId);
    } else if (!routeGameId) {
      setSelectedGameId(null);
    }
  }, [location.search, routeGameId]);

  // Fetch games from Redux store on mount or when idle
  useEffect(() => {
    if (gamesStatus === 'idle') {
      // The backend owns the playable-catalogue rule: approved and enabled.
      dispatch(fetchGames({ active: true }));
    }
  }, [dispatch, gamesStatus]);

  // Trigger toast with auto-hide
  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  // Favourites list for current player (local storage helper)
  const favs = playerService.getFavorites(userId);

  // Genres dynamically extracted from games
  const genres = Array.from(
    new Set(allGames.map((g) => g.genre).filter(Boolean))
  ).sort();

  // Probe self-hosted games
  useEffect(() => {
    const approved = allGames.filter(
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
  }, [allGames]);

  // Handle favourites toggle
  function handleToggleFav(gameId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    playerService.toggleFavorite(gameId, userId);
    setLocalUpdateTick((v) => v + 1);
  }

  // Handle game launch
  function handleLaunchGame(gameId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    dispatch(recordGameView(gameId));
    const result = playerService.launchGame(gameId, userId);
    if (!result.success) {
      showToast(result.reason || 'Could not launch game', 'error');
    }
  }

  // Suspended Account Guard
  const isSuspended = user && user.status === 'suspended';
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

  // Filter available games
  let availableGames = allGames.filter(
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
  const showUpcoming = !showingFavs && !searchQuery.trim() && !selectedGenre;
  const upcomingGames = showUpcoming
    ? allGames.filter(
        (g) => g.status !== 'approved' && g.game_approval_status !== 'approved'
      )
    : [];

  // Selected game for details view
  const selectedGame = selectedGameId
    ? allGames.find((g) => sameId(g.id || g.game_id, selectedGameId))
    : null;

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {selectedGame ? (
        <GameDetails
          game={selectedGame}
          userId={userId}
          isFav={favs.includes(String(selectedGame.id || selectedGame.game_id))}
          onToggleFav={handleToggleFav}
          onBack={() => {
            setSelectedGameId(null);
            navigate('/player/games', { replace: true });
          }}
          onLaunch={handleLaunchGame}
          onReviewSubmitted={() => dispatch(fetchGames({ active: true }))}
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
            onToggleFavView={() => {
              if (!showingFavs) {
                setSearchQuery('');
                setSelectedGenre('');
              }
              setShowingFavs(!showingFavs);
            }}
          />

          {gamesStatus === 'loading' && allGames.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading game catalog...
            </div>
          )}

          {gamesStatus === 'failed' && allGames.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
              Failed to load games: {gamesError}
            </div>
          )}

          <GamesGrid
            games={sortedGames}
            favs={favs}
            showingFavs={showingFavs}
            onToggleFav={handleToggleFav}
            onToggleFavView={() => setShowingFavs(false)}
            onSelectGame={(gid) => {
              setSelectedGameId(gid);
              navigate(`/player/games?id=${gid}`);
            }}
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
