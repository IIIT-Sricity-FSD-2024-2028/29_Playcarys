import React from 'react';
import { getStatusBadgeData } from '../../../services/publisherService';

export function TournamentMultiMgmt({
  fest,
  stages = [],
  overall,
  games = [],
  onBack,
  onStartStage,
  onCompleteStage
}) {
  if (!fest) return null;

  const t = fest;
  const statusInfo = getStatusBadgeData(t.status || 'upcoming');
  const standings = overall?.standings || [];

  function getGameName(gid) {
    const g = games.find((x) => String(x.game_id || x.id) === String(gid));
    return g?.game_name || g?.title || `Game #${gid}`;
  }

  return (
    <div id="mgmt-multi-view">
      <div className="back-row" onClick={onBack}>
        ← Back to Hub
      </div>

      <div className="page-header" id="mgmt-multi-header">
        <h1>Management: {t.tournament_name || t.name}</h1>
        <p className="text-muted">
          <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span> · Multi-Game Fest ·{' '}
          {t.visibility === 'private' ? (
            <span>
              🔒 Private — invite code <b>{t.invite_code}</b>
            </span>
          ) : (
            <span>🌐 Public</span>
          )}
        </p>
      </div>

      <div className="pub-section">
        <h3 className="mb-2">🏅 Stages</h3>
        <div id="mgmt-multi-stages" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stages.length > 0 ? (
            stages.map((s) => {
              const gname = getGameName(s.game_id);
              const stageStatusInfo = getStatusBadgeData(s.status || 'pending');

              let action = null;
              if (s.status === 'pending') {
                action = (
                  <button
                    className="btn btn-yellow btn-sm"
                    onClick={() => onStartStage(s.tournament_game_id)}
                  >
                    🚀 Start Stage
                  </button>
                );
              } else if (s.status === 'active' && s.format === 'score') {
                action = (
                  <button
                    className="btn btn-purple btn-sm"
                    onClick={() => onCompleteStage(s.tournament_game_id)}
                  >
                    ✅ Close Stage
                  </button>
                );
              } else if (s.status === 'active') {
                action = <span className="badge badge-waiting">Bracket in progress</span>;
              } else {
                action = <span className="badge badge-approved">Completed</span>;
              }

              return (
                <div key={s.tournament_game_id || s.stage_order} className="tourn-card" style={{ padding: '1rem' }}>
                  <div className="stage-order-badge">{s.stage_order}</div>
                  <div className="tourn-info">
                    <div className="tourn-title">{gname}</div>
                    <div className="tourn-meta">
                      <span>
                        {s.format === 'score'
                          ? `📊 Score (${s.metric_label || s.metric || 'Score'})`
                          : '🎯 Bracket'}
                      </span>
                      <span>⚖️ Weight {s.points_weight}</span>
                      <span className={`badge ${stageStatusInfo.className}`}>{stageStatusInfo.label}</span>
                    </div>
                  </div>
                  <div>{action}</div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted p-3">No stages found.</div>
          )}
        </div>
      </div>

      <div className="pub-section">
        <h3 className="mb-2">🏆 Overall Leaderboard</h3>
        <div id="mgmt-multi-leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>
            {overall ? `${overall.stages_completed || 0}/${overall.stages_total || 0} stages completed ${overall.complete ? '— final standings' : '— provisional'}` : 'Leaderboard unavailable'}
          </div>

          {standings.length > 0 ? (
            standings.map((r, idx) => (
              <div key={r.rank || idx} className="tourn-card" style={{ padding: '0.7rem 1rem' }}>
                <div style={{ fontWeight: 800, width: '2rem' }}>#{r.rank}</div>
                <div className="tourn-info">
                  <div className="tourn-title" style={{ marginBottom: 0 }}>
                    {r.player_name}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--accent-yellow)' }}>
                  {r.points} pts
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted p-3">No entrants yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TournamentMultiMgmt;
