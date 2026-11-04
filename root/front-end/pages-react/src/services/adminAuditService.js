// The audit log lives on the server (GET / POST / DELETE /audit-log, admin and superuser only).
// The server stamps the time and the actor from the signed token, so this file only sends
// what happened: a kind, a short message and a detail line.
import authService from './authService';

function apiBase() {
  if (typeof window !== 'undefined' && window.PC_API) {
    return window.PC_API;
  }
  const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
  return `http://${hostname || 'localhost'}:3000/api/v1`;
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = authService.getApiToken();
  if (token) h.Authorization = 'Bearer ' + token;
  return h;
}

// Newest first. Resolves to null when the server cannot be reached, so the page can say so
// instead of showing an empty log.
export async function fetchAuditLog() {
  try {
    const res = await fetch(apiBase() + '/audit-log?_=' + Date.now(), { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Fire and forget: an audit failure must never block the action it describes.
export async function recordAudit(type, msg, detail) {
  try {
    const res = await fetch(apiBase() + '/audit-log', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ type: type, msg: msg, detail: detail || '' })
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

export async function clearAuditLogOnServer() {
  try {
    const res = await fetch(apiBase() + '/audit-log', { method: 'DELETE', headers: headers() });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// "just now", "5m ago", "2h ago", "3d ago", then the date.
export function timeAgo(iso) {
  const t = Date.parse(iso || '');
  if (isNaN(t)) return '';
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 45) return 'just now';
  if (secs < 3600) return Math.round(secs / 60) + 'm ago';
  if (secs < 86400) return Math.round(secs / 3600) + 'h ago';
  if (secs < 7 * 86400) return Math.round(secs / 86400) + 'd ago';
  return new Date(t).toLocaleDateString();
}
