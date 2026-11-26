import api from '../api';
import { normalizeEntity, normalizeAuditLog } from './normalize';

export const platformApi = {
  async getPlatformStatus() {
    return api.get('/platform-status');
  },

  async getPlatformSettings() {
    const res = await api.get('/db-export?tables=settings');
    return res?.settings || {};
  },

  async savePlatformSettings(settings) {
    await api.post('/db-import', { settings });
    return settings;
  },

  async getAnalytics() {
    return api.get('/analytics');
  },

  async getAuditLog(params = {}) {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.limit) query.append('limit', params.limit);
    const qs = query.toString();
    const res = await api.get(`/audit-log${qs ? `?${qs}` : ''}`);
    return Array.isArray(res) ? res.map(normalizeAuditLog) : [];
  },

  async postAuditLog(dto) {
    const res = await api.post('/audit-log', dto);
    return normalizeAuditLog(res);
  },

  async clearAuditLog() {
    return api.delete('/audit-log');
  },

  async exportDb(tables) {
    const query = tables ? `?tables=${encodeURIComponent(tables)}` : '';
    return api.get(`/db-export${query}`);
  },

  async importDb(delta) {
    return api.post('/db-import', delta);
  }
};

export default platformApi;
