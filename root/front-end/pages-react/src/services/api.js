/**
 * ============================================================
 * CENTRAL API CLIENT — PLAYCARYS OMGMP
 * ============================================================
 *
 * Centralized HTTP client aligned with the NestJS backend running on port 3000.
 * Default Base URL: http://localhost:3000/api/v1 (or VITE_API_BASE_URL).
 *
 * FUTURE AUTHENTICATION INTEGRATION NOTICE:
 * Currently, request headers extract the temporary token and role from
 * session storage / local storage. When real authentication is integrated,
 * replace the storage token retrieval with the production JWT/session manager.
 *
 * Do not fabricate JWTs or spoof authentication headers.
 * Security boundaries are enforced by the server-side RolesGuard.
 */

const resolveApiBase = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    const custom = import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
    return custom.endsWith('/api/v1') ? custom : `${custom}/api/v1`;
  }
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

      const url = `${this.getBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const res = await fetch(url, options);

      // Handle HTTP errors
      if (!res.ok) {
        let errMessage = `API Error: ${res.status} ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMessage = Array.isArray(errData.message) ? errData.message.join(', ') : errData.message;
          }
        } catch {
          // If response body is not JSON, try text
          try {
            const errText = await res.text();
            if (errText) errMessage = errText;
          } catch {
            // ignore
          }
        }
        const error = new Error(errMessage);
        error.status = res.status;
        throw error;
      }

      // Handle empty responses (e.g. 204 No Content, DELETE, or void endpoints)
      if (res.status === 204) {
        return null;
      }

      const text = await res.text();
      if (!text || text.trim() === '') {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
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

  put(endpoint, body) {
    return this.request(endpoint, 'PUT', body);
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
