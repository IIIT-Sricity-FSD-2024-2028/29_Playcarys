const API_BASE = 'http://localhost:3000/api/v1';

window.API = {
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    const session = Auth.getSession();
    if (session && session.role) {
      headers['role'] = session.role;
    }
    return headers;
  },

  async request(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders(),
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `API Error: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`[API]: Failed ${method} ${endpoint}`, err);
      throw err;
    }
  },

  async get(endpoint) { return this.request(endpoint, 'GET'); },
  async post(endpoint, body) { return this.request(endpoint, 'POST', body); },
  async patch(endpoint, body) { return this.request(endpoint, 'PATCH', body); },
  async del(endpoint) { return this.request(endpoint, 'DELETE'); }
};
