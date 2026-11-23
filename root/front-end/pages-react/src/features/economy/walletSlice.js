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

export const fetchBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await economyApi.getBalance(userId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch balance'));
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await economyApi.getTransactions(userId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch transactions'));
    }
  }
);

export const subscribeToPlan = createAsyncThunk(
  'wallet/subscribe',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await economyApi.subscribe(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Subscription failed'));
    }
  }
);

export const claimStipend = createAsyncThunk(
  'wallet/claimStipend',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await economyApi.claimStipend(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Stipend claim failed'));
    }
  }
);

const initialState = {
  balance: null,
  transactions: [],
  ...initialAsyncState
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalance.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.balance = action.payload;
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
      })
      .addCase(claimStipend.fulfilled, (state, action) => {
        if (action.payload?.balance != null) {
          state.balance = action.payload.balance;
        }
      });
  }
});

export const { clearWalletError } = walletSlice.actions;

export default walletSlice.reducer;
