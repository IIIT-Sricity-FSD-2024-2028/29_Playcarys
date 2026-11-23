import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const economyApi = {
  async getCatalogue() {
    const res = await api.get('/economy/catalogue');
    return normalizeList(res, ['item_id']);
  },

  async getSkins() {
    const res = await api.get('/economy/skins');
    return normalizeList(res, ['skin_id', 'item_id']);
  },

  async getBalance(userId) {
    return api.get(`/economy/balance/${userId}`);
  },

  async getTransactions(userId) {
    const res = await api.get(`/economy/transactions/${userId}`);
    return normalizeList(res, ['transaction_id']);
  },

  async purchaseItem(dto) {
    return api.post('/economy/purchase', dto);
  },

  async equipItem(dto) {
    return api.post('/economy/equip', dto);
  },

  async unequipItem(dto) {
    return api.post('/economy/unequip', dto);
  },

  async subscribe(dto) {
    return api.post('/economy/subscribe', dto);
  },

  async claimStipend(dto) {
    return api.post('/economy/claim-stipend', dto);
  },

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
