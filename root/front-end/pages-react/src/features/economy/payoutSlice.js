import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import economyApi from '../../services/endpoints/economyApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchPublisherEarnings = createAsyncThunk(
  'payouts/fetchEarnings',
  async (publisherId, { rejectWithValue }) => {
    try {
      const data = await economyApi.getPublisherEarnings(publisherId);
      return { publisherId: String(publisherId), earnings: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher earnings'));
    }
  }
);

export const requestPayout = createAsyncThunk(
  'payouts/requestPayout',
  async ({ publisherId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await economyApi.requestPayout(publisherId, dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to request payout'));
    }
  }
);

export const fetchPayouts = createAsyncThunk(
  'payouts/fetchPayouts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await economyApi.getPayouts();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch payouts'));
    }
  }
);

const initialState = {
  earningsByPublisher: {},
  payouts: [],
  ...initialAsyncState
};

export const payoutSlice = createSlice({
  name: 'payouts',
  initialState,
  reducers: {
    clearPayoutsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublisherEarnings.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPublisherEarnings.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.earningsByPublisher[action.payload.publisherId] = action.payload.earnings;
      })
      .addCase(fetchPublisherEarnings.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.payouts = action.payload;
      });
  }
});

export const { clearPayoutsError } = payoutSlice.actions;

export default payoutSlice.reducer;
