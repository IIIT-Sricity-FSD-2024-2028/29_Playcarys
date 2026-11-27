import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import gamesApi from '../../services/endpoints/gamesApi';
import playerService from '../../services/playerService';
import publisherService from '../../services/publisherService';
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

/** Load one player's persisted favourites into the shared game state. */
export const fetchFavoriteGames = createAsyncThunk(
  'games/fetchFavorites',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const storedIds = playerService.getFavorites(userId).map(String);
      const loadedGames = Object.values(getState().games?.entities || {});

      // A player may only retain favourites for games that have been approved.
      // Wait for the catalogue before applying this rule, so a cold load never
      // incorrectly clears valid persisted favourites.
      if (!loadedGames.length) return storedIds;
      const approvedIds = new Set(
        loadedGames
          .filter((game) => game.status === 'approved' || game.game_approval_status === 'approved')
          .map((game) => String(game.id || game.game_id))
      );
      return storedIds.filter((gameId) => approvedIds.has(String(gameId)));
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load favourites'));
    }
  }
);

/**
 * The Game Card heart always enters persistence through Redux. The service is
 * retained inside the thunk for the existing DB compatibility layer.
 */
export const togglePlayerFavorite = createAsyncThunk(
  'games/toggleFavorite',
  async ({ gameId, userId }, { rejectWithValue }) => {
    try {
      return playerService.toggleFavorite(gameId, userId).map(String);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update favourites'));
    }
  }
);

export const submitGameReview = createAsyncThunk(
  'games/submitGameReview',
  async ({ gameId, userId, rating, comment }, { rejectWithValue }) => {
    try {
      const res = playerService.submitReview(gameId, userId, rating, comment);
      if (!res.success) {
        return rejectWithValue(res.reason || 'Failed to submit review');
      }
      return { gameId: String(gameId), userId, rating, comment, result: res };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to submit review'));
    }
  }
);

// Publisher workflows retain their compatibility/cache behavior in
// publisherService, but components must enter them through Redux.
export const fetchPublisherGameWorkspace = createAsyncThunk(
  'games/fetchPublisherWorkspace',
  async (publisherId, { rejectWithValue }) => {
    try {
      const games = await publisherService.getPublisherGames(publisherId);
      return { publisherId: String(publisherId), games, genres: publisherService.getGenres() };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch publisher games'));
    }
  }
);

export const savePublisherGameEdit = createAsyncThunk(
  'games/savePublisherEdit',
  async ({ gameId, publisherId, data }, { rejectWithValue }) => {
    try {
      const game = await publisherService.saveGameEdit(gameId, data, publisherId);
      return { gameId: String(gameId), game };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update game details'));
    }
  }
);

export const deletePublisherGame = createAsyncThunk(
  'games/deletePublisherGame',
  async ({ gameId, publisherId }, { rejectWithValue }) => {
    try {
      await publisherService.deleteGame(gameId, publisherId);
      return String(gameId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete game'));
    }
  }
);

export const fetchPublisherGameAnalytics = createAsyncThunk(
  'games/fetchPublisherAnalytics',
  async (gameId, { rejectWithValue }) => {
    try {
      return { gameId: String(gameId), data: publisherService.getGameAnalytics(gameId) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load game analytics'));
    }
  }
);

export const publishPublisherGame = createAsyncThunk(
  'games/publishPublisherGame',
  async ({ game, session, publisherId, bundleFile, achievements }, { rejectWithValue }) => {
    try {
      if (publisherService.checkTitleExists(game.title || game.game_name)) {
        throw new Error('A game with this title already exists.');
      }
      const savedGame = await publisherService.saveGameRecord(game, session);
      const gameId = savedGame?.game_id || savedGame?.id;
      if (bundleFile) {
        const uploaded = await publisherService.uploadBundle(gameId, publisherId, bundleFile);
        if (uploaded?.play_path) await publisherService.updateGamePlayPath(gameId, uploaded.play_path);
      }
      const achievementResult = await publisherService.submitAchievements(gameId, publisherId, achievements);
      return { game: savedGame, achievementResult };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to submit game for review'));
    }
  }
);

export const probeGameHost = createAsyncThunk(
  'games/probeHost',
  async (gameId, { rejectWithValue }) => {
    try {
      const isAlive = await playerService.probeSelfHosted(gameId);
      return { gameId: String(gameId), isAlive };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to probe game'));
    }
  }
);

const initialState = gamesAdapter.getInitialState({
  selectedGameId: null,
  favoriteGameIds: [],
  publisherGameIdsByPublisherId: {},
  publisherGenres: [],
  publisherWorkspaceStatus: AsyncStatus.IDLE,
  analyticsByGameId: {},
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
    toggleFavoriteGame(state, action) {
      const gid = String(action.payload);
      if (state.favoriteGameIds.includes(gid)) {
        state.favoriteGameIds = state.favoriteGameIds.filter((x) => x !== gid);
      } else {
        state.favoriteGameIds.push(gid);
      }
    },
    setFavoriteGames(state, action) {
      state.favoriteGameIds = Array.isArray(action.payload) ? action.payload.map(String) : [];
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
      })
      // favourites
      .addCase(fetchFavoriteGames.fulfilled, (state, action) => {
        state.favoriteGameIds = action.payload;
      })
      .addCase(togglePlayerFavorite.fulfilled, (state, action) => {
        state.favoriteGameIds = action.payload;
      })
      .addCase(fetchPublisherGameWorkspace.pending, (state) => {
        state.publisherWorkspaceStatus = AsyncStatus.LOADING;
      })
      .addCase(fetchPublisherGameWorkspace.fulfilled, (state, action) => {
        state.publisherWorkspaceStatus = AsyncStatus.SUCCEEDED;
        gamesAdapter.upsertMany(state, action.payload.games);
        state.publisherGameIdsByPublisherId[action.payload.publisherId] = action.payload.games.map((game) => String(game.id || game.game_id));
        state.publisherGenres = action.payload.genres || [];
      })
      .addCase(fetchPublisherGameWorkspace.rejected, (state) => {
        state.publisherWorkspaceStatus = AsyncStatus.FAILED;
      })
      .addCase(savePublisherGameEdit.fulfilled, (state, action) => {
        if (action.payload.game) gamesAdapter.upsertOne(state, action.payload.game);
      })
      .addCase(deletePublisherGame.fulfilled, (state, action) => {
        gamesAdapter.removeOne(state, action.payload);
      })
      .addCase(fetchPublisherGameAnalytics.fulfilled, (state, action) => {
        state.analyticsByGameId[action.payload.gameId] = action.payload.data;
      })
      .addCase(publishPublisherGame.fulfilled, (state, action) => {
        if (action.payload.game) gamesAdapter.upsertOne(state, action.payload.game);
      });
  }
});

export const {
  setSelectedGameId,
  toggleFavoriteGame,
  setFavoriteGames,
  clearGamesError,
  resetGamesStatus
} = gameSlice.actions;

export default gameSlice.reducer;
