import React, { useState, useEffect } from 'react';
import { entrantName, tournamentService } from '../../../services/tournamentService';
import { sameId } from '../../../services/playerService';

export function TournamentBracket({ tournament, db }) {
  const [bracketMatches, setBracketMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const t = tournament;
  const tid = t?.tournament_id || t?.id;

  // Try fetching bracket from API, fallback to local DB matches
  useEffect(() => {
    if (!t) return;
    let isMounted = true;
    setLoading(true);

    tournamentService
      .fetchBracket(tid)
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setBracketMatches(data);
        } else {
          const local = (db.tournament_matches || []).filter((m) =>
            sameId(m.tournamentId, tid)
          );
          setBracketMatches(local);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        const local = (db.tournament_matches || []).filter((m) =>
          sameId(m.tournamentId, tid)
        );
        setBracketMatches(local);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [t, tid, db]);

  if (loading) {
    return <div style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Loading bracket…</div>;
  }

  if (!bracketMatches.length) {
    return (
      <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        Bracket not generated yet. Tournament must be started by the organizer.
      </div>
    );
  }

  const rounds = [...new Set(bracketMatches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="bracket-scroll">
      {rounds.map((round) => {
        const roundMatches = bracketMatches.filter((m) => m.round === round);
        const roundLabel = round === rounds.length ? 'Final' : `Round ${round}`;

        return (
          <div key={round} className="bracket-round">
            <div className="bracket-label">{roundLabel}</div>
            <div className="bracket-stage">
              {roundMatches.map((m, idx) => {
                const p1 = entrantName(t, m.player1, db);
                const p2 = entrantName(t, m.player2, db);
                const isFinal = round === rounds.length;
                const p1Winner = m.winnerId && sameId(m.winnerId, m.player1);
                const p2Winner = m.winnerId && sameId(m.winnerId, m.player2);

                return (
                  <div
                    key={m.match_id || m.id || idx}
                    className={`bracket-match ${isFinal ? 'final' : ''} ${
                      m.status === 'completed' ? 'winner' : ''
                    }`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.25rem 0',
                        borderBottom: '1px dashed var(--border-primary)',
                        color: p1Winner ? 'var(--accent-green)' : 'inherit',
                        fontWeight: p1Winner ? 700 : 400
                      }}
                    >
                      <span>{p1}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>{m.score1 ?? '—'}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.25rem 0',
                        color: p2Winner ? 'var(--accent-green)' : 'inherit',
                        fontWeight: p2Winner ? 700 : 400
                      }}
                    >
                      <span>{p2}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>{m.score2 ?? '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TournamentBracket;
