export const selectPlayerProfile = (state, userId) =>
  state.playerProfile?.profilesByUserId[String(userId)];
export const selectLeaderboard = (state) => state.playerProfile?.leaderboard || [];
export const selectPlayerProfileStatus = (state) => state.playerProfile?.status;
export const selectPlayerProfileError = (state) => state.playerProfile?.error;

export const selectPublisherProfile = (state, userId) =>
  state.publisherProfile?.profilesByUserId[String(userId)];
export const selectPublisherProfileStatus = (state) => state.publisherProfile?.status;
export const selectPublisherProfileError = (state) => state.publisherProfile?.error;

export const selectPlatforms = (state) => state.linkedAccounts?.platforms || [];
export const selectLinkedAccounts = (state, playerId) =>
  state.linkedAccounts?.accountsByPlayerId[String(playerId)] || [];
