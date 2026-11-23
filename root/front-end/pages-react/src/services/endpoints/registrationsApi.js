import api from '../api';
import { normalizeList, normalizeRegistration } from './normalize';

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
 * Registrations API adapter for tournament player and team entries.
 * Interacts with NestJS TournamentController (/tournaments) and TeamsController (/teams).
 * Pure JavaScript adapter independent of React, Redux, pages, or browser storage.
 */
export const registrationsApi = {
  /**
   * GET /tournaments/:id/registrations
   * Fetches all registered entrants for the tournament.
   */
  async getRegistrations(tournamentId) {
    assertId(tournamentId, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(tournamentId)}/registrations`);
    return normalizeList(res).map(normalizeRegistration);
  },

  /**
   * POST /tournaments/:id/register
   * Body: RegisterPlayerDto { player_id, player_name, contact, soloConsent }
   */
  async registerPlayer(tournamentId, dto) {
    assertId(tournamentId, 'Tournament ID');
    if (!dto || typeof dto !== 'object') {
      throw new Error('Registration data is required');
    }
    const res = await api.post(`/tournaments/${encodeURIComponent(tournamentId)}/register`, dto);
    return normalizeRegistration({
      ...(res || {}),
      tournament_id: tournamentId,
      player_id: dto.player_id
    });
  },

  /**
   * DELETE /tournaments/:id/register/:playerId
   * Unregisters an individual player from the tournament.
   */
  async unregisterPlayer(tournamentId, playerId) {
    assertId(tournamentId, 'Tournament ID');
    assertId(playerId, 'Player ID');
    await api.delete(
      `/tournaments/${encodeURIComponent(tournamentId)}/register/${encodeURIComponent(playerId)}`
    );
    return {
      tournamentId: String(tournamentId),
      playerId: String(playerId)
    };
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
    return normalizeRegistration({
      ...(res || {}),
      team_id: teamId,
      tournament_id: tournamentId
    });
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
    return {
      teamId: String(teamId),
      tournamentId: String(tournamentId)
    };
  }
};

export default registrationsApi;
