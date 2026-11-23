import api from '../api';
import {
  normalizeEntity,
  normalizeList,
  normalizeTournament,
  normalizeStage,
  normalizeRegistration
} from './normalize';

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

/**
 * Tournament API adapter for tournament listing, management, stages, and registrations.
 * Interacts with NestJS TournamentController (/tournaments) and TeamsController (/teams).
 * Pure JavaScript adapter independent of React, Redux, pages, or browser storage.
 */
export const tournamentsApi = {
  /**
   * GET /tournaments
   * Query params: status (upcoming, in-progress, completed), gameId, includePrivate
   */
  async getTournaments(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.gameId != null) query.append('gameId', String(params.gameId));
    if (params.includePrivate != null) query.append('includePrivate', String(params.includePrivate));
    const qs = query.toString();
    const res = await api.get(`/tournaments${qs ? `?${qs}` : ''}`);
    return normalizeList(res, ['tournament_id', 'tournamentId']);
  },

  /**
   * GET /tournaments/:id
   */
  async getTournamentById(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}`);
    return normalizeTournament(res);
  },

  /**
   * GET /tournaments/player/:playerId
   */
  async getPlayerTournaments(playerId) {
    assertId(playerId, 'Player ID');
    const res = await api.get(`/tournaments/player/${encodeURIComponent(playerId)}`);
    return normalizeList(res, ['tournament_id', 'tournamentId']);
  },

  /**
   * POST /tournaments
   * Body: CreateTournamentDto
   */
  async createTournament(dto) {
    if (!dto || typeof dto !== 'object') {
      throw new Error('Tournament data is required');
    }
    const res = await api.post('/tournaments', dto);
    return normalizeTournament(res);
  },

  /**
   * PATCH /tournaments/:id
   * Body: UpdateTournamentDto
   */
  async updateTournament(id, dto) {
    assertId(id, 'Tournament ID');
    if (!dto || typeof dto !== 'object') {
      throw new Error('Update data is required');
    }
    const res = await api.patch(`/tournaments/${encodeURIComponent(id)}`, dto);
    return normalizeTournament(res);
  },

  /**
   * DELETE /tournaments/:id
   */
  async deleteTournament(id) {
    assertId(id, 'Tournament ID');
    await api.delete(`/tournaments/${encodeURIComponent(id)}`);
    return { id: String(id) };
  },

  /**
   * POST /tournaments/:id/start
   * Starts the tournament and locks registrations.
   */
  async startTournament(id) {
    assertId(id, 'Tournament ID');
    const res = await api.post(`/tournaments/${encodeURIComponent(id)}/start`);
    return normalizeTournament(res);
  },

  // ── Registrations ──────────────────────────────────────────

  /**
   * GET /tournaments/:id/registrations
   */
  async getRegistrations(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/registrations`);
    return normalizeList(res, ['registration_id', 'player_id']);
  },

  /**
   * POST /tournaments/:id/register
   * Body: RegisterPlayerDto { player_id, player_name, contact, soloConsent }
   */
  async registerPlayer(id, dto) {
    assertId(id, 'Tournament ID');
    if (!dto || typeof dto !== 'object') {
      throw new Error('Player registration data is required');
    }
    const res = await api.post(`/tournaments/${encodeURIComponent(id)}/register`, dto);
    return normalizeRegistration(res);
  },

  /**
   * DELETE /tournaments/:id/register/:playerId
   */
  async unregisterPlayer(id, playerId) {
    assertId(id, 'Tournament ID');
    assertId(playerId, 'Player ID');
    await api.delete(`/tournaments/${encodeURIComponent(id)}/register/${encodeURIComponent(playerId)}`);
    return { tournamentId: String(id), playerId: String(playerId) };
  },

  /**
   * POST /teams/:teamId/register/:tournamentId?requesterId=:requesterId
   * Registers a team for a team tournament.
   */
  async registerTeam(teamId, tournamentId, requesterId) {
    assertId(teamId, 'Team ID');
    assertId(tournamentId, 'Tournament ID');
    const query = requesterId != null ? `?requesterId=${encodeURIComponent(requesterId)}` : '';
    const res = await api.post(
      `/teams/${encodeURIComponent(teamId)}/register/${encodeURIComponent(tournamentId)}${query}`,
      {}
    );
    return normalizeEntity(res, ['team_id', 'tournament_id']);
  },

  /**
   * DELETE /teams/:teamId/register/:tournamentId?requesterId=:requesterId
   * Unregisters a team from a tournament.
   */
  async unregisterTeam(teamId, tournamentId, requesterId) {
    assertId(teamId, 'Team ID');
    assertId(tournamentId, 'Tournament ID');
    const query = requesterId != null ? `?requesterId=${encodeURIComponent(requesterId)}` : '';
    await api.delete(
      `/teams/${encodeURIComponent(teamId)}/register/${encodeURIComponent(tournamentId)}${query}`
    );
    return { teamId: String(teamId), tournamentId: String(tournamentId) };
  },

  // ── Multi-game Stages ──────────────────────────────────────

  /**
   * GET /tournaments/:id/stages
   * Lists every stage in play order.
   */
  async getStages(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/stages`);
    return normalizeList(res, ['tournament_game_id', 'stage_id']);
  },

  /**
   * POST /tournaments/:id/stages
   * Body: CreateTournamentGameDto
   */
  async addStage(id, dto) {
    assertId(id, 'Tournament ID');
    if (!dto || typeof dto !== 'object') {
      throw new Error('Stage data is required');
    }
    const res = await api.post(`/tournaments/${encodeURIComponent(id)}/stages`, dto);
    return normalizeStage(res);
  },

  /**
   * DELETE /tournaments/:id/stages/:stageId
   */
  async removeStage(id, stageId) {
    assertId(id, 'Tournament ID');
    assertId(stageId, 'Stage ID');
    await api.delete(
      `/tournaments/${encodeURIComponent(id)}/stages/${encodeURIComponent(stageId)}`
    );
    return { tournamentId: String(id), stageId: String(stageId), id: String(stageId) };
  }
};

export default tournamentsApi;
