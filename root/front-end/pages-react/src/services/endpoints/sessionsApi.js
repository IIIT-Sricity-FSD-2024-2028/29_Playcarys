import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

/**
 * Validates that an ID parameter is provided and not empty.
 * @param {*} id
 * @param {string} name
 */
function assertId(id, name = 'ID') {
  if (id == null || id === '' || (typeof id === 'number' && isNaN(id))) {
    throw new Error(`${name} is required`);
  }
}

export const sessionsApi = {
  // Sessions
  async getSessions(params = {}) {
    const query = new URLSearchParams();
    if (params.gameId != null) query.append('gameId', String(params.gameId));
    if (params.status) query.append('status', params.status);
    if (params.hostId != null) query.append('hostId', String(params.hostId));
    const qs = query.toString();
    const res = await api.get(`/sessions${qs ? `?${qs}` : ''}`);
    return normalizeList(res, ['session_id', 'match_id']);
  },

  async getSessionById(id) {
    assertId(id, 'Session ID');
    const res = await api.get(`/sessions/${encodeURIComponent(id)}`);
    return normalizeEntity(res, ['session_id', 'match_id']);
  },

  async getPlayerSessions(playerId) {
    assertId(playerId, 'Player ID');
    const res = await api.get(`/sessions/player/${encodeURIComponent(playerId)}`);
    return normalizeList(res, ['session_id', 'match_id']);
  },

  async endSession(id, data = {}) {
    assertId(id, 'Session ID');
    const res = await api.patch(`/sessions/${encodeURIComponent(id)}/end`, data);
    return normalizeEntity(res, ['session_id', 'match_id']);
  },

  // Match Results
  async getSessionMatchResults(sessionId) {
    assertId(sessionId, 'Session ID');
    try {
      const res = await api.get(`/match-results/session/${encodeURIComponent(sessionId)}`);
      return normalizeList(res, ['result_id', 'match_id']);
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  async getPlayerMatchResults(playerId) {
    assertId(playerId, 'Player ID');
    try {
      const res = await api.get(`/match-results/player/${encodeURIComponent(playerId)}`);
      if (Array.isArray(res) && res.length > 0) {
        return normalizeList(res, ['result_id', 'match_id']);
      }
    } catch {
      // Fallback to match-history profile endpoint
    }
    const res = await api.get(`/player-profiles/${encodeURIComponent(playerId)}/match-history`);
    return normalizeList(res, ['result_id', 'match_id']);
  },

  async getTopScorers(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    const res = await api.get(`/match-results/top-scorers${qs ? `?${qs}` : ''}`);
    return normalizeList(res, ['user_id', 'player_id']);
  }
};

export default sessionsApi;
