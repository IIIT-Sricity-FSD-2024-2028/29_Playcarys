import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import gamesApi from '../../services/endpoints/gamesApi';
import api from '../../services/api';
import {
  fetchReview,
  rescanGame as rescanGameService,
  submitDecision as submitDecisionService,
  fetchManifest as fetchManifestService,
  fetchAchievements as fetchAchievementsService,
  reviewAchievement as reviewAchievementService
} from '../../services/adminReviewService';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchPublisherApplications = createAsyncThunk(
  'gameReview/fetchPublisherApplications',
  async (_, { rejectWithValue }) => {
    try {
      return await api.request('/publisher/applications');
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch applications'));
    }
  }
);

export const reviewPublisherApplication = createAsyncThunk(
  'gameReview/reviewPublisherApplication',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      return await api.request(`/publisher/applications/${userId}/review`, 'POST', data);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to review application'));
    }
  }
);

export const fetchProposedAchievements = createAsyncThunk(
  'gameReview/fetchProposedAchievements',
  async (gameId, { rejectWithValue }) => {
    try {
      return await fetchAchievementsService(gameId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch achievements'));
    }
  }
);

export const reviewProposedAchievement = createAsyncThunk(
  'gameReview/reviewProposedAchievement',
  async ({ achievementId, decision, reviewerId }, { rejectWithValue }) => {
    try {
      return await reviewAchievementService(achievementId, decision, reviewerId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to review achievement'));
    }
  }
);

export const fetchGameReview = createAsyncThunk(
  'gameReview/fetchReview',
  async (arg, { rejectWithValue }) => {
    try {
      const id = typeof arg === 'object' ? arg.gameId : arg;
      const role = typeof arg === 'object' ? arg.role : undefined;
      const data = role ? await fetchReview(id, role) : await gamesApi.getGameReview(id);
      return { id: String(id), review: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch game review'));
    }
  }
);

export const fetchScanManifest = createAsyncThunk(
  'gameReview/fetchScanManifest',
  async (arg, { rejectWithValue }) => {
    try {
      const id = typeof arg === 'object' ? arg.gameId : arg;
      const role = typeof arg === 'object' ? arg.role : undefined;
      const data = role ? await fetchManifestService(id, role) : await gamesApi.getScanManifest(id);
      return { id: String(id), manifest: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch scan manifest'));
    }
  }
);

export const rescanGame = createAsyncThunk(
  'gameReview/rescanGame',
  async (arg, { rejectWithValue }) => {
    try {
      const id = typeof arg === 'object' ? arg.gameId : arg;
      const role = typeof arg === 'object' ? arg.role : undefined;
      const data = role ? await rescanGameService(id, role) : await gamesApi.rescanGame(id);
      return { id: String(id), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to rescan game'));
    }
  }
);

export const approveGame = createAsyncThunk(
  'gameReview/approveGame',
  async (arg, { rejectWithValue }) => {
    try {
      const id = arg.id || arg.gameId;
      const role = arg.role;
      const data = role ? await submitDecisionService(id, role, arg.body || arg) : await gamesApi.approveGame(id, { status: arg.status, review_notes: arg.review_notes });
      return { id: String(id), game: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update review status'));
    }
  }
);

const initialState = {
  reviewsById: {},
  manifestsById: {},
  reviewStatusById: {},
  scanStatusById: {},
  approvalStatusById: {},
  errorById: {},
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
      .addCase(fetchGameReview.pending, (state, action) => {
        handlePending(state);
        state.reviewStatusById[String(action.meta.arg)] = AsyncStatus.LOADING;
      })
      .addCase(fetchGameReview.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.reviewsById[action.payload.id] = action.payload.review;
        state.reviewStatusById[action.payload.id] = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchGameReview.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchScanManifest.pending, (state, action) => {
        state.scanStatusById[String(action.meta.arg)] = AsyncStatus.LOADING;
      })
      .addCase(fetchScanManifest.fulfilled, (state, action) => {
        state.manifestsById[action.payload.id] = action.payload.manifest;
        state.scanStatusById[action.payload.id] = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchScanManifest.rejected, (state, action) => {
        state.scanStatusById[String(action.meta.arg)] = AsyncStatus.FAILED;
        state.errorById[String(action.meta.arg)] = action.payload || action.error?.message;
      })
      .addCase(rescanGame.pending, (state, action) => {
        state.scanStatusById[String(action.meta.arg)] = AsyncStatus.LOADING;
      })
      .addCase(rescanGame.fulfilled, (state, action) => {
        state.scanStatusById[action.payload.id] = AsyncStatus.SUCCEEDED;
        state.manifestsById[action.payload.id] = action.payload.result;
      })
      .addCase(rescanGame.rejected, (state, action) => {
        state.scanStatusById[String(action.meta.arg)] = AsyncStatus.FAILED;
        state.errorById[String(action.meta.arg)] = action.payload || action.error?.message;
      })
      .addCase(approveGame.pending, (state, action) => {
        state.approvalStatusById[String(action.meta.arg.id)] = AsyncStatus.LOADING;
      })
      .addCase(approveGame.fulfilled, (state, action) => {
        state.approvalStatusById[action.payload.id] = AsyncStatus.SUCCEEDED;
        if (state.reviewsById[action.payload.id]) {
          state.reviewsById[action.payload.id].status = action.payload.game?.status;
        }
      })
      .addCase(approveGame.rejected, (state, action) => {
        const id = String(action.meta.arg.id);
        state.approvalStatusById[id] = AsyncStatus.FAILED;
        state.errorById[id] = action.payload || action.error?.message;
      });
  }
});

export const { clearGameReviewError } = gameReviewSlice.actions;

export default gameReviewSlice.reducer;
