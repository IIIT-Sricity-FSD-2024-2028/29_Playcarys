import api from '../api';
import {
  normalizeEntity,
  normalizeList,
  normalizeMatch,
  normalizeChatMessage,
  normalizeBracket,
  normalizeLeaderboard,
  normalizeTournamentOverview
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
 * Tournament Play API adapter for match play, brackets, leaderboards, match tokens,
 * results reporting/disputes, and tournament chat.
 * Interacts with NestJS TournamentPlayController (/tournaments).
 * Pure JavaScript adapter independent of React, Redux, pages, or browser storage.
 */
export const tournamentPlayApi = {
  /**
   * GET /tournaments/:id/overview
   * Consolidated overview for score contest, knockout bracket, or multi-game tournament.
   */
  async getOverview(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/overview`);
    return normalizeTournamentOverview(res);
  },

  /**
   * GET /tournaments/:id/leaderboard
   * Score-contest standings, ranked by declared metric.
   */
  async getLeaderboard(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/leaderboard`);
    return normalizeLeaderboard(res);
  },

  /**
   * GET /tournaments/:id/bracket
   * Knockout bracket matches ordered by round with entrant names resolved.
   */
  async getBracket(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/bracket`);
    return normalizeBracket(res);
  },

  /**
   * POST /tournaments/:id/start
   * Generates bracket server-side.
   * Accepts { organizer_id } or plain organizerId number/string.
   */
  async startTournament(id, organizerIdOrDto = {}) {
    assertId(id, 'Tournament ID');
    const orgId = typeof organizerIdOrDto === 'number' || typeof organizerIdOrDto === 'string'
      ? Number(organizerIdOrDto)
      : Number(organizerIdOrDto?.organizer_id || organizerIdOrDto?.organizerId || 1);
    const body = { organizer_id: orgId };
    const res = await api.post(`/tournaments/${encodeURIComponent(id)}/start`, body);
    return normalizeBracket(res);
  },

  // ── Multi-game Stages Play ─────────────────────────────────

  /**
   * GET /tournaments/:id/overall-leaderboard
   * Multi-game combined points standing across every completed stage.
   */
  async getOverallLeaderboard(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/overall-leaderboard`);
    return normalizeLeaderboard(res);
  },

  /**
   * GET /tournaments/:id/stages/:stageId/leaderboard
   * One stage's score-contest standings.
   */
  async getStageLeaderboard(id, stageId) {
    assertId(id, 'Tournament ID');
    assertId(stageId, 'Stage ID');
    const res = await api.get(
      `/tournaments/${encodeURIComponent(id)}/stages/${encodeURIComponent(stageId)}/leaderboard`
    );
    return normalizeLeaderboard(res);
  },

  /**
   * GET /tournaments/:id/stages/:stageId/bracket
   * One stage's knockout bracket.
   */
  async getStageBracket(id, stageId) {
    assertId(id, 'Tournament ID');
    assertId(stageId, 'Stage ID');
    const res = await api.get(
      `/tournaments/${encodeURIComponent(id)}/stages/${encodeURIComponent(stageId)}/bracket`
    );
    return normalizeBracket(res);
  },

  /**
   * POST /tournaments/:id/stages/:stageId/start
   * Opens or generates bracket for a stage. Body: { organizer_id }
   */
  async startStage(id, stageId, organizerIdOrDto = {}) {
    assertId(id, 'Tournament ID');
    assertId(stageId, 'Stage ID');
    const orgId = typeof organizerIdOrDto === 'number' || typeof organizerIdOrDto === 'string'
      ? Number(organizerIdOrDto)
      : Number(organizerIdOrDto?.organizer_id || organizerIdOrDto?.organizerId || 1);
    const body = { organizer_id: orgId };
    const res = await api.post(
      `/tournaments/${encodeURIComponent(id)}/stages/${encodeURIComponent(stageId)}/start`,
      body
    );
    return normalizeEntity(res);
  },

  /**
   * POST /tournaments/:id/stages/:stageId/complete
   * Closes a score-format stage. Body: { organizer_id }
   */
  async completeStage(id, stageId, organizerIdOrDto = {}) {
    assertId(id, 'Tournament ID');
    assertId(stageId, 'Stage ID');
    const orgId = typeof organizerIdOrDto === 'number' || typeof organizerIdOrDto === 'string'
      ? Number(organizerIdOrDto)
      : Number(organizerIdOrDto?.organizer_id || organizerIdOrDto?.organizerId || 1);
    const body = { organizer_id: orgId };
    const res = await api.post(
      `/tournaments/${encodeURIComponent(id)}/stages/${encodeURIComponent(stageId)}/complete`,
      body
    );
    return normalizeEntity(res);
  },

  // ── Match Tokens ───────────────────────────────────────────

  /**
   * GET /tournaments/matches/:matchId/token?userId=:userId
   * Retrieves signed rendezvous match token for netcode matchmaker.
   */
  async getMatchToken(matchId, userId) {
    assertId(matchId, 'Match ID');
    assertId(userId, 'User ID');
    const res = await api.get(
      `/tournaments/matches/${encodeURIComponent(matchId)}/token?userId=${encodeURIComponent(userId)}`
    );
    return normalizeEntity(res, ['match_id']);
  },

  /**
   * POST /tournaments/verify-token
   * Publisher-side verification of a presented match token.
   * Body: { game_id: number, token: string }
   */
  async verifyToken(body) {
    if (!body || typeof body !== 'object') {
      throw new Error('Token verification body is required');
    }
    const payload = {
      game_id: Number(body.game_id || body.gameId || 0),
      token: String(body.token || '')
    };
    return api.post('/tournaments/verify-token', payload);
  },

  // ── Results & Disputes ─────────────────────────────────────

  /**
   * POST /tournaments/matches/:matchId/result
   * Publisher-side HMAC-signed match result reporting.
   */
  async reportSignedMatchResult(matchId, dto) {
    assertId(matchId, 'Match ID');
    const res = await api.post(
      `/tournaments/matches/${encodeURIComponent(matchId)}/result`,
      dto
    );
    return normalizeBracket(res);
  },

  /**
   * POST /tournaments/matches/:matchId/report
   * Player reporting a match result (fallback for unintegrated games).
   * Body: ReportResultDto { reporter_id, winner_id }
   */
  async reportMatchResult(matchId, dto) {
    assertId(matchId, 'Match ID');
    const payload = {
      reporter_id: Number(dto?.reporter_id || dto?.reporterId || dto?.userId || dto?.user_id || 1),
      winner_id: dto?.winner_id != null ? dto.winner_id : dto?.winnerId
    };
    try {
      const res = await api.post(
        `/tournaments/matches/${encodeURIComponent(matchId)}/report`,
        payload
      );
      return normalizeEntity(res);
    } catch (err) {
      if (payload.winner_id != null) {
        const res = await api.post(
          `/tournaments/matches/${encodeURIComponent(matchId)}/result`,
          payload
        );
        return normalizeBracket(res);
      }
      throw err;
    }
  },

  /**
   * POST /tournaments/matches/:matchId/confirm
   * Opponent confirms reported result. Body: ConfirmResultDto { user_id }
   */
  async confirmMatchResult(matchId, dto) {
    assertId(matchId, 'Match ID');
    const uid = typeof dto === 'number' || typeof dto === 'string'
      ? Number(dto)
      : Number(dto?.user_id || dto?.userId || 1);
    const body = { user_id: uid };
    const res = await api.post(
      `/tournaments/matches/${encodeURIComponent(matchId)}/confirm`,
      body
    );
    return normalizeBracket(res);
  },

  /**
   * POST /tournaments/matches/:matchId/dispute
   * Disputer files a match dispute. Body: DisputeResultDto { user_id, reason? }
   */
  async disputeMatchResult(matchId, dto) {
    assertId(matchId, 'Match ID');
    const uid = typeof dto === 'number' || typeof dto === 'string'
      ? Number(dto)
      : Number(dto?.user_id || dto?.userId || 1);
    const body = {
      user_id: uid,
      ...(dto?.reason ? { reason: String(dto.reason) } : {})
    };
    const res = await api.post(
      `/tournaments/matches/${encodeURIComponent(matchId)}/dispute`,
      body
    );
    return normalizeEntity(res);
  },

  /**
   * POST /tournaments/matches/:matchId/resolve
   * Organizer settles a disputed match. Body: ResolveDisputeDto { organizer_id, winner_id }
   */
  async resolveMatchDispute(matchId, dto) {
    assertId(matchId, 'Match ID');
    const orgId = Number(dto?.organizer_id || dto?.organizerId || 1);
    const winner = dto?.winner_id != null ? dto.winner_id : dto?.winnerId;
    const body = { organizer_id: orgId, winner_id: winner };
    const res = await api.post(
      `/tournaments/matches/${encodeURIComponent(matchId)}/resolve`,
      body
    );
    return normalizeBracket(res);
  },

  /**
   * GET /tournaments/disputes/:organizerId
   * Retrieves disputed matches awaiting decision from this organizer.
   */
  async getDisputes(organizerId) {
    assertId(organizerId, 'Organizer ID');
    const res = await api.get(`/tournaments/disputes/${encodeURIComponent(organizerId)}`);
    return normalizeList(res, ['match_id']);
  },

  // ── Tournament Chat ────────────────────────────────────────

  /**
   * GET /tournaments/:id/chat
   * Retrieves public tournament chat messages, oldest first.
   */
  async getChat(id) {
    assertId(id, 'Tournament ID');
    const res = await api.get(`/tournaments/${encodeURIComponent(id)}/chat`);
    return normalizeList(res, ['message_id', 'chat_id']);
  },

  /**
   * POST /tournaments/:id/chat
   * Posts a message to tournament chat.
   * Body: PostChatDto { user_id, body }
   */
  async postChat(id, dto) {
    assertId(id, 'Tournament ID');
    const uid = typeof dto === 'object' ? Number(dto?.user_id || dto?.userId || 1) : 1;
    const bodyText = typeof dto === 'string' ? dto : String(dto?.body || dto?.message || '');
    const payload = {
      user_id: uid,
      body: bodyText
    };
    const res = await api.post(`/tournaments/${encodeURIComponent(id)}/chat`, payload);
    return normalizeChatMessage(res);
  }
};

export default tournamentPlayApi;
