import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import gamesApi from '../../services/endpoints/gamesApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const gamesAdapter = createEntityAdapter({
  selectId: (game) => String(game.id)
});

export const fetchGames = createAsyncThunk(
  'games/fetchGames',
  async (params, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getGames(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch games'));
    }
  }
);

export const fetchGameById = createAsyncThunk(
  'games/fetchGameById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await gamesApi.getGameById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch game'));
    }
  }
);

export const fetchPublisherGames = createAsyncThunk(
  'games/fetchPublisherGames',
  async (publisherId, { rejectWithValue }) => {
    try {
      const games = await gamesApi.getGames({ publisherId });
      return { publisherId: String(publisherId), games };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher games'));
    }
  }
);

export const createGame = createAsyncThunk(
  'games/createGame',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await gamesApi.createGame(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create game'));
    }
  }
);

export const updateGame = createAsyncThunk(
  'games/updateGame',
  async ({ id, data: dto }, { rejectWithValue }) => {
    try {
      const data = await gamesApi.updateGame(id, dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update game'));
    }
  }
);

export const setGameState = createAsyncThunk(
  'games/setGameState',
  async ({ id, enabled }, { rejectWithValue }) => {
    try {
      const data = await gamesApi.setGameState(id, enabled);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to change game state'));
    }
  }
);

export const deleteGame = createAsyncThunk(
  'games/deleteGame',
  async (id, { rejectWithValue }) => {
    try {
      await gamesApi.deleteGame(id);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete game'));
    }
  }
);

export const recordGameView = createAsyncThunk(
  'games/recordGameView',
  async (id) => {
    await gamesApi.recordGameView(id);
    return String(id);
  }
);

const initialState = gamesAdapter.getInitialState({
  selectedGameId: null,
  publisherGameIdsByPublisherId: {},
  listStatus: AsyncStatus.IDLE,
  detailStatus: AsyncStatus.IDLE,
  mutationStatus: AsyncStatus.IDLE,
  listError: null,
  detailError: null,
  mutationError: null,
  ...initialAsyncState
});

export const gameSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    setSelectedGameId(state, action) {
      state.selectedGameId = action.payload ? String(action.payload) : null;
    },
    clearGamesError(state) {
      state.error = null;
    },
    resetGamesStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchGames
      .addCase(fetchGames.pending, (state) => {
        handlePending(state);
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        handleFulfilled(state);
        gamesAdapter.setAll(state, action.payload);
        state.listStatus = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchGames.rejected, (state, action) => {
        handleRejected(state, action);
        state.listStatus = AsyncStatus.FAILED;
        state.listError = state.error;
      })
      // fetchGameById
      .addCase(fetchGameById.pending, (state) => { state.detailStatus = AsyncStatus.LOADING; state.detailError = null; })
      .addCase(fetchGameById.fulfilled, (state, action) => {
        state.detailStatus = AsyncStatus.SUCCEEDED;
        if (action.payload) {
          gamesAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(fetchGameById.rejected, (state, action) => { state.detailStatus = AsyncStatus.FAILED; state.detailError = action.payload || action.error?.message; })
      .addCase(fetchPublisherGames.fulfilled, (state, action) => {
        gamesAdapter.upsertMany(state, action.payload.games);
        state.publisherGameIdsByPublisherId[action.payload.publisherId] = action.payload.games.map((game) => String(game.id));
      })
      // createGame
      .addCase(createGame.pending, (state) => { state.mutationStatus = AsyncStatus.LOADING; state.mutationError = null; })
      .addCase(createGame.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        if (action.payload) {
          gamesAdapter.addOne(state, action.payload);
        }
      })
      .addCase(createGame.rejected, (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.mutationError = action.payload || action.error?.message; })
      // updateGame
      .addCase(updateGame.pending, (state) => { state.mutationStatus = AsyncStatus.LOADING; state.mutationError = null; })
      .addCase(updateGame.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        if (action.payload) {
          gamesAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(updateGame.rejected, (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.mutationError = action.payload || action.error?.message; })
      // setGameState
      .addCase(setGameState.pending, (state) => { state.mutationStatus = AsyncStatus.LOADING; state.mutationError = null; })
      .addCase(setGameState.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        if (action.payload) {
          gamesAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(setGameState.rejected, (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.mutationError = action.payload || action.error?.message; })
      // deleteGame
      .addCase(deleteGame.pending, (state) => { state.mutationStatus = AsyncStatus.LOADING; state.mutationError = null; })
      .addCase(deleteGame.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        gamesAdapter.removeOne(state, action.payload);
      })
      .addCase(deleteGame.rejected, (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.mutationError = action.payload || action.error?.message; })
      // recordGameView
      .addCase(recordGameView.fulfilled, (state, action) => {
        const game = state.entities[action.payload];
        if (game) {
          game.views = (Number(game.views) || 0) + 1;
        }
      });
  }
});

export const { setSelectedGameId, clearGamesError, resetGamesStatus } = gameSlice.actions;

export default gameSlice.reducer;
