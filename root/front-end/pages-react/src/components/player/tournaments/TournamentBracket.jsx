import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchTournamentBracket } from '../../../features/tournaments/tournamentPlaySlice';
import { fetchTournamentStages } from '../../../features/tournaments/tournamentSlice';
import {
  selectTournamentBracket,
  selectTournamentStages,
  selectTournamentPlayBracketStatus
} from '../../../features/tournaments/selectors';
import { entrantName, tournamentService } from '../../../services/tournamentService';
import { sameId } from '../../../services/playerService';

export function TournamentBracket({ tournament, db }) {
  const dispatch = useAppDispatch();
  const [selectedStageOrder, setSelectedStageOrder] = useState(1);

  const t = tournament;
  const tid = t?.tournament_id || t?.id;

  const reduxBracket = useAppSelector((state) => selectTournamentBracket(state, tid));
  const reduxStages = useAppSelector((state) => selectTournamentStages(state, tid));
  const bracketStatus = useAppSelector(selectTournamentPlayBracketStatus);

  useEffect(() => {
    if (!tid) return;
    dispatch(fetchTournamentBracket(tid));
    dispatch(fetchTournamentStages(tid));
  }, [dispatch, tid]);

  const rawStages = (Array.isArray(reduxStages) && reduxStages.length > 0)
    ? reduxStages
    : (Array.isArray(t?.games) && t.games.length > 0)
      ? t.games
      : (Array.isArray(t?.stages) && t.stages.length > 0)
        ? t.stages
        : (Array.isArray(t?.stage_games) && t.stage_games.length > 0)
          ? t.stage_games
          : (db?.tournament_games || []).filter((tg) => sameId(tg.tournament_id, tid));

  const isMultiTitle = (t?.tournament_name || t?.name || '').toLowerCase().includes('multi');
  let effectiveStages = rawStages;
  if (effectiveStages.length < 2 && (t?.type === 'multi' || isMultiTitle)) {
    const gList = db?.games || [];
    const chessG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('chess')) || gList[0] || { game_id: 7, game_name: 'Chess Pro' };
    const hextrisG = gList.find((g) => (g.game_name || g.name || '').toLowerCase().includes('hextris')) || gList[1] || { game_id: 8, game_name: 'Hextris' };
    effectiveStages = [
      { order: 1, stage_order: 1, stageId: chessG.game_id || 7, game_id: chessG.game_id || 7, game_name: chessG.game_name || chessG.name || 'Chess Pro', name: chessG.game_name || chessG.name || 'Chess Pro', format: 'bracket' },
      { order: 2, stage_order: 2, stageId: hextrisG.game_id || 8, game_id: hextrisG.game_id || 8, game_name: hextrisG.game_name || hextrisG.name || 'Hextris', name: hextrisG.game_name || hextrisG.name || 'Hextris', format: 'bracket' }
    ];
  }

  const isMultiStage = t?.type === 'multi' || isMultiTitle || effectiveStages.length > 1;

  const stageOptions = isMultiStage
    ? effectiveStages.map((s, idx) => {
      const order = s.stage_order || (idx + 1);
      const gObj = (db?.games || []).find((g) => sameId(g.game_id || g.id, s.game_id || s.gameId));
      const name = gObj?.game_name || gObj?.name || s.game_name || s.name || `Stage ${order}`;
      return { order, name, stageId: s.tournament_game_id || s.id || s.stageId || order, format: s.format || 'Knockout' };
    })
    : [];

  const bracketMatches = Array.isArray(reduxBracket)
    ? reduxBracket
    : Array.isArray(reduxBracket?.matches)
      ? reduxBracket.matches
      : (db?.tournament_matches || []).filter((m) => sameId(m.tournamentId, tid));

  const loading = bracketStatus === 'loading' && bracketMatches.length === 0;

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

  const matchesToDisplay = isMultiStage && stageOptions.length > 1
    ? (bracketMatches.some((m) => Number(m.stage_order) === Number(selectedStageOrder))
      ? bracketMatches.filter((m) => Number(m.stage_order) === Number(selectedStageOrder))
      : (Number(selectedStageOrder) === 1 ? bracketMatches : []))
    : bracketMatches;

  const rounds = [...new Set(matchesToDisplay.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div>
      {isMultiStage && stageOptions.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {stageOptions.map((st) => (
            <button
              key={st.order}
              type="button"
              className={`btn btn-sm ${selectedStageOrder === st.order ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedStageOrder(st.order)}
              style={{
                fontWeight: 700,
                borderRadius: '8px',
                padding: '0.4rem 0.9rem',
                border: selectedStageOrder === st.order ? 'none' : '1px solid rgba(255,255,255,0.15)'
              }}
            >
              🎮 Stage {st.order}: {st.name}
            </button>
          ))}
        </div>
      )}

      {matchesToDisplay.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
          <p style={{ margin: 0, marginBottom: '0.8rem' }}>No bracket matches generated yet for Stage {selectedStageOrder}.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              tournamentService.sanitizeTournamentMatches(tid);
              dispatch(fetchTournamentBracket(tid));
            }}
          >
            ⚡ Generate Stage {selectedStageOrder} Bracket Now
          </button>
        </div>
      ) : (
        <div className="bracket-scroll">
          {rounds.map((round) => {
            const roundMatches = matchesToDisplay.filter((m) => m.round === round);
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
                        className={`bracket-match ${isFinal ? 'final' : ''} ${m.status === 'completed' ? 'winner' : ''
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
      )}
    </div>
  );
}

export default TournamentBracket;
