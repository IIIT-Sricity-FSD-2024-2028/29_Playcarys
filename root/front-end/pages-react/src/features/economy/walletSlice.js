import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import economyApi from '../../services/endpoints/economyApi';
import publisherService from '../../services/publisherService';
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

// Publisher finance has its own aggregate endpoint.  Keeping these requests
// here makes the dashboard read its backend data from the shared Redux store.
export const fetchPublisherFinance = createAsyncThunk(
  'wallet/fetchPublisherFinance',
  async (publisherId, { rejectWithValue }) => {
    try {
      const data = await publisherService.getFinanceOverview(publisherId);
      return { publisherId: String(publisherId), data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher finance'));
    }
  }
);

export const depositPublisherFunds = createAsyncThunk(
  'wallet/depositPublisherFunds',
  async ({ publisherId, data }, { rejectWithValue }) => {
    try {
      const result = await publisherService.depositFunds(publisherId, data);
      return { publisherId: String(publisherId), result };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Deposit simulation failed'));
    }
  }
);

const initialState = {
  balance: null,
  balanceCarys: 0,
  transactions: [],
  publisherFinanceById: {},
  publisherFinanceStatus: AsyncStatus.IDLE,
  publisherFinanceError: null,
  publisherDepositStatus: AsyncStatus.IDLE,
  publisherDepositError: null,
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
      .addCase(fetchPublisherFinance.pending, (state) => {
        state.publisherFinanceStatus = AsyncStatus.LOADING;
        state.publisherFinanceError = null;
      })
      .addCase(fetchPublisherFinance.fulfilled, (state, action) => {
        state.publisherFinanceStatus = AsyncStatus.SUCCEEDED;
        state.publisherFinanceById[action.payload.publisherId] = action.payload.data;
      })
      .addCase(fetchPublisherFinance.rejected, (state, action) => {
        state.publisherFinanceStatus = AsyncStatus.FAILED;
        state.publisherFinanceError = action.payload || 'Failed to fetch publisher finance';
      })
      .addCase(depositPublisherFunds.pending, (state) => {
        state.publisherDepositStatus = AsyncStatus.LOADING;
        state.publisherDepositError = null;
      })
      .addCase(depositPublisherFunds.fulfilled, (state) => {
        state.publisherDepositStatus = AsyncStatus.SUCCEEDED;
      })
      .addCase(depositPublisherFunds.rejected, (state, action) => {
        state.publisherDepositStatus = AsyncStatus.FAILED;
        state.publisherDepositError = action.payload || 'Deposit simulation failed';
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
