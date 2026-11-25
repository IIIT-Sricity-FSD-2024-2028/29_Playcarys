import api from '../api';
import {
  normalizeEntity,
  normalizeList,
  normalizeReport,
  normalizeBan,
  normalizeModeratorAction
} from './normalize';

export const moderationApi = {
  // ── Reports ──────────────────────────────────────────────────
  async getReports(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.reportedUserId) query.append('reportedUserId', params.reportedUserId);
    if (params.reporterId) query.append('reporterId', params.reporterId);
    const qs = query.toString();
    const res = await api.get(`/reports${qs ? `?${qs}` : ''}`);
    const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
    return list.map(normalizeReport);
  },

  async getReportById(id) {
    const res = await api.get(`/reports/${id}`);
    return normalizeReport(res);
  },

  async createReport(dto) {
    const payload = {
      reported_by: Number(dto.reported_by),
      reported_user: Number(dto.reported_user),
      type: dto.type,
      reason: dto.reason,
      ...(dto.session ? { session: dto.session } : {}),
      ...(dto.sessionId != null ? { sessionId: Number(dto.sessionId) } : {})
    };
    const res = await api.post('/reports', payload);
    return normalizeReport(res);
  },

  async updateReportStatus(id, { requester_user_id, status, actionNote }) {
    const payload = {
      requester_user_id: Number(requester_user_id),
      status,
      ...(actionNote !== undefined ? { actionNote } : {})
    };
    const res = await api.patch(`/reports/${id}/status`, payload);
    return normalizeReport(res);
  },

  // ── Moderator Actions & Bans ──────────────────────────────────
  async getActions(moderatorId) {
    const endpoint = moderatorId
      ? `/moderator-actions?moderatorId=${encodeURIComponent(moderatorId)}`
      : '/moderator-actions';
    const res = await api.get(endpoint);
    const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
    return list.map(normalizeModeratorAction);
  },

  async getAllBans() {
    const res = await api.get('/moderator-actions/bans');
    const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
    return list.map(normalizeBan);
  },

  async getActiveBans() {
    const res = await api.get('/moderator-actions/bans/active');
    const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
    return list.map(normalizeBan);
  },

  async actOnReport(dto) {
    const payload = {
      moderator_id: Number(dto.moderator_id),
      ...(dto.report_id != null && !isNaN(Number(dto.report_id)) ? { report_id: Number(dto.report_id) } : {}),
      action_type: dto.action_type,
      action_reason: dto.action_reason,
      target_user_id: Number(dto.target_user_id),
      ...(dto.ban_duration ? { ban_duration: dto.ban_duration } : {})
    };
    const res = await api.post('/moderator-actions/act-on-report', payload);
    return normalizeModeratorAction(res);
  },

  async handleViolation(dto) {
    const payload = {
      moderator_id: Number(dto.moderator_id),
      target_user_id: Number(dto.target_user_id),
      action_type: dto.action_type,
      action_reason: dto.action_reason,
      violation_type: dto.violation_type,
      ...(dto.ban_duration ? { ban_duration: dto.ban_duration } : {})
    };
    const res = await api.post('/moderator-actions/handle-violation', payload);
    return normalizeModeratorAction(res);
  },

  async liftBan(playerId, moderatorId) {
    const payload = {
      moderator_id: Number(moderatorId)
    };
    const res = await api.patch(`/moderator-actions/bans/${playerId}/lift`, payload);
    return res;
  }
};

export default moderationApi;
