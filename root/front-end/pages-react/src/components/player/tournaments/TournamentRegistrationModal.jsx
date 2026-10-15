import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import {
  tournamentService,
  seedOf,
  myTeamsIn
} from '../../../services/tournamentService';
import { formatDate, sameId } from '../../../services/playerService';

export function TournamentRegistrationModal({
  tournament,
  userId,
  db,
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const t = tournament;
  const isTeam = !!(t && t.team_size);

  if (!isOpen || !t) return null;

  // Fetch or resolve user's teams when modal opens for team tournament
  useEffect(() => {
    if (!isOpen || !t || !isTeam) return;

    let isMounted = true;
    setLoadingTeams(true);

    api
      .get(`/teams?playerId=${parseInt(userId, 10)}`)
      .then((data) => {
        if (!isMounted) return;
        const myTeamsList = Array.isArray(data) ? data : db.teams || [];
        setTeams(myTeamsList);
        const eligible = myTeamsList.filter(
          (team) =>
            team.member_ids?.length === t.team_size &&
            Number(team.captain_id) === parseInt(userId, 10)
        );
        if (eligible.length > 0) {
          setSelectedTeamId(String(eligible[0].team_id));
        }
        setLoadingTeams(false);
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = (db.teams || []).filter((tm) =>
          (tm.member_ids || []).some((m) => sameId(m, userId))
        );
        setTeams(fallback);
        const eligible = fallback.filter(
          (team) =>
            team.member_ids?.length === t.team_size &&
            Number(team.captain_id) === parseInt(userId, 10)
        );
        if (eligible.length > 0) {
          setSelectedTeamId(String(eligible[0].team_id));
        }
        setLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, t, isTeam, userId, db]);

  if (!isOpen || !t) return null;

  const u = (db.users || []).find((user) => sameId(user.id || user.user_id, userId));
  const username = u?.username || u?.user_name || 'You';
  const avatar = u?.avatar || '🎮';
  const wins = u?.wins || 0;
  const losses = u?.losses || 0;

  // Team state calculations
  const myTeamIds = new Set(teams.map((tm) => String(tm.team_id)));
  const alreadyIn = isTeam
    ? (db.team_tournament || []).find(
        (r) =>
          sameId(r.tournament_id, t.tournament_id || t.id) &&
          myTeamIds.has(String(r.team_id))
      )
    : null;

  const eligibleTeams = isTeam
    ? teams.filter(
        (team) =>
          team.member_ids?.length === t.team_size &&
          Number(team.captain_id) === parseInt(userId, 10)
      )
    : [];

  const groupTag = t.group_id != null
    ? (db.groups || []).find((g) => Number(g.group_id) === Number(t.group_id))
    : null;

  async function handleRegister() {
    setSubmitting(true);
    try {
      if (isTeam) {
        if (!selectedTeamId) {
          throw new Error('Please select a team.');
        }
        await tournamentService.registerTeam(
          t.tournament_id || t.id,
          selectedTeamId,
          userId
        );
        onShowToast('Team registered! 🏆 Good luck!', 'success');
      } else {
        await tournamentService.registerSolo(
          t.tournament_id || t.id,
          userId,
          inviteCode
        );
        onShowToast(`Registered for ${t.tournament_name || t.name}! 🏆 Good luck!`, 'success');
      }
      onSuccess();
      onClose();
    } catch (err) {
      onShowToast(err.message || 'Could not register for tournament.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="modal-overlay show"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        opacity: 1,
        pointerEvents: 'all',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        className="modal"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Confirm Registration</h3>
          <span className="modal-close" onClick={onClose}>
            ✕
          </span>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* Header Summary */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1rem'
            }}
          >
            <div
              style={{
                fontFamily: "'Orbitron', monospace",
                fontWeight: 700,
                marginBottom: '0.35rem',
                color: '#fff'
              }}
            >
              {t.tournament_name || t.name}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isTeam
                ? `Team tournament · teams of ${t.team_size}`
                : `${t.game || t.game_name || 'Game'} · ${formatDate(t.startDate || t.start_date)} · Prize: ${t.prize}`}
            </div>
            {groupTag && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--accent-yellow)',
                  marginTop: '0.2rem'
                }}
              >
                🛡️ {groupTag.name}
              </div>
            )}
          </div>

          {/* Body Content */}
          {isTeam ? (
            alreadyIn ? (
              <div
                className="alert alert-info"
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--accent-green)',
                  fontSize: '0.85rem'
                }}
              >
                <span>
                  ✅ Your team{' '}
                  <b>
                    {teams.find((tm) => String(tm.team_id) === String(alreadyIn.team_id))?.name ||
                      alreadyIn.team_id}
                  </b>{' '}
                  is already registered for this tournament.
                </span>
              </div>
            ) : !eligibleTeams.length ? (
              <div
                className="alert alert-info"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5
                }}
              >
                <span>
                  You need to <b>captain</b> a team with exactly <b>{t.team_size}</b> members to register.
                  Head to Teams to create or fill one out.
                </span>
              </div>
            ) : (
              <div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Register which of your teams?
                  </label>
                  <select
                    className="form-input"
                    id="reg-team-select"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem' }}
                  >
                    {eligibleTeams.map((team) => (
                      <option key={team.team_id} value={team.team_id}>
                        {team.name} ({team.member_ids?.length || t.team_size} members)
                      </option>
                    ))}
                  </select>
                </div>

                {t.visibility === 'private' && (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      🔒 Invite Code <span className="required" style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="e.g. 2N8JQR"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase', width: '100%' }}
                    />
                  </div>
                )}
              </div>
            )
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}
              >
                <div
                  className="avatar"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    color: '#fff'
                  }}
                >
                  {avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{username}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Global Seed #{seedOf(userId, db)} · {wins}W {losses}L
                  </div>
                </div>
              </div>

              {t.visibility === 'private' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    🔒 Invite Code <span className="required" style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    id="reg-invite-code"
                    placeholder="e.g. 2N8JQR"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', width: '100%' }}
                  />
                </div>
              )}

              <div
                className="alert alert-info"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  lineHeight: 1.45
                }}
              >
                ℹ️ By registering, you commit to participate on {formatDate(t.startDate || t.start_date)}.
                Registration closes {formatDate(t.regClose)}.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          {isTeam && alreadyIn ? (
            <button
              className="btn btn-purple"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          ) : isTeam && !eligibleTeams.length ? (
            <button
              className="btn btn-purple"
              onClick={() => {
                window.location.href = '/pages/player/community.html?tab=teams';
              }}
              type="button"
            >
              Manage My Teams →
            </button>
          ) : (
            <button
              className="btn btn-purple"
              id="confirm-reg-btn"
              onClick={handleRegister}
              disabled={submitting}
              type="button"
            >
              {submitting ? 'Registering…' : 'Confirm & Register'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TournamentRegistrationModal;
