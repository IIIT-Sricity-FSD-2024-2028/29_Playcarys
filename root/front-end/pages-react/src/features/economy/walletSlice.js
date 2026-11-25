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
  balanceCarys: 0,
  transactions: [],
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletError(state) {
      state.error = null;
    },
    resetWalletStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },
    clearWalletMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchBalance
      .addCase(fetchBalance.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchBalance.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.balance = action.payload;
        if (action.payload?.carys_points != null) {
          state.balanceCarys = action.payload.carys_points;
        }
      })
      .addCase(fetchBalance.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchTransactions
      .addCase(fetchTransactions.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload || [];
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch transactions';
      })
      // subscribeToPlan
      .addCase(subscribeToPlan.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(subscribeToPlan.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload?.transaction) {
          state.transactions.unshift(action.payload.transaction);
        }
        if (action.payload?.stipend_carys != null) {
          state.balanceCarys += action.payload.stipend_carys;
          if (state.balance) {
            state.balance.carys_points = (state.balance.carys_points || 0) + action.payload.stipend_carys;
          }
        }
      })
      .addCase(subscribeToPlan.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Subscription failed';
      })
      // claimStipend
      .addCase(claimStipend.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(claimStipend.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload?.balance_carys != null) {
          state.balanceCarys = action.payload.balance_carys;
          if (state.balance) {
            state.balance.carys_points = action.payload.balance_carys;
          }
        }
      })
      .addCase(claimStipend.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Stipend claim failed';
      })
      // Cross-slice: updates from purchases
      .addMatcher(
        (action) => action.type === 'catalogue/purchase/fulfilled',
        (state, action) => {
          if (action.payload?.balance_carys != null) {
            state.balanceCarys = action.payload.balance_carys;
            if (state.balance) {
              state.balance.carys_points = action.payload.balance_carys;
            }
          }
          if (action.payload?.transaction) {
            state.transactions.unshift(action.payload.transaction);
          }
        }
      )
      .addMatcher(
        (action) => action.type === 'catalogue/fetchCatalogue/fulfilled',
        (state, action) => {
          if (action.payload?.balance_carys != null) {
            state.balanceCarys = action.payload.balance_carys;
            if (state.balance) {
              state.balance.carys_points = action.payload.balance_carys;
            }
          }
        }
      );
  }
});

export const {
  clearWalletError,
  resetWalletStatus,
  clearWalletMutationStatus
} = walletSlice.actions;

export default walletSlice.reducer;
