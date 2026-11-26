import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

// The API uses game_approval_status / game_status, while older page code used
// status / enabled. Keep both representations consistent at the API boundary.
const normalizeGame = (game) => {
  const entity = normalizeEntity(game);
  if (!entity) return entity;
  const approvalStatus = String(entity.game_approval_status ?? entity.approval_status ?? entity.status ?? '').toLowerCase();
  const gameStatus = String(entity.game_status ?? (entity.enabled === false ? 'disabled' : 'enabled')).toLowerCase();
  return {
    ...entity,
    status: approvalStatus,
    game_approval_status: approvalStatus,
    game_status: gameStatus,
    enabled: gameStatus === 'enabled'
  };
};

const normalizeGameList = (data) => normalizeList(data).map(normalizeGame);

export const gamesApi = {
  async getGames(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.publisherId) query.append('publisherId', params.publisherId);
    if (params.active != null) query.append('active', String(params.active));
    const qs = query.toString();
    const res = await api.get(`/games${qs ? `?${qs}` : ''}`);
    return normalizeGameList(res);
  },

  async getGameById(id) {
    const res = await api.get(`/games/${id}`);
    return normalizeGame(res);
  },

  async getScanManifest(id) {
    return api.get(`/games/${id}/scan-manifest`);
  },

  async recordGameView(id) {
    return api.post(`/games/${id}/view`).catch(() => {});
  },

  async createGame(dto) {
    const res = await api.post('/games', dto);
    return normalizeGame(res);
  },

  async updateGame(id, dto) {
    const res = await api.patch(`/games/${id}`, dto);
    return normalizeGame(res);
  },

  async setGameState(id, enabled) {
    const res = await api.patch(`/games/${id}/state`, {
      game_status: enabled ? 'enabled' : 'disabled'
    });
    return normalizeGame(res);
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

  async deleteGameAchievement(id, publisherId) {
    await api.delete(`/achievements/${id}?publisherId=${encodeURIComponent(publisherId)}`);
    return { id: String(id) };
  },

  async getPendingAchievements() {
    const res = await api.get('/achievements/pending');
    return normalizeList(res, ['achievement_id']);
  },

  async reviewAchievement(id, dto) {
    return normalizeEntity(await api.patch(`/achievements/${id}/review`, dto), ['achievement_id']);
  },

  async getPlayerAchievements(userId) {
    const res = await api.get(`/players/${userId}/achievements`);
    return normalizeList(res, ['achievement_id']);
  },

  async unlockAchievement(dto) {
    return normalizeEntity(await api.post('/achievements/unlock', dto), ['achievement_id']);
  },

  async evaluatePlayerAchievements(userId) {
    return api.post(`/players/${userId}/achievements/evaluate`);
  },

  async getPlayerTitles(userId) {
    return api.get(`/players/${userId}/titles`);
  },

  async setPlayerTitle(userId, title) {
    return api.patch(`/players/${userId}/title`, { title });
  }
};

export default gamesApi;
