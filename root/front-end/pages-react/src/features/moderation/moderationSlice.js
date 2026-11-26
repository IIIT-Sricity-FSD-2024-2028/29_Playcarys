import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import moderationApi from '../../services/endpoints/moderationApi';
import * as moderatorService from '../../services/moderatorService';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchModeratorDashboard = createAsyncThunk(
  'moderation/fetchDashboard',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await moderatorService.fetchModeratorDashboardData(userId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch moderator dashboard data'));
    }
  }
);

export const sendContactAdminNotification = createAsyncThunk(
  'moderation/sendContactAdmin',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await moderatorService.sendContactAdminNotification(payload);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send admin notification'));
    }
  }
);

export const fetchModeratorActions = createAsyncThunk(
  'moderation/fetchActions',
  async (moderatorId, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getActions(moderatorId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch moderator actions'));
    }
  }
);

export const fetchBans = createAsyncThunk(
  'moderation/fetchBans',
  async (_, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getAllBans();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch bans'));
    }
  }
);

export const fetchActiveBans = createAsyncThunk(
  'moderation/fetchActiveBans',
  async (_, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getActiveBans();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch active bans'));
    }
  }
);

export const actOnReport = createAsyncThunk(
  'moderation/actOnReport',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await moderationApi.actOnReport(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to apply moderation action'));
    }
  }
);

export const handleViolation = createAsyncThunk(
  'moderation/handleViolation',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await moderationApi.handleViolation(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to handle violation'));
    }
  }
);

export const liftBan = createAsyncThunk(
  'moderation/liftBan',
  async ({ playerId, moderatorId }, { rejectWithValue }) => {
    try {
      const data = await moderationApi.liftBan(playerId, moderatorId);
      return { playerId: String(playerId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to lift ban'));
    }
  }
);

const initialState = {
  actions: [],
  bans: [],
  dashboardData: null,
  dashboardStatus: AsyncStatus.IDLE,
  selectedBanTarget: null,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const moderationSlice = createSlice({
  name: 'moderation',
  initialState,
  reducers: {
    clearModerationError(state) {
      state.error = null;
    },
    resetModerationStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },
    clearModerationMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    },
    setSelectedBanTarget(state, action) {
      state.selectedBanTarget = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchModeratorActions
      .addCase(fetchModeratorActions.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchModeratorActions.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.actions = action.payload;
      })
      .addCase(fetchModeratorActions.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchBans
      .addCase(fetchBans.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchBans.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.bans = action.payload;
      })
      .addCase(fetchBans.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchActiveBans
      .addCase(fetchActiveBans.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchActiveBans.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.bans = action.payload;
      })
      .addCase(fetchActiveBans.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // actOnReport
      .addCase(actOnReport.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(actOnReport.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          state.actions.unshift(action.payload);
        }
        const arg = action.meta?.arg;
        if (arg && arg.action_type === 'ban') {
          const targetPlayerId = String(arg.target_user_id);
          const existingIdx = state.bans.findIndex(
            (b) => String(b.playerId) === targetPlayerId
          );
          const newBan = {
            id: 'b_' + Date.now(),
            playerId: Number(arg.target_user_id),
            duration: arg.ban_duration || '7 Days',
            reason: arg.action_reason,
            active: true,
            bannedDate: new Date().toISOString().slice(0, 10)
          };
          if (existingIdx !== -1) {
            state.bans[existingIdx] = { ...state.bans[existingIdx], ...newBan };
          } else {
            state.bans.push(newBan);
          }
        }
      })
      .addCase(actOnReport.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to apply moderation action';
      })
      // handleViolation
      .addCase(handleViolation.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(handleViolation.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          state.actions.unshift(action.payload);
        }
        const arg = action.meta?.arg;
        if (arg && arg.action_type === 'ban') {
          const targetPlayerId = String(arg.target_user_id);
          const existingIdx = state.bans.findIndex(
            (b) => String(b.playerId) === targetPlayerId
          );
          const newBan = {
            id: 'b_' + Date.now(),
            playerId: Number(arg.target_user_id),
            duration: arg.ban_duration || '7 Days',
            reason: arg.action_reason,
            active: true,
            bannedDate: new Date().toISOString().slice(0, 10)
          };
          if (existingIdx !== -1) {
            state.bans[existingIdx] = { ...state.bans[existingIdx], ...newBan };
          } else {
            state.bans.push(newBan);
          }
        }
      })
      .addCase(handleViolation.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to handle violation';
      })
      // liftBan
      .addCase(liftBan.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(liftBan.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const targetPlayerId = String(action.payload?.playerId || action.meta?.arg?.playerId);
        state.bans = state.bans.map((b) =>
          String(b.playerId) === targetPlayerId ? { ...b, active: false } : b
        );
      })
      .addCase(liftBan.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to lift ban';
      })
      .addCase(fetchModeratorDashboard.pending, (state) => {
        state.dashboardStatus = AsyncStatus.LOADING;
      })
      .addCase(fetchModeratorDashboard.fulfilled, (state, action) => {
        state.dashboardStatus = AsyncStatus.SUCCEEDED;
        state.dashboardData = action.payload;
      })
      .addCase(fetchModeratorDashboard.rejected, (state, action) => {
        state.dashboardStatus = AsyncStatus.FAILED;
        state.error = action.payload || action.error?.message;
      })
      .addCase(sendContactAdminNotification.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
      })
      .addCase(sendContactAdminNotification.fulfilled, (state) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
      })
      .addCase(sendContactAdminNotification.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || action.error?.message;
      });
  }
});

export const {
  clearModerationError,
  resetModerationStatus,
  clearModerationMutationStatus,
  setSelectedBanTarget
} = moderationSlice.actions;

export default moderationSlice.reducer;
