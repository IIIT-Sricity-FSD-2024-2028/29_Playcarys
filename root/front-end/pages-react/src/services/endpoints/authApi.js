import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const authApi = {
  async login({ username, password }) {
    const res = await api.post('/auth/login', { username, password });
    return res;
  },

  async register(dto) {
    const res = await api.post('/auth/register', dto);
    return res;
  },

  async forgotPassword(dto) {
    return api.post('/auth/forgot-password', dto);
  },

  async resetPassword(dto) {
    return api.post('/auth/reset-password', dto);
  },

  async changePassword(dto) {
    return api.post('/auth/change-password', dto);
  },

  async heartbeat(dto) {
    return api.post('/auth/heartbeat', dto);
  },

  async release(dto) {
    return api.post('/auth/release', dto);
  }
};

export default authApi;
