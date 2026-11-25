import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchTournamentLeaderboard } from '../../../features/tournaments/tournamentPlaySlice';
import { fetchRegistrations } from '../../../features/tournaments/registrationSlice';
import {
  selectTournamentLeaderboard,
  selectRegistrationsByTournament,
  selectTournamentPlayLeaderboardStatus,
  selectTournamentPlayLeaderboardError
} from '../../../features/tournaments/selectors';
import { seedOf, pcpOf, entrantCount } from '../../../services/tournamentService';
import { sameId } from '../../../services/playerService';

export function TournamentLeaderboard({ tournament, userId, db, isScoreContest }) {
  const dispatch = useAppDispatch();
  const t = tournament;
  const tid = t?.tournament_id || t?.id;
  const myUid = String(userId);

  const reduxLeaderboard = useAppSelector((state) => selectTournamentLeaderboard(state, tid));
  const reduxRegistrations = useAppSelector((state) => selectRegistrationsByTournament(state, tid));
  const status = useAppSelector(selectTournamentPlayLeaderboardStatus);
  const error = useAppSelector(selectTournamentPlayLeaderboardError);

  useEffect(() => {
    if (!tid) return;
    if (isScoreContest) {
      dispatch(fetchTournamentLeaderboard(tid));
    }
    dispatch(fetchRegistrations(tid));
  }, [dispatch, isScoreContest, tid]);

  const loading = status === 'loading' && !reduxLeaderboard;
  const leaderboardData = reduxLeaderboard;

  const max = t?.maxParticipants || t?.max_participants || 16;
  const isTeam = Boolean(t?.team_size);
  const unitLabel = isTeam ? 'Teams' : 'Players';

  // Comprehensive entrant discovery across Redux registrations, tournament DTO and fallback local storage
  const fromRedux = reduxRegistrations.map((r) => String(r.playerId || r.player_id || r.id));
  const fromPt = (db?.player_tournament || [])
    .filter((pt) => sameId(pt.tournament_id, tid))
    .map((pt) => String(pt.player_id));
  const fromReg = (t?.registeredPlayers || t?.registered_player_ids || []).map((p) =>
    typeof p === 'object' ? String(p.id || p.user_id) : String(p)
  );
  const allSoloPlayerIds = [...new Set([...fromRedux, ...fromPt, ...fromReg])].filter(Boolean);

  const registeredTeamRows = isTeam
    ? (db?.team_tournament || []).filter((tt) => sameId(tt.tournament_id, tid))
    : [];

  const rawCount = entrantCount(t, db);
  const registeredCount = t?.participants ?? (isTeam
    ? Math.max(rawCount, (t?.registered_team_ids || []).length, registeredTeamRows.length)
    : Math.max(rawCount, allSoloPlayerIds.length));

  const isFull = registeredCount >= max;
  const spotsRemaining = Math.max(0, max - registeredCount);

  // Common Header Card displaying Registered Players count
  const renderRegisteredSummaryCard = () => (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(139, 92, 246, 0.06))',
        border: '1px solid rgba(0, 212, 255, 0.22)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(0, 212, 255, 0.12)',
            border: '1px solid rgba(0, 212, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}
        >
          👥
        </div>
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--text-secondary)',
              marginBottom: '0.15rem'
            }}
          >
            Registered {unitLabel}
          </div>
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#fff',
              fontFamily: "'Orbitron', sans-serif",
              lineHeight: 1.1
            }}
          >
            <span style={{ color: 'var(--accent-cyan)' }}>{registeredCount}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
              {' '}/ {max} {unitLabel}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span
          className={`badge ${isFull ? 'badge-rejected' : 'badge-approved'}`}
          style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
        >
          {isFull ? 'Field Full' : `${spotsRemaining} Spots Available`}
        </span>
        {isTeam && t?.team_size && (
          <span
            className="badge badge-player"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
          >
            {t.team_size} Players / Squad
          </span>
        )}
        <span
          className={`badge badge-${
            t?.status === 'in-progress'
              ? 'progress'
              : t?.status === 'completed'
              ? 'approved'
              : t?.status === 'paused'
              ? 'waiting'
              : t?.status === 'cancelled'
              ? 'rejected'
              : 'upcoming'
          }`}
          style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
        >
          {t?.status === 'in-progress'
            ? 'In Progress'
            : t?.status === 'completed'
            ? 'Completed'
            : t?.status === 'paused'
            ? 'Paused'
            : t?.status === 'cancelled'
            ? 'Cancelled'
            : 'Registration Open'}
        </span>
      </div>
    </div>
  );

  // ── 1. SCORE CONTEST VIEW ───────────────────────────────────────
  if (isScoreContest) {
    if (loading) {
      return (
        <div>
          {renderRegisteredSummaryCard()}
          <p className="text-muted text-sm">Loading leaderboard…</p>
        </div>
      );
    }

    if (error && !leaderboardData) {
      return (
        <div>
          {renderRegisteredSummaryCard()}
          <p className="text-muted text-sm">Could not load remote leaderboard scores.</p>
        </div>
      );
    }

    const standings = leaderboardData?.standings || [];
    const unit = leaderboardData?.metric_unit || '';
    const rankEmojis = ['🥇', '🥈', '🥉'];

    // Merge registered players who haven't played yet into the participants view
    const standingPlayerIds = new Set(standings.map((s) => String(s.player_id)));
    const unplayedPlayers = allSoloPlayerIds
      .filter((pid) => !standingPlayerIds.has(String(pid)))
      .map((pid) => {
        const u = (db?.users || []).find((usr) => sameId(usr.id || usr.user_id, pid));
        return {
          player_id: pid,
          player_name: u?.user_name || u?.username || `Player #${pid}`,
          avatar: u?.avatar || '👤',
          played: false,
          attempts: 0,
          value: null
        };
      });

    const allEntrantsList = [...standings, ...unplayedPlayers];

    if (!allEntrantsList.length) {
      return (
        <div>
          {renderRegisteredSummaryCard()}
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md, 8px)'
            }}
          >
            No players registered yet. Be the first to join!
          </div>
        </div>
      );
    }

    return (
      <div className="score-leaderboard-wrap">
        {renderRegisteredSummaryCard()}

        <div
          style={{
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>
            Ranked by {leaderboardData?.metric_label || 'Score'} ·{' '}
            {leaderboardData?.direction === 'low' ? 'lowest' : 'highest'} wins
          </span>
          <span>
            {standings.filter((s) => s.played).length} of {registeredCount} participants scored
          </span>
        </div>

        {allEntrantsList.map((e, i) => {
          const isMe = sameId(e.player_id, myUid);
          const rankLabel = e.played ? (i < 3 ? rankEmojis[i] : `#${e.rank || i + 1}`) : '—';

          return (
            <div
              key={e.player_id || i}
              className={`player-seed-row ${isMe ? 'me-row' : ''}`}
            >
              <span
                className="seed-num"
                style={{
                  fontSize: i < 3 && e.played ? '1.2rem' : '0.85rem',
                  width: '32px'
                }}
              >
                {rankLabel}
              </span>

              <div
                className="avatar avatar-sm"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#fff'
                }}
              >
                {e.avatar || '?'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>
                  {e.player_name || 'Player'} {isMe && '⭐'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {e.played
                    ? `Best of ${e.attempts} attempt${e.attempts === 1 ? '' : 's'}`
                    : 'Registered · Has not submitted score yet'}
                </div>
              </div>

              <span
                style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: e.played ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                }}
              >
                {e.played ? `${e.value}${unit}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── 2. BRACKET / KNOCKOUT TEAM TOURNAMENT VIEW ─────────────────
  if (isTeam) {
    const teamsList = registeredTeamRows.map((tt) => {
      const teamObj = (db?.teams || []).find((tm) => sameId(tm.team_id, tt.team_id));
      const captainObj = (db?.users || []).find((u) => sameId(u.id || u.user_id, teamObj?.captain_id));
      const isMyTeam = (teamObj?.member_ids || []).some((m) => sameId(m, myUid));

      return {
        team_id: tt.team_id,
        name: teamObj?.name || `Team #${tt.team_id}`,
        captainName: captainObj?.user_name || captainObj?.username || 'Captain',
        memberCount: teamObj?.member_ids?.length || t?.team_size || 0,
        isMyTeam
      };
    });

    if (!teamsList.length) {
      return (
        <div>
          {renderRegisteredSummaryCard()}
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md, 8px)'
            }}
          >
            No teams registered yet. Captains can enter their squads!
          </div>
        </div>
      );
    }

    return (
      <div className="roster-wrap">
        {renderRegisteredSummaryCard()}

        <div
          style={{
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem'
          }}
        >
          Registered Squads & Rosters
        </div>

        {teamsList.map((tm, idx) => (
          <div
            key={tm.team_id || idx}
            className={`player-seed-row ${tm.isMyTeam ? 'me-row' : ''}`}
          >
            <span className="seed-num">#{idx + 1}</span>

            <div
              className="avatar avatar-sm"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: '#fff'
              }}
            >
              🛡️
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>
                {tm.name} {tm.isMyTeam && '⭐ (Your Team)'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Captain: {tm.captainName} · Roster: {tm.memberCount}/{t.team_size || tm.memberCount} members
              </div>
            </div>

            <span className="badge badge-player" style={{ fontSize: '0.72rem' }}>
              Squad Team
            </span>
          </div>
        ))}
      </div>
    );
  }

  // ── 3. BRACKET / KNOCKOUT SOLO VIEW ────────────────────────────
  if (!allSoloPlayerIds.length) {
    return (
      <div>
        {renderRegisteredSummaryCard()}
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md, 8px)'
          }}
        >
          No players registered yet. Be the first to join!
        </div>
      </div>
    );
  }

  const enriched = allSoloPlayerIds
    .map((pid) => {
      const u = (db?.users || []).find((user) => sameId(user.id || user.user_id, pid));
      return {
        uid: String(pid),
        user: u,
        pcp: pcpOf(pid, db),
        seed: seedOf(pid, db)
      };
    })
    .sort((a, b) => (Number(a.seed) || 999) - (Number(b.seed) || 999));

  return (
    <div className="roster-wrap">
      {renderRegisteredSummaryCard()}

      <div
        style={{
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          marginBottom: '0.75rem'
        }}
      >
        Registered Players & Seeding
      </div>

      {enriched.map((e, i) => {
        const isMe = sameId(e.uid, myUid);
        const localSeed = i + 1;
        const username = e.user?.username || e.user?.user_name || `Player #${e.uid}`;
        const avatar = e.user?.avatar || username.slice(0, 2).toUpperCase();

        return (
          <div
            key={e.uid}
            className={`player-seed-row ${isMe ? 'me-row' : ''}`}
          >
            <span className="seed-num">#{localSeed}</span>
            <div
              className="avatar avatar-sm"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#fff'
              }}
            >
              {avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>
                {username} {isMe && '⭐'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Global Seed #{e.seed}
              </div>
            </div>
            <span className="player-pcp-mini">{e.pcp} PCP</span>
          </div>
        );
      })}
    </div>
  );
}

export default TournamentLeaderboard;
