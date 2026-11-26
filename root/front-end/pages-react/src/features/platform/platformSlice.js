import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import platformApi from '../../services/endpoints/platformApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

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
      });
  }
});

export const { clearPlatformError, resetPlatformMutation } = platformSlice.actions;

export default platformSlice.reducer;
