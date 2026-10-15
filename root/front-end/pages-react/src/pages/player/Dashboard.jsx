import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import playerService, { sameId, hydrateFromServer, getDatabase } from '../../services/playerService';
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
  const { user, loading: authLoading } = useContext(AuthContext);

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

  useEffect(() => {
    if (authLoading) return;

    // Check authorization: player or guest
    const currentRole = user?.role || 'player';
    if (currentRole !== 'player' && currentRole !== 'guest') {
      console.warn('Unauthorized role for Player Dashboard:', currentRole);
    }

    const currentUid = user?.userId ?? user?.id ?? user?.user_id ?? 7;

    async function loadDashboard() {
      try {
        setLoading(true);

        // Hydrate all key tables from backend so stats, friends, and tournaments
        // reflect authoritative server state rather than stale localStorage.
        await hydrateFromServer(
          ['users', 'player_profiles', 'games', 'tournaments', 'player_tournament',
           'matches', 'match_results', 'sessions', 'friendships', 'notifications'],
          currentUid
        );

        const dashData = playerService.getDashboardData(currentUid, currentRole);
        setData(dashData);

        // Pick a random featured game index initially as in original source
        if (dashData.featuredGames && dashData.featuredGames.length > 0) {
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
  }, [authLoading, user?.userId, user?.id, user?.user_id]);

  const navigate = useNavigate();

  // Featured game slide controls
  function handleSlideNext() {
    if (!data?.featuredGames?.length) return;
    setFeaturedIndex((prev) => (prev + 1) % data.featuredGames.length);
  }

  function handleSelectFeatIndex(idx) {
    if (!data?.featuredGames?.length) return;
    setFeaturedIndex(idx % data.featuredGames.length);
  }

  // Open Game Details Modal
  function handleViewDetails(gameId) {
    const targetId = gameId || (currentFeatGame ? (currentFeatGame.id || currentFeatGame.game_id) : null);
    if (!targetId) return;

    const allGames = [
      ...(data?.featuredGames || []),
      ...(data?.libraryGames || []),
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

  const currentFeatGame =
    data?.featuredGames && data.featuredGames.length > 0
      ? data.featuredGames[featuredIndex]
      : null;

  // Count live tournaments for currently featured game
  const currentFeatGameId = currentFeatGame?.id || currentFeatGame?.game_id;
  const liveTournamentsCount = (data?.tournaments || []).filter(
    (t) => sameId(t.game_id, currentFeatGameId) && t.status === 'in-progress'
  ).length;

  const isGuest = user?.role === 'guest';

  return (
    <>
      <div className="dash-shell" style={{ position: 'relative', zIndex: 1 }}>
        {/* ≡≡≡ MAIN FEED ≡≡≡ */}
        <div className="dash-main">
          {/* Featured Spotlight Banner */}
          <FeaturedGame
            game={currentFeatGame}
            currentIndex={featuredIndex}
            totalGames={data?.featuredGames?.length || 0}
            liveTournaments={liveTournamentsCount}
            onNext={handleSlideNext}
            onSelectIndex={handleSelectFeatIndex}
            onPlay={(id) => handlePlayGame(id, true)}
            onViewDetails={handleViewDetails}
          />

          {/* Scrollable Area */}
          <div className="dash-scroll">
            {/* Live Events / Upcoming Tournaments */}
            <TournamentList tournaments={data?.tournaments || []} />

            {/* Game Library */}
            <GameLibrary
              games={data?.libraryGames || []}
              onPlay={handlePlayGame}
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>

        {/* ≡≡≡ RIGHT SIDEBAR ≡≡≡ */}
        <div className="dash-right">
          {/* Player Identity Card & Progression */}
          <PlayerIdentityCard
            user={data?.user}
            pcp={data?.pcp}
            tierInfo={data?.tierInfo}
            xpProgress={data?.xpProgress}
            xpTierSize={data?.xpTierSize}
            level={data?.level}
            elo={data?.elo}
            matches={data?.matches}
            wins={data?.wins}
            winRate={data?.winRate}
            isGuest={isGuest}
            pct={data?.pct}
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
