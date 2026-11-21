import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { fetchModeratorDashboardData } from '../../services/moderatorService';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

/**
 * Thunk: moderator/fetchDashboard
 * Fetches aggregated moderator dashboard data.
 */
export const fetchModeratorDashboard = createAsyncThunk(
  'moderator/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchModeratorDashboardData();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch moderator dashboard'));
    }
  }
);

/**
 * Thunk: moderator/fetchReports
 * Fetches user and game reports from the backend.
 */
export const fetchModeratorReports = createAsyncThunk(
  'moderator/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/reports');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch moderator reports'));
    }
  }
);

/**
 * Thunk: moderator/fetchBans
 * Fetches active player bans.
 */
export const fetchModeratorBans = createAsyncThunk(
  'moderator/fetchBans',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/moderator-actions/bans');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch active bans'));
    }
  }
);

/**
 * Thunk: moderator/fetchSessions
 * Fetches active player game sessions.
 */
export const fetchModeratorSessions = createAsyncThunk(
  'moderator/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/sessions');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch active sessions'));
    }
  }
);

const initialState = {
  stats: null,
  reports: [],
  sessions: [],
  bans: [],
  activeReport: null,
  ...initialAsyncState
};

export const moderatorSlice = createSlice({
  name: 'moderator',
  initialState,
  reducers: {
    setActiveReport(state, action) {
      state.activeReport = action.payload;
    },
    clearModeratorError(state) {
      state.error = null;
    },
    resetModeratorStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    },
    resetModeratorState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchModeratorDashboard
      .addCase(fetchModeratorDashboard.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchModeratorDashboard.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.stats = action.payload;
      })
      .addCase(fetchModeratorDashboard.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchModeratorReports
      .addCase(fetchModeratorReports.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchModeratorReports.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.reports = action.payload;
      })
      .addCase(fetchModeratorReports.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchModeratorBans
      .addCase(fetchModeratorBans.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchModeratorBans.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.bans = action.payload;
      })
      .addCase(fetchModeratorBans.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchModeratorSessions
      .addCase(fetchModeratorSessions.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchModeratorSessions.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.sessions = action.payload;
      })
      .addCase(fetchModeratorSessions.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const {
  setActiveReport,
  clearModeratorError,
  resetModeratorStatus,
  resetModeratorState
} = moderatorSlice.actions;

// Selectors
export const selectModeratorStats = (state) => state.moderator.stats;
export const selectModeratorReports = (state) => state.moderator.reports;
export const selectModeratorSessions = (state) => state.moderator.sessions;
export const selectModeratorBans = (state) => state.moderator.bans;
export const selectActiveReport = (state) => state.moderator.activeReport;
export const selectModeratorStatus = (state) => state.moderator.status;
export const selectModeratorError = (state) => state.moderator.error;

export default moderatorSlice.reducer;

