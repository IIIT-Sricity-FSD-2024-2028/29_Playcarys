import { reportsAdapter } from './reportSlice';

const reportsSelectors = reportsAdapter.getSelectors((state) => state.reports);

export const selectAllReports = reportsSelectors.selectAll;
export const selectReportById = (state, id) => reportsSelectors.selectById(state, String(id));
export const selectReportsStatus = (state) => state.reports?.status;
export const selectReportsError = (state) => state.reports?.error;
export const selectActiveReport = (state) => state.reports?.activeReport;

export const selectModeratorActions = (state) => state.moderation?.actions || [];
export const selectActiveBans = (state) => state.moderation?.bans || [];
export const selectModerationStatus = (state) => state.moderation?.status;
export const selectModerationError = (state) => state.moderation?.error;
