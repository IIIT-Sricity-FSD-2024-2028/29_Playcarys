import React from 'react';
import { getStatusBadgeData } from '../../../services/publisherService';

export function TournamentMgmt({
  tournament,
  gameName = 'Chess',
  matches = [],
  users = [],
  onBack,
  onStartTournament,
  onAdvanceRound,
  onForceWinner,
  onExportResults
}) {
  if (!tournament) return null;

  const t = tournament;
  const statusInfo = getStatusBadgeData(t.status || 'upcoming');
  const isUpcoming = t.status === 'upcoming';
  const isCompleted = t.status === 'completed';

  function getUserName(id) {
    const u = users.find((x) => String(x.id || x.user_id) === String(id));
    return u?.user_name || u?.username || id || 'TBD';
  }

  return (
    <div id="mgmt-view">
      <div className="back-row" onClick={onBack}>
        ← Back to Hub
      </div>

      <div className="page-header" id="mgmt-header">
        <h1>Management: {t.tournament_name || t.name}</h1>
        <p className="text-muted">
          Status: <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span> · Game: {gameName}
        </p>
      </div>

      <div id="mgmt-controls" className="pub-section">
        {isUpcoming ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3>Ready to start?</h3>
              <p className="text-secondary text-sm">
                Once started, registration closes and the bracket is generated.
              </p>
            </div>
            <button
              className="btn btn-yellow btn-lg"
              onClick={onStartTournament}
            >
              🚀 Start Tournament Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3>Tournament Level: Round {t.currentRound || 1}</h3>
              <p className="text-secondary text-sm">
                Manage live matches and resolve disputes below.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isCompleted ? (
                <span className="badge badge-approved">Completed</span>
              ) : (
                <button
                  className="btn btn-purple btn-sm"
                  onClick={onAdvanceRound}
                >
                  Advance Next Round
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={onExportResults}
              >
                📝 Export Results
              </button>
            </div>
          </div>
        )}
      </div>

      <div id="mgmt-bracket" className="pub-section">
        <h3 className="mb-2">🎯 Bracket Management</h3>
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
                    {isLive && (
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
              Bracket not yet generated. Start the tournament to see matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TournamentMgmt;
