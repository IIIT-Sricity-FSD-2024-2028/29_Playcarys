import React, { useState, useEffect } from 'react';
import { tournamentService, seedOf, pcpOf } from '../../../services/tournamentService';
import { sameId } from '../../../services/playerService';

export function TournamentLeaderboard({ tournament, userId, db, isScoreContest }) {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const t = tournament;
  const tid = t?.tournament_id || t?.id;
  const myUid = String(userId);

  useEffect(() => {
    if (!isScoreContest || !tid) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    tournamentService
      .fetchLeaderboard(tid)
      .then((data) => {
        if (!isMounted) return;
        setLeaderboardData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Could not load leaderboard.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isScoreContest, tid]);

  if (isScoreContest) {
    if (loading) {
      return <p className="text-muted text-sm">Loading…</p>;
    }

    if (error || !leaderboardData) {
      return <p className="text-muted text-sm">Could not load the leaderboard.</p>;
    }

    const standings = leaderboardData.standings || [];
    if (!standings.length) {
      return <p className="text-muted text-sm">No players registered yet. Be the first!</p>;
    }

    const unit = leaderboardData.metric_unit || '';
    const rankEmojis = ['🥇', '🥈', '🥉'];

    return (
      <div className="score-leaderboard-wrap">
        <div
          style={{
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem'
          }}
        >
          Ranked by {leaderboardData.metric_label || 'Score'} ·{' '}
          {leaderboardData.direction === 'low' ? 'lowest' : 'highest'} wins
        </div>

        {standings.map((e, i) => {
          const isMe = sameId(e.player_id, myUid);
          const rankLabel = e.played ? (i < 3 ? rankEmojis[i] : `#${e.rank}`) : '—';

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
                    : 'Has not played yet'}
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

  // Bracket / Knockout Roster view
  const pids = t.registeredPlayers || [];
  if (!pids.length) {
    return <p className="text-muted text-sm">No players registered yet. Be the first!</p>;
  }

  const enriched = pids
    .map((pid) => {
      const u = (db.users || []).find((user) => sameId(user.id || user.user_id, pid));
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
      {enriched.map((e, i) => {
        const isMe = sameId(e.uid, myUid);
        const localSeed = i + 1;
        const username = e.user?.username || e.user?.user_name || 'Unknown';
        const avatar = e.user?.avatar || '?';

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
                fontSize: '0.9rem',
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
