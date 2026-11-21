import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

/**
 * Thunk: player/fetchGames
 * Fetches available games list from the backend API.
 */
export const fetchPlayerGames = createAsyncThunk(
  'player/fetchGames',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/games');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player games'));
    }
  }
);

/**
 * Thunk: player/fetchTournaments
 * Fetches tournament list from the backend API.
 */
export const fetchPlayerTournaments = createAsyncThunk(
  'player/fetchTournaments',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/tournaments');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player tournaments'));
    }
  }
);

/**
 * Thunk: player/fetchProfile
 * Fetches detailed player profile for a given user ID.
 */
export const fetchPlayerProfile = createAsyncThunk(
  'player/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await api.get(`/player-profiles/${userId}`);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player profile'));
    }
  }
);

const initialState = {
  games: [],
  currentGame: null,
  tournaments: [],
  currentTournament: null,
  leaderboard: [],
  matchHistory: [],
  notifications: [],
  profile: null,
  ...initialAsyncState
};

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentGame(state, action) {
      state.currentGame = action.payload;
    },
    setCurrentTournament(state, action) {
      state.currentTournament = action.payload;
    },
    clearPlayerError(state) {
      state.error = null;
    },
    resetPlayerStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    },
    resetPlayerState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchPlayerGames
      .addCase(fetchPlayerGames.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlayerGames.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.games = action.payload;
      })
      .addCase(fetchPlayerGames.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchPlayerTournaments
      .addCase(fetchPlayerTournaments.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlayerTournaments.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.tournaments = action.payload;
      })
      .addCase(fetchPlayerTournaments.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchPlayerProfile
      .addCase(fetchPlayerProfile.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlayerProfile.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.profile = action.payload;
      })
      .addCase(fetchPlayerProfile.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const {
  setCurrentGame,
  setCurrentTournament,
  clearPlayerError,
  resetPlayerStatus,
  resetPlayerState
} = playerSlice.actions;

// Selectors
export const selectPlayerGames = (state) => state.player.games;
export const selectCurrentGame = (state) => state.player.currentGame;
export const selectPlayerTournaments = (state) => state.player.tournaments;
export const selectCurrentTournament = (state) => state.player.currentTournament;
export const selectLeaderboard = (state) => state.player.leaderboard;
export const selectMatchHistory = (state) => state.player.matchHistory;
export const selectPlayerNotifications = (state) => state.player.notifications;
export const selectPlayerProfile = (state) => state.player.profile;
export const selectPlayerStatus = (state) => state.player.status;
export const selectPlayerError = (state) => state.player.error;

export default playerSlice.reducer;

