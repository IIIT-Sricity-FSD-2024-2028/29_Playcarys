import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const notificationsApi = {
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.recipient_id) query.append('recipient_id', params.recipient_id);
    if (params.type) query.append('type', params.type);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    const res = await api.get(`/notifications${qs ? `?${qs}` : ''}`);
    return normalizeList(res);
  },

  async getUserNotifications(userId) {
    const res = await api.get(`/notifications/user/${userId}`);
    return normalizeList(res);
  },

  async getUnreadCount(userId) {
    if (userId) {
      return api.get(`/notifications/unread-count/${userId}`);
    }
    return api.get('/notifications/unread-count');
  },

  async getDirectory() {
    const res = await api.get('/notifications/directory');
    return normalizeList(res, ['user_id']);
  },

  async getThread(parentId) {
    const res = await api.get(`/notifications/thread/${parentId}`);
    return normalizeList(res);
  },

  async sendNotification(dto) {
    const res = await api.post('/notifications', dto);
    return normalizeEntity(res);
  },

  async replyToNotification(dto) {
    const res = await api.post('/notifications/reply', dto);
    return normalizeEntity(res);
  },

  async markAsRead(id) {
    await api.patch(`/notifications/${id}/read`);
    return { id: String(id) };
  },

  async markAllAsRead(userId) {
    await api.post('/notifications/mark-all-read', { user_id: userId });
    return { userId: String(userId) };
  },

  async deleteNotification(id) {
    await api.delete(`/notifications/${id}`);
    return { id: String(id) };
  }
};

export default notificationsApi;
