import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tournamentsApi from '../../services/endpoints/tournamentsApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchTournamentOverview = createAsyncThunk(
  'tournamentPlay/fetchOverview',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getOverview(id);
      return { id: String(id), overview: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournament overview'));
    }
  }
);

export const fetchTournamentLeaderboard = createAsyncThunk(
  'tournamentPlay/fetchLeaderboard',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getLeaderboard(id);
      return { id: String(id), leaderboard: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch leaderboard'));
    }
  }
);

export const fetchTournamentBracket = createAsyncThunk(
  'tournamentPlay/fetchBracket',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getBracket(id);
      return { id: String(id), bracket: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch bracket'));
    }
  }
);

export const fetchTournamentChat = createAsyncThunk(
  'tournamentPlay/fetchChat',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getChat(id);
      return { id: String(id), chat: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch chat'));
    }
  }
);

export const sendTournamentChatMessage = createAsyncThunk(
  'tournamentPlay/sendChat',
  async ({ id, message }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.postChat(id, { message });
      return { id: String(id), message: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send chat'));
    }
  }
);

export const startTournament = createAsyncThunk(
  'tournamentPlay/startTournament',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.startTournament(id);
      return { id: String(id), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to start tournament'));
    }
  }
);

export const reportMatchResult = createAsyncThunk(
  'tournamentPlay/reportMatchResult',
  async ({ matchId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.reportMatchResult(matchId, dto);
      return { matchId: String(matchId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to report match result'));
    }
  }
);

export const confirmMatchResult = createAsyncThunk(
  'tournamentPlay/confirmMatchResult',
  async ({ matchId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.confirmMatchResult(matchId, dto);
      return { matchId: String(matchId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to confirm match result'));
    }
  }
);

export const disputeMatchResult = createAsyncThunk(
  'tournamentPlay/disputeMatchResult',
  async ({ matchId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.disputeMatchResult(matchId, dto);
      return { matchId: String(matchId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to dispute match result'));
    }
  }
);

export const resolveMatchDispute = createAsyncThunk(
  'tournamentPlay/resolveMatchDispute',
  async ({ matchId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.resolveMatchDispute(matchId, dto);
      return { matchId: String(matchId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to resolve dispute'));
    }
  }
);

const initialState = {
  byTournament: {},
  ...initialAsyncState
};

export const tournamentPlaySlice = createSlice({
  name: 'tournamentPlay',
  initialState,
  reducers: {
    clearTournamentPlayError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTournamentOverview.fulfilled, (state, action) => {
        const { id, overview } = action.payload;
        state.byTournament[id] = { ...(state.byTournament[id] || {}), overview };
      })
      .addCase(fetchTournamentLeaderboard.fulfilled, (state, action) => {
        const { id, leaderboard } = action.payload;
        state.byTournament[id] = { ...(state.byTournament[id] || {}), leaderboard };
      })
      .addCase(fetchTournamentBracket.fulfilled, (state, action) => {
        const { id, bracket } = action.payload;
        state.byTournament[id] = { ...(state.byTournament[id] || {}), bracket };
      })
      .addCase(fetchTournamentChat.fulfilled, (state, action) => {
        const { id, chat } = action.payload;
        state.byTournament[id] = { ...(state.byTournament[id] || {}), chat };
      })
      .addCase(sendTournamentChatMessage.fulfilled, (state, action) => {
        const { id, message } = action.payload;
        if (!state.byTournament[id]) state.byTournament[id] = {};
        if (!state.byTournament[id].chat) state.byTournament[id].chat = [];
        state.byTournament[id].chat.push(message);
      });
  }
});

export const { clearTournamentPlayError } = tournamentPlaySlice.actions;

export default tournamentPlaySlice.reducer;
