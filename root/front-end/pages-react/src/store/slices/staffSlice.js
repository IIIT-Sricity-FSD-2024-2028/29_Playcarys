import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

/**
 * Thunk: staff/fetchInbox
 * Fetches notifications and messages for staff members.
 */
export const fetchStaffInbox = createAsyncThunk(
  'staff/fetchInbox',
  async (userId, { rejectWithValue }) => {
    try {
      const endpoint = userId ? `/notifications?recipient_id=${userId}` : '/notifications';
      const data = await api.get(endpoint);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch staff inbox'));
    }
  }
);

/**
 * Thunk: staff/markNotificationRead
 * Marks a notification as read in the backend.
 */
export const markNotificationRead = createAsyncThunk(
  'staff/markNotificationRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      return notificationId;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to mark notification as read'));
    }
  }
);

/**
 * Thunk: staff/sendMessage
 * Dispatches an internal staff notification/message.
 */
export const sendStaffMessage = createAsyncThunk(
  'staff/sendMessage',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/notifications', payload);
      return res;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send staff message'));
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  directory: null,
  activeThread: null,
  ...initialAsyncState
};

export const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    setActiveThread(state, action) {
      state.activeThread = action.payload;
    },
    clearStaffError(state) {
      state.error = null;
    },
    resetStaffStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    },
    resetStaffState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchStaffInbox
      .addCase(fetchStaffInbox.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchStaffInbox.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => !n.is_read && !n.read).length;
      })
      .addCase(fetchStaffInbox.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // markNotificationRead
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const id = action.payload;
        const item = state.notifications.find((n) => (n.notification_id || n.id) === id);
        if (item) {
          item.is_read = true;
          item.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // sendStaffMessage
      .addCase(sendStaffMessage.pending, (state) => {
        handlePending(state);
      })
      .addCase(sendStaffMessage.fulfilled, (state, action) => {
        handleFulfilled(state);
        if (action.payload) {
          state.notifications.unshift(action.payload);
        }
      })
      .addCase(sendStaffMessage.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const {
  setActiveThread,
  clearStaffError,
  resetStaffStatus,
  resetStaffState
} = staffSlice.actions;

// Selectors
export const selectStaffNotifications = (state) => state.staff.notifications;
export const selectStaffUnreadCount = (state) => state.staff.unreadCount;
export const selectStaffDirectory = (state) => state.staff.directory;
export const selectActiveThread = (state) => state.staff.activeThread;
export const selectStaffStatus = (state) => state.staff.status;
export const selectStaffError = (state) => state.staff.error;

export default staffSlice.reducer;

