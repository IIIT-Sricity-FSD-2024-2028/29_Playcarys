import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import profilesApi from '../../services/endpoints/profilesApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchPlayerProfile = createAsyncThunk(
  'playerProfile/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await profilesApi.getPlayerProfile(userId);
      return { userId: String(userId), profile: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player profile'));
    }
  }
);

export const fetchLeaderboard = createAsyncThunk(
  'playerProfile/fetchLeaderboard',
  async (_, { rejectWithValue }) => {
    try {
      const data = await profilesApi.getPlayerLeaderboard();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch leaderboard'));
    }
  }
);

export const fetchPlayerProfiles = createAsyncThunk(
  'playerProfile/fetchAllProfiles',
  async (_, { rejectWithValue }) => {
    try {
      const data = await profilesApi.getPlayerProfiles();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player profiles'));
    }
  }
);

export const updatePlayerProfile = createAsyncThunk(
  'playerProfile/updateProfile',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const res = await profilesApi.updatePlayerProfile(userId, data);
      return { userId: String(userId), profile: res };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update player profile'));
    }
  }
);

const initialState = {
  profilesByUserId: {},
  leaderboard: [],
  ...initialAsyncState
};

export const playerProfileSlice = createSlice({
  name: 'playerProfile',
  initialState,
  reducers: {
    clearPlayerProfileError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerProfile.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlayerProfile.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
      })
      .addCase(fetchPlayerProfile.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchPlayerProfiles.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlayerProfiles.fulfilled, (state, action) => {
        handleFulfilled(state);
        if (Array.isArray(action.payload)) {
          action.payload.forEach((p) => {
            const uid = String(p.user_id || p.userId || p.id);
            state.profilesByUserId[uid] = p;
          });
        }
      })
      .addCase(fetchPlayerProfiles.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload;
      })
      .addCase(updatePlayerProfile.fulfilled, (state, action) => {
        state.profilesByUserId[action.payload.userId] = action.payload.profile;
      });
  }
});

export const { clearPlayerProfileError } = playerProfileSlice.actions;

export default playerProfileSlice.reducer;
