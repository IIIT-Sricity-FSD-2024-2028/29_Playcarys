import api from '../api';
import {
  normalizeEntity,
  normalizeList,
  normalizeCatalogueItem,
  normalizeCatalogue,
  normalizeTransaction,
  normalizeBalance
} from './normalize';

export const economyApi = {
  // ── Player Catalogue & Shop ───────────────────────────────────
  async getCatalogue(viewerId) {
    const query = viewerId != null ? `?viewerId=${encodeURIComponent(viewerId)}` : '';
    const res = await api.get(`/economy/catalogue${query}`);
    return normalizeCatalogue(res);
  },

  async getSkins(userIds) {
    let ids = '';
    if (Array.isArray(userIds)) ids = userIds.join(',');
    else if (userIds != null) ids = String(userIds);
    const query = ids ? `?userIds=${encodeURIComponent(ids)}` : '';
    const res = await api.get(`/economy/skins${query}`);
    return res || {};
  },

  async getBalance(userId) {
    const res = await api.get(`/economy/balance/${userId}`);
    return normalizeBalance(res);
  },

  async getTransactions(userId) {
    const res = await api.get(`/economy/transactions/${userId}`);
    return normalizeList(res, ['transaction_id', 'id']);
  },

  async purchaseItem(dto) {
    const payload = {
      user_id: Number(dto.user_id),
      item_id: Number(dto.item_id),
      currency: dto.currency,
      ...(dto.idempotency_key ? { idempotency_key: dto.idempotency_key } : {})
    };
    const res = await api.post('/economy/purchase', payload);
    return {
      ...res,
      item: normalizeCatalogueItem(res?.item),
      paid_for: res?.paid_for ? normalizeCatalogueItem(res.paid_for) : null,
      transaction: res?.transaction ? normalizeTransaction(res.transaction) : null
    };
  },

  async equipItem(dto) {
    const payload = {
      user_id: Number(dto.user_id),
      item_id: Number(dto.item_id)
    };
    const res = await api.post('/economy/equip', payload);
    return {
      ...res,
      equipped: normalizeCatalogueItem(res?.equipped)
    };
  },

  async unequipItem(dto) {
    const payload = {
      user_id: Number(dto.user_id),
      item_id: Number(dto.item_id)
    };
    const res = await api.post('/economy/unequip', payload);
    return {
      ...res,
      unequipped: res?.unequipped ? normalizeCatalogueItem(res.unequipped) : null
    };
  },

  async awardMatch(dto) {
    const payload = {
      user_id: Number(dto.user_id),
      game_id: Number(dto.game_id),
      result: dto.result,
      ...(dto.session_id != null ? { session_id: Number(dto.session_id) } : {})
    };
    return api.post('/economy/award', payload);
  },

  async subscribe(dto) {
    const payload = {
      user_id: Number(dto.user_id),
      plan_id: String(dto.plan_id)
    };
    const res = await api.post('/economy/subscribe', payload);
    return {
      ...res,
      subscription: res?.subscription ? normalizeEntity(res.subscription, ['subscription_id', 'id']) : null,
      transaction: res?.transaction ? normalizeTransaction(res.transaction) : null
    };
  },

  async claimStipend(dto) {
    const payload = {
      user_id: Number(dto.user_id)
    };
    return api.post('/economy/claim-stipend', payload);
  },

  // ── Publisher Earnings & Payouts (preserved for future parts) ─
  async getPublisherEarnings(publisherId) {
    return api.get(`/economy/publishers/${publisherId}/earnings`);
  },

  async requestPayout(publisherId, dto) {
    return api.post(`/economy/publishers/${publisherId}/payouts`, dto);
  },

  async withdrawPublisher(publisherId, dto) {
    return api.post(`/economy/publishers/${publisherId}/withdraw`, dto);
  },

  async getPayouts() {
    const res = await api.get('/economy/payouts');
    return normalizeList(res, ['payout_id']);
  }
};

export default economyApi;
