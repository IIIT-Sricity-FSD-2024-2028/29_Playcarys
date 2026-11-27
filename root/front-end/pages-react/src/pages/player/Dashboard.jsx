import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { recordGameView, fetchGames } from '../../features/games/gameSlice';
import { selectAllGames } from '../../features/games/selectors';
import { fetchTournaments } from '../../features/tournaments/tournamentSlice';
import { selectAllTournaments } from '../../features/tournaments/selectors';
import { hydratePlayerDatabase, fetchPlayerProfile } from '../../features/profiles/playerProfileSlice';
import AuthContext from '../../context/AuthContext';
import playerService, { sameId, getDatabase } from '../../services/playerService';
import FeaturedGame from '../../components/player/dashboard/FeaturedGame';
import TournamentList from '../../components/player/dashboard/TournamentList';
import GameLibrary from '../../components/player/dashboard/GameLibrary';
import PlayerIdentityCard from '../../components/player/dashboard/PlayerIdentityCard';
import QuickAccess from '../../components/player/dashboard/QuickAccess';
import DailyStreak from '../../components/player/dashboard/DailyStreak';
import FriendsList from '../../components/player/dashboard/FriendsList';
import TodayActivity from '../../components/player/dashboard/TodayActivity';
import GameDetailsModal from '../../components/player/dashboard/GameDetailsModal';
import '../../styles/player/dashboard.css';

export function Dashboard() {
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useContext(AuthContext);

  const reduxGames = useAppSelector(selectAllGames);
  const reduxTournaments = useAppSelector(selectAllTournaments);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedPublisher, setSelectedPublisher] = useState('PlayCarys');

  // In-app Toast message
  const [toast, setToast] = useState(null);

  // Ref to ensure data loading & bonus calculations run only once per mount
  const initializedRef = useRef(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  const currentUid = user?.userId ?? user?.id ?? user?.user_id ?? 7;
  const currentRole = user?.role || 'player';

  useEffect(() => {
    if (authLoading) return;

    // Check authorization: player or guest
    if (currentRole !== 'player' && currentRole !== 'guest') {
      console.warn('Unauthorized role for Player Dashboard:', currentRole);
    }

    async function loadDashboard() {
      try {
        setLoading(true);

        // 1. Hydrate all key tables from backend via Redux thunk (non-blocking for offline resilience)
        try {
          await dispatch(
            hydratePlayerDatabase({
              tables: ['users', 'player_profiles', 'games', 'tournaments', 'player_tournament',
                       'matches', 'match_results', 'sessions', 'friendships', 'notifications'],
              userId: currentUid
            })
          ).unwrap();
        } catch (hydrateErr) {
          console.warn('[Dashboard] Backend database hydration notice:', hydrateErr);
        }

        // 2. Fetch authoritative domain data through Redux slices
        try {
          await Promise.allSettled([
            dispatch(fetchGames()),
            dispatch(fetchTournaments()),
            dispatch(fetchPlayerProfile(currentUid))
          ]);
        } catch (fetchErr) {
          console.warn('[Dashboard] Redux domain fetch notice:', fetchErr);
        }

        const dashData = playerService.getDashboardData(currentUid, currentRole);
        setData(dashData);

        // Pick a random featured game index initially as in original source
        if (dashData?.featuredGames && dashData.featuredGames.length > 0) {
          const randIdx = Math.floor(Math.random() * dashData.featuredGames.length);
          setFeaturedIndex(randIdx);
        }
      } catch (err) {
        console.error('Failed to initialize Player Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    function handleFriendsUpdated() {
      const freshData = playerService.getDashboardData(currentUid, currentRole);
      setData(freshData);
    }

    window.addEventListener('friends-updated', handleFriendsUpdated);
    return () => window.removeEventListener('friends-updated', handleFriendsUpdated);
  }, [dispatch, authLoading, currentUid, currentRole]);

  const navigate = useNavigate();

  const effectiveFeaturedGames =
    data?.featuredGames && data.featuredGames.length > 0
      ? data.featuredGames
      : reduxGames.filter((g) => (g.game_approval_status === 'approved' || g.status === 'approved') && g.img).slice(0, 4);

  const effectiveLibraryGames =
    data?.libraryGames && data.libraryGames.length > 0
      ? data.libraryGames
      : (reduxGames.length > 0 ? reduxGames.filter((g) => (g.game_approval_status === 'approved' || g.status === 'approved')).slice(0, 10) : []);

  const effectiveTournaments =
    data?.tournaments && data.tournaments.length > 0
      ? data.tournaments
      : (reduxTournaments.length > 0 ? reduxTournaments.filter((t) => t.status === 'upcoming' || t.status === 'in-progress').slice(0, 3) : []);

  // Featured game slide controls
  function handleSlideNext() {
    if (!effectiveFeaturedGames?.length) return;
    setFeaturedIndex((prev) => (prev + 1) % effectiveFeaturedGames.length);
  }

  function handleSelectFeatIndex(idx) {
    if (!effectiveFeaturedGames?.length) return;
    setFeaturedIndex(idx % effectiveFeaturedGames.length);
  }

  const currentFeatGame =
    effectiveFeaturedGames && effectiveFeaturedGames.length > 0
      ? effectiveFeaturedGames[featuredIndex % effectiveFeaturedGames.length]
      : null;

  // Open Game Details Modal
  function handleViewDetails(gameId) {
    const targetId = gameId || (currentFeatGame ? (currentFeatGame.id || currentFeatGame.game_id) : null);
    if (!targetId) return;

    const allGames = [
      ...(effectiveFeaturedGames || []),
      ...(effectiveLibraryGames || []),
      ...(reduxGames || []),
      ...(getDatabase()?.games || [])
    ];
    const foundGame = allGames.find((g) => sameId(g.id || g.game_id, targetId)) || currentFeatGame;
    if (!foundGame) return;

    const db = getDatabase();
    const pub = (db?.users || []).find((u) => sameId(u.id, foundGame.publisher_id || foundGame.developer_id));
    setSelectedPublisher(pub?.username || 'PlayCarys');
    setSelectedGame(foundGame);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedGame(null);
  }

  // Play game action
  function handlePlayGame(gameId, isApproved = true) {
    if (!isApproved) {
      showToast('Game coming soon! 🔒');
      return;
    }

    dispatch(recordGameView(gameId));
    const currentUserId = user?.userId ?? user?.id ?? 7;
    const result = playerService.playFast(gameId, currentUserId);
    if (result && result.success === false) {
      showToast('Coming Soon! 🚀 This game engine is being integrated.');
    }
  }

  // Spectate friend match
  function handleSpectate(sessionId) {
    playerService.spectate(sessionId);
  }

  if (authLoading || loading) {
    return (
      <div
        className="dash-shell"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          color: 'var(--accent-cyan)',
          fontFamily: "'Orbitron', monospace",
          fontSize: '1.2rem'
        }}
      >
        Loading PlayCarys Dashboard…
      </div>
    );
  }

  // Count live tournaments for currently featured game
  const currentFeatGameId = currentFeatGame?.id || currentFeatGame?.game_id;
  const liveTournamentsCount = (effectiveTournaments || []).filter(
    (t) => sameId(t.game_id, currentFeatGameId) && t.status === 'in-progress'
  ).length;

  const isGuest = user?.role === 'guest';
  const effectiveUser = data?.user || {
    id: String(currentUid),
    user_id: String(currentUid),
    username: user?.username || (isGuest ? 'Guest Player' : 'Player'),
    avatar: user?.avatar,
    level: 1,
    elo: 1200,
    xp: 0,
    matches: 0,
    wins: 0
  };

  return (
    <>
      <div className="dash-shell" style={{ position: 'relative', zIndex: 1 }}>
        {/* ≡≡≡ MAIN FEED ≡≡≡ */}
        <div className="dash-main">
          {/* Featured Spotlight Banner */}
          <FeaturedGame
            game={currentFeatGame}
            currentIndex={featuredIndex}
            totalGames={effectiveFeaturedGames?.length || 0}
            liveTournaments={liveTournamentsCount}
            onNext={handleSlideNext}
            onSelectIndex={handleSelectFeatIndex}
            onPlay={(id) => handlePlayGame(id, true)}
            onViewDetails={handleViewDetails}
          />

          {/* Scrollable Area */}
          <div className="dash-scroll">
            {/* Live Events / Upcoming Tournaments */}
            <TournamentList tournaments={effectiveTournaments || []} />

            {/* Game Library */}
            <GameLibrary
              games={effectiveLibraryGames || []}
              onPlay={handlePlayGame}
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>

        {/* ≡≡≡ RIGHT SIDEBAR ≡≡≡ */}
        <div className="dash-right">
          {/* Player Identity Card & Progression */}
          <PlayerIdentityCard
            user={effectiveUser}
            pcp={data?.pcp != null ? data.pcp : 0}
            tierInfo={data?.tierInfo}
            xpProgress={data?.xpProgress != null ? data.xpProgress : 0}
            xpTierSize={data?.xpTierSize != null ? data.xpTierSize : 1000}
            level={data?.level != null ? data.level : effectiveUser?.level || 1}
            elo={data?.elo != null ? data.elo : effectiveUser?.elo || 1200}
            matches={data?.matches != null ? data.matches : 0}
            wins={data?.wins != null ? data.wins : 0}
            winRate={data?.winRate != null ? data.winRate : 0}
            isGuest={isGuest}
            pct={data?.pct != null ? data.pct : 0}
          />

          {/* Quick Access Navigation */}
          <QuickAccess />

          {/* Daily Login Streak */}
          <DailyStreak streak={data?.streak} bonusMsg={data?.bonusMsg} />

          {/* Friends Online & Live Presence */}
          <FriendsList
            friends={data?.friends || []}
            isGuest={isGuest}
            onSpectate={handleSpectate}
          />

          {/* Today's Activity */}
          <TodayActivity activities={data?.activities || []} />
        </div>
      </div>

      {/* Game Details Modal */}
      <GameDetailsModal
        isOpen={isModalOpen}
        game={selectedGame}
        publisherName={selectedPublisher}
        onClose={handleCloseModal}
        onPlay={(id) => {
          handleCloseModal();
          handlePlayGame(id, true);
        }}
      />

      {/* Toast Notification Container */}
      {toast && <div className="dash-toast">{toast}</div>}
    </>
  );
}

export default Dashboard;
