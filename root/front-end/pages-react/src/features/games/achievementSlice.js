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

export const fetchGameAchievements = createAsyncThunk(
  'achievements/fetchGameAchievements',
  async (gameId, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getGameAchievements(gameId);
      return { gameId: String(gameId), achievements: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch achievements'));
    }
  }
);

export const fetchPlayerAchievements = createAsyncThunk(
  'achievements/fetchPlayerAchievements',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getPlayerAchievements(userId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player achievements'));
    }
  }
);

export const fetchPendingAchievements = createAsyncThunk(
  'achievements/fetchPendingAchievements',
  async (_, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getPendingAchievements();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch pending achievements'));
    }
  }
);

export const unlockAchievement = createAsyncThunk(
  'achievements/unlockAchievement',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await gamesApi.unlockAchievement(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to unlock achievement'));
    }
  }
);

export const createGameAchievement = createAsyncThunk(
  'achievements/createGameAchievement',
  async ({ gameId, data }, { rejectWithValue }) => {
    try { return { gameId: String(gameId), achievement: await gamesApi.createGameAchievement(gameId, data) }; }
    catch (err) { return rejectWithValue(extractErrorMessage(err, 'Failed to create achievement')); }
  }
);

export const reviewAchievement = createAsyncThunk(
  'achievements/reviewAchievement',
  async ({ id, data }, { rejectWithValue }) => {
    try { return await gamesApi.reviewAchievement(id, data); }
    catch (err) { return rejectWithValue(extractErrorMessage(err, 'Failed to review achievement')); }
  }
);

export const evaluatePlayerAchievements = createAsyncThunk(
  'achievements/evaluatePlayerAchievements',
  async (userId, { rejectWithValue }) => {
    try { return { userId: String(userId), result: await gamesApi.evaluatePlayerAchievements(userId) }; }
    catch (err) { return rejectWithValue(extractErrorMessage(err, 'Failed to evaluate achievements')); }
  }
);

export const setPlayerTitle = createAsyncThunk(
  'achievements/setPlayerTitle',
  async ({ userId, title }, { rejectWithValue }) => {
    try { return { userId: String(userId), title, result: await gamesApi.setPlayerTitle(userId, title) }; }
    catch (err) { return rejectWithValue(extractErrorMessage(err, 'Failed to set active title')); }
  }
);

const initialState = {
  achievementsByGameId: {},
  playerAchievements: [],
  pendingAchievements: [],
  titlesByUserId: {},
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  ...initialAsyncState
};

export const achievementSlice = createSlice({
  name: 'achievements',
  initialState,
  reducers: {
    clearAchievementError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGameAchievements.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchGameAchievements.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.achievementsByGameId[action.payload.gameId] = action.payload.achievements;
      })
      .addCase(fetchGameAchievements.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchPlayerAchievements.fulfilled, (state, action) => {
        state.playerAchievements = action.payload;
      })
      .addCase(fetchPendingAchievements.fulfilled, (state, action) => {
        state.pendingAchievements = action.payload;
      })
      .addCase(createGameAchievement.pending, (state) => { state.mutationStatus = AsyncStatus.LOADING; })
      .addCase(createGameAchievement.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        (state.achievementsByGameId[action.payload.gameId] ||= []).push(action.payload.achievement);
      })
      .addCase(createGameAchievement.rejected, (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.mutationError = action.payload || action.error?.message; })
      .addCase(reviewAchievement.fulfilled, (state, action) => {
        state.pendingAchievements = state.pendingAchievements.filter((achievement) => String(achievement.id) !== String(action.payload.id));
      })
      .addCase(unlockAchievement.fulfilled, (state, action) => {
        if (action.payload) state.playerAchievements.push(action.payload);
      })
      .addCase(evaluatePlayerAchievements.fulfilled, (state, action) => {
        if (action.payload.result?.achievements) state.playerAchievements = action.payload.result.achievements;
      })
      .addCase(setPlayerTitle.fulfilled, (state, action) => {
        state.titlesByUserId[action.payload.userId] = action.payload.result?.titles || action.payload.title;
      });
  }
});

export const { clearAchievementError } = achievementSlice.actions;

export default achievementSlice.reducer;
