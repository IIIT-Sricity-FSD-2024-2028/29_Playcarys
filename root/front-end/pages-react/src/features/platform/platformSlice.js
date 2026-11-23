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

const initialState = {
  statusData: null,
  systemSettings: {},
  ...initialAsyncState
};

export const platformSlice = createSlice({
  name: 'platform',
  initialState,
  reducers: {
    clearPlatformError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatformStatus.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlatformStatus.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.statusData = action.payload;
      })
      .addCase(fetchPlatformStatus.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const { clearPlatformError } = platformSlice.actions;

export default platformSlice.reducer;
