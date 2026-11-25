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
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await socialApi.getTeams(params);
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

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ id, data, requesterId }, { rejectWithValue }) => {
    try {
      return await socialApi.updateTeam(id, data, requesterId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update team'));
    }
  }
);

export const addTeamMember = createAsyncThunk(
  'teams/addMember',
  async ({ teamId, userId, requesterId }, { rejectWithValue }) => {
    try {
      return await socialApi.addTeamMember(teamId, { user_id: userId }, requesterId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to add team member'));
    }
  }
);

export const removeTeamMember = createAsyncThunk(
  'teams/removeMember',
  async ({ teamId, userId, requesterId }, { rejectWithValue }) => {
    try {
      return await socialApi.removeTeamMember(teamId, userId, requesterId);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to remove team member'));
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async ({ id, requesterId }, { rejectWithValue }) => {
    try {
      await socialApi.deleteTeam(id, requesterId);
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
  async ({ teamId, fromUser, body }, { rejectWithValue }) => {
    try {
      const data = await socialApi.postTeamChat(teamId, { from_user: fromUser, body });
      return { teamId: String(teamId), message: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to post team chat'));
    }
  }
);

const initialState = teamsAdapter.getInitialState({
  chatByTeamId: {},
  listStatus: AsyncStatus.IDLE,
  listError: null,
  detailStatus: AsyncStatus.IDLE,
  detailError: null,
  mutationStatus: AsyncStatus.IDLE,
  mutationError: null,
  chatStatusByTeamId: {},
  chatErrorByTeamId: {},
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
        handlePending(state, 'listStatus');
        state.listError = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        handleFulfilled(state, 'listStatus');
        teamsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        handleRejected(state, action, 'listStatus');
        state.listError = state.error;
      })
      .addCase(fetchTeamById.pending, (state) => handlePending(state, 'detailStatus'))
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        handleFulfilled(state, 'detailStatus');
        if (action.payload) {
          teamsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        handleRejected(state, action, 'detailStatus');
        state.detailError = state.error;
      })
      .addCase(createTeam.pending, (state) => handlePending(state, 'mutationStatus'))
      .addCase(createTeam.fulfilled, (state, action) => {
        handleFulfilled(state, 'mutationStatus');
        if (action.payload) {
          teamsAdapter.addOne(state, action.payload);
        }
      })
      .addCase(createTeam.rejected, (state, action) => {
        handleRejected(state, action, 'mutationStatus');
        state.mutationError = state.error;
      })
      .addCase(updateTeam.pending, (state) => handlePending(state, 'mutationStatus'))
      .addCase(updateTeam.fulfilled, (state, action) => {
        handleFulfilled(state, 'mutationStatus');
        if (action.payload) teamsAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateTeam.rejected, (state, action) => {
        handleRejected(state, action, 'mutationStatus');
        state.mutationError = state.error;
      })
      .addCase(addTeamMember.pending, (state) => handlePending(state, 'mutationStatus'))
      .addCase(addTeamMember.fulfilled, (state, action) => {
        handleFulfilled(state, 'mutationStatus');
        if (action.payload) teamsAdapter.upsertOne(state, action.payload);
      })
      .addCase(addTeamMember.rejected, (state, action) => {
        handleRejected(state, action, 'mutationStatus');
        state.mutationError = state.error;
      })
      .addCase(removeTeamMember.pending, (state) => handlePending(state, 'mutationStatus'))
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        handleFulfilled(state, 'mutationStatus');
        if (action.payload) teamsAdapter.upsertOne(state, action.payload);
      })
      .addCase(removeTeamMember.rejected, (state, action) => {
        handleRejected(state, action, 'mutationStatus');
        state.mutationError = state.error;
      })
      .addCase(deleteTeam.pending, (state) => handlePending(state, 'mutationStatus'))
      .addCase(deleteTeam.fulfilled, (state, action) => {
        handleFulfilled(state, 'mutationStatus');
        teamsAdapter.removeOne(state, action.payload);
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        handleRejected(state, action, 'mutationStatus');
        state.mutationError = state.error;
      })
      .addCase(fetchTeamChat.pending, (state, action) => {
        const id = String(action.meta.arg);
        state.chatStatusByTeamId[id] = AsyncStatus.LOADING;
        state.chatErrorByTeamId[id] = null;
      })
      .addCase(fetchTeamChat.fulfilled, (state, action) => {
        state.chatByTeamId[action.payload.teamId] = action.payload.chat;
        state.chatStatusByTeamId[action.payload.teamId] = AsyncStatus.SUCCEEDED;
      })
      .addCase(fetchTeamChat.rejected, (state, action) => {
        const id = String(action.meta.arg);
        state.chatStatusByTeamId[id] = AsyncStatus.FAILED;
        state.chatErrorByTeamId[id] = action.payload || action.error?.message || 'Failed to fetch team chat';
      })
      .addCase(postTeamChatMessage.pending, (state, action) => {
        state.chatStatusByTeamId[String(action.meta.arg.teamId)] = AsyncStatus.LOADING;
      })
      .addCase(postTeamChatMessage.fulfilled, (state, action) => {
        const { teamId, message } = action.payload;
        if (!state.chatByTeamId[teamId]) state.chatByTeamId[teamId] = [];
        state.chatByTeamId[teamId].push(message);
        state.chatStatusByTeamId[teamId] = AsyncStatus.SUCCEEDED;
      })
      .addCase(postTeamChatMessage.rejected, (state, action) => {
        const id = String(action.meta.arg.teamId);
        state.chatStatusByTeamId[id] = AsyncStatus.FAILED;
        state.chatErrorByTeamId[id] = action.payload || action.error?.message || 'Failed to post team chat';
      });
  }
});

export const { clearTeamsError } = teamSlice.actions;

export default teamSlice.reducer;
