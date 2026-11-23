import { notificationsAdapter } from './notificationSlice';

const notifSelectors = notificationsAdapter.getSelectors((state) => state.notifications);

export const selectAllNotifications = notifSelectors.selectAll;
export const selectNotificationById = (state, id) => notifSelectors.selectById(state, String(id));
export const selectNotificationsTotal = notifSelectors.selectTotal;

export const selectUnreadCount = (state) => state.notifications?.unreadCount || 0;
export const selectNotificationsDirectory = (state) => state.notifications?.directory || [];
export const selectActiveThread = (state) => state.notifications?.activeThread;
export const selectThreadMessages = (state) => state.notifications?.threadMessages || [];
export const selectNotificationsStatus = (state) => state.notifications?.status;
export const selectNotificationsError = (state) => state.notifications?.error;
