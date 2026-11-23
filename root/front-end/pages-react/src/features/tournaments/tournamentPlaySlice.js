import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tournamentPlayApi from '../../services/endpoints/tournamentPlayApi';
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
      const data = await tournamentPlayApi.getOverview(id);
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
      const data = await tournamentPlayApi.getLeaderboard(id);
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
      const data = await tournamentPlayApi.getBracket(id);
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
      const data = await tournamentPlayApi.getChat(id);
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
      const data = await tournamentPlayApi.postChat(id, { message });
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
      const data = await tournamentPlayApi.startTournament(id);
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
      const data = await tournamentPlayApi.reportMatchResult(matchId, dto);
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
      const data = await tournamentPlayApi.confirmMatchResult(matchId, dto);
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
      const data = await tournamentPlayApi.disputeMatchResult(matchId, dto);
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
      const data = await tournamentPlayApi.resolveMatchDispute(matchId, dto);
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
