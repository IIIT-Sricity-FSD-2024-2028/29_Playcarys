import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import tournamentsApi from '../../services/endpoints/tournamentsApi';
import { registerForTournament, withdrawFromTournament } from './registrationSlice';
import {
  AsyncStatus,
  extractErrorMessage
} from '../../app/asyncUtils';

/**
 * Entity adapter for tournament records.
 * Uses normalized String(id) as entity key.
 */
export const tournamentsAdapter = createEntityAdapter({
  selectId: (tournament) => String(tournament.id)
});

// ── Async Thunks ─────────────────────────────────────────────

export const fetchTournaments = createAsyncThunk(
  'tournaments/fetchTournaments',
  async (params, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getTournaments(params);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournaments'));
    }
  }
);

export const fetchTournamentById = createAsyncThunk(
  'tournaments/fetchTournamentById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getTournamentById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournament'));
    }
  }
);

export const fetchPlayerTournaments = createAsyncThunk(
  'tournaments/fetchPlayerTournaments',
  async (playerId, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getPlayerTournaments(playerId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch player tournaments'));
    }
  }
);

export const createTournament = createAsyncThunk(
  'tournaments/createTournament',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.createTournament(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create tournament'));
    }
  }
);

export const updateTournament = createAsyncThunk(
  'tournaments/updateTournament',
  async ({ id, data: dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.updateTournament(id, dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update tournament'));
    }
  }
);

export const deleteTournament = createAsyncThunk(
  'tournaments/deleteTournament',
  async (id, { rejectWithValue }) => {
    try {
      await tournamentsApi.deleteTournament(id);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete tournament'));
    }
  }
);

export const startTournament = createAsyncThunk(
  'tournaments/startTournament',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.startTournament(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to start tournament'));
    }
  }
);

export const fetchTournamentStages = createAsyncThunk(
  'tournaments/fetchStages',
  async (id, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getStages(id);
      return { id: String(id), stages: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch tournament stages'));
    }
  }
);

export const addTournamentStage = createAsyncThunk(
  'tournaments/addStage',
  async ({ tournamentId, stage: dto }, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.addStage(tournamentId, dto);
      return { tournamentId: String(tournamentId), stage: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to add tournament stage'));
    }
  }
);

export const removeTournamentStage = createAsyncThunk(
  'tournaments/removeStage',
  async ({ tournamentId, stageId }, { rejectWithValue }) => {
    try {
      await tournamentsApi.removeStage(tournamentId, stageId);
      return { tournamentId: String(tournamentId), stageId: String(stageId) };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to remove tournament stage'));
    }
  }
);

// ── Slice Definition ─────────────────────────────────────────

const initialState = tournamentsAdapter.getInitialState({
  // Dedicated stages dictionary indexed by tournament id: { [tournamentId]: Stage[] }
  stagesByTournamentId: {},

  // Player tournaments mapping indexed by player id: { [playerId]: string[] }
  playerTournamentIdsByPlayerId: {},

  // Granular request statuses and errors avoiding one global loading flag
  listStatus: AsyncStatus.IDLE,
  listError: null,

  detailStatus: AsyncStatus.IDLE,
  detailError: null,

  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,

  stageStatus: AsyncStatus.IDLE,
  stageError: null,

  // Compatibility aliases for existing consumers (e.g. Tournaments.jsx)
  status: AsyncStatus.IDLE,
  error: null
});

export const tournamentSlice = createSlice({
  name: 'tournaments',
  initialState,
  reducers: {
    clearTournamentsError(state) {
      state.error = null;
      state.listError = null;
      state.detailError = null;
      state.mutationError = null;
      state.stageError = null;
    },
    resetTournamentsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.listStatus = AsyncStatus.IDLE;
      state.detailStatus = AsyncStatus.IDLE;
      state.mutationStatus = AsyncStatus.IDLE;
      state.stageStatus = AsyncStatus.IDLE;
      state.error = null;
      state.listError = null;
      state.detailError = null;
      state.mutationError = null;
      state.stageError = null;
    },
    resetMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchTournaments ──────────────────────────────────
      .addCase(fetchTournaments.pending, (state) => {
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
        state.status = AsyncStatus.LOADING;
        state.error = null;
      })
      .addCase(fetchTournaments.fulfilled, (state, action) => {
        state.listStatus = AsyncStatus.SUCCEEDED;
        state.listError = null;
        state.status = AsyncStatus.SUCCEEDED;
        state.error = null;
        tournamentsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTournaments.rejected, (state, action) => {
        state.listStatus = AsyncStatus.FAILED;
        state.listError = action.payload || 'Failed to fetch tournaments';
        state.status = AsyncStatus.FAILED;
        state.error = state.listError;
      })

      // ── fetchTournamentById ───────────────────────────────
      .addCase(fetchTournamentById.pending, (state) => {
        state.detailStatus = AsyncStatus.LOADING;
        state.detailError = null;
      })
      .addCase(fetchTournamentById.fulfilled, (state, action) => {
        state.detailStatus = AsyncStatus.SUCCEEDED;
        state.detailError = null;
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(fetchTournamentById.rejected, (state, action) => {
        state.detailStatus = AsyncStatus.FAILED;
        state.detailError = action.payload || 'Failed to fetch tournament';
      })

      // ── fetchPlayerTournaments ────────────────────────────
      .addCase(fetchPlayerTournaments.pending, (state) => {
        state.listStatus = AsyncStatus.LOADING;
        state.listError = null;
      })
      .addCase(fetchPlayerTournaments.fulfilled, (state, action) => {
        state.listStatus = AsyncStatus.SUCCEEDED;
        state.listError = null;
        if (action.payload && action.payload.length > 0) {
          tournamentsAdapter.upsertMany(state, action.payload);
        }
        const playerId = action.meta?.arg != null ? String(action.meta.arg) : null;
        if (playerId) {
          if (!state.playerTournamentIdsByPlayerId) {
            state.playerTournamentIdsByPlayerId = {};
          }
          state.playerTournamentIdsByPlayerId[playerId] = (action.payload || []).map(
            (t) => String(t.id || t.tournament_id)
          );
        }
      })
      .addCase(fetchPlayerTournaments.rejected, (state, action) => {
        state.listStatus = AsyncStatus.FAILED;
        state.listError = action.payload || 'Failed to fetch player tournaments';
      })

      // ── createTournament ──────────────────────────────────
      .addCase(createTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(createTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          tournamentsAdapter.addOne(state, action.payload);
        }
      })
      .addCase(createTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to create tournament';
      })

      // ── updateTournament ──────────────────────────────────
      .addCase(updateTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(updateTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(updateTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to update tournament';
      })

      // ── deleteTournament ──────────────────────────────────
      .addCase(deleteTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(deleteTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        tournamentsAdapter.removeOne(state, action.payload);
        delete state.stagesByTournamentId[action.payload];
      })
      .addCase(deleteTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to delete tournament';
      })

      // ── startTournament ───────────────────────────────────
      .addCase(startTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(startTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(startTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to start tournament';
      })

      // ── fetchTournamentStages ─────────────────────────────
      .addCase(fetchTournamentStages.pending, (state) => {
        state.stageStatus = AsyncStatus.LOADING;
        state.stageError = null;
      })
      .addCase(fetchTournamentStages.fulfilled, (state, action) => {
        state.stageStatus = AsyncStatus.SUCCEEDED;
        state.stageError = null;
        state.stagesByTournamentId[action.payload.id] = action.payload.stages;
      })
      .addCase(fetchTournamentStages.rejected, (state, action) => {
        state.stageStatus = AsyncStatus.FAILED;
        state.stageError = action.payload || 'Failed to fetch tournament stages';
      })

      // ── addTournamentStage ────────────────────────────────
      .addCase(addTournamentStage.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(addTournamentStage.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const tid = String(action.payload.tournamentId);
        if (!state.stagesByTournamentId[tid]) {
          state.stagesByTournamentId[tid] = [];
        }
        state.stagesByTournamentId[tid].push(action.payload.stage);
      })
      .addCase(addTournamentStage.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to add tournament stage';
      })

      // ── removeTournamentStage ─────────────────────────────
      .addCase(removeTournamentStage.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(removeTournamentStage.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { tournamentId, stageId } = action.payload;
        if (state.stagesByTournamentId[tournamentId]) {
          state.stagesByTournamentId[tournamentId] = state.stagesByTournamentId[tournamentId].filter(
            (s) => String(s.id || s.stage_id || s.tournament_game_id) !== String(stageId)
          );
        }
      })
      .addCase(removeTournamentStage.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Failed to remove tournament stage';
      })

      // ── Coordinated actions with registrationSlice ────────
      .addCase(registerForTournament.fulfilled, (state, action) => {
        const tid = String(action.payload.tournamentId);
        const t = state.entities[tid];
        if (t) {
          t.participants = (Number(t.participants) || 0) + 1;
          if (action.payload.playerId) {
            t.registered_player_ids = t.registered_player_ids || [];
            if (!t.registered_player_ids.includes(action.payload.playerId)) {
              t.registered_player_ids.push(action.payload.playerId);
            }
          }
        }
        const playerId = action.payload.playerId != null ? String(action.payload.playerId) : null;
        if (playerId && state.playerTournamentIdsByPlayerId?.[playerId]) {
          if (!state.playerTournamentIdsByPlayerId[playerId].includes(tid)) {
            state.playerTournamentIdsByPlayerId[playerId].push(tid);
          }
        }
      })
      .addCase(withdrawFromTournament.fulfilled, (state, action) => {
        const tid = String(action.payload.tournamentId);
        const t = state.entities[tid];
        if (t) {
          t.participants = Math.max(0, (Number(t.participants) || 1) - 1);
          if (action.payload.playerId && t.registered_player_ids) {
            t.registered_player_ids = t.registered_player_ids.filter(
              (id) => String(id) !== String(action.payload.playerId)
            );
          }
        }
        const playerId = action.payload.playerId != null ? String(action.payload.playerId) : null;
        if (playerId && state.playerTournamentIdsByPlayerId?.[playerId]) {
          state.playerTournamentIdsByPlayerId[playerId] = state.playerTournamentIdsByPlayerId[playerId].filter(
            (id) => String(id) !== tid
          );
        }
      });
  }
});

export const {
  clearTournamentsError,
  resetTournamentsStatus,
  resetMutationStatus
} = tournamentSlice.actions;

export default tournamentSlice.reducer;
