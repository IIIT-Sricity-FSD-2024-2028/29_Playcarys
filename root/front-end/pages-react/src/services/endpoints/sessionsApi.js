import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const sessionsApi = {
  // Sessions
  async getSessions() {
    const res = await api.get('/sessions');
    return normalizeList(res, ['session_id']);
  },

  async getSessionById(id) {
    const res = await api.get(`/sessions/${id}`);
    return normalizeEntity(res, ['session_id']);
  },

  async getPlayerSessions(playerId) {
    const res = await api.get(`/sessions/player/${playerId}`);
    return normalizeList(res, ['session_id']);
  },

  async endSession(id) {
    const res = await api.patch(`/sessions/${id}/end`);
    return normalizeEntity(res, ['session_id']);
  },

  // Match Results
  async getMatchResults() {
    const res = await api.get('/match-results');
    return normalizeList(res, ['result_id', 'match_id']);
  },

  async getSessionMatchResults(sessionId) {
    const res = await api.get(`/match-results/session/${sessionId}`);
    return normalizeList(res, ['result_id', 'match_id']);
  },

  async getPlayerMatchResults(playerId) {
    const res = await api.get(`/match-results/player/${playerId}`);
    return normalizeList(res, ['result_id', 'match_id']);
  },

  async getTopScorers(params = {}) {
    const query = new URLSearchParams();
    if (params.gameId) query.append('gameId', params.gameId);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    const res = await api.get(`/match-results/top-scorers${qs ? `?${qs}` : ''}`);
    return normalizeList(res, ['user_id', 'player_id']);
  },

  async recordMatchResult(dto) {
    const res = await api.post('/match-results', dto);
    return normalizeEntity(res, ['result_id', 'match_id']);
  }
};

export default sessionsApi;
