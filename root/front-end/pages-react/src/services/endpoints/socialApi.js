import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const socialApi = {
  // Teams
  async getTeams({ playerId } = {}) {
    const query = playerId != null ? `?playerId=${encodeURIComponent(playerId)}` : '';
    const res = await api.get(`/teams${query}`);
    return normalizeList(res, ['team_id']);
  },

  async getTeamById(id) {
    const res = await api.get(`/teams/${id}`);
    return normalizeEntity(res, ['team_id']);
  },

  async createTeam(dto) {
    const res = await api.post('/teams', dto);
    return normalizeEntity(res, ['team_id']);
  },

  async updateTeam(id, dto, requesterId) {
    const res = await api.patch(`/teams/${id}?requesterId=${encodeURIComponent(requesterId)}`, dto);
    return normalizeEntity(res, ['team_id']);
  },

  async addTeamMember(teamId, dto, requesterId) {
    const res = await api.post(
      `/teams/${teamId}/members?requesterId=${encodeURIComponent(requesterId)}`,
      dto
    );
    return normalizeEntity(res, ['team_id']);
  },

  async removeTeamMember(teamId, userId, requesterId) {
    const res = await api.delete(
      `/teams/${teamId}/members/${userId}?requesterId=${encodeURIComponent(requesterId)}`
    );
    return normalizeEntity(res, ['team_id']);
  },

  async deleteTeam(id, requesterId) {
    await api.delete(`/teams/${id}?requesterId=${encodeURIComponent(requesterId)}`);
    return { id: String(id) };
  },

  async getTeamChat(teamId) {
    const res = await api.get(`/teams/${teamId}/chat`);
    return normalizeList(res, ['chat_id', 'message_id']);
  },

  async postTeamChat(teamId, dto) {
    const res = await api.post(`/teams/${teamId}/chat`, dto);
    return normalizeEntity(res, ['chat_id', 'message_id']);
  },

  // Groups
  async getGroups() {
    const res = await api.get('/groups');
    return normalizeList(res, ['group_id']);
  },

  async getGroupById(id) {
    const res = await api.get(`/groups/${id}`);
    return normalizeEntity(res, ['group_id']);
  },

  async createGroup(dto) {
    const res = await api.post('/groups', dto);
    return normalizeEntity(res, ['group_id']);
  },

  async updateGroup(id, dto) {
    const res = await api.patch(`/groups/${id}`, dto);
    return normalizeEntity(res, ['group_id']);
  },

  async deleteGroup(id) {
    await api.delete(`/groups/${id}`);
    return { id: String(id) };
  },

  async joinGroup(groupId, dto) {
    return api.post(`/groups/${groupId}/join`, dto);
  },

  async leaveGroup(groupId, dto) {
    return api.post(`/groups/${groupId}/leave`, dto);
  },

  async getGroupChat(groupId) {
    const res = await api.get(`/groups/${groupId}/chat`);
    return normalizeList(res, ['chat_id', 'message_id']);
  },

  async postGroupChat(groupId, dto) {
    const res = await api.post(`/groups/${groupId}/chat`, dto);
    return normalizeEntity(res, ['chat_id', 'message_id']);
  },

  // Friends & Messages
  async searchPlayers(query) {
    const res = await api.get(`/players/search?q=${encodeURIComponent(query)}`);
    return normalizeList(res, ['user_id', 'player_id']);
  },

  async getFriends(userId) {
    const res = await api.get(`/friends/${userId}`);
    return normalizeList(res, ['friend_id', 'user_id']);
  },

  async getFriendRequests(userId) {
    const res = await api.get(`/friends/${userId}/requests`);
    return normalizeList(res, ['request_id']);
  },

  async sendFriendRequest(dto) {
    return api.post('/friends/request', dto);
  },

  async respondFriendRequest(id, dto) {
    return api.post(`/friends/requests/${id}/respond`, dto);
  },

  async removeFriend(userId, friendId) {
    await api.delete(`/friends/${userId}/${friendId}`);
    return { friendId: String(friendId) };
  },

  async getMessages(userId, withUserId) {
    const res = await api.get(`/messages/${userId}/${withUserId}`);
    return normalizeList(res, ['message_id']);
  },

  async sendMessage(dto) {
    const res = await api.post('/messages', dto);
    return normalizeEntity(res, ['message_id']);
  }
};

export default socialApi;
