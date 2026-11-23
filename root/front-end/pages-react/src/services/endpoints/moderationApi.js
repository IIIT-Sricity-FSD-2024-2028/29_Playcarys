import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const moderationApi = {
  // Reports
  async getReports() {
    const res = await api.get('/reports');
    return normalizeList(res);
  },

  async getReportById(id) {
    const res = await api.get(`/reports/${id}`);
    return normalizeEntity(res);
  },

  async createReport(dto) {
    const res = await api.post('/reports', dto);
    return normalizeEntity(res);
  },

  async updateReportStatus(id, status) {
    const res = await api.patch(`/reports/${id}/status`, { status });
    return normalizeEntity(res);
  },

  // Moderator actions
  async getActions() {
    const res = await api.get('/moderator-actions');
    return normalizeList(res, ['action_id']);
  },

  async getActiveBans() {
    const res = await api.get('/moderator-actions/bans');
    return normalizeList(res, ['ban_id', 'action_id']);
  },

  async getPlayerActions(playerId) {
    const res = await api.get(`/moderator-actions/player/${playerId}`);
    return normalizeList(res, ['action_id']);
  },

  async issueWarning(dto) {
    const res = await api.post('/moderator-actions/warn', dto);
    return normalizeEntity(res, ['action_id']);
  },

  async banPlayer(dto) {
    const res = await api.post('/moderator-actions/ban', dto);
    return normalizeEntity(res, ['ban_id', 'action_id']);
  },

  async liftBan(id) {
    const res = await api.post(`/moderator-actions/bans/${id}/lift`);
    return normalizeEntity(res, ['ban_id', 'action_id']);
  }
};

export default moderationApi;
