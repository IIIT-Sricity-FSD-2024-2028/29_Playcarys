import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import socialApi from '../../services/endpoints/socialApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const teamsAdapter = createEntityAdapter({
  selectId: (team) => String(team.id)
});

export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (_, { rejectWithValue }) => {
    try {
      const data = await socialApi.getTeams();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch teams'));
    }
  }
);

export const fetchTeamById = createAsyncThunk(
  'teams/fetchTeamById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await socialApi.getTeamById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch team'));
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await socialApi.createTeam(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create team'));
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (id, { rejectWithValue }) => {
    try {
      await socialApi.deleteTeam(id);
      return String(id);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete team'));
    }
  }
);

export const fetchTeamChat = createAsyncThunk(
  'teams/fetchChat',
  async (teamId, { rejectWithValue }) => {
    try {
      const data = await socialApi.getTeamChat(teamId);
      return { teamId: String(teamId), chat: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch team chat'));
    }
  }
);

export const postTeamChatMessage = createAsyncThunk(
  'teams/postChat',
  async ({ teamId, message }, { rejectWithValue }) => {
    try {
      const data = await socialApi.postTeamChat(teamId, { message });
      return { teamId: String(teamId), message: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to post team chat'));
    }
  }
);

const initialState = teamsAdapter.getInitialState({
  chatByTeamId: {},
  ...initialAsyncState
});

export const teamSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearTeamsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        handleFulfilled(state);
        teamsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        if (action.payload) {
          teamsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        if (action.payload) {
          teamsAdapter.addOne(state, action.payload);
        }
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        teamsAdapter.removeOne(state, action.payload);
      })
      .addCase(fetchTeamChat.fulfilled, (state, action) => {
        state.chatByTeamId[action.payload.teamId] = action.payload.chat;
      })
      .addCase(postTeamChatMessage.fulfilled, (state, action) => {
        const { teamId, message } = action.payload;
        if (!state.chatByTeamId[teamId]) state.chatByTeamId[teamId] = [];
        state.chatByTeamId[teamId].push(message);
      });
  }
});

export const { clearTeamsError } = teamSlice.actions;

export default teamSlice.reducer;
