import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import sessionsApi from '../../services/endpoints/sessionsApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const sessionsAdapter = createEntityAdapter({
  selectId: (session) => String(session.id)
});

export const fetchSessions = createAsyncThunk(
  'gameSessions/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getSessions();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch sessions'));
    }
  }
);

export const fetchPlayerSessions = createAsyncThunk(
  'gameSessions/fetchPlayerSessions',
  async (playerId, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.getPlayerSessions(playerId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player sessions'));
    }
  }
);

export const endSession = createAsyncThunk(
  'gameSessions/endSession',
  async (id, { rejectWithValue }) => {
    try {
      const data = await sessionsApi.endSession(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to end session'));
    }
  }
);

const initialState = sessionsAdapter.getInitialState({
  ...initialAsyncState
});

export const gameSessionSlice = createSlice({
  name: 'gameSessions',
  initialState,
  reducers: {
    clearSessionsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        handleFulfilled(state);
        sessionsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchPlayerSessions.fulfilled, (state, action) => {
        sessionsAdapter.upsertMany(state, action.payload);
      })
      .addCase(endSession.fulfilled, (state, action) => {
        if (action.payload) {
          sessionsAdapter.upsertOne(state, action.payload);
        }
      });
  }
});

export const { clearSessionsError } = gameSessionSlice.actions;

export default gameSessionSlice.reducer;
