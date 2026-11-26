import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const notificationsApi = {
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.userId != null) query.append('userId', params.userId);
    if (params.roleName) query.append('roleName', params.roleName);
    const qs = query.toString();
    const res = await api.get(`/notifications${qs ? `?${qs}` : ''}`);
    return normalizeList(res);
  },

  async getUserNotifications(userId, roleName) {
    return this.getNotifications({ userId, roleName });
  },

  async getUnreadCount(userId, roleName) {
    return api.get(`/notifications/unread-count?userId=${encodeURIComponent(userId)}&roleName=${encodeURIComponent(roleName)}`);
  },

  async getDirectory(viewerId) {
    const res = await api.get(`/notifications/directory?viewerId=${encodeURIComponent(viewerId)}`);
    return normalizeList(res, ['user_id']);
  },

  async getThread(parentId) {
    const notification = normalizeEntity(await api.get(`/notifications/${parentId}`));
    return [notification, ...(notification?.replies || [])];
  },

  async sendNotification(dto) {
    const res = await api.post('/notifications', dto);
    return normalizeEntity(res);
  },

  async replyToNotification(dto) {
    const { notificationId, ...body } = dto;
    const res = await api.post(`/notifications/${notificationId}/reply`, body);
    return normalizeEntity(res);
  },

  async markAsRead(id, audience, read = true) {
    return api.patch(`/notifications/${id}/read`, { ...audience, read });
  },

  async markAllAsRead(audience) {
    return api.patch('/notifications/mark-all-read', audience);
  },

  async deleteNotification(id, audience) {
    return api.request(`/notifications/${id}`, 'DELETE', audience);
  }
};

export default notificationsApi;
