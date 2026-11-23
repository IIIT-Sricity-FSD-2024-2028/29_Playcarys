import { sessionsAdapter } from './gameSessionSlice';

const sessionsSelectors = sessionsAdapter.getSelectors((state) => state.gameSessions);

export const selectAllSessions = sessionsSelectors.selectAll;
export const selectSessionById = (state, id) => sessionsSelectors.selectById(state, String(id));
export const selectSessionsStatus = (state) => state.gameSessions?.status;
export const selectSessionsError = (state) => state.gameSessions?.error;

export const selectPlayerMatchResults = (state, playerId) =>
  state.matchResults?.resultsByPlayerId[String(playerId)] || [];
export const selectTopScorers = (state) => state.matchResults?.topScorers || [];
