import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const gamesApi = {
  async getGames(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.publisherId) query.append('publisherId', params.publisherId);
    if (params.active != null) query.append('active', String(params.active));
    const qs = query.toString();
    const res = await api.get(`/games${qs ? `?${qs}` : ''}`);
    return normalizeList(res);
  },

  async getGameById(id) {
    const res = await api.get(`/games/${id}`);
    return normalizeEntity(res);
  },

  async getScanManifest(id) {
    return api.get(`/games/${id}/scan-manifest`);
  },

  async recordGameView(id) {
    return api.post(`/games/${id}/view`).catch(() => {});
  },

  async createGame(dto) {
    const res = await api.post('/games', dto);
    return normalizeEntity(res);
  },

  async updateGame(id, dto) {
    const res = await api.patch(`/games/${id}`, dto);
    return normalizeEntity(res);
  },

  async setGameState(id, enabled) {
    const res = await api.patch(`/games/${id}/state`, { enabled });
    return normalizeEntity(res);
  },

  async deleteGame(id) {
    await api.delete(`/games/${id}`);
    return { id: String(id) };
  },

  async getGameReview(id) {
    return api.get(`/games/${id}/review`);
  },

  async rescanGame(id) {
    return api.post(`/games/${id}/rescan`);
  },

  async approveGame(id, dto) {
    const res = await api.patch(`/games/${id}/approve`, dto);
    return normalizeEntity(res);
  },

  async getGameSave(id, userId) {
    const query = userId != null ? `?userId=${encodeURIComponent(userId)}` : '';
    return api.get(`/games/${id}/save${query}`);
  },

  async putGameSave(id, saveData) {
    return api.put(`/games/${id}/save`, saveData);
  },

  async getGameAchievements(id) {
    const res = await api.get(`/games/${id}/achievements`);
    return normalizeList(res, ['achievement_id']);
  },

  async createGameAchievement(id, dto) {
    const res = await api.post(`/games/${id}/achievements`, dto);
    return normalizeEntity(res, ['achievement_id']);
  },

  async getPendingAchievements() {
    const res = await api.get('/achievements/pending');
    return normalizeList(res, ['achievement_id']);
  },

  async reviewAchievement(id, dto) {
    return api.patch(`/achievements/${id}/review`, dto);
  },

  async getPlayerAchievements(userId) {
    const res = await api.get(`/players/${userId}/achievements`);
    return normalizeList(res, ['achievement_id']);
  },

  async unlockAchievement(dto) {
    return api.post('/achievements/unlock', dto);
  }
};

export default gamesApi;
