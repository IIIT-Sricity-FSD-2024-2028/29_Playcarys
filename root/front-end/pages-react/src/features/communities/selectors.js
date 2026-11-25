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

export const selectSearchResults = (state) => state.social?.searchResults || [];
export const selectFriends = (state) => state.social?.friends || [];
export const selectFriendRequests = (state) => state.social?.friendRequests || [];
export const selectMessagesByContact = (state, contactId) =>
  state.social?.messagesByContact[String(contactId)] || [];
