import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import tournamentsApi from '../../services/endpoints/tournamentsApi';
import { registerForTournament, withdrawFromTournament } from './registrationSlice';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const tournamentsAdapter = createEntityAdapter({
  selectId: (tournament) => String(tournament.id)
});

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

const initialState = tournamentsAdapter.getInitialState({
  stagesByTournamentId: {},
  ...initialAsyncState
});

export const tournamentSlice = createSlice({
  name: 'tournaments',
  initialState,
  reducers: {
    clearTournamentsError(state) {
      state.error = null;
    },
    resetTournamentsStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchTournaments
      .addCase(fetchTournaments.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchTournaments.fulfilled, (state, action) => {
        handleFulfilled(state);
        tournamentsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTournaments.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // fetchTournamentById
      .addCase(fetchTournamentById.fulfilled, (state, action) => {
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      // createTournament
      .addCase(createTournament.fulfilled, (state, action) => {
        if (action.payload) {
          tournamentsAdapter.addOne(state, action.payload);
        }
      })
      // updateTournament
      .addCase(updateTournament.fulfilled, (state, action) => {
        if (action.payload) {
          tournamentsAdapter.upsertOne(state, action.payload);
        }
      })
      // deleteTournament
      .addCase(deleteTournament.fulfilled, (state, action) => {
        tournamentsAdapter.removeOne(state, action.payload);
      })
      // fetchTournamentStages
      .addCase(fetchTournamentStages.fulfilled, (state, action) => {
        state.stagesByTournamentId[action.payload.id] = action.payload.stages;
      })
      // Coordinated action with registrationSlice:
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
      });
  }
});

export const { clearTournamentsError, resetTournamentsStatus } = tournamentSlice.actions;

export default tournamentSlice.reducer;
