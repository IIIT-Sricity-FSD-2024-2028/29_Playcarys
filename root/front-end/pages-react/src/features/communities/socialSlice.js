import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import socialApi from '../../services/endpoints/socialApi';
import {
  AsyncStatus,
  initialAsyncState,
  extractErrorMessage,
  handlePending,
  handleFulfilled,
  handleRejected
} from '../../app/asyncUtils';

export const searchPlayers = createAsyncThunk(
  'social/searchPlayers',
  async (query, { rejectWithValue }) => {
    try {
      const data = await socialApi.searchPlayers(query);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Search failed'));
    }
  }
);

export const fetchFriends = createAsyncThunk(
  'social/fetchFriends',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await socialApi.getFriends(userId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch friends'));
    }
  }
);

export const fetchFriendRequests = createAsyncThunk(
  'social/fetchFriendRequests',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await socialApi.getFriendRequests(userId);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch friend requests'));
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'social/fetchMessages',
  async ({ userId, withUserId }, { rejectWithValue }) => {
    try {
      const data = await socialApi.getMessages(userId, withUserId);
      return { withUserId: String(withUserId), messages: data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch messages'));
    }
  }
);

export const sendMessage = createAsyncThunk(
  'social/sendMessage',
  async (dto, { rejectWithValue }) => {
    try {
      const data = await socialApi.sendMessage(dto);
      return data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to send message'));
    }
  }
);

const initialState = {
  searchResults: [],
  friends: [],
  friendRequests: [],
  messagesByContact: {},
  ...initialAsyncState
};

export const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    clearSearchResults(state) {
      state.searchResults = [];
    },
    clearSocialError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchPlayers.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.friends = action.payload;
      })
      .addCase(fetchFriendRequests.fulfilled, (state, action) => {
        state.friendRequests = action.payload;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messagesByContact[action.payload.withUserId] = action.payload.messages;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const contactId = String(action.payload?.recipient_id || action.payload?.to_user_id);
        if (contactId) {
          if (!state.messagesByContact[contactId]) state.messagesByContact[contactId] = [];
          state.messagesByContact[contactId].push(action.payload);
        }
      });
  }
});

export const { clearSearchResults, clearSocialError } = socialSlice.actions;

export default socialSlice.reducer;
