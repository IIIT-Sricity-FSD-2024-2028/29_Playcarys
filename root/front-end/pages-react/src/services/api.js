// API client aligned with the NestJS backend and legacy api.js contracts

const resolveApiBase = () => {
  if (typeof window !== 'undefined' && window.PC_API) {
    return window.PC_API;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname || 'localhost'}:3000/api/v1`;
};

export const api = {
  getBaseUrl() {
    return resolveApiBase();
  },

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const token = sessionStorage.getItem('playcarys_api_token') || localStorage.getItem('playcarys_api_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const rawSession = sessionStorage.getItem('playcarys_session') || localStorage.getItem('playcarys_session');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session && session.role) {
          headers['role'] = session.role;
        }
      }
    } catch (e) {
      // ignore storage access errors
    }

    return headers;
  },

  async request(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders()
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(`${this.getBaseUrl()}${endpoint}`, options);
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

  get(endpoint) {
    return this.request(endpoint, 'GET');
  },

  post(endpoint, body) {
    return this.request(endpoint, 'POST', body);
  },

  patch(endpoint, body) {
    return this.request(endpoint, 'PATCH', body);
  },

  del(endpoint) {
    return this.request(endpoint, 'DELETE');
  },

  delete(endpoint) {
    return this.request(endpoint, 'DELETE');
  }
};

export default api;
