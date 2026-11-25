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

export const withdrawPublisher = createAsyncThunk(
  'payouts/withdrawPublisher',
  async ({ publisherId, dto }, { rejectWithValue }) => {
    try {
      const data = await economyApi.withdrawPublisher(publisherId, dto);
      return { publisherId: String(publisherId), payout: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to request withdrawal'));
    }
  }
);

export const fetchPayoutById = createAsyncThunk(
  'payouts/fetchPayoutById',
  async (payoutId, { rejectWithValue }) => {
    try {
      const data = await economyApi.getPayout(payoutId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch payout'));
    }
  }
);

export const fetchPayouts = createAsyncThunk(
  'payouts/fetchPayouts',
  async (publisherId, { rejectWithValue }) => {
    try {
      const data = await economyApi.getPayouts(publisherId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch payouts'));
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

const initialState = {
  earningsByPublisher: {},
  payouts: [],
  activePayout: null,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const payoutSlice = createSlice({
  name: 'payouts',
  initialState,
  reducers: {
    clearPayoutsError(state) {
      state.error = null;
    },
    resetPayoutMutation(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },
    setActivePayout(state, action) {
      state.activePayout = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchPublisherEarnings ────────────────────────────
      .addCase(fetchPublisherEarnings.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPublisherEarnings.fulfilled, (state, action) => {
        handleFulfilled(state);
        const { publisherId, earnings } = action.payload;
        state.earningsByPublisher[publisherId] = earnings;
        if (earnings?.active_payout) {
          state.activePayout = earnings.active_payout;
        }
      })
      .addCase(fetchPublisherEarnings.rejected, (state, action) => {
        handleRejected(state, action);
      })

      // ── withdrawPublisher ─────────────────────────────────
      .addCase(withdrawPublisher.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(withdrawPublisher.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { publisherId, payout } = action.payload;
        state.activePayout = payout;

        if (payout && !state.payouts.some((p) => String(p.payout_id || p.id) === String(payout.payout_id || payout.id))) {
          state.payouts.unshift(payout);
        }

        const earnings = state.earningsByPublisher[publisherId];
        if (earnings) {
          earnings.active_payout = payout;
          if (Array.isArray(earnings.history)) {
            if (!earnings.history.some((p) => String(p.payout_id || p.id) === String(payout.payout_id || payout.id))) {
              earnings.history.unshift(payout);
            }
          }
        }
      })
      .addCase(withdrawPublisher.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || action.error?.message || 'Withdrawal failed';
      })

      // ── fetchPayoutById ───────────────────────────────────
      .addCase(fetchPayoutById.fulfilled, (state, action) => {
        const payout = action.payload;
        if (!payout) return;

        state.activePayout = payout;

        const pIdx = state.payouts.findIndex(
          (p) => String(p.payout_id || p.id) === String(payout.payout_id || payout.id)
        );
        if (pIdx !== -1) {
          state.payouts[pIdx] = payout;
        } else {
          state.payouts.unshift(payout);
        }

        const pubId = payout.publisher_id != null ? String(payout.publisher_id) : null;
        if (pubId && state.earningsByPublisher[pubId]) {
          const earnings = state.earningsByPublisher[pubId];
          if (
            earnings.active_payout &&
            String(earnings.active_payout.payout_id || earnings.active_payout.id) === String(payout.payout_id || payout.id)
          ) {
            if (payout.status === 'paid' || payout.status === 'failed') {
              earnings.active_payout = null;
            } else {
              earnings.active_payout = payout;
            }
          }
          if (Array.isArray(earnings.history)) {
            const hIdx = earnings.history.findIndex(
              (p) => String(p.payout_id || p.id) === String(payout.payout_id || payout.id)
            );
            if (hIdx !== -1) {
              earnings.history[hIdx] = payout;
            } else {
              earnings.history.unshift(payout);
            }
          }
        }
      })

      // ── fetchPayouts ──────────────────────────────────────
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.payouts = action.payload;
      });
  }
});

export const { clearPayoutsError, resetPayoutMutation, setActivePayout } = payoutSlice.actions;

export default payoutSlice.reducer;
