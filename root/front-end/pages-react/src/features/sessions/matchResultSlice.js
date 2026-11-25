import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import sessionsApi from '../../services/endpoints/sessionsApi';
import {
  AsyncStatus,
  extractErrorMessage
} from '../../app/asyncUtils';

export const fetchPlayerMatchResults = createAsyncThunk(
  'matchResults/fetchPlayerResults',
  async (playerId, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getPlayerMatchResults(playerId);
      return { playerId: String(playerId), results: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch match results'));
    }
  }
);

export const fetchSessionMatchResults = createAsyncThunk(
  'matchResults/fetchSessionResults',
  async (sessionId, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getSessionMatchResults(sessionId);
      return { sessionId: String(sessionId), results: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch session match results'));
    }
  }
);

export const fetchTopScorers = createAsyncThunk(
  'matchResults/fetchTopScorers',
  async (params, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getTopScorers(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch top scorers'));
    }
  }
);

const initialState = {
  resultsByPlayerId: {},
  resultsBySessionId: {},
  sessionResultsStatusById: {},
  sessionResultsErrorById: {},
  topScorers: [],

  fetchStatus: AsyncStatus.IDLE,
  fetchError: null,

  // Compatibility aliases
  status: AsyncStatus.IDLE,
  error: null
};

export const matchResultSlice = createSlice({
  name: 'matchResults',
  initialState,
  reducers: {
    clearMatchResultsError(state) {
      state.error = null;
      state.fetchError = null;
    },
    resetMatchResultsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.fetchStatus = AsyncStatus.IDLE;
      state.error = null;
      state.fetchError = null;
    },
    clearSessionMatchResults(state, action) {
      if (action.payload != null) {
        const sessionId = String(action.payload);
        delete state.resultsBySessionId[sessionId];
        delete state.sessionResultsStatusById[sessionId];
        delete state.sessionResultsErrorById[sessionId];
      } else {
        state.resultsBySessionId = {};
        state.sessionResultsStatusById = {};
        state.sessionResultsErrorById = {};
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchPlayerMatchResults ────────────────────────────
      .addCase(fetchPlayerMatchResults.pending, (state) => {
        state.fetchStatus = AsyncStatus.LOADING;
        state.fetchError = null;
        state.status = AsyncStatus.LOADING;
        state.error = null;
      })
      .addCase(fetchPlayerMatchResults.fulfilled, (state, action) => {
        state.fetchStatus = AsyncStatus.SUCCEEDED;
        state.fetchError = null;
        state.status = AsyncStatus.SUCCEEDED;
        state.error = null;
        if (!state.resultsByPlayerId) state.resultsByPlayerId = {};
        state.resultsByPlayerId[action.payload.playerId] = action.payload.results;
      })
      .addCase(fetchPlayerMatchResults.rejected, (state, action) => {
        state.fetchStatus = AsyncStatus.FAILED;
        state.fetchError = action.payload || 'Failed to fetch match results';
        state.status = AsyncStatus.FAILED;
        state.error = state.fetchError;
      })

      // ── fetchSessionMatchResults ───────────────────────────
      .addCase(fetchSessionMatchResults.pending, (state, action) => {
        const sessionId = String(action.meta.arg);
        state.sessionResultsStatusById[sessionId] = AsyncStatus.LOADING;
        delete state.sessionResultsErrorById[sessionId];
      })
      .addCase(fetchSessionMatchResults.fulfilled, (state, action) => {
        state.fetchStatus = AsyncStatus.SUCCEEDED;
        state.fetchError = null;
        if (!state.resultsBySessionId) state.resultsBySessionId = {};
        const sessionId = action.payload.sessionId;
        state.sessionResultsStatusById[sessionId] = AsyncStatus.SUCCEEDED;
        delete state.sessionResultsErrorById[sessionId];
        state.resultsBySessionId[sessionId] = Array.isArray(action.payload.results)
          ? action.payload.results
          : [];
      })
      .addCase(fetchSessionMatchResults.rejected, (state, action) => {
        state.fetchStatus = AsyncStatus.FAILED;
        state.fetchError = action.payload || 'Failed to fetch session match results';
        if (!state.resultsBySessionId) state.resultsBySessionId = {};
        if (action.meta?.arg != null) {
          const sessionId = String(action.meta.arg);
          state.sessionResultsStatusById[sessionId] = AsyncStatus.FAILED;
          state.sessionResultsErrorById[sessionId] = state.fetchError;
          state.resultsBySessionId[sessionId] = [];
        }
      })

      // ── fetchTopScorers ────────────────────────────────────
      .addCase(fetchTopScorers.fulfilled, (state, action) => {
        state.topScorers = action.payload;
      });
  }
});

export const {
  clearMatchResultsError,
  resetMatchResultsStatus,
  clearSessionMatchResults
} = matchResultSlice.actions;

export default matchResultSlice.reducer;
