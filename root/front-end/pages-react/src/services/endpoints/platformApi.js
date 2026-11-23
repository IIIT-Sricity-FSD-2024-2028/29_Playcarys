import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const platformApi = {
  async getPlatformStatus() {
    return api.get('/platform-status');
  },

  async getAnalytics() {
    return api.get('/analytics');
  },

  async getAuditLog(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    const res = await api.get(`/audit-log${qs ? `?${qs}` : ''}`);
    return normalizeList(res, ['log_id']);
  },

  async postAuditLog(dto) {
    const res = await api.post('/audit-log', dto);
    return normalizeEntity(res, ['log_id']);
  },

  async exportDb() {
    return api.get('/db-export');
  },

  async importDb(delta) {
    return api.post('/db-import', delta);
  }
};

export default platformApi;
