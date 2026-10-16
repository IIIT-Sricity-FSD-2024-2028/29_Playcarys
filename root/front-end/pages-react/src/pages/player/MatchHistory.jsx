import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { getDatabase, sameId, formatDate, hydrateFromServer, GAME_ASSETS } from '../../services/playerService';
import api from '../../services/api';
import '../../styles/player/match-history.css';

export function MatchHistory() {
  const { user } = useContext(AuthContext);
  const userId = user?.userId ?? user?.id ?? user?.user_id ?? 7;

  const [selectedGameId, setSelectedGameId] = useState('');
  const [resultFilter, setResultFilter] = useState(''); // '' | 'win' | 'loss' | 'draw'
  const [currentPage, setCurrentPage] = useState(1);
  const [openSessionId, setOpenSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbVersion, setDbVersion] = useState(0);

  const PAGE_SIZE = 15;

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        await Promise.allSettled([
          hydrateFromServer(['match_results', 'sessions', 'matches', 'games', 'users']),
          api.get(`/player-profiles/${userId}/match-history`).catch(() => null),
          api.get(`/match-results/player/${userId}`).catch(() => null),
          api.get('/games').catch(() => null)
        ]);
        if (mounted) {
          setDbVersion((v) => v + 1);
        }
      } catch (err) {
        console.warn('Failed to load match history:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const db = getDatabase();
  const allGames = db.games || [];

  // Helper to determine match outcome
  const getOutcome = (r) => {
    const val = (r.result || '').toLowerCase();
    if (val === 'win' || val === 'loss' || val === 'draw') return val;
    if (r.player_rank != null) {
      return Number(r.player_rank) === 1 ? 'win' : 'loss';
    }
    return 'draw';
  };

  // Helper for duration formatting
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // All matches for this player, newest first
  const allPlayerMatches = useMemo(() => {
    const results = (db.match_results || []).filter((r) => sameId(r.player_id, userId));
    return results.slice().sort((a, b) => new Date(b.joined_at || 0) - new Date(a.joined_at || 0));
  }, [db, dbVersion, userId]);

  // Insights data (calculated from all matches of player)
  const insights = useMemo(() => {
    if (!allPlayerMatches.length) return null;

    // Recent form (up to 12 matches, newest first)
    const recentForm = allPlayerMatches.slice(0, 12).map((r) => {
      const res = getOutcome(r);
      const ch = res === 'win' ? 'W' : res === 'loss' ? 'L' : 'D';
      return { res, ch, date: formatDate(r.joined_at), id: r.id || r.session_id };
    });

    // Win streak
    let streak = 0;
    for (const r of allPlayerMatches) {
      if (getOutcome(r) === 'win') streak++;
      else break;
    }

    // Record by game
    const byGame = {};
    allPlayerMatches.forEach((r) => {
      const g = allGames.find((x) => sameId(x.game_id || x.id, r.game_id));
      const gName = g?.game_name || g?.title || `Game ${r.game_id}`;
      const imgKey = g?.img || g?.game_image;
      const emoji = (imgKey && GAME_ASSETS.EMOJI_MAP[imgKey]) || '🎮';
      if (!byGame[gName]) {
        byGame[gName] = { name: gName, total: 0, wins: 0, emoji };
      }
      byGame[gName].total++;
      if (getOutcome(r) === 'win') byGame[gName].wins++;
    });

    const gameRecords = Object.values(byGame)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        pct: Math.round((item.wins / item.total) * 100)
      }));

    // Personal bests
    let bestDist = 0;
    let bestScore = 0;
    let bestCarys = 0;

    allPlayerMatches.forEach((r) => {
      if (r.distance != null && Number(r.distance) > bestDist) {
        bestDist = Number(r.distance);
      }
      const score = Number(r.game_score || r.score || 0);
      if (score > bestScore) bestScore = score;
      const c = Number(r.carys_earned || 0);
      if (c > bestCarys) bestCarys = c;
    });

    return {
      recentForm,
      streak,
      gameRecords,
      bestDist,
      bestScore,
      bestCarys,
      totalCount: allPlayerMatches.length
    };
  }, [allPlayerMatches, allGames]);

  // Overall stats (filtered by selected game if any)
  const gameScopedMatches = useMemo(() => {
    if (!selectedGameId) return allPlayerMatches;
    return allPlayerMatches.filter((r) => sameId(r.game_id, selectedGameId));
  }, [allPlayerMatches, selectedGameId]);

  const stats = useMemo(() => {
    const total = gameScopedMatches.length;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalCarys = 0;

    gameScopedMatches.forEach((r) => {
      const out = getOutcome(r);
      if (out === 'win') wins++;
      else if (out === 'loss') losses++;
      else draws++;

      totalCarys += Number(r.carys_earned || 0);
    });

    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { total, wins, losses, draws, winRate, totalCarys };
  }, [gameScopedMatches]);

  // Filtered matches (by game and by result)
  const filteredMatches = useMemo(() => {
    return gameScopedMatches.filter((r) => {
      if (!resultFilter) return true;
      return getOutcome(r) === resultFilter;
    });
  }, [gameScopedMatches, resultFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredMatches.length / PAGE_SIZE) || 1;
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMatches.slice(start, start + PAGE_SIZE);
  }, [filteredMatches, currentPage]);

  const toggleDetail = (sid) => {
    setOpenSessionId((prev) => (prev === String(sid) ? null : String(sid)));
  };

  return (
    <div className="page-wrapper" style={{ padding: '1.5rem', maxWidth: '1120px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-content">
        <Link to="/player/dashboard" className="back-btn" style={{ textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>

        <div className="page-header-row mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Orbitron', monospace", fontSize: '2rem' }}>Match History</h1>
            <p className="text-muted" style={{ margin: '0.4rem 0 0' }}>
              Every match you have played, with your record and rewards
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/player/leaderboard" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              👑 Leaderboard
            </Link>
            <Link to="/player/games" className="btn btn-purple" style={{ textDecoration: 'none' }}>
              ＋ Play a Game
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards" id="summary-row">
          <div className="sum-card">
            <div className="sum-val" id="sum-matches">{stats.total}</div>
            <div className="sum-lbl">Total Matches</div>
          </div>
          <div className="sum-card">
            <div className="sum-val" id="sum-wins" style={{ color: 'var(--accent-green)' }}>
              {stats.wins}
            </div>
            <div className="sum-lbl">Wins</div>
            <div className="sum-sub">
              {stats.losses}L{stats.draws ? ` · ${stats.draws}D` : ''}
            </div>
          </div>
          <div className="sum-card">
            <div className="sum-val" id="sum-rate" style={{ color: 'var(--accent-cyan)' }}>
              {stats.winRate}%
            </div>
            <div className="sum-lbl">Win Rate</div>
            <div className="sum-bar">
              <i style={{ width: `${stats.winRate}%` }}></i>
            </div>
          </div>
          <div className="sum-card">
            <div
              className="sum-val"
              id="sum-carys"
              style={{ color: stats.totalCarys >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {stats.totalCarys >= 0 ? '+' : ''}{stats.totalCarys.toLocaleString()}
            </div>
            <div className="sum-lbl">Carys Earned</div>
          </div>
        </div>

        {/* Insights Row */}
        {insights && (
          <div className="insights-row" id="insights-row">
            <div className="ins-card">
              <div className="ins-title">Recent Form — newest first</div>
              <div className="form-strip">
                {insights.recentForm.map((item, idx) => (
                  <div key={idx} className={`form-pill form-${item.res}`} title={`${item.res.toUpperCase()} · ${item.date}`}>
                    {item.ch}
                  </div>
                ))}
              </div>
              <div className="sum-sub" style={{ marginTop: '0.7rem' }}>
                {insights.streak > 0 ? `🔥 ${insights.streak} win streak` : 'No active streak'}
              </div>
            </div>

            <div className="ins-card">
              <div className="ins-title">Record by Game</div>
              {insights.gameRecords.length > 0 ? (
                insights.gameRecords.map((item) => (
                  <div key={item.name} className="ins-game-row">
                    <span>{item.emoji}</span>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>{item.name}</span>
                        <span className="gr-num">{item.wins}/{item.total}</span>
                      </div>
                      <div className="gr-bar">
                        <i style={{ width: `${item.pct}%` }}></i>
                      </div>
                    </div>
                    <span className="gr-num">{item.pct}%</span>
                  </div>
                ))
              ) : (
                <div className="sum-sub">No games yet</div>
              )}
            </div>

            <div className="ins-card">
              <div className="ins-title">Personal Bests</div>
              <div className="pb-row">
                <span>Furthest drive</span>
                <b style={{ color: 'var(--accent-cyan)' }}>
                  {insights.bestDist ? `${insights.bestDist}m` : '—'}
                </b>
              </div>
              <div className="pb-row">
                <span>Highest score</span>
                <b style={{ color: '#ffd166' }}>{insights.bestScore || '—'}</b>
              </div>
              <div className="pb-row">
                <span>Best Carys haul</span>
                <b style={{ color: 'var(--accent-green)' }}>
                  {insights.bestCarys ? `+${insights.bestCarys}` : '—'}
                </b>
              </div>
              <div className="pb-row">
                <span>Matches played</span>
                <b>{insights.totalCount}</b>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-row">
          <select
            className="filter-select"
            value={selectedGameId}
            onChange={(e) => {
              setSelectedGameId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Games</option>
            {allGames.map((g) => (
              <option key={g.game_id || g.id} value={g.game_id || g.id}>
                {g.game_name || g.title}
              </option>
            ))}
          </select>

          <div className="filter-group">
            <button
              type="button"
              className={`filter-btn ${resultFilter === '' ? 'active' : ''}`}
              onClick={() => {
                setResultFilter('');
                setCurrentPage(1);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`filter-btn ${resultFilter === 'win' ? 'active' : ''}`}
              onClick={() => {
                setResultFilter('win');
                setCurrentPage(1);
              }}
            >
              Wins
            </button>
            <button
              type="button"
              className={`filter-btn ${resultFilter === 'loss' ? 'active' : ''}`}
              onClick={() => {
                setResultFilter('loss');
                setCurrentPage(1);
              }}
            >
              Losses
            </button>
            <button
              type="button"
              className={`filter-btn ${resultFilter === 'draw' ? 'active' : ''}`}
              onClick={() => {
                setResultFilter('draw');
                setCurrentPage(1);
              }}
            >
              Draws
            </button>
          </div>

          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {filteredMatches.length} match{filteredMatches.length === 1 ? '' : 'es'}
          </span>
        </div>

        {/* Match List */}
        <div id="history-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading match records...
            </div>
          ) : paginatedMatches.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-primary)'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎮</div>
              <h3 style={{ margin: '0 0 0.5rem' }}>No matches found</h3>
              <p style={{ margin: 0 }}>Try adjusting your filters or go play some games!</p>
            </div>
          ) : (
            paginatedMatches.map((r) => {
              const sid = String(r.session_id || r.id);
              const outcome = getOutcome(r);
              const isWin = outcome === 'win';
              const isLoss = outcome === 'loss';
              const barCls = isWin ? 'win-bar' : isLoss ? 'loss-bar' : 'draw-bar';
              const badgeCls = isWin ? 'win-badge' : isLoss ? 'loss-badge' : 'draw-badge';
              const pcpCls = (r.carys_earned ?? 0) >= 0 ? 'pcp-pos' : 'pcp-neg';

              const g = allGames.find((x) => sameId(x.game_id || x.id, r.game_id));
              const gName = r.game_name || g?.game_name || g?.title || `Game #${r.game_id}`;
              const imgKey = g?.img || g?.game_image || r.game_image;
              const emoji = (imgKey && GAME_ASSETS.EMOJI_MAP[imgKey]) || '🎮';
              const isOpen = openSessionId === sid;

              return (
                <React.Fragment key={sid}>
                  <div
                    className={`history-item ${barCls} ${isOpen ? 'open' : ''}`}
                    onClick={() => toggleDetail(sid)}
                  >
                    <div className="game-icon-box">{emoji}</div>

                    <div className="history-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.97rem' }}>{gName}</strong>
                        <span className={`result-badge ${badgeCls}`}>{outcome}</span>
                      </div>
                      <div className="row-meta" style={{ marginTop: '0.3rem' }}>
                        {formatDate(r.joined_at)}
                        {r.duration_seconds ? ` · ⏱️ ${formatDuration(r.duration_seconds)}` : ''}
                      </div>
                    </div>

                    <div className="history-chips">
                      {r.kills != null && <span className="stat-chip">🔪 {r.kills} Kills</span>}
                      {r.distance != null && <span className="stat-chip">📍 {r.distance}m</span>}
                      {r.score != null && r.distance == null && r.kills == null && (
                        <span className="stat-chip">🎯 Score {r.score}</span>
                      )}
                    </div>

                    {r.opponents && r.opponents.length > 0 && (
                      <div className="opponents-list">
                        <div className="opp-title">Played with</div>
                        {r.opponents.map((opp, oppIdx) => (
                          <div key={oppIdx} className="opponent-badge">
                            <div className="opponent-avatar">{opp.avatar || 'OP'}</div>
                            <span>{opp.player_name || 'Opponent'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="history-stats">
                      <div className={`pcp-gain ${pcpCls}`}>
                        {(r.carys_earned ?? 0) >= 0 ? '+' : ''}
                        {r.carys_earned ?? 0} Carys
                      </div>
                      <div className="rank-line">RANK #{r.player_rank || '—'}</div>
                    </div>
                  </div>

                  {/* Inline Detail Panel */}
                  {isOpen && (
                    <div className="detail-panel">
                      <div className="detail-grid">
                        {r.distance != null && (
                          <div className="detail-cell">
                            <div className="dc-lbl">Distance</div>
                            <div className="dc-val" style={{ color: 'var(--accent-cyan)' }}>
                              {r.distance}m
                            </div>
                          </div>
                        )}
                        {r.coins != null && (
                          <div className="detail-cell">
                            <div className="dc-lbl">Coins</div>
                            <div className="dc-val" style={{ color: '#ffd166' }}>
                              {r.coins}
                            </div>
                          </div>
                        )}
                        {r.diamonds != null && (
                          <div className="detail-cell">
                            <div className="dc-lbl">Diamonds</div>
                            <div className="dc-val" style={{ color: '#7ec4ff' }}>
                              {r.diamonds}
                            </div>
                          </div>
                        )}
                        {r.kills != null && (
                          <div className="detail-cell">
                            <div className="dc-lbl">Kills</div>
                            <div className="dc-val" style={{ color: '#ff9d9d' }}>
                              {r.kills}
                            </div>
                          </div>
                        )}
                        <div className="detail-cell">
                          <div className="dc-lbl">Game Score</div>
                          <div className="dc-val">
                            {r.game_score != null ? r.game_score : (r.score ?? '—')}
                          </div>
                        </div>
                        <div className="detail-cell">
                          <div className="dc-lbl">Carys</div>
                          <div className="dc-val" style={{ color: 'var(--accent-green)' }}>
                            {(r.carys_earned ?? 0) >= 0 ? '+' : ''}
                            {r.carys_earned ?? 0}
                          </div>
                        </div>
                        {r.xp_gained != null && (
                          <div className="detail-cell">
                            <div className="dc-lbl">XP</div>
                            <div className="dc-val">+{r.xp_gained}</div>
                          </div>
                        )}
                        <div className="detail-cell">
                          <div className="dc-lbl">Rank</div>
                          <div className="dc-val">#{r.player_rank || '—'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span className="sum-sub" style={{ margin: 0 }}>
                          Session #{sid} · {formatDate(r.joined_at)}
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination" id="pagination-controls">
            <button
              type="button"
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                type="button"
                className={`page-btn ${currentPage === pNum ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(pNum);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {pNum}
              </button>
            ))}
            <button
              type="button"
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchHistory;
