import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import socialApi from '../../services/endpoints/socialApi';
import { AsyncStatus, extractErrorMessage } from '../../app/asyncUtils';

const createSocialThunk = (type, work, fallback) => createAsyncThunk(type, async (arg, { rejectWithValue }) => {
  try { return await work(arg); } catch (error) { return rejectWithValue(extractErrorMessage(error, fallback)); }
});

export const searchPlayers = createSocialThunk('social/searchPlayers', ({ query, viewerId }) => socialApi.searchPlayers(query, viewerId), 'Search failed');
export const fetchFriends = createSocialThunk('social/fetchFriends', (userId) => socialApi.getFriends(userId), 'Failed to fetch friends');
export const fetchFriendRequests = createSocialThunk('social/fetchFriendRequests', (userId) => socialApi.getFriendRequests(userId), 'Failed to fetch friend requests');
export const sendFriendRequest = createSocialThunk('social/sendFriendRequest', (dto) => socialApi.sendFriendRequest(dto), 'Failed to send friend request');
export const respondToFriendRequest = createSocialThunk('social/respondToFriendRequest', async ({ requestId, userId, action }) => {
  await socialApi.respondFriendRequest(requestId, { user_id: userId, action });
  return { requestId: String(requestId), userId, action, requests: await socialApi.getFriendRequests(userId), friends: action === 'accept' ? await socialApi.getFriends(userId) : undefined };
}, 'Failed to respond to friend request');
export const removeFriend = createSocialThunk('social/removeFriend', async ({ userId, friendId }) => {
  await socialApi.removeFriend(userId, friendId);
  return { friendId: String(friendId), friends: await socialApi.getFriends(userId) };
}, 'Failed to remove friend');
export const fetchMessages = createSocialThunk('social/fetchMessages', async ({ userId, withUserId }) => ({ withUserId: String(withUserId), messages: await socialApi.getMessages(userId, withUserId) }), 'Failed to fetch messages');
export const sendMessage = createSocialThunk('social/sendMessage', async (dto) => ({ message: await socialApi.sendMessage(dto), contactId: String(dto.to_user) }), 'Failed to send message');

const initialState = {
  searchResults: [], friends: [], friendRequests: { incoming: [], outgoing: [] }, messagesByContact: {},
  searchStatus: AsyncStatus.IDLE, friendsStatus: AsyncStatus.IDLE, requestsStatus: AsyncStatus.IDLE,
  messagesStatusByContact: {}, mutationStatus: AsyncStatus.IDLE, error: null
};
const setMutationPending = (state) => { state.mutationStatus = AsyncStatus.LOADING; state.error = null; };
const setMutationRejected = (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.error = action.payload || action.error?.message || 'Operation failed'; };

export const socialSlice = createSlice({
  name: 'social', initialState,
  reducers: {
    clearSearchResults: (state) => { state.searchResults = []; },
    clearSocialError: (state) => { state.error = null; },
    clearConversation: (state, action) => { delete state.messagesByContact[String(action.payload)]; }
  },
  extraReducers: (builder) => builder
    .addCase(searchPlayers.pending, (state) => { state.searchStatus = AsyncStatus.LOADING; state.error = null; })
    .addCase(searchPlayers.fulfilled, (state, action) => { state.searchStatus = AsyncStatus.SUCCEEDED; state.searchResults = action.payload; })
    .addCase(searchPlayers.rejected, (state, action) => { state.searchStatus = AsyncStatus.FAILED; state.error = action.payload || action.error?.message; })
    .addCase(fetchFriends.pending, (state) => { state.friendsStatus = AsyncStatus.LOADING; })
    .addCase(fetchFriends.fulfilled, (state, action) => { state.friendsStatus = AsyncStatus.SUCCEEDED; state.friends = action.payload; })
    .addCase(fetchFriends.rejected, (state, action) => { state.friendsStatus = AsyncStatus.FAILED; state.error = action.payload || action.error?.message; })
    .addCase(fetchFriendRequests.pending, (state) => { state.requestsStatus = AsyncStatus.LOADING; })
    .addCase(fetchFriendRequests.fulfilled, (state, action) => { state.requestsStatus = AsyncStatus.SUCCEEDED; state.friendRequests = action.payload || { incoming: [], outgoing: [] }; })
    .addCase(fetchFriendRequests.rejected, (state, action) => { state.requestsStatus = AsyncStatus.FAILED; state.error = action.payload || action.error?.message; })
    .addCase(sendFriendRequest.pending, setMutationPending).addCase(sendFriendRequest.fulfilled, (state) => { state.mutationStatus = AsyncStatus.SUCCEEDED; }).addCase(sendFriendRequest.rejected, setMutationRejected)
    .addCase(respondToFriendRequest.pending, setMutationPending).addCase(respondToFriendRequest.fulfilled, (state, action) => { state.mutationStatus = AsyncStatus.SUCCEEDED; state.friendRequests = action.payload.requests; if (action.payload.friends) state.friends = action.payload.friends; }).addCase(respondToFriendRequest.rejected, setMutationRejected)
    .addCase(removeFriend.pending, setMutationPending).addCase(removeFriend.fulfilled, (state, action) => { state.mutationStatus = AsyncStatus.SUCCEEDED; state.friends = action.payload.friends; delete state.messagesByContact[action.payload.friendId]; }).addCase(removeFriend.rejected, setMutationRejected)
    .addCase(fetchMessages.pending, (state, action) => { state.messagesStatusByContact[String(action.meta.arg.withUserId)] = AsyncStatus.LOADING; })
    .addCase(fetchMessages.fulfilled, (state, action) => { state.messagesStatusByContact[action.payload.withUserId] = AsyncStatus.SUCCEEDED; state.messagesByContact[action.payload.withUserId] = action.payload.messages; })
    .addCase(fetchMessages.rejected, (state, action) => { state.messagesStatusByContact[String(action.meta.arg.withUserId)] = AsyncStatus.FAILED; state.error = action.payload || action.error?.message; })
    .addCase(sendMessage.pending, setMutationPending).addCase(sendMessage.fulfilled, (state, action) => { const { contactId, message } = action.payload; state.mutationStatus = AsyncStatus.SUCCEEDED; (state.messagesByContact[contactId] ||= []).push(message); }).addCase(sendMessage.rejected, setMutationRejected)
});

export const { clearSearchResults, clearSocialError, clearConversation } = socialSlice.actions;
export default socialSlice.reducer;
