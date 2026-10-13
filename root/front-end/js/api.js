// Backend origin is resolved once in data/db.js (window.PC_API) so that whichever
// laptop serves the page is also treated as the API host. The literal fallback
// only applies if this file is somehow loaded without db.js.
const API_BASE = window.PC_API || ('http://' + (window.location.hostname || 'localhost') + ':3000/api/v1');

window.API = {
  getHeaders() {
    // Auth.apiAuthHeaders() is the source of truth for the signed session
    // token (stored under 'playcarys_api_token' by Auth.setApiToken() at
    // login) — 'jwt_token' was never written by anything in this app, so
    // every plain API.* call was silently going out unauthenticated.
    // 'Auth' is declared with `const` at top scope in utils.js, so — unlike a
    // `var` — it never becomes `window.Auth`; check the bare identifier instead
    // (same guard db.js already uses for this exact reason).
    const hasAuth = typeof Auth !== 'undefined';
    const headers = {
      'Content-Type': 'application/json',
      ...(hasAuth ? Auth.apiAuthHeaders() : {}),
    };
    try {
      const session = hasAuth ? Auth.getSession() : null;
      if (session && session.role) headers['role'] = session.role;
    } catch (e) { /* not signed in */ }
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
