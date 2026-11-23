export const selectPlatformStatus = (state) => state.platform?.statusData;
export const selectPlatformSettings = (state) => state.platform?.systemSettings || {};
export const selectPlatformLoading = (state) => state.platform?.status === 'loading';

export const selectAnalyticsMetrics = (state) => state.analytics?.metrics;
export const selectAnalyticsLoading = (state) => state.analytics?.status === 'loading';

export const selectAuditLogs = (state) => state.audit?.logs || [];
export const selectAuditLoading = (state) => state.audit?.status === 'loading';
