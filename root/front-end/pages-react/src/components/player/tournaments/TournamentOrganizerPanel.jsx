import React, { useState } from 'react';
import { entrantCount, tournamentService } from '../../../services/tournamentService';
import { sameId } from '../../../services/playerService';

export function TournamentOrganizerPanel({
  tournament,
  userId,
  db,
  onStarted,
  onShowToast
}) {
  const [starting, setStarting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const t = tournament;
  if (!t || !sameId(t.organizer || t.organizer_id, userId)) {
    return null;
  }

  const entrants = entrantCount(t, db);
  const isBracket = t.format === 'bracket';
  const min = isBracket ? 2 : 1;
  const ready = entrants >= min;
  const unit = t.team_size ? 'teams' : 'players';

  async function handleConfirmStart() {
    setStarting(true);
    try {
      await tournamentService.startTournament(t.tournament_id || t.id, userId);
      onShowToast(`${t.name} has started! 🚀`, 'success');
      setConfirmOpen(false);
      onStarted();
    } catch (err) {
      onShowToast(err.message || 'Could not start tournament.', 'error');
    } finally {
      setStarting(false);
    }
  }

  if (t.status === 'upcoming') {
    return (
      <>
        <div
          className="match-action-bar"
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            borderColor: 'rgba(139, 92, 246, 0.4)',
            animation: 'none'
          }}
        >
          <div>
            <h3 style={{ marginBottom: '0.15rem', color: '#fff', fontSize: '1.1rem' }}>
              🎛️ You're the organizer
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {ready
                ? isBracket
                  ? `Starting locks registration and generates the bracket from the ${entrants} ${unit} entered.`
                  : `Starting opens scoring — entrants can play and the leaderboard goes live.`
                : `You need at least ${min} ${unit} to start. ${entrants} so far.`}
            </p>
          </div>

          <button
            className="btn btn-lg"
            disabled={!ready || starting}
            style={{
              background: ready
                ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))'
                : 'rgba(255, 255, 255, 0.06)',
              color: '#fff',
              fontWeight: 800,
              border: 'none',
              padding: '0.75rem 1.5rem',
              opacity: ready ? 1 : 0.5,
              cursor: ready ? 'pointer' : 'not-allowed'
            }}
            onClick={() => setConfirmOpen(true)}
            type="button"
          >
            🚀 Start Tournament
          </button>
        </div>

        {confirmOpen && (
          <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <div className="modal-header">
                <h3 className="modal-title">Start Tournament</h3>
                <span className="modal-close" onClick={() => setConfirmOpen(false)}>✕</span>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Start <b>{t.name}</b>? Registration closes and this cannot be undone.
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)} type="button">
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
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
      </>
    );
  }

  if (t.status === 'in-progress') {
    return (
      <div
        className="match-action-bar"
        style={{
          background: 'rgba(139, 92, 246, 0.08)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
          animation: 'none'
        }}
      >
        <div>
          <h3 style={{ marginBottom: '0.15rem', color: '#fff', fontSize: '1.1rem' }}>
            🎛️ You're the organizer
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            This tournament is live. Disputed matches come to you to settle.
          </p>
        </div>
        <span className="badge badge-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          Running
        </span>
      </div>
    );
  }

  return null;
}

export default TournamentOrganizerPanel;
