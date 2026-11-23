import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const profilesApi = {
  async getPlayerProfiles() {
    const res = await api.get('/player-profiles');
    return normalizeList(res, ['user_id', 'profile_id']);
  },

  async getPlayerLeaderboard() {
    const res = await api.get('/player-profiles/leaderboard');
    return normalizeList(res, ['user_id', 'profile_id']);
  },

  async getPlayerProfile(userId) {
    const res = await api.get(`/player-profiles/${userId}`);
    return normalizeEntity(res, ['user_id', 'profile_id']);
  },

  async getPlayerMatchHistory(userId) {
    const res = await api.get(`/player-profiles/${userId}/match-history`);
    return normalizeList(res, ['match_id']);
  },

  async updatePlayerProfile(userId, dto) {
    const res = await api.patch(`/player-profiles/${userId}`, dto);
    return normalizeEntity(res, ['user_id', 'profile_id']);
  },

  async getPublisherProfiles() {
    const res = await api.get('/publisher-profiles');
    return normalizeList(res, ['user_id', 'publisher_id']);
  },

  async getPublisherProfile(userId) {
    const res = await api.get(`/publisher-profiles/${userId}`);
    return normalizeEntity(res, ['user_id', 'publisher_id']);
  },

  async getPlatforms() {
    return api.get('/linked-accounts/platforms');
  },

  async getPlayerLinkedAccounts(playerId) {
    const res = await api.get(`/linked-accounts/player/${playerId}`);
    return normalizeList(res, ['account_id']);
  },

  async linkAccount(dto) {
    const res = await api.post('/linked-accounts', dto);
    return normalizeEntity(res, ['account_id']);
  },

  async unlinkAccount(id) {
    await api.delete(`/linked-accounts/${id}`);
    return { id: String(id) };
  }
};

export default profilesApi;
