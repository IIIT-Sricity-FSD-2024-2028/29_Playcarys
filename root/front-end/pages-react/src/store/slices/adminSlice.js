import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

/**
 * Thunk: admin/fetchDashboardStats
 * Fetches admin statistics from the backend.
 */
export const fetchAdminStats = createAsyncThunk(
  'admin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/admin/analytics').catch(async () => {
        // Fallback aggregate if dedicated analytics route is unavailable
        const [users, games] = await Promise.all([
          api.get('/users').catch(() => []),
          api.get('/games').catch(() => [])
        ]);
        return {
          totalUsers: Array.isArray(users) ? users.length : 0,
          totalGames: Array.isArray(games) ? games.length : 0
        };
      });
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch admin stats'));
    }
  }
);

/**
 * Thunk: admin/fetchUsers
 * Fetches list of users for administration.
 */
export const fetchAdminUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/users');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch admin users'));
    }
  }
);

/**
 * Thunk: admin/fetchPendingApprovals
 * Fetches games pending approval from publishers.
 */
export const fetchPendingApprovals = createAsyncThunk(
  'admin/fetchPendingApprovals',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/games?status=pending').catch(async () => {
        const all = await api.get('/games');
        return Array.isArray(all) ? all.filter((g) => g.status === 'pending' || g.approval_status === 'pending') : [];
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch pending approvals'));
    }
  }
);

const initialState = {
  stats: null,
  users: [],
  pendingApprovals: [],
  auditLogs: [],
  settings: {},
  gameReviewItem: null,
  ...initialAsyncState
};

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setGameReviewItem(state, action) {
      state.gameReviewItem = action.payload;
    },
    clearAdminError(state) {
      state.error = null;
    },
    resetAdminStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    },
    resetAdminState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchAdminStats
      .addCase(fetchAdminStats.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchAdminUsers
      .addCase(fetchAdminUsers.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.users = action.payload;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchPendingApprovals
      .addCase(fetchPendingApprovals.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.pendingApprovals = action.payload;
      })
      .addCase(fetchPendingApprovals.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const {
  setGameReviewItem,
  clearAdminError,
  resetAdminStatus,
  resetAdminState
} = adminSlice.actions;

// Selectors
export const selectAdminStats = (state) => state.admin.stats;
export const selectAdminUsers = (state) => state.admin.users;
export const selectPendingApprovals = (state) => state.admin.pendingApprovals;
export const selectAuditLogs = (state) => state.admin.auditLogs;
export const selectAdminSettings = (state) => state.admin.settings;
export const selectGameReviewItem = (state) => state.admin.gameReviewItem;
export const selectAdminStatus = (state) => state.admin.status;
export const selectAdminError = (state) => state.admin.error;

export default adminSlice.reducer;

