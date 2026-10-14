import React from 'react';
import {
  kindOf,
  entrantCount,
  isRegistered,
  myTeamsIn,
  KIND_LABEL
} from '../../../services/tournamentService';
import { formatDate } from '../../../services/playerService';

export function TournamentCard({
  tournament,
  userId,
  db,
  onSelect,
  onRegister,
  onWithdraw,
  withdrawingId
}) {
  const t = tournament;
  const rawTid = t.tournament_id || t.id;
  const tid = rawTid ? String(rawTid) : '';
  const isWithdrawing = Boolean(withdrawingId && sameId(withdrawingId, rawTid));
  const entrants = entrantCount(t, db);
  const max = t.maxParticipants || t.max_participants || 16;
  const pct = max ? Math.min(100, Math.round((entrants / max) * 100)) : 0;
  const reg = isRegistered(t, userId, db);
  const isLive = t.status === 'in-progress';
  const kind = kindOf(t, db);
  const isTeam = !!t.team_size;
  const regClosed = t.regClose ? new Date() > new Date(t.regClose) : false;
  const isFull = entrants >= max;

  const mine = isTeam ? myTeamsIn(t, userId, db) : [];
  const regLabel = isTeam && mine.length ? `✓ ${mine[0].name}` : '✓ Registered';

  function handleActionClick(e, type) {
    e.stopPropagation();
    if (type === 'withdraw') {
      if (isWithdrawing || !rawTid) return;
      onWithdraw(t);
    } else if (type === 'register') {
      onRegister(t);
    } else if (type === 'view') {
      onSelect(tid);
    }
  }

  let actionElement = null;
  if (t.status === 'upcoming' && reg) {
    actionElement = (
      <button
        className="tc-btn tc-btn-ghost"
        onClick={(e) => handleActionClick(e, 'withdraw')}
        disabled={isWithdrawing || !rawTid}
        type="button"
        style={isWithdrawing ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
      >
        {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
      </button>
    );
  } else if (t.status === 'upcoming' && isFull) {
    actionElement = <span className="tc-note">Field is full</span>;
  } else if (t.status === 'upcoming' && regClosed) {
    actionElement = <span className="tc-note">Registration closed</span>;
  } else if (t.status === 'upcoming') {
    actionElement = (
      <button
        className="tc-btn tc-btn-primary"
        onClick={(e) => handleActionClick(e, 'register')}
        type="button"
      >
        {isTeam ? 'Enter a Team' : 'Register'}
      </button>
    );
  } else if (isLive) {
    actionElement = (
      <button
        className="tc-btn tc-btn-live"
        onClick={(e) => handleActionClick(e, 'view')}
        type="button"
      >
        {reg ? '⚔️ My Match' : '👁 Watch'}
      </button>
    );
  } else if (t.status === 'completed') {
    actionElement = (
      <button
        className="tc-btn tc-btn-ghost"
        onClick={(e) => handleActionClick(e, 'view')}
        type="button"
      >
        Results
      </button>
    );
  }

  return (
    <div
      className={`tcard kind-${kind}`}
      onClick={() => onSelect(tid)}
    >
      <div className="tcard-emblem">{isTeam ? '⚔️' : isLive ? '🔥' : '🏆'}</div>

      <div className="tcard-body">
        <div className="tcard-head">
          {isLive && <span className="live-dot" />}
          <span className="tcard-title">{t.tournament_name || t.name || t.desc}</span>
          <span className={`kind-pill kind-pill-${kind}`}>{KIND_LABEL[kind]}</span>
          {isTeam && (
            <span className="kind-pill kind-pill-team">
              ⚔️ {t.team_size}v{t.team_size}
            </span>
          )}
          {reg && <span className="kind-pill kind-pill-reg">{regLabel}</span>}
        </div>

        <p className="tcard-desc">{t.desc || ''}</p>

        <div className="tcard-meta">
          <span>🎮 {t.game || 'Game'}</span>
          <span className="sep">·</span>
          <span>
            {isTeam ? '⚔️' : '👥'} {entrants}/{max} {isTeam ? 'teams' : 'players'}
          </span>
          <span className="sep">·</span>
          <span>📅 {formatDate(t.startDate || t.start_date)}</span>
          <span className="sep">·</span>
          <span className="tcard-prize">{t.prize || '—'}</span>
        </div>

        {t.status === 'upcoming' && (
          <div className="tcard-progress">
            <div className="tcard-bar">
              <div className="tcard-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="tcard-barlabel">
              {pct}% full · {regClosed ? 'registration closed' : `closes ${formatDate(t.regClose)}`}
            </span>
          </div>
        )}
      </div>

      <div className="tcard-action" onClick={(e) => e.stopPropagation()}>
        {actionElement}
      </div>
    </div>
  );
}

export default TournamentCard;
