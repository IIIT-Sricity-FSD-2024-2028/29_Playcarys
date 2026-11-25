import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import notificationsApi from '../../services/endpoints/notificationsApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const notificationsAdapter = createEntityAdapter({
  selectId: (notification) => String(notification.id)
});

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.getNotifications(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch notifications'));
    }
  }
);

export const fetchUserNotifications = createAsyncThunk(
  'notifications/fetchUserNotifications',
  async ({ userId, roleName }, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.getUserNotifications(userId, roleName);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch user notifications'));
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async ({ userId, roleName }, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.getUnreadCount(userId, roleName);
      return typeof data === 'number' ? data : (data?.count || data?.unread_count || 0);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch unread count'));
    }
  }
);

export const fetchDirectory = createAsyncThunk(
  'notifications/fetchDirectory',
  async (viewerId, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.getDirectory(viewerId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch directory'));
    }
  }
);

export const fetchThread = createAsyncThunk(
  'notifications/fetchThread',
  async (parentId, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.getThread(parentId);
      return { parentId: String(parentId), messages: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch thread'));
    }
  }
);

export const sendNotification = createAsyncThunk(
  'notifications/sendNotification',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.sendNotification(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send notification'));
    }
  }
);

export const replyToNotification = createAsyncThunk(
  'notifications/reply',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await notificationsApi.replyToNotification(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send reply'));
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async ({ id, audience, read = true }, { rejectWithValue }) => {
    try {
      const notification = await notificationsApi.markAsRead(id, audience, read);
      return { id: String(id), read, notification };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to mark notification read'));
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (audience, { rejectWithValue }) => {
    try {
      await notificationsApi.markAllAsRead(audience);
      return audience;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to mark all read'));
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async ({ id, audience }, { rejectWithValue }) => {
    try {
      await notificationsApi.deleteNotification(id, audience);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete notification'));
    }
  }
);

const initialState = notificationsAdapter.getInitialState({
  unreadCount: 0,
  directory: [],
  activeThread: null,
  threadMessages: [],
  ...initialAsyncState
});

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setActiveThread(state, action) {
      state.activeThread = action.payload;
    },
    clearNotificationsError(state) {
      state.error = null;
    },
    resetNotificationsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        handleFulfilled(state);
        notificationsAdapter.setAll(state, action.payload);
        state.unreadCount = action.payload.filter((n) => !n.is_read && !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchUserNotifications
      .addCase(fetchUserNotifications.fulfilled, (state, action) => {
        notificationsAdapter.setAll(state, action.payload);
        state.unreadCount = action.payload.filter((n) => !n.is_read && !n.read).length;
      })
      // fetchUnreadCount
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // fetchDirectory
      .addCase(fetchDirectory.fulfilled, (state, action) => {
        state.directory = action.payload;
      })
      // fetchThread
      .addCase(fetchThread.fulfilled, (state, action) => {
        state.threadMessages = action.payload.messages;
      })
      // sendNotification
      .addCase(sendNotification.fulfilled, (state, action) => {
        if (action.payload) {
          notificationsAdapter.addOne(state, action.payload);
        }
      })
      // replyToNotification
      .addCase(replyToNotification.fulfilled, (state, action) => {
        if (action.payload) {
          notificationsAdapter.upsertOne(state, action.payload);
          state.threadMessages = [action.payload, ...(action.payload.replies || [])];
        }
      })
      // markNotificationRead
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const { id, read, notification } = action.payload;
        const n = state.entities[id];
        const wasUnread = n && !n.is_read && !n.read;
        if (notification) {
          notificationsAdapter.upsertOne(state, notification);
        } else if (n) {
          n.is_read = read;
          n.read = read;
        }
        if (wasUnread && read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (!wasUnread && !read) {
          state.unreadCount += 1;
        }
      })
      // markAllNotificationsRead
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        Object.values(state.entities).forEach((n) => {
          if (n) {
            n.is_read = true;
            n.read = true;
          }
        });
        state.unreadCount = 0;
      })
      // deleteNotification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        notificationsAdapter.removeOne(state, action.payload);
      });
  }
});

export const { setActiveThread, clearNotificationsError, resetNotificationsStatus } =
  notificationSlice.actions;

export default notificationSlice.reducer;
