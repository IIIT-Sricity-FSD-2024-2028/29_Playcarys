import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { getDatabase, sameId, getTierFromPoints, hydrateFromServer } from '../../services/playerService';
import api from '../../services/api';
import '../../styles/player/leaderboard.css';

export function Leaderboard() {
  const { user } = useContext(AuthContext);
  const myUid = user?.userId ?? user?.id ?? user?.user_id ?? 7;

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('pcp'); // 'pcp' | 'wins' | 'points' | 'streaks'
  const [loading, setLoading] = useState(true);
  const [dbVersion, setDbVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        await Promise.allSettled([
          hydrateFromServer(['player_profiles', 'users', 'match_results']),
          api.get('/player-profiles/leaderboard').catch(() => null)
        ]);
        if (mounted) {
          setDbVersion((v) => v + 1);
        }
      } catch (err) {
        console.warn('Failed to load leaderboard data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const db = getDatabase();

  // Build enriched player list
  const players = useMemo(() => {
    const rawProfiles = db.player_profiles || [];
    const users = db.users || [];
    const matchResults = db.match_results || [];

    const enriched = rawProfiles.map((p) => {
      const u = users.find((usr) => sameId(usr.user_id || usr.id, p.user_id));
      const myMatches = new Set(
        matchResults
          .filter((r) => sameId(r.player_id, p.user_id))
          .map((r) => String(r.session_id))
      );
      const totalMatches = u?.matches || myMatches.size || 0;
      const wins = u?.wins || p.matches_won || 0;
      const points = p.carys_points || 0;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      const streak = u?.loginStreak || 0;
      const tier = getTierFromPoints(points);
      const name = u?.username || u?.user_name || p.player_name || `Player ${p.user_id}`;
      const avatar = u?.avatar || name.slice(0, 2).toUpperCase();

      return {
        profile: p,
        user: u,
        userId: p.user_id,
        name,
        avatar,
        wins,
        points,
        winRate,
        streak,
        tier,
        totalMatches
      };
    });

    // Sort according to selection
    if (sortBy === 'wins') {
      enriched.sort((a, b) => b.wins - a.wins);
    } else if (sortBy === 'points') {
      enriched.sort((a, b) => b.points - a.points);
    } else if (sortBy === 'streaks') {
      enriched.sort((a, b) => b.streak - a.streak);
    } else {
      enriched.sort((a, b) => (b.points || 0) - (a.points || 0));
    }

    return enriched;
  }, [db, dbVersion, sortBy]);

  // Search filter
  const filteredPlayers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, search]);

  // Current player stats and rank in overall list
  const myIndex = players.findIndex((p) => sameId(p.userId, myUid));
  const myData = myIndex >= 0 ? players[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  let gapText = '';
  if (myRank === 1) {
    gapText = '🏆 You are #1!';
  } else if (myIndex > 0) {
    const abovePlayer = players[myIndex - 1];
    const diff = (abovePlayer.points || 0) - (myData?.points || 0);
    gapText = `${diff.toLocaleString()} PCP behind #${myRank - 1} ${abovePlayer.name}`;
  }

  // Top 3 Podium
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd for podium visualization
  const medalEmoji = ['🥇', '🥈', '🥉'];

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-content">
        <Link to="/player/dashboard" className="back-btn" style={{ textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>

        <div className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
          <h1 style={{ fontSize: '2.4rem', fontFamily: "'Orbitron', monospace", margin: '0 0 0.5rem' }}>
            🏆 Global Champions
          </h1>
          <p className="text-muted" style={{ margin: 0 }}>
            Top competitive players ranked by PlayCarys Points (PCP)
          </p>
        </div>

        {/* Podium for top 3 */}
        {!loading && players.length >= 3 && (
          <div className="podium">
            {podiumOrder.map((idx) => {
              const p = players[idx];
              if (!p) return null;
              const rank = idx + 1;
              const isMe = sameId(p.userId, myUid);

              return (
                <div key={p.userId} className={`podium-slot rank-${rank}`}>
                  <div style={{ position: 'relative' }}>
                    <div className="podium-rank-medal">{medalEmoji[idx]}</div>
                    <div className="plinth">
                      <div className="podium-avatar">
                        {p.avatar}
                      </div>
                      <div className="podium-name">
                        {p.name} {isMe ? '⭐' : ''}
                      </div>
                      <div style={{ fontSize: '0.68rem', margin: '0.2rem 0' }}>
                        <span
                          className="tier-badge"
                          style={{
                            background: `${p.tier.color}22`,
                            color: p.tier.color,
                            border: `1px solid ${p.tier.color}44`
                          }}
                        >
                          {p.tier.name}
                        </span>
                      </div>
                      <div className="podium-pts">{(p.points || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                        ⚡ {p.points.toLocaleString()} Carys · 🏆 {p.wins}W
                      </div>
                    </div>
                  </div>
                  <div className="base-block"></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Your Rank Banner */}
        {myData && myRank && (
          <div className="my-rank-banner" id="my-rank-banner">
            <div style={{ fontSize: '2rem' }}>🎯</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.2rem'
                }}
              >
                Your Current Rank
              </div>
              <div
                style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--accent-cyan)'
                }}
              >
                #{myRank} of {players.length}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--accent-yellow)'
                }}
              >
                {(myData.points || 0).toLocaleString()} PCP
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {gapText}
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Search Filter */}
        <div className="lb-filter">
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Search player…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem' }}
            />
          </div>
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="pcp">🏅 By PCP</option>
            <option value="wins">🏆 By Wins</option>
            <option value="points">⚡ By Carys</option>
            <option value="streaks">🔥 By Streak</option>
          </select>
        </div>

        {/* Column Headers */}
        <div className="lb-row" style={{ background: 'transparent', borderColor: 'transparent', paddingBottom: '0.25rem', marginBottom: 0 }}>
          <div className="lb-col-header" style={{ textAlign: 'center' }}>
            Rank
          </div>
          <div className="lb-col-header">Player</div>
          <div className="lb-col-header" style={{ textAlign: 'right' }}>
            PCP Points
          </div>
          <div className="lb-stats">
            <div className="lb-col-header" style={{ textAlign: 'center' }}>
              Wins
            </div>
            <div className="lb-col-header" style={{ textAlign: 'center' }}>
              Carys
            </div>
            <div className="lb-col-header" style={{ textAlign: 'center' }}>
              Streak
            </div>
          </div>
        </div>

        {/* Rankings List */}
        <div id="leaderboard-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading leaderboard rankings...
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-primary)'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <h3 style={{ margin: '0 0 0.5rem' }}>No players found</h3>
              <p className="text-muted" style={{ margin: 0 }}>
                Try a different search term
              </p>
            </div>
          ) : (
            filteredPlayers.map((p, i) => {
              const isMe = sameId(p.userId, myUid);
              const rank = i + 1;
              const rankDisplay = rank <= 3 ? medalEmoji[i] : `#${rank}`;

              return (
                <div key={p.userId} className={`lb-row ${isMe ? 'me-row' : ''}`}>
                  <div className="lb-rank-num">{rankDisplay}</div>

                  <div className="lb-player">
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      {p.avatar}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {p.name}{' '}
                        {isMe && (
                          <span
                            className="badge badge-cyan"
                            style={{
                              fontSize: '0.55rem',
                              verticalAlign: 'middle',
                              marginLeft: '0.3rem',
                              padding: '0.1rem 0.35rem'
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                        <span
                          className="tier-badge"
                          style={{
                            background: `${p.tier.color}22`,
                            color: p.tier.color,
                            border: `1px solid ${p.tier.color}44`
                          }}
                        >
                          {p.tier.name}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          {p.winRate}% WR
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lb-pcp-val">{(p.points || 0).toLocaleString()}</div>

                  <div className="lb-stats">
                    <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-green)' }}>
                      {p.wins}
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        fontFamily: "'Orbitron', monospace",
                        fontSize: '0.82rem',
                        color: p.tier.color
                      }}
                    >
                      {p.points.toLocaleString()}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                      {p.streak > 0 ? (
                        `🔥 ${p.streak}d`
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </div>
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

export default Leaderboard;
