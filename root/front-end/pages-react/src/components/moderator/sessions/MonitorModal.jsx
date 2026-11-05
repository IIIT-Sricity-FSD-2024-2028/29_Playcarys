import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getPlayers } from '../../../services/moderatorService';

function formatTimeDuration(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) {
    return '0s';
  }
  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatDigitalTimer(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const s = Math.floor(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '—';
  }
}

function getRelativeTime(ts) {
  if (!ts) return '';
  try {
    const diffMs = Date.now() - new Date(ts).getTime();
    if (isNaN(diffMs) || diffMs < 0) return '';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function getResolvedRole(u) {
  if (!u) return 'player';
  if (u.role) return String(u.role).toLowerCase();
  switch (u.role_id) {
    case 1:
      return 'superuser';
    case 2:
      return 'admin';
    case 3:
      return 'moderator';
    case 4:
      return 'player';
    case 5:
      return 'publisher';
    default:
      return 'player';
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin':
      return 'badge-admin';
    case 'moderator':
      return 'badge-moderator';
    case 'publisher':
      return 'badge-publisher';
    case 'superuser':
      return 'badge-superuser';
    default:
      return 'badge-player';
  }
}

function getUserAvatar(u) {
  if (!u) return '👤';
  if (u.avatar) return u.avatar;
  const name = u.user_name || u.username || 'U';
  return name.slice(0, 2).toUpperCase();
}

export function MonitorModal({
  isOpen,
  match,
  matchResults = [],
  users = [],
  games = [],
  onClose,
  onTerminate
}) {
  const navigate = useNavigate();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  const isLive = match ? (match.status === 'in-progress' || match.status === 'active') : false;
  const startTimestamp = match?.start_time || match?.created_at || match?.createdAt;

  useEffect(() => {
    if (!isOpen || !match) return;

    if (!isLive) {
      const dur = Number(match.duration) || 0;
      if (dur > 0) {
        setElapsedSeconds(dur);
      } else if (match.start_time && (match.end_time || match.ended_at)) {
        const startMs = Date.parse(match.start_time);
        const endMs = Date.parse(match.end_time || match.ended_at);
        if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
          setElapsedSeconds(Math.floor((endMs - startMs) / 1000));
        } else {
          setElapsedSeconds(0);
        }
      } else {
        setElapsedSeconds(0);
      }
      return;
    }

    const calculateElapsed = () => {
      if (startTimestamp) {
        const startMs = Date.parse(startTimestamp);
        if (!isNaN(startMs)) {
          return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        }
      }
      return Number(match.duration) || 0;
    };

    setElapsedSeconds(calculateElapsed());
    const timer = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, match, isLive, startTimestamp]);

  if (!isOpen || !match) return null;

  const plist = getPlayers(match, matchResults);
  const mid = String(match.match_id != null ? match.match_id : match.id);

  // Match game & host information
  const gameObj = (games || []).find(
    (g) =>
      String(g.game_id ?? g.id) === String(match.game_id) ||
      (g.title && match.game && g.title.toLowerCase() === match.game.toLowerCase())
  );
  const gameTitle = match.game || gameObj?.title || gameObj?.game_name || 'Match';
  const gameCategory = gameObj?.category || gameObj?.genre || match.category || 'Casual';

  const hostId = match.created_by != null ? match.created_by : match.hostId;
  const hostUser = (users || []).find(
    (u) =>
      String(u.user_id) === String(hostId) ||
      String(u.id) === String(hostId) ||
      (match.host && (u.user_name === match.host || u.username === match.host))
  );

  const formattedStarted = formatTimestamp(startTimestamp);
  const relativeStarted = getRelativeTime(startTimestamp);
  const formattedEnded = formatTimestamp(match.end_time || match.ended_at);

  const copySessionId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(mid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEscalateToBan = (playerUser, pid) => {
    onClose();
    const effectiveUser = playerUser || {
      user_id: pid,
      id: pid,
      user_name: `Player #${pid}`,
      username: `Player #${pid}`
    };
    navigate(`/moderator/bans/${pid}?player=${pid}`, {
      state: {
        player: effectiveUser,
        initialReason: `Violation in Live Session #${mid} (${gameTitle})`
      }
    });
  };

  return createPortal(
    <div
      className="modal-overlay show"
      id="monitor-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        opacity: 1,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal card monitor-modal-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h3 className="modal-title" id="monitor-title" style={{ margin: 0, fontSize: '1.2rem', fontFamily: "'Orbitron', monospace" }}>
                Session: {gameTitle}
              </h3>
              <button
                type="button"
                className="copy-btn"
                title="Copy Session ID"
                onClick={copySessionId}
              >
                #{mid} {copied ? '✓ Copied' : '📋'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {isLive ? (
                <span className="badge badge-progress" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="live-beacon" /> LIVE IN PROGRESS
                </span>
              ) : (
                <span className="badge badge-approved">
                  {String(match.status || 'unknown').toUpperCase()}
                </span>
              )}
              <span className="tag" style={{ textTransform: 'capitalize' }}>
                {match.mode || 'casual'}
              </span>
              <span className="tag">
                {gameCategory}
              </span>
              {match.privacy && (
                <span className="tag" style={{ textTransform: 'capitalize' }}>
                  🔒 {match.privacy}
                </span>
              )}
            </div>
          </div>
          <span
            className="modal-close"
            style={{ cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)' }}
            onClick={onClose}
          >
            ✕
          </span>
        </div>

        {/* Hero Session Time & Live Elapsed Counter */}
        <div className={`monitor-timer-hero ${isLive ? 'live' : 'completed'}`}>
          <div className="monitor-timer-main">
            <span className="monitor-timer-label">
              {isLive ? (
                <>
                  <span className="live-beacon" /> Real-Time Session Duration
                </>
              ) : (
                '⏱ Total Session Duration'
              )}
            </span>
            <div className="monitor-timer-value">
              {formatDigitalTimer(elapsedSeconds)}
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                ({formatTimeDuration(elapsedSeconds)})
              </span>
            </div>
            <span className="monitor-timer-meta">
              {isLive
                ? `Active since ${formattedStarted}${relativeStarted ? ` (${relativeStarted})` : ''}`
                : `Played from ${formattedStarted} to ${formattedEnded}`}
            </span>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              Server Health
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isLive ? '#10b981' : 'var(--text-secondary)' }}>
              {isLive ? 'Session in progress' : 'No live connection data'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Players: {plist.length}{match.maxPlayers ? ` / ${match.maxPlayers}` : ''}
            </span>
          </div>
        </div>

        {/* Session Metadata Grid */}
        <div className="monitor-grid">
          <div className="monitor-grid-cell">
            <span className="cell-label">Game Title</span>
            <span className="cell-value">{gameTitle}</span>
          </div>

          <div className="monitor-grid-cell">
            <span className="cell-label">Session ID</span>
            <span className="cell-value">#{mid}</span>
          </div>

          <div className="monitor-grid-cell">
            <span className="cell-label">Host / Creator</span>
            <span className="cell-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {hostUser ? (
                <>
                  <span className="avatar avatar-xs" style={{ width: 20, height: 20, fontSize: '0.65rem' }}>
                    {getUserAvatar(hostUser)}
                  </span>
                  <span>{hostUser.user_name || hostUser.username}</span>
                </>
              ) : match.host ? (
                match.host
              ) : (
                'System Matchmaker'
              )}
            </span>
          </div>

          <div className="monitor-grid-cell">
            <span className="cell-label">Started At</span>
            <span className="cell-value">{formattedStarted}</span>
          </div>
        </div>

        {/* Who Is Playing Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <h4
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              👥 PLAYERS IN THIS SESSION ({plist.length})
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Click player action to escalate
            </span>
          </div>

          {plist.length === 0 ? (
            <div
              style={{
                padding: '1.25rem',
                textAlign: 'center',
                background: 'var(--bg-input, rgba(255, 255, 255, 0.03))',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}
            >
              No active player records found for this session.
            </div>
          ) : (
            <div className="match-players-list">
              {plist.map((pid) => {
                const u = (users || []).find(
                  (usr) => String(usr.user_id) === String(pid) || String(usr.id) === String(pid)
                );
                const role = getResolvedRole(u);
                const isHost =
                  String(pid) === String(hostId) ||
                  (match.host && u && (u.user_name === match.host || u.username === match.host));

                // Match result details if available
                const playerResult = (matchResults || []).find(
                  (r) => String(r.session_id) === mid && String(r.player_id) === String(pid)
                );

                // Compute individual playing time
                let playerDurationSec = elapsedSeconds;
                let joinedTimeStr = formattedStarted;

                if (playerResult?.joined_at) {
                  joinedTimeStr = formatTimestamp(playerResult.joined_at);
                  const jMs = Date.parse(playerResult.joined_at);
                  if (!isNaN(jMs)) {
                    if (isLive) {
                      playerDurationSec = Math.max(0, Math.floor((Date.now() - jMs) / 1000));
                    } else if (match.end_time || match.ended_at) {
                      const eMs = Date.parse(match.end_time || match.ended_at);
                      if (!isNaN(eMs)) {
                        playerDurationSec = Math.max(0, Math.floor((eMs - jMs) / 1000));
                      }
                    }
                  }
                }

                const score = playerResult?.score != null ? playerResult.score : playerResult?.game_score;
                const rank = playerResult?.player_rank;
                const resultOutcome = playerResult?.result;
                const carys = playerResult?.carys_earned;
                const xp = playerResult?.xp_gained;

                return (
                  <div key={pid} className="monitor-player-card">
                    {/* Left: Avatar & Identity */}
                    <div className="monitor-player-left">
                      <div className="avatar avatar-sm">
                        {getUserAvatar(u)}
                      </div>
                      <div className="monitor-player-info">
                        <div className="monitor-player-title">
                          <span>{u ? (u.user_name || u.username) : `Player #${pid}`}</span>
                          {isHost && (
                            <span className="badge-host">👑 Host</span>
                          )}
                          <span className={`badge ${getRoleBadgeClass(role)}`}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                          {u?.status === 'banned' && (
                            <span className="badge badge-banned">Banned</span>
                          )}
                        </div>

                        <div className="monitor-player-sub">
                          <span>ID: #{pid}</span>
                          <span className="badge-time">
                            ⏱ Playing: {formatTimeDuration(playerDurationSec)}
                          </span>
                          {score != null && (
                            <span className="badge-score">
                              Score: {Number(score).toLocaleString()}
                            </span>
                          )}
                          {rank != null && (
                            <span className="badge badge-approved" style={{ fontSize: '0.68rem' }}>
                              {rank === 1 ? '🏆 Rank #1' : `Rank #${rank}`}
                            </span>
                          )}
                          {resultOutcome && (
                            <span className="tag" style={{ textTransform: 'capitalize' }}>
                              {resultOutcome}
                            </span>
                          )}
                          {carys != null && carys > 0 && (
                            <span style={{ color: '#00d4ff', fontSize: '0.72rem' }}>
                              +{carys} Carys
                            </span>
                          )}
                          {xp != null && xp > 0 && (
                            <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>
                              +{xp} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Moderator Disciplinary Action */}
                    <div className="monitor-player-right">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.65rem',
                          color: 'var(--accent-red)',
                          borderColor: 'rgba(239, 68, 68, 0.4)'
                        }}
                        title="Escalate to ban this player"
                        onClick={() => handleEscalateToBan(u, pid)}
                      >
                        🔨 Ban Player
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Warning if in-progress */}
        {isLive && (
          <div
            className="alert alert-warning mt-2"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--accent-yellow)',
              fontSize: '0.85rem'
            }}
          >
            ⚠️ Terminating will disconnect all {plist.length} active players immediately and conclude the match session.
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-primary)'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Session Status: <strong style={{ color: '#fff' }}>{match.status || 'Active'}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            {isLive && (
              <button
                type="button"
                className="btn btn-red"
                id="terminate-btn"
                onClick={() => onTerminate(match)}
              >
                ⛔ Terminate Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

export default MonitorModal;
