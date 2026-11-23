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

export const groupsAdapter = createEntityAdapter({
  selectId: (group) => String(group.id)
});

export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const data = await socialApi.getGroups();
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch groups'));
    }
  }
);

export const fetchGroupById = createAsyncThunk(
  'groups/fetchGroupById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await socialApi.getGroupById(id);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch group'));
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await socialApi.createGroup(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create group'));
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async ({ groupId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await socialApi.joinGroup(groupId, dto);
      return { groupId: String(groupId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to join group'));
    }
  }
);

export const leaveGroup = createAsyncThunk(
  'groups/leaveGroup',
  async ({ groupId, ...dto }, { rejectWithValue }) => {
    try {
      const data = await socialApi.leaveGroup(groupId, dto);
      return { groupId: String(groupId), result: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to leave group'));
    }
  }
);

export const fetchGroupChat = createAsyncThunk(
  'groups/fetchChat',
  async (groupId, { rejectWithValue }) => {
    try {
      const data = await socialApi.getGroupChat(groupId);
      return { groupId: String(groupId), chat: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch group chat'));
    }
  }
);

export const postGroupChatMessage = createAsyncThunk(
  'groups/postChat',
  async ({ groupId, message }, { rejectWithValue }) => {
    try {
      const data = await socialApi.postGroupChat(groupId, { message });
      return { groupId: String(groupId), message: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to post group chat'));
    }
  }
);

const initialState = groupsAdapter.getInitialState({
  chatByGroupId: {},
  ...initialAsyncState
});

export const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    clearGroupsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        handlePending(state);
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        handleFulfilled(state);
        groupsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        handleRejected(state, action);
      })
      .addCase(fetchGroupById.fulfilled, (state, action) => {
        if (action.payload) {
          groupsAdapter.upsertOne(state, action.payload);
        }
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        if (action.payload) {
          groupsAdapter.addOne(state, action.payload);
        }
      })
      .addCase(fetchGroupChat.fulfilled, (state, action) => {
        state.chatByGroupId[action.payload.groupId] = action.payload.chat;
      })
      .addCase(postGroupChatMessage.fulfilled, (state, action) => {
        const { groupId, message } = action.payload;
        if (!state.chatByGroupId[groupId]) state.chatByGroupId[groupId] = [];
        state.chatByGroupId[groupId].push(message);
      });
  }
});

export const { clearGroupsError } = groupSlice.actions;

export default groupSlice.reducer;
