import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { AsyncStatus, initialAsyncState, extractErrorMessage, handlePending, handleFulfilled, handleRejected } from '../asyncUtils';

/**
 * Thunk: publisher/fetchMyGames
 * Fetches games associated with the publisher.
 */
export const fetchPublisherGames = createAsyncThunk(
  'publisher/fetchMyGames',
  async (publisherId, { rejectWithValue }) => {
    try {
      const endpoint = publisherId ? `/games?publisher_id=${publisherId}` : '/games';
      const data = await api.get(endpoint);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher games'));
    }
  }
);

/**
 * Thunk: publisher/fetchMyTournaments
 * Fetches tournaments published or managed by the publisher.
 */
export const fetchPublisherTournaments = createAsyncThunk(
  'publisher/fetchMyTournaments',
  async (publisherId, { rejectWithValue }) => {
    try {
      const endpoint = publisherId ? `/tournaments?publisher_id=${publisherId}` : '/tournaments';
      const data = await api.get(endpoint);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher tournaments'));
    }
  }
);

/**
 * Thunk: publisher/fetchEarnings
 * Fetches publisher revenue and earnings metrics.
 */
export const fetchPublisherEarnings = createAsyncThunk(
  'publisher/fetchEarnings',
  async (publisherId, { rejectWithValue }) => {
    try {
      const endpoint = publisherId ? `/earnings/${publisherId}` : '/earnings';
      const data = await api.get(endpoint);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher earnings'));
    }
  }
);

const initialState = {
  myGames: [],
  myTournaments: [],
  earnings: null,
  stats: null,
  currentDraft: null,
  ...initialAsyncState
};

export const publisherSlice = createSlice({
  name: 'publisher',
  initialState,
  reducers: {
    setCurrentDraft(state, action) {
      state.currentDraft = action.payload;
    },
    clearPublisherError(state) {
      state.error = null;
    },
    resetPublisherStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    },
    resetPublisherState() {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchPublisherGames
      .addCase(fetchPublisherGames.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPublisherGames.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.myGames = action.payload;
      })
      .addCase(fetchPublisherGames.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchPublisherTournaments
      .addCase(fetchPublisherTournaments.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPublisherTournaments.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.myTournaments = action.payload;
      })
      .addCase(fetchPublisherTournaments.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchPublisherEarnings
      .addCase(fetchPublisherEarnings.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchPublisherEarnings.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.earnings = action.payload;
      })
      .addCase(fetchPublisherEarnings.rejected, (state, action) => {
        handleRejected(state, action);
      });
  }
});

export const {
  setCurrentDraft,
  clearPublisherError,
  resetPublisherStatus,
  resetPublisherState
} = publisherSlice.actions;

// Selectors
export const selectPublisherGames = (state) => state.publisher.myGames;
export const selectPublisherTournaments = (state) => state.publisher.myTournaments;
export const selectPublisherEarnings = (state) => state.publisher.earnings;
export const selectPublisherStats = (state) => state.publisher.stats;
export const selectPublisherDraft = (state) => state.publisher.currentDraft;
export const selectPublisherStatus = (state) => state.publisher.status;
export const selectPublisherError = (state) => state.publisher.error;

export default publisherSlice.reducer;

