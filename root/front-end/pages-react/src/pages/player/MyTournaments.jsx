import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchPlayerTournaments,
  fetchTournaments,
  openTournamentDetails
} from '../../features/tournaments/tournamentSlice';
import { setMyTournamentsFilter } from '../../features/tournaments/registrationSlice';
import {
  selectPlayerTournaments,
  selectTournamentsListStatus,
  selectTournamentsListError
} from '../../features/tournaments/selectors';
import {
  fetchPlayerProfile,
  fetchLeaderboard
} from '../../features/profiles/playerProfileSlice';
import {
  selectPlayerProfile,
  selectLeaderboard
} from '../../features/profiles/selectors';
import { fetchGames } from '../../features/games/gameSlice';
import { selectAllGames } from '../../features/games/selectors';
import { selectAuthUser } from '../../features/auth/selectors';
import { sameId, formatDate, GAME_ASSETS } from '../../services/playerService';
import '../../styles/player/my-tournaments.css';

export function MyTournaments() {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const { user: contextUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const user = authUser || contextUser;
  const userId = user?.id ?? user?.userId ?? user?.user_id ?? 7;

  const [activeTab, setActiveTab] = useState('live');
  const [loading, setLoading] = useState(true);

  const myTourns = useAppSelector((state) => selectPlayerTournaments(state, userId));
  const myProfile = useAppSelector((state) => selectPlayerProfile(state, userId));
  const leaderboard = useAppSelector(selectLeaderboard);
  const allGames = useAppSelector(selectAllGames);
  const listStatus = useAppSelector(selectTournamentsListStatus);
  const listError = useAppSelector(selectTournamentsListError);

  // Fetch player tournament records and profiles on mount
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        await Promise.allSettled([
          dispatch(fetchPlayerTournaments(userId)),
          dispatch(fetchTournaments()),
          dispatch(fetchPlayerProfile(userId)),
          dispatch(fetchLeaderboard()),
          dispatch(fetchGames())
        ]);
      } catch (err) {
        console.warn('Failed to load MyTournaments data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [dispatch, userId]);

  const handleRetry = () => {
    setLoading(true);
    Promise.allSettled([
      dispatch(fetchPlayerTournaments(userId)),
      dispatch(fetchTournaments()),
      dispatch(fetchPlayerProfile(userId)),
      dispatch(fetchLeaderboard()),
      dispatch(fetchGames())
    ]).finally(() => setLoading(false));
  };

  // Compute seed
  const sortedProfiles = [...(leaderboard || [])].sort(
    (a, b) => (Number(b.carys_points) || 0) - (Number(a.carys_points) || 0)
  );
  const seedIndex = sortedProfiles.findIndex((p) => sameId(p.user_id || p.id, userId));
  const mySeed = seedIndex >= 0 ? `#${seedIndex + 1}` : (myProfile?.seed ? `#${myProfile.seed}` : '—');

  const live = myTourns.filter((t) => t.status === 'in-progress');
  const upcoming = myTourns.filter((t) => t.status === 'upcoming');
  const archive = myTourns.filter((t) => t.status === 'completed');

  const currentList = activeTab === 'live' ? live : activeTab === 'upcoming' ? upcoming : archive;

  function renderGameIcon(game, index) {
    const imgKey = game?.img || game?.game_image;
    const imgSrc = imgKey ? (GAME_ASSETS.IMG_MAP[imgKey] || imgKey) : null;
    const emoji = imgKey ? (GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮') : '🎮';
    const bgColor = GAME_ASSETS.COLORS[index % GAME_ASSETS.COLORS.length];

    if (imgSrc && (imgSrc.startsWith('/') || imgSrc.startsWith('http') || imgSrc.startsWith('data:'))) {
      return (
        <img
          src={imgSrc}
          alt={game?.game_name || 'Game'}
          style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-lg)', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: '70px',
          height: '70px',
          borderRadius: 'var(--radius-lg)',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem'
        }}
      >
        {emoji}
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-content">
        <Link to="/player/dashboard" className="back-btn" style={{ textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>

        <div className="page-header-row mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontSize: '2rem' }}>Competitive Center</h1>
            <p className="text-muted" style={{ margin: '0.4rem 0 0' }}>
              Your personal competitive record, rankings, and tournament history
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/player/leaderboard" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              👑 Leaderboard
            </Link>
            <Link to="/player/tournaments" className="btn btn-purple" style={{ textDecoration: 'none' }}>
              + Join Tournament
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="stats-strip" id="stats-strip">
          <div className="stat-strip-card">
            <div className="stat-strip-val text-cyan" id="st-pcp">
              {(myProfile?.carys_points || 0).toLocaleString()}
            </div>
            <div className="stat-strip-lbl">Carys Points</div>
          </div>
          <div className="stat-strip-card">
            <div className="stat-strip-val" id="st-rank" style={{ color: 'var(--accent-cyan)' }}>
              {mySeed}
            </div>
            <div className="stat-strip-lbl">Global Seed</div>
          </div>
          <div className="stat-strip-card">
            <div className="stat-strip-val text-green" id="st-joined" style={{ color: 'var(--accent-green)' }}>
              {myTourns.length}
            </div>
            <div className="stat-strip-lbl">Tournaments Joined</div>
          </div>
          <div className="stat-strip-card">
            <div className="stat-strip-val text-yellow" id="st-wins" style={{ color: 'var(--accent-yellow)' }}>
              {myProfile?.matches_won || 0}
            </div>
            <div className="stat-strip-lbl">Match Wins</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="comp-tabs">
          <button
            type="button"
            className={`comp-tab ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('live');
              dispatch(setMyTournamentsFilter('live'));
            }}
          >
            🔴 Live {live.length > 0 && `(${live.length})`}
          </button>
          <button
            type="button"
            className={`comp-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('upcoming');
              dispatch(setMyTournamentsFilter('upcoming'));
            }}
          >
            📅 Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
          </button>
          <button
            type="button"
            className={`comp-tab ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('archive');
              dispatch(setMyTournamentsFilter('archive'));
            }}
          >
            📁 Archive {archive.length > 0 && `(${archive.length})`}
          </button>
        </div>

        {/* Error Alert */}
        {listError && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.88rem'
            }}
          >
            <span>{listError}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleRetry}
              style={{ color: '#fff' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div id="tab-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading your tournament data...
            </div>
          ) : currentList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-primary)',
                borderRadius: 'var(--radius-xl)'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                {activeTab === 'live' ? '🎮' : activeTab === 'upcoming' ? '📅' : '📁'}
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>
                No {activeTab === 'live' ? 'active' : activeTab} tournaments
              </h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                {activeTab === 'archive'
                  ? 'Your completed tournaments will appear here'
                  : 'Register for an upcoming tournament to compete'}
              </p>
              {activeTab !== 'archive' && (
                <Link to="/player/tournaments" className="btn btn-purple" style={{ textDecoration: 'none' }}>
                  Find Tournaments
                </Link>
              )}
            </div>
          ) : (
            currentList.map((t, i) => {
              const tid = t.tournament_id || t.id;
              const game = allGames.find((g) => sameId(g.game_id || g.id, t.game_id));
              const tName = t.tournament_name || t.name || 'Official PlayCarys Tournament';
              const maxP = t.maxParticipants || t.max_participants || 32;
              const curP = t.participants || (t.registeredPlayers?.length) || 0;

              return (
                <div key={tid} className="my-tourn-card">
                  <div className="my-tourn-header">
                    {renderGameIcon(game, i)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: "'Orbitron', monospace" }}>
                          {tName}
                        </h3>
                        {activeTab === 'live' ? (
                          <span className="status-live">LIVE</span>
                        ) : (
                          <span
                            className={`badge ${
                              t.status === 'completed' ? 'badge-approved' : 'badge-upcoming'
                            }`}
                          >
                            {t.status}
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
                        {t.desc || 'Official PlayCarys Tournament'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Orbitron', monospace",
                          fontSize: '1.6rem',
                          fontWeight: 800,
                          color: 'var(--accent-yellow)'
                        }}
                      >
                        {t.prize || '5,000 PCP'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Prize Pool</div>
                    </div>
                  </div>

                  <div className="my-tourn-body">
                    <div className="tourn-meta-item">
                      <span className="tourn-meta-lbl">Game</span>
                      <span className="tourn-meta-val">{game?.game_name || game?.title || 'PlayCarys Game'}</span>
                    </div>
                    <div className="tourn-meta-item">
                      <span className="tourn-meta-lbl">Start Date</span>
                      <span className="tourn-meta-val">{formatDate(t.startDate || t.start_date)}</span>
                    </div>
                    <div className="tourn-meta-item">
                      <span className="tourn-meta-lbl">Format</span>
                      <span className="tourn-meta-val">{t.format || 'Single Elimination'}</span>
                    </div>
                    <div className="tourn-meta-item">
                      <span className="tourn-meta-lbl">Entrants</span>
                      <span className="tourn-meta-val">
                        {curP}/{maxP}
                      </span>
                    </div>
                    <div className="tourn-meta-item">
                      <span className="tourn-meta-lbl">Your Seed</span>
                      <span className="tourn-meta-val rank-badge">{mySeed}</span>
                    </div>
                    <div className="tourn-meta-item">
                      <span className="tourn-meta-lbl">Reg. Closes</span>
                      <span className="tourn-meta-val">{formatDate(t.regClose || t.reg_close || t.startDate)}</span>
                    </div>
                  </div>

                  <div className="my-tourn-footer">
                    {activeTab === 'live' ? (
                      <>
                        <span style={{ fontSize: '0.81rem', color: 'var(--text-secondary)' }}>
                          You are a registered competitor
                        </span>
                        <button
                          type="button"
                          className="btn btn-cyan btn-sm"
                          onClick={() => {
                            dispatch(openTournamentDetails(tid));
                            navigate(`/player/tournaments?highlight=${tid}`);
                          }}
                        >
                          Enter Lobby
                        </button>
                      </>
                    ) : activeTab === 'upcoming' ? (
                      <>
                        <span style={{ fontSize: '0.81rem', color: 'var(--text-secondary)' }}>
                          Registration confirmed ✓ · Seed <strong>{mySeed}</strong>
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            dispatch(openTournamentDetails(tid));
                            navigate(`/player/tournaments?highlight=${tid}`);
                          }}
                        >
                          Full Details
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.81rem', color: 'var(--text-secondary)' }}>
                          Tournament completed
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            dispatch(openTournamentDetails(tid));
                            navigate(`/player/tournaments?highlight=${tid}`);
                          }}
                        >
                          View Results
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default MyTournaments;
