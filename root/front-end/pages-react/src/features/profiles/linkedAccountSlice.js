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

export const fetchPlatforms = createAsyncThunk(
  'linkedAccounts/fetchPlatforms',
  async (_, { rejectWithValue }) => {
    try {
      const data = await profilesApi.getPlatforms();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch platforms'));
    }
  }
);

export const fetchLinkedAccounts = createAsyncThunk(
  'linkedAccounts/fetchAccounts',
  async (playerId, { rejectWithValue }) => {
    try {
      const data = await profilesApi.getPlayerLinkedAccounts(playerId);
      return { playerId: String(playerId), accounts: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch linked accounts'));
    }
  }
);

export const linkAccount = createAsyncThunk(
  'linkedAccounts/link',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await profilesApi.linkAccount(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to link account'));
    }
  }
);

export const unlinkAccount = createAsyncThunk(
  'linkedAccounts/unlink',
  async (id, { rejectWithValue }) => {
    try {
      await profilesApi.unlinkAccount(id);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to unlink account'));
    }
  }
);

const initialState = {
  platforms: [],
  accountsByPlayerId: {},
  ...initialAsyncState
};

export const linkedAccountSlice = createSlice({
  name: 'linkedAccounts',
  initialState,
  reducers: {
    clearLinkedAccountsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatforms.fulfilled, (state, action) => {
        state.platforms = action.payload;
      })
      .addCase(fetchLinkedAccounts.fulfilled, (state, action) => {
        state.accountsByPlayerId[action.payload.playerId] = action.payload.accounts;
      })
      .addCase(linkAccount.fulfilled, (state, action) => {
        const playerId = String(action.payload?.player_id || action.payload?.userId);
        if (playerId && state.accountsByPlayerId[playerId]) {
          state.accountsByPlayerId[playerId].push(action.payload);
        }
      })
      .addCase(unlinkAccount.fulfilled, (state, action) => {
        Object.keys(state.accountsByPlayerId).forEach((pid) => {
          state.accountsByPlayerId[pid] = state.accountsByPlayerId[pid].filter(
            (acc) => String(acc.id) !== action.payload
          );
        });
      });
  }
});

export const { clearLinkedAccountsError } = linkedAccountSlice.actions;

export default linkedAccountSlice.reducer;
