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
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        handleFulfilled(state);
        gamesAdapter.setAll(state, action.payload);
      })
      .addCase(fetchGames.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchGameById
      .addCase(fetchGameById.fulfilled, (state, action) => {
        if (action.payload) {
          gamesAdapter.upsertOne(state, action.payload);
        }
      })
      // createGame
      .addCase(createGame.fulfilled, (state, action) => {
        if (action.payload) {
          gamesAdapter.addOne(state, action.payload);
        }
      })
      // updateGame
      .addCase(updateGame.fulfilled, (state, action) => {
        if (action.payload) {
          gamesAdapter.upsertOne(state, action.payload);
        }
      })
      // setGameState
      .addCase(setGameState.fulfilled, (state, action) => {
        if (action.payload) {
          gamesAdapter.upsertOne(state, action.payload);
        }
      })
      // deleteGame
      .addCase(deleteGame.fulfilled, (state, action) => {
        gamesAdapter.removeOne(state, action.payload);
      })
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
