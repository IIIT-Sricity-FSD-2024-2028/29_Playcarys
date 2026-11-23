import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const tournamentsApi = {
  async getTournaments(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.gameId) query.append('gameId', params.gameId);
    if (params.includePrivate != null) query.append('includePrivate', String(params.includePrivate));
    const qs = query.toString();
    const res = await api.get(`/tournaments${qs ? `?${qs}` : ''}`);
    return normalizeList(res);
  },

  async getTournamentById(id) {
    const res = await api.get(`/tournaments/${id}`);
    return normalizeEntity(res);
  },

  async getRegistrations(id) {
    const res = await api.get(`/tournaments/${id}/registrations`);
    return normalizeList(res, ['registration_id', 'player_id']);
  },

  async getStages(id) {
    const res = await api.get(`/tournaments/${id}/stages`);
    return normalizeList(res, ['stage_id']);
  },

  async addStage(id, dto) {
    const res = await api.post(`/tournaments/${id}/stages`, dto);
    return normalizeEntity(res, ['stage_id']);
  },

  async removeStage(id, stageId) {
    await api.delete(`/tournaments/${id}/stages/${stageId}`);
    return { id: String(stageId) };
  },

  async getPlayerTournaments(playerId) {
    const res = await api.get(`/tournaments/player/${playerId}`);
    return normalizeList(res);
  },

  async createTournament(dto) {
    const res = await api.post('/tournaments', dto);
    return normalizeEntity(res);
  },

  async registerPlayer(id, dto) {
    const res = await api.post(`/tournaments/${id}/register`, dto);
    return normalizeEntity(res);
  },

  async unregisterPlayer(id, playerId) {
    await api.delete(`/tournaments/${id}/register/${playerId}`);
    return { tournamentId: String(id), playerId: String(playerId) };
  },

  async registerTeam(teamId, tournamentId) {
    const res = await api.post(`/teams/${teamId}/register/${tournamentId}`);
    return normalizeEntity(res);
  },

  async unregisterTeam(teamId, tournamentId) {
    await api.delete(`/teams/${teamId}/register/${tournamentId}`);
    return { teamId: String(teamId), tournamentId: String(tournamentId) };
  },

  async startTournament(id) {
    return api.post(`/tournaments/${id}/start`);
  },

  async updateTournament(id, dto) {
    const res = await api.patch(`/tournaments/${id}`, dto);
    return normalizeEntity(res);
  },

  async deleteTournament(id) {
    await api.delete(`/tournaments/${id}`);
    return { id: String(id) };
  },

  // Tournament play operations
  async getOverview(id) {
    return api.get(`/tournaments/${id}/overview`);
  },

  async getLeaderboard(id) {
    return api.get(`/tournaments/${id}/leaderboard`);
  },

  async getBracket(id) {
    return api.get(`/tournaments/${id}/bracket`);
  },

  async getChat(id) {
    const res = await api.get(`/tournaments/${id}/chat`);
    return normalizeList(res, ['chat_id', 'message_id']);
  },

  async postChat(id, dto) {
    const res = await api.post(`/tournaments/${id}/chat`, dto);
    return normalizeEntity(res, ['chat_id', 'message_id']);
  },

  async reportMatchResult(matchId, dto) {
    return api.post(`/tournaments/matches/${matchId}/result`, dto).catch(async () => {
      return api.post(`/tournaments/matches/${matchId}/report`, dto);
    });
  },

  async confirmMatchResult(matchId, dto) {
    return api.post(`/tournaments/matches/${matchId}/confirm`, dto);
  },

  async disputeMatchResult(matchId, dto) {
    return api.post(`/tournaments/matches/${matchId}/dispute`, dto);
  },

  async resolveMatchDispute(matchId, dto) {
    return api.post(`/tournaments/matches/${matchId}/resolve`, dto);
  }
};

export default tournamentsApi;
