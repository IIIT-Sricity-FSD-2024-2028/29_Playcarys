import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import moderationApi from '../../services/endpoints/moderationApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchModeratorActions = createAsyncThunk(
  'moderation/fetchActions',
  async (_, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getActions();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch moderator actions'));
    }
  }
);

export const fetchActiveBans = createAsyncThunk(
  'moderation/fetchBans',
  async (_, { rejectWithValue }) => {
    try {
      const data = await moderationApi.getActiveBans();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch active bans'));
    }
  }
);

export const issueWarning = createAsyncThunk(
  'moderation/issueWarning',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await moderationApi.issueWarning(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to issue warning'));
    }
  }
);

export const banPlayer = createAsyncThunk(
  'moderation/banPlayer',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await moderationApi.banPlayer(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to ban player'));
    }
  }
);

export const liftBan = createAsyncThunk(
  'moderation/liftBan',
  async (id, { rejectWithValue }) => {
    try {
      const data = await moderationApi.liftBan(id);
      return { id: String(id), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to lift ban'));
    }
  }
);

const initialState = {
  actions: [],
  bans: [],
  selectedBanTarget: null,
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
      // fetchActiveBans
      .addCase(fetchActiveBans.fulfilled, (state, action) => {
        state.bans = action.payload;
      })
      // banPlayer
      .addCase(banPlayer.fulfilled, (state, action) => {
        if (action.payload) {
          state.bans.push(action.payload);
        }
      })
      // liftBan
      .addCase(liftBan.fulfilled, (state, action) => {
        state.bans = state.bans.filter((b) => String(b.id || b.ban_id) !== action.payload.id);
      });
  }
});

export const {
  clearModerationError,
  resetModerationStatus,
  setSelectedBanTarget
} = moderationSlice.actions;

export default moderationSlice.reducer;
