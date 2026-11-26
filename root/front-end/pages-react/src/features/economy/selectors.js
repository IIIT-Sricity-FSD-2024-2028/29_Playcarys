export const selectCatalogueItems = (state) => state.catalogue?.items || [];
export const selectCataloguePlans = (state) => state.catalogue?.plans || [];
export const selectCatalogueSubscription = (state) => state.catalogue?.subscription || null;
export const selectCatalogueSkins = (state) => state.catalogue?.skins || {};
export const selectCatalogueBalance = (state) =>
  state.catalogue?.balanceCarys ?? state.wallet?.balanceCarys ?? state.wallet?.balance?.carys_points ?? 0;
export const selectCatalogueStatus = (state) => state.catalogue?.status;
export const selectCatalogueError = (state) => state.catalogue?.error;
export const selectCatalogueMutationStatus = (state) => state.catalogue?.mutationStatus;
export const selectCatalogueMutationError = (state) => state.catalogue?.mutationError;

export const selectWalletBalance = (state) => state.wallet?.balance;
export const selectWalletCarys = (state) =>
  state.wallet?.balanceCarys ?? state.wallet?.balance?.carys_points ?? state.catalogue?.balanceCarys ?? 0;
export const selectWalletTransactions = (state) => state.wallet?.transactions || [];
export const selectWalletStatus = (state) => state.wallet?.status;
export const selectWalletError = (state) => state.wallet?.error;
export const selectWalletMutationStatus = (state) => state.wallet?.mutationStatus;
export const selectWalletMutationError = (state) => state.wallet?.mutationError;

export const selectPublisherEarnings = (state, publisherId) =>
  state.payouts?.earningsByPublisher[String(publisherId)];
export const selectPayouts = (state) => state.payouts?.payouts || [];
export const selectActivePayout = (state) => state.payouts?.activePayout || null;
export const selectPayoutStatus = (state) => state.payouts?.status;
export const selectPayoutError = (state) => state.payouts?.error;
export const selectPayoutMutationStatus = (state) => state.payouts?.mutationStatus;
export const selectPayoutMutationError = (state) => state.payouts?.mutationError;

