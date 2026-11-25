export const selectPlatformStatus = (state) => state.platform?.statusData || null;
export const selectPlatformSettings = (state) => state.platform?.systemSettings || {};
export const selectPlatformStateStatus = (state) => state.platform?.status;
export const selectPlatformError = (state) => state.platform?.error;
export const selectPlatformMutationStatus = (state) => state.platform?.mutationStatus;
export const selectPlatformMutationError = (state) => state.platform?.mutationError;

export const selectAnalyticsMetrics = (state) => state.analytics?.metrics || null;
export const selectAnalyticsStatus = (state) => state.analytics?.status;
export const selectAnalyticsError = (state) => state.analytics?.error;

export const selectAuditLogs = (state) => state.audit?.logs || [];
export const selectAuditStatus = (state) => state.audit?.status;
export const selectAuditError = (state) => state.audit?.error;
export const selectAuditMutationStatus = (state) => state.audit?.mutationStatus;
export const selectAuditMutationError = (state) => state.audit?.mutationError;
