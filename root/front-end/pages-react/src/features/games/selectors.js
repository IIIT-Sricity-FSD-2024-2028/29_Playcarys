import { gamesAdapter } from './gameSlice';

const gamesSelectors = gamesAdapter.getSelectors((state) => state.games);

export const selectAllGames = gamesSelectors.selectAll;
export const selectGameById = (state, id) => gamesSelectors.selectById(state, String(id));
export const selectGameEntities = gamesSelectors.selectEntities;
export const selectGamesTotal = gamesSelectors.selectTotal;

export const selectGamesStatus = (state) => state.games?.status;
export const selectGamesError = (state) => state.games?.error;
export const selectSelectedGameId = (state) => state.games?.selectedGameId;

export const selectApprovedGames = (state) => {
  const all = gamesSelectors.selectAll(state);
  return all.filter((g) => (g.status === 'approved' || g.game_approval_status === 'approved') && g.enabled !== false);
};

export const selectGameReview = (state, gameId) => state.gameReview?.reviewsById[String(gameId)];
export const selectScanManifest = (state, gameId) => state.gameReview?.manifestsById[String(gameId)];
export const selectGameSave = (state, gameId) => state.gameSaves?.savesByGameId[String(gameId)];

export const selectGameAchievements = (state, gameId) => state.achievements?.achievementsByGameId[String(gameId)] || [];
export const selectPlayerAchievements = (state) => state.achievements?.playerAchievements || [];
export const selectPendingAchievements = (state) => state.achievements?.pendingAchievements || [];
