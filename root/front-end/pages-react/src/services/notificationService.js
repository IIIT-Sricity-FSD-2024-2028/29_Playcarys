import api from './api';

export const notificationService = {
  /**
   * Fetch all notifications for the given user and role from the backend.
   * Direct messages + role broadcasts.
   */
  async getNotifications(userId, roleName = 'player') {
    const uid = parseInt(userId, 10);
    const role = roleName || 'player';
    return await api.get(`/notifications?userId=${uid}&roleName=${encodeURIComponent(role)}`);
  },

  /**
   * Fetch unread notifications count for the given user and role.
   */
  async getUnreadCount(userId, roleName = 'player') {
    const uid = parseInt(userId, 10);
    const role = roleName || 'player';
    const res = await api.get(`/notifications/unread-count?userId=${uid}&roleName=${encodeURIComponent(role)}`);
    return res?.unread_count ?? 0;
  },

  /**
   * Mark a single notification as read or unread.
   * PATCH /notifications/:id/read
   */
  async markAsRead(id, userId, roleName = 'player', read = true) {
    const notifId = parseInt(id, 10);
    const uid = parseInt(userId, 10);
    const role = roleName || 'player';
    return await api.patch(`/notifications/${notifId}/read`, {
      userId: uid,
      roleName: role,
      read: Boolean(read)
    });
  },

  /**
   * Mark all notifications as read for the user and role.
   * PATCH /notifications/mark-all-read
   */
  async markAllAsRead(userId, roleName = 'player') {
    const uid = parseInt(userId, 10);
    const role = roleName || 'player';
    return await api.patch('/notifications/mark-all-read', {
      userId: uid,
      roleName: role
    });
  },

  /**
   * Reply on a direct notification (stored on the notification's thread).
   * POST /notifications/:id/reply
   */
  async reply(id, fromUserId, fromName, msg) {
    return await api.post(`/notifications/${parseInt(id, 10)}/reply`, {
      fromUserId: parseInt(fromUserId, 10),
      from: fromName,
      msg
    });
  },

  /**
   * Delete a direct notification (only allowed for direct messages to user).
   * DELETE /notifications/:id
   */
  async deleteNotification(id, userId, roleName = 'player') {
    const notifId = parseInt(id, 10);
    const uid = parseInt(userId, 10);
    const role = roleName || 'player';
    // DELETE accepts body in api client or query params
    return await api.request(`/notifications/${notifId}`, 'DELETE', {
      userId: uid,
      roleName: role
    });
  }
};

export default notificationService;
