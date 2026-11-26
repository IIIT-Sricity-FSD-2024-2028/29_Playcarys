// The audit log lives on the server (GET / POST / DELETE /audit-log, admin and superuser only).
// The server stamps the time and the actor from the signed token, so this file only sends
// what happened: a kind, a short message and a detail line.
import platformApi from './endpoints/platformApi';

// Newest first. Resolves to null when the server cannot be reached, so the page can say so
// instead of showing an empty log.
export async function fetchAuditLog(params) {
  try {
    return await platformApi.getAuditLog(params);
  } catch (e) {
    return null;
  }
}

// Fire and forget: an audit failure must never block the action it describes.
export async function recordAudit(type, msg, detail) {
  try {
    return await platformApi.postAuditLog({ type, msg, detail: detail || '' });
  } catch (e) {
    return null;
  }
}

export async function clearAuditLogOnServer() {
  try {
    await platformApi.clearAuditLog();
    return true;
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

export default {
  fetchAuditLog,
  recordAudit,
  clearAuditLogOnServer,
  timeAgo
};
