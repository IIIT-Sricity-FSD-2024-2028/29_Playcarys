import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  updateTournament,
  fetchTournamentById
} from '../../../features/tournaments/tournamentSlice';
import {
  startTournament,
  fetchTournamentBracket,
  fetchTournamentOverview,
  resolveDisputeWinner
} from '../../../features/tournaments/tournamentPlaySlice';
import { selectTournamentMatches } from '../../../features/tournaments/selectors';
import { entrantCount, entrantName, tournamentService } from '../../../services/tournamentService';
import { sameId } from '../../../services/playerService';

export function TournamentOrganizerPanel({
  tournament,
  userId,
  db,
  onStarted,
  onShowToast
}) {
  const dispatch = useAppDispatch();
  const [starting, setStarting] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerNameInput, setWinnerNameInput] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const t = tournament;
  const organizerId = t?.organizer ?? t?.organizer_id ?? t?.publisherId ?? t?.publisher_id;
  if (!t || !sameId(organizerId, userId)) {
    return null;
  }

  const tid = t.tournament_id || t.id;
  const entrants = t.participants ?? entrantCount(t, db);
  const isBracket = t.format === 'bracket';
  const min = isBracket ? 2 : 1;
  const ready = entrants >= min;
  const unit = t.team_size ? 'teams' : 'players';

  // Candidate entrants for quick winner selection
  const candidateEntrants = [];
  if (t.team_size && Array.isArray(db?.team_tournament)) {
    (db.team_tournament || []).filter((r) => sameId(r.tournament_id, tid)).forEach((r) => {
      const tm = (db?.teams || []).find((x) => sameId(x.team_id, r.team_id));
      candidateEntrants.push({ id: r.team_id, name: tm ? tm.name : `Team #${r.team_id}` });
    });
  } else if (Array.isArray(db?.player_tournament)) {
    (db.player_tournament || []).filter((r) => sameId(r.tournament_id, tid)).forEach((r) => {
      const u = (db?.users || []).find((x) => sameId(x.id || x.user_id, r.player_id));
      candidateEntrants.push({ id: r.player_id, name: u?.user_name || u?.username || `Player #${r.player_id}` });
    });
  }

  async function handleConfirmStart() {
    setStarting(true);
    try {
      await dispatch(startTournament({ tournamentId: tid, organizerId: userId })).unwrap();
      onShowToast(`${t.name || t.tournament_name} has started! 🚀 Bracket generated.`, 'success');
      setConfirmStartOpen(false);
      dispatch(fetchTournamentById(tid));
      dispatch(fetchTournamentBracket(tid));
      dispatch(fetchTournamentOverview(tid));
      if (onStarted) onStarted();
    } catch (err) {
      try {
        await tournamentService.startTournament(tid, userId);
        onShowToast(`${t.name || t.tournament_name} has started! 🚀 Bracket generated.`, 'success');
        setConfirmStartOpen(false);
        if (onStarted) onStarted();
      } catch (legacyErr) {
        onShowToast(err.message || legacyErr.message || 'Could not start tournament.', 'error');
      }
    } finally {
      setStarting(false);
    }
  }

  async function handlePause() {
    try {
      await dispatch(updateTournament({ id: tid, changes: { status: 'paused' } })).unwrap();
      onShowToast('Tournament paused ⏸️', 'info');
      dispatch(fetchTournamentById(tid));
      if (onStarted) onStarted();
    } catch (err) {
      await tournamentService.pauseTournament(tid);
      onShowToast('Tournament paused ⏸️', 'info');
      if (onStarted) onStarted();
    }
  }

  async function handleResume() {
    try {
      await dispatch(updateTournament({ id: tid, changes: { status: 'in-progress' } })).unwrap();
      onShowToast('Tournament resumed! ▶️', 'success');
      dispatch(fetchTournamentById(tid));
      if (onStarted) onStarted();
    } catch (err) {
      await tournamentService.resumeTournament(tid);
      onShowToast('Tournament resumed! ▶️', 'success');
      if (onStarted) onStarted();
    }
  }

  async function handleConfirmCancel() {
    try {
      await dispatch(updateTournament({ id: tid, changes: { status: 'cancelled' } })).unwrap();
      onShowToast('Tournament cancelled 🛑', 'info');
      setCancelModalOpen(false);
      dispatch(fetchTournamentById(tid));
      if (onStarted) onStarted();
    } catch (err) {
      await tournamentService.cancelTournament(tid, cancelReason.trim() || 'Cancelled by organizer');
      onShowToast('Tournament cancelled 🛑', 'info');
      setCancelModalOpen(false);
      if (onStarted) onStarted();
    }
  }

  async function handleConfirmWinner() {
    if (!winnerNameInput.trim()) return;
    try {
      await dispatch(updateTournament({ id: tid, changes: { winner: winnerNameInput.trim(), status: 'completed' } })).unwrap();
      onShowToast(`Winner declared: ${winnerNameInput.trim()}! 🏆`, 'success');
      setWinnerModalOpen(false);
      dispatch(fetchTournamentById(tid));
      if (onStarted) onStarted();
    } catch (err) {
      await tournamentService.declareWinner(tid, winnerNameInput.trim(), winnerNameInput.trim());
      onShowToast(`Winner declared: ${winnerNameInput.trim()}! 🏆`, 'success');
      setWinnerModalOpen(false);
      if (onStarted) onStarted();
    }
  }

  async function handleSaveDeadline() {
    if (!newDeadline) return;
    try {
      await dispatch(updateTournament({ id: tid, changes: { regClose: newDeadline } })).unwrap();
      onShowToast('Registration deadline extended! 📅', 'success');
      setDeadlineModalOpen(false);
      dispatch(fetchTournamentById(tid));
      if (onStarted) onStarted();
    } catch (err) {
      await tournamentService.extendDeadline(tid, newDeadline);
      onShowToast('Registration deadline extended! 📅', 'success');
      setDeadlineModalOpen(false);
      if (onStarted) onStarted();
    }
  }

  const reduxMatches = useAppSelector((state) => selectTournamentMatches(state, tid));
  const fallbackMatches = (db?.tournament_matches || []).filter(
    (m) => sameId(m.tournamentId, tid)
  );
  const allMatches = reduxMatches.length > 0 ? reduxMatches : fallbackMatches;
  const disputedMatches = allMatches.filter((m) => m.status === 'disputed');

  function handleClearDispute(mid) {
    tournamentService.resetDispute(mid);
    onShowToast(`Match ${mid} dispute cleared — match is ready for players!`, 'success');
    if (onStarted) onStarted();
  }

  async function handleResolveWinner(mid, winnerId) {
    try {
      await dispatch(resolveDisputeWinner({ matchId: mid, organizerId: userId, organizer_id: userId, winnerId, winner_id: winnerId, tournamentId: tid })).unwrap();
      onShowToast(`Match ${mid} resolved! Winner advanced in bracket.`, 'success');
      dispatch(fetchTournamentBracket(tid));
      dispatch(fetchTournamentOverview(tid));
    } catch (err) {
      tournamentService.resolveDisputeWinner(mid, winnerId);
      onShowToast(`Match ${mid} resolved! Winner advanced in bracket.`, 'success');
    }
    if (onStarted) onStarted();
  }

  return (
    <>
      {disputedMatches.length > 0 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '0.9rem' }}>
            ⚠️ {disputedMatches.length} Match in Dispute
          </div>
          {disputedMatches.map((dm) => (
            <div
              key={dm.match_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.82rem',
                color: '#fff',
                padding: '0.4rem 0',
                borderTop: '1px dashed rgba(239, 68, 68, 0.2)'
              }}
            >
              <span>
                <strong>{dm.match_id}</strong>: {entrantName(t, dm.player1, db)} vs {entrantName(t, dm.player2, db)}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                  onClick={() => handleClearDispute(dm.match_id)}
                >
                  Clear Dispute (Let Play)
                </button>
                <button
                  type="button"
                  className="btn btn-green btn-xs"
                  onClick={() => handleResolveWinner(dm.match_id, dm.player1)}
                >
                  Award {entrantName(t, dm.player1, db)}
                </button>
                <button
                  type="button"
                  className="btn btn-green btn-xs"
                  onClick={() => handleResolveWinner(dm.match_id, dm.player2)}
                >
                  Award {entrantName(t, dm.player2, db)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        className="match-action-bar"
        style={{
          background: 'rgba(139, 92, 246, 0.08)',
          borderColor: 'rgba(139, 92, 246, 0.4)',
          animation: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h3 style={{ marginBottom: '0.15rem', color: '#fff', fontSize: '1.1rem' }}>
            🎛️ Organizer Controls
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {t.status === 'upcoming' && (ready
              ? isBracket
                ? `Starting locks registration and generates the bracket from the ${entrants} ${unit} entered.`
                : `Starting opens scoring — entrants can play and the leaderboard goes live.`
              : `You need at least ${min} ${unit} to start. ${entrants} so far.`)}
            {t.status === 'in-progress' && 'This tournament is live. You can pause, cancel, or announce the winner early.'}
            {t.status === 'paused' && 'This tournament is currently paused. Matches are on hold.'}
            {t.status === 'completed' && `Tournament completed. Winner: ${t.winner || 'Champion'}`}
            {t.status === 'cancelled' && `Tournament cancelled. ${t.cancel_reason ? `Reason: ${t.cancel_reason}` : ''}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* UPCOMING CONTROLS */}
          {t.status === 'upcoming' && (
            <>
              <button
                className="btn btn-md"
                disabled={!ready || starting}
                style={{
                  background: ready
                    ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))'
                    : 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                  fontWeight: 800,
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  opacity: ready ? 1 : 0.5,
                  cursor: ready ? 'pointer' : 'not-allowed'
                }}
                onClick={() => setConfirmStartOpen(true)}
                type="button"
              >
                {starting ? 'Starting…' : '🚀 Start Tournament'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setNewDeadline(t.regClose ? t.regClose.slice(0, 16) : '');
                  setDeadlineModalOpen(true);
                }}
                type="button"
              >
                📅 Extend Deadline
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setCancelModalOpen(true)}
                type="button"
              >
                🛑 Cancel
              </button>
            </>
          )}

          {/* IN-PROGRESS CONTROLS */}
          {t.status === 'in-progress' && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handlePause}
                type="button"
              >
                ⏸️ Pause
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setWinnerModalOpen(true)}
                type="button"
              >
                👑 Announce Winner
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setCancelModalOpen(true)}
                type="button"
              >
                🛑 Cancel
              </button>
            </>
          )}

          {/* PAUSED CONTROLS */}
          {t.status === 'paused' && (
            <>
              <button
                className="btn btn-yellow btn-sm"
                onClick={handleResume}
                style={{ fontWeight: 700 }}
                type="button"
              >
                ▶️ Resume
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setNewDeadline(t.regClose ? t.regClose.slice(0, 16) : '');
                  setDeadlineModalOpen(true);
                }}
                type="button"
              >
                📅 Extend Deadline
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setWinnerModalOpen(true)}
                type="button"
              >
                👑 Announce Winner
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setCancelModalOpen(true)}
                type="button"
              >
                🛑 Cancel
              </button>
            </>
          )}

          {t.status === 'completed' && (
            <span className="badge badge-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Completed
            </span>
          )}

          {t.status === 'cancelled' && (
            <span className="badge badge-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* CONFIRM START MODAL */}
      {confirmStartOpen && (
        <div className="modal-overlay show" onClick={() => setConfirmStartOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Start Tournament</h3>
              <span className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setConfirmStartOpen(false)}>✕</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Start <b>{t.name || t.tournament_name}</b>? Registration closes and bracket will be generated immediately.
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmStartOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirmStart}
                disabled={starting}
                type="button"
              >
                {starting ? 'Starting…' : 'Yes, Start Tournament'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND DEADLINE MODAL */}
      {deadlineModalOpen && (
        <div className="modal-overlay show" onClick={() => setDeadlineModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>📅 Extend Deadline</h3>
              <span className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setDeadlineModalOpen(false)}>✕</span>
            </div>
            <div className="mb-3">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                New Registration Deadline:
              </label>
              <input
                type="datetime-local"
                className="form-control"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
              />
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button className="btn btn-ghost btn-sm" onClick={() => setDeadlineModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="btn btn-yellow btn-sm" onClick={handleSaveDeadline} disabled={!newDeadline} type="button">
                Save Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLARE WINNER MODAL */}
      {winnerModalOpen && (
        <div className="modal-overlay show" onClick={() => setWinnerModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>👑 Directly Announce Winner</h3>
              <span className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setWinnerModalOpen(false)}>✕</span>
            </div>
            {candidateEntrants.length > 0 && (
              <div className="mb-3">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                  Select Entrant:
                </label>
                <select
                  className="form-control"
                  onChange={(e) => setWinnerNameInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
                >
                  <option value="">-- Choose Entrant --</option>
                  {candidateEntrants.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-3">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Or Enter Winner Name:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Shadow Vanguard"
                value={winnerNameInput}
                onChange={(e) => setWinnerNameInput(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
              />
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button className="btn btn-ghost btn-sm" onClick={() => setWinnerModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirmWinner} disabled={!winnerNameInput.trim()} type="button">
                Declare Winner & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL TOURNAMENT MODAL */}
      {cancelModalOpen && (
        <div className="modal-overlay show" onClick={() => setCancelModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', color: '#f87171' }}>🛑 Cancel Tournament</h3>
              <span className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setCancelModalOpen(false)}>✕</span>
            </div>
            <div className="mb-3">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Reason (optional):
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Insufficient entrants / Rescheduled"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid var(--border-primary)' }}
              />
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button className="btn btn-ghost btn-sm" onClick={() => setCancelModalOpen(false)} type="button">
                Back
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleConfirmCancel} type="button">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TournamentOrganizerPanel;
