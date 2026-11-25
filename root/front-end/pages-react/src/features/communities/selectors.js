import { teamsAdapter } from './teamSlice';
import { groupsAdapter } from './groupSlice';

const teamsSelectors = teamsAdapter.getSelectors((state) => state.teams);
const groupsSelectors = groupsAdapter.getSelectors((state) => state.groups);

export const selectAllTeams = teamsSelectors.selectAll;
export const selectTeamById = (state, id) => teamsSelectors.selectById(state, String(id));
export const selectTeamChat = (state, teamId) => state.teams?.chatByTeamId[String(teamId)] || [];
export const selectTeamsStatus = (state) => state.teams?.listStatus || 'idle';
export const selectTeamsError = (state) => state.teams?.listError || null;
export const selectTeamDetailStatus = (state) => state.teams?.detailStatus || 'idle';
export const selectTeamMutationStatus = (state) => state.teams?.mutationStatus || 'idle';
export const selectTeamMutationError = (state) => state.teams?.mutationError || null;
export const selectTeamChatStatus = (state, teamId) =>
  state.teams?.chatStatusByTeamId?.[String(teamId)] || 'idle';
export const selectTeamChatError = (state, teamId) =>
  state.teams?.chatErrorByTeamId?.[String(teamId)] || null;

export const selectAllGroups = groupsSelectors.selectAll;
export const selectGroupById = (state, id) => groupsSelectors.selectById(state, String(id));
export const selectGroupChat = (state, groupId) => state.groups?.chatByGroupId[String(groupId)] || [];
export const selectGroupsStatus = (state) => state.groups?.listStatus || 'idle';
export const selectGroupsError = (state) => state.groups?.listError || null;
export const selectGroupDetailStatus = (state) => state.groups?.detailStatus || 'idle';
export const selectGroupMutationStatus = (state) => state.groups?.mutationStatus || 'idle';
export const selectGroupMutationError = (state) => state.groups?.mutationError || null;
export const selectGroupChatStatus = (state, groupId) => state.groups?.chatStatusByGroupId?.[String(groupId)] || 'idle';
export const selectGroupChatError = (state, groupId) => state.groups?.chatErrorByGroupId?.[String(groupId)] || null;
export const selectGroupRequests = (state, groupId) => state.groups?.requestsByGroupId?.[String(groupId)] || [];
export const selectGroupTournaments = (state, groupId) => state.groups?.tournamentsByGroupId?.[String(groupId)] || [];

export const selectSearchResults = (state) => state.social?.searchResults || [];
export const selectFriends = (state) => state.social?.friends || [];
export const selectFriendRequests = (state) => state.social?.friendRequests || [];
export const selectMessagesByContact = (state, contactId) =>
  state.social?.messagesByContact[String(contactId)] || [];
