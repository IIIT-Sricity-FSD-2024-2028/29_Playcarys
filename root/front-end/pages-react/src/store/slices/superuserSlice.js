import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { fetchPlatformStats, fetchRecentActivity } from '../../services/superuserService';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

/**
 * Thunk: superuser/fetchPlatformStats
 * Fetches real platform aggregated metrics directly from backend.
 */
export const fetchSuperuserPlatformStats = createAsyncThunk(
  'superuser/fetchPlatformStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await fetchPlatformStats();
      return stats;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch platform stats'));
    }
  }
);

/**
 * Thunk: superuser/fetchRecentActivity
 * Fetches recent system activities from backend.
 */
export const fetchSuperuserRecentActivity = createAsyncThunk(
  'superuser/fetchRecentActivity',
  async (_, { rejectWithValue }) => {
    try {
      const activity = await fetchRecentActivity();
      return Array.isArray(activity) ? activity : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch recent activity'));
    }
  }
);

/**
 * Thunk: superuser/fetchUsers
 * Fetches complete user registry for superuser oversight.
 */
export const fetchSuperuserUsers = createAsyncThunk(
  'superuser/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const users = await api.get('/users');
      return Array.isArray(users) ? users : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch users'));
    }
  }
);

/**
 * Thunk: superuser/fetchGames
 * Fetches platform-wide games.
 */
export const fetchSuperuserGames = createAsyncThunk(
  'superuser/fetchGames',
  async (_, { rejectWithValue }) => {
    try {
      const games = await api.get('/games');
      return Array.isArray(games) ? games : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch platform games'));
    }
  }
);

const initialState = {
  platformStats: null,
  users: [],
  admins: [],
  games: [],
  reports: [],
  recentActivity: [],
  systemSettings: {},
  ...initialAsyncState
};

export const superuserSlice = createSlice({
  name: 'superuser',
  initialState,
  reducers: {
    clearSuperuserError(state) {
      state.error = null;
    },
    resetSuperuserStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    },
    resetSuperuserState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchSuperuserPlatformStats
      .addCase(fetchSuperuserPlatformStats.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchSuperuserPlatformStats.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.platformStats = action.payload;
      })
      .addCase(fetchSuperuserPlatformStats.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchSuperuserRecentActivity
      .addCase(fetchSuperuserRecentActivity.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchSuperuserRecentActivity.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.recentActivity = action.payload;
      })
      .addCase(fetchSuperuserRecentActivity.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchSuperuserUsers
      .addCase(fetchSuperuserUsers.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchSuperuserUsers.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.users = action.payload;
      })
      .addCase(fetchSuperuserUsers.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchSuperuserGames
      .addCase(fetchSuperuserGames.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchSuperuserGames.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.games = action.payload;
      })
      .addCase(fetchSuperuserGames.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const {
  clearSuperuserError,
  resetSuperuserStatus,
  resetSuperuserState
} = superuserSlice.actions;

// Selectors
export const selectSuperuserStats = (state) => state.superuser.platformStats;
export const selectSuperuserUsers = (state) => state.superuser.users;
export const selectSuperuserAdmins = (state) => state.superuser.admins;
export const selectSuperuserGames = (state) => state.superuser.games;
export const selectSuperuserReports = (state) => state.superuser.reports;
export const selectSuperuserActivity = (state) => state.superuser.recentActivity;
export const selectSuperuserStatus = (state) => state.superuser.status;
export const selectSuperuserError = (state) => state.superuser.error;

export default superuserSlice.reducer;

