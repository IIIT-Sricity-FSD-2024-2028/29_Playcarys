export const selectWalletBalance = (state) => state.wallet?.balance;
export const selectWalletTransactions = (state) => state.wallet?.transactions || [];
export const selectWalletStatus = (state) => state.wallet?.status;
export const selectWalletError = (state) => state.wallet?.error;

export const selectCatalogueItems = (state) => state.catalogue?.items || [];
export const selectCatalogueSkins = (state) => state.catalogue?.skins || [];
export const selectCatalogueStatus = (state) => state.catalogue?.status;
export const selectCatalogueError = (state) => state.catalogue?.error;

export const selectPublisherEarnings = (state, publisherId) =>
  state.payouts?.earningsByPublisher[String(publisherId)];
export const selectPayouts = (state) => state.payouts?.payouts || [];
