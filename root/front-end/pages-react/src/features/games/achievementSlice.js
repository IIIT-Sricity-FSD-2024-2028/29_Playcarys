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

const initialState = {
  achievementsByGameId: {},
  playerAchievements: [],
  pendingAchievements: [],
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
      });
  }
});

export const { clearAchievementError } = achievementSlice.actions;

export default achievementSlice.reducer;
