import { sessionsAdapter } from './gameSessionSlice';
import { AsyncStatus } from '../../app/asyncUtils';

const sessionsSelectors = sessionsAdapter.getSelectors((state) => state.gameSessions);

export const selectAllSessions = sessionsSelectors.selectAll;
export const selectSessionById = (state, id) =>
  id != null ? sessionsSelectors.selectById(state, String(id)) : undefined;
export const selectSessionsEntities = sessionsSelectors.selectEntities;
export const selectSessionsTotal = sessionsSelectors.selectTotal;

export const selectSessionsStatus = (state) =>
  state.gameSessions?.listStatus || state.gameSessions?.status || AsyncStatus.IDLE;
export const selectSessionsError = (state) =>
  state.gameSessions?.listError || state.gameSessions?.error || null;
export const selectSessionDetailStatus = (state) =>
  state.gameSessions?.detailStatus || AsyncStatus.IDLE;
export const selectSessionDetailError = (state) =>
  state.gameSessions?.detailError || null;
export const selectSessionsMutationStatus = (state) =>
  state.gameSessions?.mutationStatus || AsyncStatus.IDLE;
export const selectSessionsMutationError = (state) =>
  state.gameSessions?.mutationError || null;

export const selectPlayerMatchResults = (state, playerId) =>
  (playerId != null && state.matchResults?.resultsByPlayerId)
    ? state.matchResults.resultsByPlayerId[String(playerId)] || []
    : [];

export const selectSessionMatchResults = (state, sessionId) =>
  (sessionId != null && state.matchResults?.resultsBySessionId)
    ? state.matchResults.resultsBySessionId[String(sessionId)] || []
    : [];

export const selectSessionMatchResultsStatus = (state, sessionId) =>
  sessionId != null
    ? state.matchResults?.sessionResultsStatusById?.[String(sessionId)] || AsyncStatus.IDLE
    : AsyncStatus.IDLE;

export const selectSessionMatchResultsError = (state, sessionId) =>
  sessionId != null
    ? state.matchResults?.sessionResultsErrorById?.[String(sessionId)] || null
    : null;

export const selectTopScorers = (state) =>
  state.matchResults?.topScorers || [];

export const selectMatchResultsStatus = (state) =>
  state.matchResults?.fetchStatus || state.matchResults?.status || AsyncStatus.IDLE;

export const selectMatchResultsError = (state) =>
  state.matchResults?.fetchError || state.matchResults?.error || null;

// ── UI Selectors ─────────────────────────────────────────────

export const selectGameSessionUI = (state) =>
  state.gameSessions?.ui || {};

export const selectMatchResultUI = (state) =>
  state.matchResults?.ui || {};
