import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchTournamentById } from '../../../features/tournaments/tournamentSlice';
import { selectAllTournaments } from '../../../features/tournaments/selectors';
import { sameId } from '../../../services/playerService';
import { kindOf, hasPrizeMoney, KIND_LABEL } from '../../../services/tournamentService';

export function JoinTournamentByIdModal({
  isOpen,
  onClose,
  onSelectTournament,
  onRegisterTournament,
  db,
  userId,
  onShowToast
}) {
  const dispatch = useAppDispatch();
  const allTournaments = useAppSelector(selectAllTournaments);
  const [tournamentIdInput, setTournamentIdInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [foundTournament, setFoundTournament] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTournamentIdInput('');
      setError('');
      setFoundTournament(null);
      setSearching(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanId = String(tournamentIdInput).trim().replace(/[^0-9]/g, '');
    if (!cleanId) {
      setError('Please enter a valid numeric Tournament ID.');
      setFoundTournament(null);
      return;
    }

    setError('');
    setSearching(true);
    setFoundTournament(null);

    // 1. Look in Redux store tournaments
    const local = allTournaments.find((t) => sameId(t.id || t.tournament_id, cleanId))
      || (db?.tournaments || []).find((t) => sameId(t.id || t.tournament_id, cleanId));
    if (local) {
      setFoundTournament(local);
      setSearching(false);
      return;
    }

    // 2. Fetch from backend via Redux thunk
    try {
      const data = await dispatch(fetchTournamentById(cleanId)).unwrap();
      if (data && (data.tournament_id || data.id)) {
        setFoundTournament(data);
      } else {
        setError(`Tournament #${cleanId} was not found.`);
      }
    } catch (err) {
      setError(err?.message || err || `Tournament #${cleanId} could not be found or does not exist.`);
    } finally {
      setSearching(false);
    }
  };

  const handleProceed = () => {
    if (!foundTournament) return;
    const tid = foundTournament.tournament_id || foundTournament.id;

    // Check if player is registered
    const regList = foundTournament.registeredPlayers || foundTournament.registered_player_ids || [];
    const isReg = regList.map(String).includes(String(userId));

    onSelectTournament(tid, foundTournament);

    if (foundTournament.status === 'completed') {
      if (onShowToast) onShowToast(`Opened completed tournament #${tid}`, 'info');
      onClose();
      return;
    }

    if (isReg) {
      if (onShowToast) onShowToast(`You are already registered for ${foundTournament.tournament_name || 'this tournament'}!`, 'info');
      onClose();
      return;
    }

    // If not registered, open the registration modal
    if (onRegisterTournament) {
      onRegisterTournament(foundTournament);
    }
    onClose();
  };

  const kind = foundTournament ? kindOf(foundTournament, db) : 'casual';
  const regList = foundTournament ? (foundTournament.registeredPlayers || foundTournament.registered_player_ids || []) : [];
  const isReg = regList.map(String).includes(String(userId));
  const max = foundTournament ? (foundTournament.maxParticipants || foundTournament.max_participants || 16) : 16;
  const entrants = foundTournament ? (foundTournament.participants != null ? foundTournament.participants : regList.length) : 0;

  return createPortal(
    <div
      className="modal-overlay show"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: 1,
        pointerEvents: 'all',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #121829)',
          border: '1px solid var(--border-primary, rgba(255, 255, 255, 0.12))',
          borderRadius: 'var(--radius-lg, 14px)',
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          animation: 'fadeIn 0.2s ease-out',
          color: 'var(--text-primary, #fff)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: "'Orbitron', monospace", color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯</span> Join Tournament by ID
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Enter any ID to join Official, Community, or Casual tournaments (Public or Private).
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.45rem' }}>
              Tournament ID <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 5, 8, #12"
                value={tournamentIdInput}
                onChange={(e) => {
                  setTournamentIdInput(e.target.value);
                  setError('');
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={searching || !tournamentIdInput.trim()}
                style={{ whiteSpace: 'nowrap', minWidth: '90px' }}
              >
                {searching ? 'Finding...' : '🔍 Find'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              color: '#f87171',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        {foundTournament && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-primary, rgba(255, 255, 255, 0.1))',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '1.1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                {foundTournament.tournament_name || foundTournament.name}
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--accent-cyan)' }}>
                ID: #{foundTournament.tournament_id || foundTournament.id}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span className={`kind-pill kind-pill-${kind}`} style={{ fontSize: '0.7rem' }}>
                {KIND_LABEL[kind] || '🎮 Tournament'}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '99px',
                  background: foundTournament.visibility === 'private' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: foundTournament.visibility === 'private' ? '#f87171' : '#60a5fa'
                }}
              >
                {foundTournament.visibility === 'private' ? '🔒 Private' : '🌐 Public'}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '99px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)'
                }}
              >
                {foundTournament.status ? foundTournament.status.toUpperCase() : 'UPCOMING'}
              </span>
              {hasPrizeMoney(foundTournament) && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '99px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--accent-yellow, #f59e0b)',
                    fontWeight: 600
                  }}
                >
                  🏆 {foundTournament.prize}
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>🎮 {foundTournament.game || foundTournament.game_name || 'Game'}</span>
              <span>👥 {entrants}/{max} {foundTournament.team_size ? 'teams' : 'players'}</span>
            </div>

            {isReg && (
              <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--accent-green, #10b981)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>✓</span> You are already registered for this tournament.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          {foundTournament && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleProceed}
            >
              {isReg
                ? 'Open Tournament →'
                : foundTournament.status === 'completed'
                  ? 'View Results →'
                  : 'Join Tournament →'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default JoinTournamentByIdModal;

