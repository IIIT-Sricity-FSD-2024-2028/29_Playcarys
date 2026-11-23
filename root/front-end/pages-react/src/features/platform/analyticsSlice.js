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

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const data = await platformApi.getAnalytics();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch analytics'));
    }
  }
);

const initialState = {
  metrics: null,
  ...initialAsyncState
};

export const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalyticsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.metrics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const { clearAnalyticsError } = analyticsSlice.actions;

export default analyticsSlice.reducer;
