import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import gamesApi from '../../services/endpoints/gamesApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchGameReview = createAsyncThunk(
  'gameReview/fetchReview',
  async (id, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getGameReview(id);
      return { id: String(id), review: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch game review'));
    }
  }
);

export const fetchScanManifest = createAsyncThunk(
  'gameReview/fetchScanManifest',
  async (id, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getScanManifest(id);
      return { id: String(id), manifest: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch scan manifest'));
    }
  }
);

export const rescanGame = createAsyncThunk(
  'gameReview/rescanGame',
  async (id, { rejectWithValue }) => {
    try {
      const data = await gamesApi.rescanGame(id);
      return { id: String(id), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to rescan game'));
    }
  }
);

export const approveGame = createAsyncThunk(
  'gameReview/approveGame',
  async ({ id, status, review_notes }, { rejectWithValue }) => {
    try {
      const data = await gamesApi.approveGame(id, { status, review_notes });
      return { id: String(id), game: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update review status'));
    }
  }
);

const initialState = {
  reviewsById: {},
  manifestsById: {},
  ...initialAsyncState
};

export const gameReviewSlice = createSlice({
  name: 'gameReview',
  initialState,
  reducers: {
    clearGameReviewError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGameReview.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchGameReview.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.reviewsById[action.payload.id] = action.payload.review;
      })
      .addCase(fetchGameReview.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchScanManifest.fulfilled, (state, action) => {
        state.manifestsById[action.payload.id] = action.payload.manifest;
      })
      .addCase(approveGame.fulfilled, (state, action) => {
        if (state.reviewsById[action.payload.id]) {
          state.reviewsById[action.payload.id].status = action.payload.game?.status;
        }
      });
  }
});

export const { clearGameReviewError } = gameReviewSlice.actions;

export default gameReviewSlice.reducer;
