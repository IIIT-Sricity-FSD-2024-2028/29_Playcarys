import React, { useState } from 'react';
import { getStatusBadgeData, formatDate } from '../../../services/publisherService';

export function TournamentMgmt({
  tournament,
  gameName = 'Chess',
  matches = [],
  users = [],
  onBack,
  onStartTournament,
  onAdvanceRound,
  onForceWinner,
  onExportResults,
  onPauseTournament,
  onResumeTournament,
  onCancelTournament,
  onDeclareWinner,
  onExtendDeadline
}) {
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');
  const [customWinnerName, setCustomWinnerName] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  if (!tournament) return null;

  const t = tournament;
  const statusInfo = getStatusBadgeData(t.status || 'upcoming');
  const isUpcoming = t.status === 'upcoming';
  const isInProgress = t.status === 'in-progress';
  const isPaused = t.status === 'paused';
  const isCompleted = t.status === 'completed';
  const isCancelled = t.status === 'cancelled';

  function getUserName(id) {
    if (!id) return 'TBD';
    if (id === 'BYE') return 'BYE';
    const u = users.find((x) => String(x.id || x.user_id) === String(id));
    return u?.user_name || u?.username || id || 'TBD';
  }

  // Extract distinct candidate participants from matches or registered players
  const candidateParticipants = [];
  const seenIds = new Set();
  matches.forEach((m) => {
    [m.player1, m.player2].forEach((p) => {
      if (p && p !== 'BYE' && !seenIds.has(String(p))) {
        seenIds.add(String(p));
        candidateParticipants.push({ id: p, name: getUserName(p) });
      }
    });
  });
  if (Array.isArray(t.registeredPlayers)) {
    t.registeredPlayers.forEach((p) => {
      const pid = typeof p === 'object' ? p.id || p.user_id : p;
      if (pid && !seenIds.has(String(pid))) {
        seenIds.add(String(pid));
        candidateParticipants.push({ id: pid, name: getUserName(pid) });
      }
    });
  }

  const handleSaveDeadline = () => {
    if (!deadlineInput) return;
    if (onExtendDeadline) {
      onExtendDeadline(deadlineInput);
    }
    setShowDeadlineModal(false);
  };

  const handleConfirmWinner = () => {
    const finalWinnerId = selectedWinnerId || 'manual';
    const finalWinnerName = customWinnerName.trim() || getUserName(selectedWinnerId) || 'Champion';
    if (onDeclareWinner) {
      onDeclareWinner(finalWinnerId, finalWinnerName);
    }
    setShowWinnerModal(false);
  };

  const handleConfirmCancel = () => {
    if (onCancelTournament) {
      onCancelTournament(cancelReasonInput.trim() || 'Cancelled by publisher');
    }
    setShowCancelModal(false);
  };

  return (
    <div id="mgmt-view">
      <div className="back-row" onClick={onBack}>
        ← Back to Hub
      </div>

      <div className="page-header" id="mgmt-header">
        <h1>Management: {t.tournament_name || t.name}</h1>
        <p className="text-muted">
          Status: <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span> · Game: {gameName} · Registered: <strong style={{ color: '#fff' }}>{candidateParticipants.length || t.participants || 0}</strong> / {t.maxParticipants || 32}
          {t.regClose && (
            <span> · Reg Deadline: {formatDate(t.regClose)}</span>
          )}
        </p>
      </div>

      {/* COMPLETED BANNER */}
      {isCompleted && (
        <div
          className="pub-section"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))',
            borderColor: 'rgba(34, 197, 94, 0.4)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h3 style={{ color: 'var(--accent-green)', margin: '0 0 0.25rem 0' }}>
              🏆 Tournament Completed!
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Winner: <strong style={{ color: '#fff', fontSize: '1.05rem' }}>{t.winner || 'Undisputed Champion'}</strong>
              {t.prize && <span> · Prize Pool: <strong>{t.prize}</strong></span>}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onExportResults}>
            📝 Export Results
          </button>
        </div>
      )}

      {/* CANCELLED BANNER */}
      {isCancelled && (
        <div
          className="pub-section"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            marginBottom: '1.5rem'
          }}
        >
          <h3 style={{ color: '#f87171', margin: '0 0 0.25rem 0' }}>🛑 Tournament Cancelled</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t.cancel_reason ? `Reason: ${t.cancel_reason}` : 'This tournament was cancelled by the publisher.'}
          </p>
        </div>
      )}

      {/* CONTROLS BAR */}
      {!isCompleted && !isCancelled && (
        <div id="mgmt-controls" className="pub-section" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3>
                {isUpcoming && 'Ready to start?'}
                {isInProgress && `Tournament Level: Round ${t.currentRound || 1} (Live)`}
                {isPaused && '⏸️ Tournament is Paused'}
              </h3>
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                {isUpcoming && 'Once started, registration closes and the bracket matches are seeded.'}
                {isInProgress && 'Manage live matches, advance rounds, or complete early.'}
                {isPaused && 'Matches are temporarily on hold. You can resume at any time.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* UPCOMING ACTIONS */}
              {isUpcoming && (
                <>
                  <button
                    className="btn btn-yellow btn-md"
                    onClick={onStartTournament}
                    style={{ fontWeight: 700 }}
                  >
                    🚀 Start Tournament Now
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setDeadlineInput(t.regClose ? t.regClose.slice(0, 16) : '');
                      setShowDeadlineModal(true);
                    }}
                  >
                    📅 Extend Deadline
                  </button>
                </>
              )}

              {/* LIVE ACTIONS */}
              {isInProgress && (
                <>
                  <button
                    className="btn btn-purple btn-sm"
                    onClick={onAdvanceRound}
                  >
                    Advance Next Round →
                  </button>
                  {onPauseTournament && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={onPauseTournament}
                      title="Pause tournament live matches"
                    >
                      ⏸️ Pause Tournament
                    </button>
                  )}
                  {onDeclareWinner && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowWinnerModal(true)}
                      title="Directly select winner and complete"
                    >
                      👑 Announce Winner
                    </button>
                  )}
                </>
              )}

              {/* PAUSED ACTIONS */}
              {isPaused && (
                <>
                  {onResumeTournament && (
                    <button
                      className="btn btn-yellow btn-sm"
                      onClick={onResumeTournament}
                      style={{ fontWeight: 700 }}
                    >
                      ▶️ Resume Tournament
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setDeadlineInput(t.regClose ? t.regClose.slice(0, 16) : '');
                      setShowDeadlineModal(true);
                    }}
                  >
                    📅 Extend Deadline
                  </button>
                  {onDeclareWinner && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowWinnerModal(true)}
                    >
                      👑 Announce Winner
                    </button>
                  )}
                </>
              )}

              {/* CANCEL TOURNAMENT */}
              {onCancelTournament && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowCancelModal(true)}
                >
                  🛑 Cancel Tournament
                </button>
              )}

              <button
                className="btn btn-ghost btn-sm"
                onClick={onExportResults}
              >
                📝 Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BRACKET MATCHES */}
      <div id="mgmt-bracket" className="pub-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>🎯 Bracket Management</h3>
          {isInProgress && (
            <span className="badge badge-progress">Round {t.currentRound || 1} Active</span>
          )}
        </div>

        <div id="mgmt-matches" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {matches.length > 0 ? (
            matches.map((m) => {
              const p1 = m.p1_name || getUserName(m.player1);
              const p2 = m.p2_name || getUserName(m.player2);
              const isLive =
                m.status !== 'completed' &&
                m.player1 &&
                m.player2 &&
                m.player1 !== 'BYE' &&
                m.player2 !== 'BYE';

              const winner = m.winner_id != null ? m.winner_id : m.winnerId;
              const p1IsWinner = winner != null && String(winner) === String(m.player1);
              const p2IsWinner = winner != null && String(winner) === String(m.player2);
              const matchId = m.match_id || m.matchId || m.id;

              return (
                <div key={matchId} className="tourn-card" style={{ padding: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                      {matchId} · Round {m.round}{' '}
                      {m.status === 'disputed' && <span className="badge badge-rejected">DISPUTED</span>}
                      {m.status === 'pending' && <span className="badge badge-waiting">PENDING</span>}
                      {m.status === 'completed' && <span className="badge badge-approved">COMPLETED</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: p1IsWinner ? 'var(--accent-green)' : 'inherit'
                        }}
                      >
                        {p1}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>vs</div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: p2IsWinner ? 'var(--accent-green)' : 'inherit'
                        }}
                      >
                        {p2}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {m.status === 'completed' && (
                      <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 700 }}>
                        Winner: {String(winner) === String(m.player1) ? p1 : p2}
                      </span>
                    )}
                    {isLive && !isCompleted && !isCancelled && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onForceWinner(matchId, m.player1, p1)}
                        >
                          🏆 Win P1
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onForceWinner(matchId, m.player2, p2)}
                        >
                          🏆 Win P2
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-3 text-muted">
              Bracket not yet generated. Click "🚀 Start Tournament Now" to generate bracket and seed matches.
            </div>
          )}
        </div>
      </div>

      {/* EXTEND DEADLINE MODAL */}
      {showDeadlineModal && (
        <div className="modal-overlay show" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>📅 Extend Registration Deadline</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 fs-5"
                onClick={() => setShowDeadlineModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="mb-3">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                New Registration Deadline
              </label>
              <input
                type="datetime-local"
                className="form-control"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Extends registration eligibility so more players or teams can join before start.
              </p>
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDeadlineModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-yellow btn-sm"
                disabled={!deadlineInput}
                onClick={handleSaveDeadline}
              >
                Save New Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLARE WINNER MODAL */}
      {showWinnerModal && (
        <div className="modal-overlay show" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>👑 Directly Announce Winner</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 fs-5"
                onClick={() => setShowWinnerModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Select a participant or enter a winner name. This will immediately complete the tournament and announce the champion.
            </p>
            {candidateParticipants.length > 0 && (
              <div className="mb-3">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                  Select from Participants:
                </label>
                <select
                  className="form-control"
                  value={selectedWinnerId}
                  onChange={(e) => {
                    setSelectedWinnerId(e.target.value);
                    const sel = candidateParticipants.find((c) => String(c.id) === e.target.value);
                    if (sel) setCustomWinnerName(sel.name);
                  }}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
                >
                  <option value="">-- Choose Participant --</option>
                  {candidateParticipants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-3">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Winner Display Name:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Maverick or Shadow Squad"
                value={customWinnerName}
                onChange={(e) => setCustomWinnerName(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
              />
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowWinnerModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!selectedWinnerId && !customWinnerName.trim()}
                onClick={handleConfirmWinner}
              >
                👑 Announce & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL TOURNAMENT MODAL */}
      {showCancelModal && (
        <div className="modal-overlay show" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f87171' }}>🛑 Cancel Tournament</h3>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 fs-5"
                onClick={() => setShowCancelModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Are you sure you want to cancel <strong>{t.tournament_name || t.name}</strong>? Ongoing matches will be stopped and registered players will be notified.
            </p>
            <div className="mb-3">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Cancellation Reason:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Rescheduled / Technical maintenance"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
              />
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Tournament
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmCancel}
              >
                Yes, Cancel Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentMgmt;
