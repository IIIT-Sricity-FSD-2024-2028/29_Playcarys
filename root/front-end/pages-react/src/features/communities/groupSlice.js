import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import socialApi from '../../services/endpoints/socialApi';
import { AsyncStatus, extractErrorMessage } from '../../app/asyncUtils';

export const groupsAdapter = createEntityAdapter({ selectId: (group) => String(group.id) });
const message = (error, fallback) => extractErrorMessage(error, fallback);
const refreshGroup = (groupId) => socialApi.getGroupById(groupId);
const thunk = (type, work, fallback) => createAsyncThunk(type, async (arg, { rejectWithValue }) => {
  try { return await work(arg); } catch (error) { return rejectWithValue(message(error, fallback)); }
});

export const fetchGroups = thunk('groups/fetchGroups', (params = {}) => socialApi.getGroups(params), 'Failed to fetch groups');
export const fetchGroupById = thunk('groups/fetchGroupById', refreshGroup, 'Failed to fetch group');
export const createGroup = thunk('groups/createGroup', socialApi.createGroup, 'Failed to create group');
export const updateGroup = thunk('groups/updateGroup', ({ id, data, requesterId }) => socialApi.updateGroup(id, data, requesterId), 'Failed to update group');
export const deleteGroup = thunk('groups/deleteGroup', async ({ id, requesterId }) => { await socialApi.deleteGroup(id, requesterId); return String(id); }, 'Failed to delete group');
export const joinGroup = thunk('groups/joinGroup', async ({ groupId, userId }) => { const result = await socialApi.joinGroup(groupId, userId); return { group: await refreshGroup(groupId), result }; }, 'Failed to join group');
export const leaveGroup = thunk('groups/leaveGroup', async ({ groupId, userId }) => { const result = await socialApi.leaveGroup(groupId, userId); return { group: await refreshGroup(groupId), result }; }, 'Failed to leave group');
export const promoteGroupOfficer = thunk('groups/promoteOfficer', ({ groupId, userId, requesterId }) => socialApi.promoteGroupOfficer(groupId, userId, requesterId), 'Failed to promote officer');
export const demoteGroupOfficer = thunk('groups/demoteOfficer', ({ groupId, userId, requesterId }) => socialApi.demoteGroupOfficer(groupId, userId, requesterId), 'Failed to demote officer');
export const removeGroupMember = thunk('groups/removeMember', async ({ groupId, userId, requesterId }) => { await socialApi.removeGroupMember(groupId, userId, requesterId); return refreshGroup(groupId); }, 'Failed to remove group member');
export const fetchGroupRequests = thunk('groups/fetchRequests', async ({ groupId, requesterId }) => ({ groupId: String(groupId), requests: await socialApi.getGroupRequests(groupId, requesterId) }), 'Failed to fetch group requests');
export const respondToGroupRequest = thunk('groups/respondToRequest', async ({ groupId, requestId, accept, requesterId }) => { await socialApi.respondToGroupRequest(groupId, requestId, accept, requesterId); return { groupId: String(groupId), requestId: String(requestId), group: await refreshGroup(groupId) }; }, 'Failed to respond to group request');
export const fetchGroupTournaments = thunk('groups/fetchTournaments', async (groupId) => ({ groupId: String(groupId), tournaments: await socialApi.getGroupTournaments(groupId) }), 'Failed to fetch group tournaments');
export const fetchGroupChat = thunk('groups/fetchChat', async (groupId) => ({ groupId: String(groupId), chat: await socialApi.getGroupChat(groupId) }), 'Failed to fetch group chat');
export const postGroupChatMessage = thunk('groups/postChat', async ({ groupId, fromUser, body }) => ({ groupId: String(groupId), message: await socialApi.postGroupChat(groupId, { from_user: fromUser, body }) }), 'Failed to post group chat');

const initialState = groupsAdapter.getInitialState({
  chatByGroupId: {}, requestsByGroupId: {}, tournamentsByGroupId: {},
  listStatus: AsyncStatus.IDLE, listError: null, detailStatus: AsyncStatus.IDLE, detailError: null,
  mutationStatus: AsyncStatus.IDLE, mutationError: null, chatStatusByGroupId: {}, chatErrorByGroupId: {}
});
const setMutationPending = (state) => { state.mutationStatus = AsyncStatus.LOADING; state.mutationError = null; };
const setMutationRejected = (state, action) => { state.mutationStatus = AsyncStatus.FAILED; state.mutationError = action.payload || action.error?.message || 'Operation failed'; };
const upsertGroup = (state, action) => { state.mutationStatus = AsyncStatus.SUCCEEDED; groupsAdapter.upsertOne(state, action.payload.group || action.payload); };

export const groupSlice = createSlice({
  name: 'groups', initialState,
  reducers: { clearGroupsError: (state) => { state.listError = null; state.detailError = null; state.mutationError = null; } },
  extraReducers: (builder) => builder
    .addCase(fetchGroups.pending, (state) => { state.listStatus = AsyncStatus.LOADING; state.listError = null; })
    .addCase(fetchGroups.fulfilled, (state, action) => { state.listStatus = AsyncStatus.SUCCEEDED; groupsAdapter.setAll(state, action.payload); })
    .addCase(fetchGroups.rejected, (state, action) => { state.listStatus = AsyncStatus.FAILED; state.listError = action.payload || action.error?.message; })
    .addCase(fetchGroupById.pending, (state) => { state.detailStatus = AsyncStatus.LOADING; state.detailError = null; })
    .addCase(fetchGroupById.fulfilled, (state, action) => { state.detailStatus = AsyncStatus.SUCCEEDED; groupsAdapter.upsertOne(state, action.payload); })
    .addCase(fetchGroupById.rejected, (state, action) => { state.detailStatus = AsyncStatus.FAILED; state.detailError = action.payload || action.error?.message; })
    .addCase(createGroup.pending, setMutationPending).addCase(createGroup.fulfilled, upsertGroup).addCase(createGroup.rejected, setMutationRejected)
    .addCase(updateGroup.pending, setMutationPending).addCase(updateGroup.fulfilled, upsertGroup).addCase(updateGroup.rejected, setMutationRejected)
    .addCase(deleteGroup.pending, setMutationPending).addCase(deleteGroup.fulfilled, (state, action) => { state.mutationStatus = AsyncStatus.SUCCEEDED; groupsAdapter.removeOne(state, action.payload); }).addCase(deleteGroup.rejected, setMutationRejected)
    .addCase(joinGroup.pending, setMutationPending).addCase(joinGroup.fulfilled, upsertGroup).addCase(joinGroup.rejected, setMutationRejected)
    .addCase(leaveGroup.pending, setMutationPending).addCase(leaveGroup.fulfilled, upsertGroup).addCase(leaveGroup.rejected, setMutationRejected)
    .addCase(promoteGroupOfficer.pending, setMutationPending).addCase(promoteGroupOfficer.fulfilled, upsertGroup).addCase(promoteGroupOfficer.rejected, setMutationRejected)
    .addCase(demoteGroupOfficer.pending, setMutationPending).addCase(demoteGroupOfficer.fulfilled, upsertGroup).addCase(demoteGroupOfficer.rejected, setMutationRejected)
    .addCase(removeGroupMember.pending, setMutationPending).addCase(removeGroupMember.fulfilled, upsertGroup).addCase(removeGroupMember.rejected, setMutationRejected)
    .addCase(fetchGroupRequests.fulfilled, (state, action) => { state.requestsByGroupId[action.payload.groupId] = action.payload.requests; })
    .addCase(respondToGroupRequest.fulfilled, (state, action) => { groupsAdapter.upsertOne(state, action.payload.group); state.requestsByGroupId[action.payload.groupId] = (state.requestsByGroupId[action.payload.groupId] || []).filter((request) => String(request.id) !== action.payload.requestId); })
    .addCase(fetchGroupTournaments.fulfilled, (state, action) => { state.tournamentsByGroupId[action.payload.groupId] = action.payload.tournaments; })
    .addCase(fetchGroupChat.pending, (state, action) => { state.chatStatusByGroupId[String(action.meta.arg)] = AsyncStatus.LOADING; })
    .addCase(fetchGroupChat.fulfilled, (state, action) => { state.chatByGroupId[action.payload.groupId] = action.payload.chat; state.chatStatusByGroupId[action.payload.groupId] = AsyncStatus.SUCCEEDED; })
    .addCase(fetchGroupChat.rejected, (state, action) => { const id = String(action.meta.arg); state.chatStatusByGroupId[id] = AsyncStatus.FAILED; state.chatErrorByGroupId[id] = action.payload || action.error?.message; })
    .addCase(postGroupChatMessage.fulfilled, (state, action) => { const { groupId, message: chatMessage } = action.payload; (state.chatByGroupId[groupId] ||= []).push(chatMessage); state.chatStatusByGroupId[groupId] = AsyncStatus.SUCCEEDED; })
});

export const { clearGroupsError } = groupSlice.actions;
export default groupSlice.reducer;
