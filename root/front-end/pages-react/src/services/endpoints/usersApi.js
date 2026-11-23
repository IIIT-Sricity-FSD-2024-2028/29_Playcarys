import api from '../api';
import { normalizeEntity, normalizeList } from './normalize';

export const usersApi = {
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role_id != null) query.append('role_id', params.role_id);
    const qs = query.toString();
    const res = await api.get(`/users${qs ? `?${qs}` : ''}`);
    return normalizeList(res);
  },

  async getUserById(id) {
    const res = await api.get(`/users/${id}`);
    return normalizeEntity(res);
  },

  async createUser(dto) {
    const res = await api.post('/users', dto);
    return normalizeEntity(res);
  },

  async updateUser(id, dto) {
    const res = await api.patch(`/users/${id}`, dto);
    return normalizeEntity(res);
  },

  async updateUserStatus(id, statusDto) {
    const res = await api.patch(`/users/${id}/status`, statusDto);
    return normalizeEntity(res);
  },

  async assignUserRole(id, roleDto) {
    const res = await api.patch(`/users/${id}/role`, roleDto);
    return normalizeEntity(res);
  },

  async deleteUser(id) {
    await api.delete(`/users/${id}`);
    return { id: String(id) };
  },

  async getRoles() {
    const res = await api.get('/roles');
    return normalizeList(res, ['role_id']);
  }
};

export default usersApi;
