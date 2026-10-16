import React, { useState } from 'react';
import {
  isRegistered,
  myTeamsIn,
  entrantName,
  entrantCount,
  tournamentService
} from '../../../services/tournamentService';
import { formatDate, sameId } from '../../../services/playerService';
import TournamentOrganizerPanel from './TournamentOrganizerPanel';
import TournamentTabs from './TournamentTabs';
import TournamentBracket from './TournamentBracket';
import TournamentLeaderboard from './TournamentLeaderboard';
import TournamentChat from './TournamentChat';

export function TournamentDetails({
  tournament,
  userId,
  db,
  onBack,
  onOpenRegModal,
  onRefresh,
  onShowToast,
  onWithdraw,
  withdrawingId
}) {
  const [activeTab, setActiveTab] = useState('tab-overview');

  const t = tournament;
  if (!t) return null;

  const tid = t.tournament_id || t.id;
  const uid = String(userId);
  const reg = isRegistered(t, userId, db);
  const entrants = entrantCount(t, db);
  const max = t.maxParticipants || t.max_participants || 16;
  const isFull = entrants >= max;
  const regClosed = t.regClose ? new Date() > new Date(t.regClose) : false;

  // Score contest resolution
  const gameOf = (db.games || []).find((g) => sameId(g.game_id || g.id, t.game_id));
  const isScoreContest = t.format
    ? t.format === 'score'
    : gameOf && gameOf.game_mode
    ? gameOf.game_mode === 'single'
    : String(t.game_id) === '8';

  const publisherUser = (db.users || []).find((u) => sameId(u.user_id || u.id, t.publisherId || t.organizer));

  // My current ready match
  const mySlots = t.team_size
    ? myTeamsIn(t, userId, db).map((tm) => String(tm.team_id))
    : [uid];

  const myMatch = (db.tournament_matches || []).find(
    (m) =>
      sameId(m.tournamentId, t.id || t.tournament_id) &&
      (mySlots.includes(String(m.player1)) || mySlots.includes(String(m.player2))) &&
      m.status === 'waiting' &&
      m.player1 &&
      m.player2 &&
      m.player1 !== 'BYE' &&
      m.player2 !== 'BYE'
  );

  // Matches pending verification or in dispute
  const pendingMatch = (db.tournament_matches || []).find(
    (m) =>
      sameId(m.tournamentId, t.id || t.tournament_id) &&
      (sameId(m.player1, uid) || sameId(m.player2, uid)) &&
      m.status === 'pending'
  );

  const disputedMatch = (db.tournament_matches || []).find(
    (m) =>
      sameId(m.tournamentId, t.id || t.tournament_id) &&
      (sameId(m.player1, uid) || sameId(m.player2, uid)) &&
      m.status === 'disputed'
  );

  // Launch handlers
  function handlePlayGame() {
    const gameId = String(t.game_id);
    if (typeof window !== 'undefined' && window.GameLaunch && window.GameLaunch.hasEngine(gameId)) {
      window.GameLaunch.launch(gameId, { mode: 'tournament', tournamentId: tid });
    } else {
      window.location.href = `/pages/player/games.html?highlight=${gameId}`;
    }
  }

  function handleEnterMatch(matchId) {
    tournamentService.enterMatch(t, matchId, userId).then((res) => {
      if (!res.success && res.reason) {
        onShowToast(res.reason, 'error');
      }
    });
  }

  function handleConfirmResult(mid) {
    tournamentService.confirmResult(mid);
    onShowToast('Result confirmed! The bracket has updated.', 'success');
    onRefresh();
  }

  function handleDisputeResult(mid) {
    tournamentService.disputeResult(mid);
    onShowToast('Match disputed. A moderator has been notified.', 'error');
    onRefresh();
  }

  // Helper for timeline
  const now = Date.now();
  const regCloseTs = t.regClose ? new Date(t.regClose).getTime() : 0;
  const isDone = t.status === 'completed';
  const isLive = t.status === 'in-progress';

  const timelineEvents = [
    { label: 'Registrations Open', date: 'Now', done: true, active: false },
    {
      label: 'Registration Deadline',
      date: formatDate(t.regClose),
      done: now > regCloseTs,
      active: now < regCloseTs && t.status === 'upcoming'
    },
    { label: 'Brackets Announced', date: '24h before start', done: isLive || isDone, active: false },
    { label: 'Tournament Begins', date: formatDate(t.startDate || t.start_date), done: isLive || isDone, active: isLive },
    { label: 'Grand Finals', date: 'Final round', done: isDone, active: false },
    {
      label: 'Results & Auto-Payouts',
      date: isDone ? 'Smart Contract Executed' : 'After Grand Finals',
      done: isDone,
      active: false
    }
  ];

  // Helper for prize breakdown
  const prizeStr = t.prize || '1000 PCP';
  const totalPrize = parseInt(prizeStr.replace(/[^0-9]/g, ''), 10) || 0;
  const isINR = prizeStr.includes('₹');
  const sym = isINR ? '₹' : '$';

  const prizeTiers = [
    { place: '1st', emoji: '🥇', pct: 60, color: 'var(--accent-yellow)', barColor: 'linear-gradient(90deg,#f59e0b,#fcd34d)' },
    { place: '2nd', emoji: '🥈', pct: 25, color: '#c0c0c0', barColor: 'linear-gradient(90deg,#9ca3af,#d1d5db)' },
    { place: '3rd', emoji: '🥉', pct: 10, color: '#cd7f32', barColor: 'linear-gradient(90deg,#b45309,#d97706)' },
    { place: '4th+', emoji: '🎖️', pct: 5, color: 'var(--text-secondary)', barColor: 'var(--border-primary)' }
  ];

  return (
    <div className="page-content" id="detail-view">
      <div
        className="back-btn"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          cursor: 'pointer',
          color: 'var(--accent-cyan)',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}
      >
        ← All Tournaments
      </div>

      <div id="detail-content">
        {/* Detail Hero */}
        <div className="detail-hero">
          <div className="detail-hero-inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span
                    className={`badge badge-${
                      t.status === 'in-progress' ? 'progress' : t.status === 'completed' ? 'approved' : 'upcoming'
                    }`}
                  >
                    {t.status === 'in-progress' ? 'In Progress' : t.status === 'completed' ? 'Completed' : 'Upcoming'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ID: {t.tournament_id || t.id}
                  </span>
                </div>
                <h1 className="hero-title">{t.tournament_name || t.name || t.desc}</h1>
                <p className="hero-desc">{t.desc}</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Prize Pool
                </div>
                <div className="hero-prize">{t.prize || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Banners */}
        {myMatch && (
          <div className="match-action-bar">
            <div>
              <h3 style={{ marginBottom: '0.15rem', color: '#fff' }}>⚔️ Your Match is Ready!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Match ID: {myMatch.match_id} · Opponent:{' '}
                {entrantName(
                  t,
                  mySlots.includes(String(myMatch.player1)) ? myMatch.player2 : myMatch.player1,
                  db
                )}
              </p>
            </div>
            <button
              className="btn btn-purple btn-lg"
              onClick={() => handleEnterMatch(myMatch.match_id)}
              type="button"
            >
              ENTER ARENA
            </button>
          </div>
        )}

        {pendingMatch && (
          sameId(pendingMatch.reportedBy, uid) ? (
            <div
              className="match-action-bar"
              style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'var(--accent-yellow)', animation: 'none' }}
            >
              <div>
                <h3 style={{ color: 'var(--accent-yellow)', marginBottom: '0.2rem' }}>⏳ Result Reported</h3>
                <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Waiting for your opponent to confirm the 1-0 result...
                </p>
              </div>
              <button className="btn btn-ghost disabled" disabled type="button">
                Pending...
              </button>
            </div>
          ) : (
            <div
              className="match-action-bar"
              style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'var(--accent-green)', animation: 'none' }}
            >
              <div>
                <h3 style={{ color: 'var(--accent-green)', marginBottom: '0.2rem' }}>✅ Verify Result</h3>
                <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Your opponent reported a win. Do you agree with this result?
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-green"
                  onClick={() => handleConfirmResult(pendingMatch.match_id)}
                  type="button"
                >
                  Yes, I Agree
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ color: 'var(--accent-red)' }}
                  onClick={() => handleDisputeResult(pendingMatch.match_id)}
                  type="button"
                >
                  No, Dispute
                </button>
              </div>
            </div>
          )
        )}

        {disputedMatch && (
          <div
            className="match-action-bar"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--accent-red)', animation: 'none' }}
          >
            <div>
              <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.2rem' }}>⚠️ Match in Dispute</h3>
              <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                A publisher is currently reviewing the logs for match {disputedMatch.match_id}.
              </p>
            </div>
            <button className="btn btn-ghost disabled" disabled type="button">
              Under Review
            </button>
          </div>
        )}

        {isScoreContest && reg && t.status === 'upcoming' && (
          <div
            className="match-action-bar"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-primary)', animation: 'none' }}
          >
            <div>
              <h3 style={{ marginBottom: '0.15rem', color: '#fff' }}>⏳ Not open yet</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                You're in. {t.game} opens for scoring on {formatDate(t.startDate || t.start_date)} — runs played before then don't count towards the leaderboard.
              </p>
            </div>
            <button className="btn btn-ghost btn-lg" disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} type="button">
              🔒 Locked
            </button>
          </div>
        )}

        {isScoreContest && reg && t.status === 'in-progress' && (
          <div
            className="match-action-bar"
            style={{
              background: 'linear-gradient(45deg,rgba(245,158,11,0.15),rgba(239,68,68,0.15))',
              borderColor: 'var(--accent-yellow)',
              animation: 'none'
            }}
          >
            <div>
              <h3 style={{ marginBottom: '0.15rem', color: '#fff' }}>🎯 {t.game} — Score Contest</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Play to set your best {t.metric_label || 'score'}. Your best run is what lands on the leaderboard.
              </p>
            </div>
            <button
              className="btn btn-lg"
              style={{
                background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                color: '#fff',
                fontWeight: 800,
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem'
              }}
              onClick={handlePlayGame}
              type="button"
            >
              🎮 Play Now
            </button>
          </div>
        )}

        {/* Organizer Panel */}
        <TournamentOrganizerPanel
          tournament={t}
          userId={userId}
          db={db}
          onStarted={onRefresh}
          onShowToast={onShowToast}
        />

        {/* Navigation Tabs */}
        <TournamentTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab 1: Overview */}
        {activeTab === 'tab-overview' && (
          <div className="tab-content">
            <div className="detail-grid">
              <div>
                <div className="info-section">
                  <h3>📆 Timeline</h3>
                  <div className="timeline">
                    {timelineEvents.map((e, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className={`timeline-dot ${e.done ? 'done' : e.active ? 'active' : ''}`} />
                        <div
                          className="timeline-title"
                          style={{
                            color: e.active ? 'var(--accent-cyan)' : e.done ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          {e.label}
                        </div>
                        <div className="timeline-date">{e.date}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="info-section">
                  <h3>🥇 Prize Distribution</h3>
                  <div>
                    {prizeTiers.map((tier, idx) => (
                      <div key={idx} className="prize-row">
                        <div
                          className="prize-rank-badge"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: tier.color,
                            border: `1px solid ${tier.color}`
                          }}
                        >
                          {tier.emoji}
                        </div>
                        <div style={{ minWidth: '42px', fontWeight: 700 }}>{tier.place}</div>
                        <div className="prize-bar">
                          <div className="prize-bar-fill" style={{ width: `${tier.pct}%`, background: tier.barColor }} />
                        </div>
                        <div style={{ minWidth: '40px', textAlign: 'right', fontWeight: 700, color: tier.color }}>
                          {tier.pct}%
                        </div>
                        <div style={{ minWidth: '72px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {sym}{Math.round((totalPrize * tier.pct) / 100).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="side-panel">
                <div className="action-panel">
                  {reg && t.status === 'upcoming' && onWithdraw ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <button
                        className="reg-cta registered"
                        type="button"
                        style={{ cursor: 'default' }}
                      >
                        ✓ Registered
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{
                          width: '100%',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          color: 'var(--accent-red)',
                          opacity: withdrawingId && sameId(withdrawingId, tid) ? 0.6 : 1,
                          cursor: withdrawingId && sameId(withdrawingId, tid) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={Boolean(withdrawingId && sameId(withdrawingId, tid))}
                        onClick={() => onWithdraw(t)}
                        type="button"
                      >
                        {withdrawingId && sameId(withdrawingId, tid) ? 'Withdrawing...' : 'Withdraw from Tournament'}
                      </button>
                    </div>
                  ) : reg ? (
                    <button
                      className="reg-cta registered"
                      type="button"
                    >
                      ✓ Registered
                    </button>
                  ) : t.status === 'upcoming' && isFull ? (
                    <button
                      className="reg-cta registered"
                      disabled
                      style={{ opacity: 0.65, cursor: 'not-allowed' }}
                      type="button"
                    >
                      Field Full
                    </button>
                  ) : t.status === 'upcoming' ? (
                    <button
                      className="reg-cta open"
                      onClick={() => onOpenRegModal(t)}
                      type="button"
                    >
                      {t.team_size ? '⚡ Enter a Team' : '⚡ Register Now'}
                    </button>
                  ) : (
                    <button
                      className="reg-cta registered"
                      disabled
                      style={{ opacity: 0.65, cursor: 'not-allowed' }}
                      type="button"
                    >
                      {t.status === 'in-progress'
                        ? 'In Progress'
                        : t.status === 'completed'
                        ? 'Completed'
                        : 'Registration Closed'}
                    </button>
                  )}

                  {isScoreContest && reg && t.status === 'in-progress' && (
                    <button
                      className="reg-cta open"
                      style={{
                        marginTop: '0.75rem',
                        background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                        boxShadow: '0 4px 15px rgba(245,158,11,0.3)'
                      }}
                      onClick={handlePlayGame}
                      type="button"
                    >
                      🎮 Play {t.game}
                    </button>
                  )}
                </div>

                <div className="org-card">
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Organized by
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      className="avatar"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        color: '#fff'
                      }}
                    >
                      {publisherUser?.avatar || '🎮'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff' }}>
                        {publisherUser?.username || t.publisherName || 'PlayCarys'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                        Verified Publisher ✓
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bracket */}
        {activeTab === 'tab-bracket' && (
          <div className="tab-content">
            <div className="info-section">
              <h3>🎯 Dynamic Tournament Bracket</h3>
              <TournamentBracket tournament={t} db={db} />
            </div>
          </div>
        )}

        {/* Tab 3: Format & Rules */}
        {activeTab === 'tab-format' && (
          <div className="tab-content">
            <div className="info-section" style={{ marginBottom: '1.5rem' }}>
              <h3>🎮 Match Flow & Qualification</h3>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ marginBottom: '1rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#fff' }}>Match Flow:</strong>{' '}
                  {t.match_flow || 'Single Elimination tournament structure. Winners advance to the next round immediately.'}
                </p>
                <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#fff' }}>Qualification:</strong>{' '}
                  {t.qualification || 'Open registration for all authorized players. No minimum PCP required.'}
                </p>
              </div>
            </div>

            <div className="info-section">
              <h3>📜 Professional Rulebook</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(t.rules_list || [
                  'Participants must be present at match time.',
                  'Unfair play leads to disqualification.'
                ]).map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.7rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--accent-purple)'
                    }}
                  >
                    <span style={{ color: 'var(--accent-purple)', fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Leaderboard, Participants & Chat */}
        {activeTab === 'tab-leaderboard' && (
          <div className="tab-content">
            <div className="info-section">
              <h3>{isScoreContest ? '🏁 Leaderboard' : '🏆 Official Leaderboard'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {isScoreContest
                  ? 'Everyone plays the same game; the best result wins. Play to set your record and climb the board.'
                  : 'Players are seeded by their global PlayCarys Points (PCP). Win matches to climb the ranks!'}
              </p>
              <TournamentLeaderboard
                tournament={t}
                userId={userId}
                db={db}
                isScoreContest={isScoreContest}
              />
            </div>

            <TournamentChat
              tournamentId={tid}
              userId={userId}
              isRegistered={reg}
              onShowToast={onShowToast}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default TournamentDetails;
