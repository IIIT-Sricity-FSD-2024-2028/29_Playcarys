import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tournamentsApi from '../../services/endpoints/tournamentsApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const fetchRegistrations = createAsyncThunk(
  'registrations/fetchRegistrations',
  async (tournamentId, { rejectWithValue }) => {
    try {
      const data = await tournamentsApi.getRegistrations(tournamentId);
      return { tournamentId: String(tournamentId), registrations: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch registrations'));
    }
  }
);

export const registerForTournament = createAsyncThunk(
  'registrations/register',
  async ({ tournamentId, playerId, teamId, ...extra }, { rejectWithValue }) => {
    try {
      let res;
      if (teamId) {
        res = await tournamentsApi.registerTeam(teamId, tournamentId);
      } else {
        res = await tournamentsApi.registerPlayer(tournamentId, {
          player_id: playerId,
          ...extra
        });
      }
      return {
        tournamentId: String(tournamentId),
        playerId: playerId ? String(playerId) : undefined,
        teamId: teamId ? String(teamId) : undefined,
        registration: res
      };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Registration failed'));
    }
  }
);

export const withdrawFromTournament = createAsyncThunk(
  'registrations/withdraw',
  async ({ tournamentId, playerId, teamId }, { rejectWithValue }) => {
    try {
      if (teamId) {
        await tournamentsApi.unregisterTeam(teamId, tournamentId);
      } else {
        await tournamentsApi.unregisterPlayer(tournamentId, playerId);
      }
      return {
        tournamentId: String(tournamentId),
        playerId: playerId ? String(playerId) : undefined,
        teamId: teamId ? String(teamId) : undefined
      };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Withdrawal failed'));
    }
  }
);

const initialState = {
  byTournament: {},
  ...initialAsyncState
};

export const registrationSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {
    clearRegistrationError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchRegistrations
      .addCase(fetchRegistrations.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        handleFulfilled(state);
        state.byTournament[action.payload.tournamentId] = action.payload.registrations;
      })
      .addCase(fetchRegistrations.rejected, (state, action) => {
        handleRejected(state, action);
      })
      // registerForTournament
      .addCase(registerForTournament.fulfilled, (state, action) => {
        const { tournamentId, registration } = action.payload;
        if (!state.byTournament[tournamentId]) {
          state.byTournament[tournamentId] = [];
        }
        if (registration) {
          state.byTournament[tournamentId].push(registration);
        }
      })
      // withdrawFromTournament
      .addCase(withdrawFromTournament.fulfilled, (state, action) => {
        const { tournamentId, playerId, teamId } = action.payload;
        if (state.byTournament[tournamentId]) {
          state.byTournament[tournamentId] = state.byTournament[tournamentId].filter((r) => {
            if (playerId && (String(r.player_id) === playerId || String(r.id) === playerId)) {
              return false;
            }
            if (teamId && String(r.team_id) === teamId) {
              return false;
            }
            return true;
          });
        }
      });
  }
});

export const { clearRegistrationError } = registrationSlice.actions;

export default registrationSlice.reducer;
