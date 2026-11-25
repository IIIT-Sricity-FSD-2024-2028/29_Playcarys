import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import registrationsApi from '../../services/endpoints/registrationsApi';
import {
  AsyncStatus,
  extractErrorMessage
} from '../../app/asyncUtils';

// ── Async Thunks ─────────────────────────────────────────────

/**
 * Fetch all registrations for a given tournament.
 */
export const fetchRegistrations = createAsyncThunk(
  'registrations/fetchRegistrations',
  async (tournamentId, { rejectWithValue }) => {
    try {
      const data = await registrationsApi.getRegistrations(tournamentId);
      return { tournamentId: String(tournamentId), registrations: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch registrations'));
    }
  }
);

/**
 * Register an individual player or a team for a tournament.
 */
export const registerForTournament = createAsyncThunk(
  'registrations/register',
  async ({ tournamentId, playerId, teamId, requesterId, ...extra }, { rejectWithValue }) => {
    try {
      let res;
      if (teamId) {
        res = await registrationsApi.registerTeam(teamId, tournamentId, requesterId || playerId);
      } else {
        res = await registrationsApi.registerPlayer(tournamentId, {
          player_id: playerId,
          ...extra
        });
      }
      return {
        tournamentId: String(tournamentId),
        playerId: playerId != null ? String(playerId) : undefined,
        teamId: teamId != null ? String(teamId) : undefined,
        registration: res
      };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Registration failed'));
    }
  }
);

/**
 * Withdraw an individual player or a team from a tournament.
 */
export const withdrawFromTournament = createAsyncThunk(
  'registrations/withdraw',
  async ({ tournamentId, playerId, teamId, requesterId }, { rejectWithValue }) => {
    try {
      if (teamId) {
        await registrationsApi.unregisterTeam(teamId, tournamentId, requesterId || playerId);
      } else {
        await registrationsApi.unregisterPlayer(tournamentId, playerId);
      }
      return {
        tournamentId: String(tournamentId),
        playerId: playerId != null ? String(playerId) : undefined,
        teamId: teamId != null ? String(teamId) : undefined
      };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Withdrawal failed'));
    }
  }
);

// ── Slice Definition ─────────────────────────────────────────

const initialState = {
  // Registrations indexed by tournamentId: { [tournamentId]: Registration[] }
  byTournament: {},

  // Registrations indexed by playerId: { [playerId]: Registration[] }
  byPlayer: {},

  // Granular async tracking avoiding one global flag
  fetchStatus: AsyncStatus.IDLE,
  fetchError: null,

  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,

  statusByTournament: {},
  errorByTournament: {},

  // Compatibility aliases
  status: AsyncStatus.IDLE,
  error: null
};

export const registrationSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {
    clearRegistrationError(state) {
      state.error = null;
      state.fetchError = null;
      state.mutationError = null;
    },
    resetRegistrationStatus(state) {
      state.status = AsyncStatus.IDLE;
      state.fetchStatus = AsyncStatus.IDLE;
      state.mutationStatus = AsyncStatus.IDLE;
      state.error = null;
      state.fetchError = null;
      state.mutationError = null;
      state.statusByTournament = {};
      state.errorByTournament = {};
    },
    clearRegistrationMutationStatus(state) {
      state.mutationStatus = AsyncStatus.IDLE;
      state.mutationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── fetchRegistrations ─────────────────────────────────
      .addCase(fetchRegistrations.pending, (state, action) => {
        state.fetchStatus = AsyncStatus.LOADING;
        state.fetchError = null;
        state.status = AsyncStatus.LOADING;
        state.error = null;
        if (action.meta?.arg) {
          state.statusByTournament[String(action.meta.arg)] = AsyncStatus.LOADING;
          state.errorByTournament[String(action.meta.arg)] = null;
        }
      })
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        state.fetchStatus = AsyncStatus.SUCCEEDED;
        state.fetchError = null;
        state.status = AsyncStatus.SUCCEEDED;
        state.error = null;
        state.byTournament[action.payload.tournamentId] = action.payload.registrations;
        state.statusByTournament[action.payload.tournamentId] = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchRegistrations.rejected, (state, action) => {
        state.fetchStatus = AsyncStatus.FAILED;
        state.fetchError = action.payload || 'Failed to fetch registrations';
        state.status = AsyncStatus.FAILED;
        state.error = state.fetchError;
        if (action.meta?.arg) {
          state.statusByTournament[String(action.meta.arg)] = AsyncStatus.FAILED;
          state.errorByTournament[String(action.meta.arg)] = state.fetchError;
        }
      })

      // ── registerForTournament ──────────────────────────────
      .addCase(registerForTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(registerForTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { tournamentId, registration, playerId, teamId } = action.payload;
        if (!state.byTournament[tournamentId]) {
          state.byTournament[tournamentId] = [];
        }
        if (registration) {
          const list = state.byTournament[tournamentId];
          const existingIdx = list.findIndex((r) => {
            if (playerId && (String(r.playerId || r.player_id) === String(playerId) || String(r.id) === String(playerId))) {
              return true;
            }
            if (teamId && String(r.teamId || r.team_id) === String(teamId)) {
              return true;
            }
            if (registration.id && String(r.id) === String(registration.id)) {
              return true;
            }
            return false;
          });
          if (existingIdx >= 0) {
            list[existingIdx] = registration;
          } else {
            list.push(registration);
          }
        }
        if (playerId) {
          const pIdStr = String(playerId);
          if (!state.byPlayer) state.byPlayer = {};
          if (!state.byPlayer[pIdStr]) state.byPlayer[pIdStr] = [];
          const pList = state.byPlayer[pIdStr];
          const regRecord = registration || {
            id: `${tournamentId}_${pIdStr}`,
            tournamentId: String(tournamentId),
            playerId: pIdStr,
            status: 'confirmed'
          };
          const existingPIdx = pList.findIndex(
            (r) => String(r.tournamentId || r.tournament_id) === String(tournamentId)
          );
          if (existingPIdx >= 0) {
            pList[existingPIdx] = regRecord;
          } else {
            pList.push(regRecord);
          }
        }
      })
      .addCase(registerForTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Registration failed';
      })

      // ── withdrawFromTournament ────────────────────────────
      .addCase(withdrawFromTournament.pending, (state) => {
        state.mutationStatus = AsyncStatus.LOADING;
        state.mutationError = null;
      })
      .addCase(withdrawFromTournament.fulfilled, (state, action) => {
        state.mutationStatus = AsyncStatus.SUCCEEDED;
        state.mutationError = null;
        const { tournamentId, playerId, teamId } = action.payload;
        if (state.byTournament[tournamentId]) {
          state.byTournament[tournamentId] = state.byTournament[tournamentId].filter((r) => {
            if (playerId && (String(r.playerId || r.player_id) === String(playerId) || String(r.id) === String(playerId))) {
              return false;
            }
            if (teamId && String(r.teamId || r.team_id) === String(teamId)) {
              return false;
            }
            return true;
          });
        }
        if (playerId && state.byPlayer?.[String(playerId)]) {
          state.byPlayer[String(playerId)] = state.byPlayer[String(playerId)].filter(
            (r) => String(r.tournamentId || r.tournament_id) !== String(tournamentId)
          );
        }
      })
      .addCase(withdrawFromTournament.rejected, (state, action) => {
        state.mutationStatus = AsyncStatus.FAILED;
        state.mutationError = action.payload || 'Withdrawal failed';
      })

      // ── Synchronization with fetchPlayerTournaments ────────
      .addCase('tournaments/fetchPlayerTournaments/fulfilled', (state, action) => {
        const playerId = action.meta?.arg != null ? String(action.meta.arg) : null;
        if (playerId && Array.isArray(action.payload)) {
          if (!state.byPlayer) state.byPlayer = {};
          state.byPlayer[playerId] = action.payload.map((t) => ({
            id: `${t.id || t.tournament_id}_${playerId}`,
            tournamentId: String(t.id || t.tournament_id),
            playerId,
            status: 'confirmed'
          }));
        }
      });
  }
});

export const {
  clearRegistrationError,
  resetRegistrationStatus,
  clearRegistrationMutationStatus
} = registrationSlice.actions;

export default registrationSlice.reducer;
