import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import sessionsApi from '../../services/endpoints/sessionsApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
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
  topScorers: [],
  ...initialAsyncState
};

export const matchResultSlice = createSlice({
  name: 'matchResults',
  initialState,
  reducers: {
    clearMatchResultsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerMatchResults.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPlayerMatchResults.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.resultsByPlayerId[action.payload.playerId] = action.payload.results;
      })
      .addCase(fetchPlayerMatchResults.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchTopScorers.fulfilled, (state, action) => {
        state.topScorers = action.payload;
      });
  }
});

export const { clearMatchResultsError } = matchResultSlice.actions;

export default matchResultSlice.reducer;
