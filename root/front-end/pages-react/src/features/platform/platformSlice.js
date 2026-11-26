import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/endpoints/platformApi';
import * as superuserService from '../../services/superuserService';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchPlatformOverview = createAsyncThunk(
  'platform/fetchOverview',
  async ({ limit = 8, role } = {}, { rejectWithValue }) => {
    try {
      const [stats, activity, economy] = await Promise.all([
        superuserService.fetchPlatformStats(),
        superuserService.fetchRecentActivity(limit),
        role === 'superuser' ? superuserService.getPlatformEconomy() : Promise.resolve(null)
      ]);
      return { stats, activity, economy };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch platform overview'));
    }
  }
);

export const executeDangerZone = createAsyncThunk(
  'platform/executeDangerZone',
  async (actionKey, { rejectWithValue }) => {
    try {
      let result;
      if (actionKey === 'purge-sessions') {
        result = await superuserService.purgeSessions();
      } else if (actionKey === 'lift-bans') {
        result = await superuserService.liftAllBans();
      } else if (actionKey === 'archive-reports') {
        result = await superuserService.archiveAllReports();
      } else if (actionKey === 'reset-data') {
        result = await superuserService.clearActivityLog();
      }
      return { actionKey, result };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Danger zone action failed'));
    }
  }
);

export const fetchPlatformStatus = createAsyncThunk(
  'platform/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const data = await platformApi.getPlatformStatus();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch platform status'));
    }
  }
);

export const fetchPlatformSettings = createAsyncThunk(
  'platform/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await platformApi.getPlatformSettings();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch platform settings'));
    }
  }
);

export const updatePlatformSettings = createAsyncThunk(
  'platform/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const data = await platformApi.savePlatformSettings(settings);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update platform settings'));
    }
  }
);

const initialState = {
  statusData: null,
  systemSettings: {},
  overviewStats: null,
  overviewActivity: [],
  overviewEconomy: null,
  overviewStatus: AsyncStatus.IDLE,
  dangerZoneStatus: AsyncStatus.IDLE,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const platformSlice = createSlice({
  name: 'platform',
  initialState,
  reducers: {
    clearPlatformError(state) {
      state.error = null;
    },
    resetPlatformMutation(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchPlatformStatus ───────────────────────────────
      .addCase(fetchPlatformStatus.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlatformStatus.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.statusData = action.payload;
      })
      .addCase(fetchPlatformStatus.rejected, (state, action) => {
        handleRejected(state, action);
      })

      // ── fetchPlatformSettings ─────────────────────────────
      .addCase(fetchPlatformSettings.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlatformSettings.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.systemSettings = action.payload;
      })
      .addCase(fetchPlatformSettings.rejected, (state, action) => {
        handleRejected(state, action);
      })

      // ── updatePlatformSettings ────────────────────────────
      .addCase(updatePlatformSettings.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(updatePlatformSettings.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        state.systemSettings = { ...state.systemSettings, ...action.payload };
        if (
          action.payload.maintenanceMode !== undefined ||
          action.payload.registrationOpen !== undefined
        ) {
          state.statusData = { ...state.statusData, ...action.payload };
        }
      })
      .addCase(updatePlatformSettings.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || action.error?.message || 'Failed to update settings';
      })
      // ── fetchPlatformOverview ─────────────────────────────
      .addCase(fetchPlatformOverview.pending, (state) => {
        state.overviewStatus = AsyncStatus.LOADING;
      })
      .addCase(fetchPlatformOverview.fulfilled, (state, action) => {
        state.overviewStatus = AsyncStatus.SUCCEEDED;
        state.overviewStats = action.payload.stats;
        state.overviewActivity = action.payload.activity;
        state.overviewEconomy = action.payload.economy;
      })
      .addCase(fetchPlatformOverview.rejected, (state, action) => {
        state.overviewStatus = AsyncStatus.FAILED;
        state.error = action.payload || action.error?.message;
      })
      // ── executeDangerZone ─────────────────────────────────
      .addCase(executeDangerZone.pending, (state) => {
        state.dangerZoneStatus = AsyncStatus.LOADING;
      })
      .addCase(executeDangerZone.fulfilled, (state) => {
        state.dangerZoneStatus = AsyncStatus.SUCCEEDED;
      })
      .addCase(executeDangerZone.rejected, (state, action) => {
        state.dangerZoneStatus = AsyncStatus.FAILED;
        state.error = action.payload || action.error?.message;
      });
  }
});

export const { clearPlatformError, resetPlatformMutation } = platformSlice.actions;

export default platformSlice.reducer;
