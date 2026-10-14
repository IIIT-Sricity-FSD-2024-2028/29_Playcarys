// Build-review console data, copied from the old pages/admin/game-review.html.
//
// Everything on that page comes from the backend (GET /games/:id/review is admin-only).
// The decision goes back through PATCH /games/:id/approve, so the server's own rules
// (a scan must exist, a failed scan needs a superuser, approval binds to the build hash)
// apply even if this page is bypassed.
import authService from './authService';
import {
  getDB,
  dispatchUserNotification,
  dispatchRoleNotification
} from './adminService';

function apiBase() {
  return window.PC_API;
}

// Headers for admin-only calls. The signed token is the real authorisation; the role
// header stays for routes that have not moved to the token yet.
export function apiHeaders(role, json) {
  const headers = { role: role };
  const token = authService.getApiToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

// Same, as used by the achievements calls (always JSON, token read from localStorage).
export function adminHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const s = authService.getSession();
    if (s && s.role) headers.role = s.role;
    const tok = localStorage.getItem('playcarys_api_token');
    if (tok) headers.Authorization = 'Bearer ' + tok;
  } catch (e) {
    // storage blocked: the request simply goes without a token
  }
  return headers;
}

// Everything the console shows: game, scan, publisher, history, blockers...
export async function fetchReview(gameId, role) {
  const res = await fetch(apiBase() + '/games/' + gameId + '/review', { headers: apiHeaders(role, false) });
  if (!res.ok) {
    let msg = res.status === 404 ? 'That game does not exist on the server.' : 'Server said ' + res.status;
    try {
      const b = await res.json();
      msg = b.message || msg;
    } catch (e) {
      // not JSON: keep the message above
    }
    throw new Error(msg);
  }
  return res.json();
}

// The file list is fetched on demand: it is big and only this page shows it.
export async function fetchManifest(gameId, role) {
  const r = await fetch(apiBase() + '/games/' + encodeURIComponent(gameId) + '/scan-manifest', {
    headers: apiHeaders(role, false)
  });
  if (!r.ok) throw new Error(String(r.status));
  const data = await r.json();
  return data.manifest || [];
}

// The achievements this publisher proposed, including the ones not approved yet.
export async function fetchAchievements(gameId) {
  const r = await fetch(apiBase() + '/games/' + gameId + '/achievements?includeUnapproved=true', {
    headers: adminHeaders()
  });
  return r.ok ? r.json() : [];
}

export async function reviewAchievement(achievementId, decision, reviewerId) {
  const r = await fetch(apiBase() + '/achievements/' + achievementId + '/review', {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ reviewer_id: parseInt(reviewerId, 10), decision: decision })
  });
  let body = {};
  try {
    body = await r.json();
  } catch (e) {
    // empty body
  }
  if (!r.ok) throw new Error(body.message || 'Failed (' + r.status + ')');
  return body;
}

export async function rescanGame(gameId, role) {
  const res = await fetch(apiBase() + '/games/' + gameId + '/rescan', {
    method: 'POST',
    headers: apiHeaders(role, true)
  });
  if (!res.ok) {
    let b = {};
    try {
      b = await res.json();
    } catch (e) {
      // empty body
    }
    throw new Error(b.message || res.statusText);
  }
}

export async function submitDecision(gameId, role, body) {
  const res = await fetch(apiBase() + '/games/' + gameId + '/approve', {
    method: 'PATCH',
    headers: apiHeaders(role, true),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let b = {};
    try {
      b = await res.json();
    } catch (e) {
      // empty body
    }
    throw new Error(b.message || 'Server said ' + res.status);
  }
  return res.json();
}

// After the server accepts a decision, copy it into the local DB so the rest of the
// admin pages agree straight away. The server stays authoritative.
export function syncLocal(data, gameId, session, updated, decision, note) {
  try {
    const db = getDB();
    const local = db.games.find((x) => String(x.game_id) === String(gameId));
    if (local) {
      local.game_approval_status = decision;
      local.game_status = decision === 'approved' ? 'enabled' : 'disabled';
      if (updated && updated.approved_bundle_hash) local.approved_bundle_hash = updated.approved_bundle_hash;
      local.review_note = note || '';
    }
    db.activityLog.unshift({
      type: 'approval',
      msg: (data.game.game_name || 'A game') + ' ' + decision + ' after build review',
      time: 'just now'
    });

    const pubName = data.publisher ? data.publisher.user_name : null;
    if (pubName) {
      dispatchUserNotification(
        pubName,
        session.role,
        session.username,
        'has <b>' + decision + '</b> your build for <b>' + (data.game.game_name || 'your game') + '</b>.' +
          (note ? '<br><i>' + note + '</i>' : '')
      );
    }
    if (session.role !== 'superuser') {
      dispatchRoleNotification('superuser', session.role, session.username, decision + ' the build for ' + (data.game.game_name || 'a game'));
    }
    db.save();
  } catch (e) {
    console.warn('[PlayCarys] Local mirror of the review decision failed', e);
  }
}

// 1536 -> "1.5 KB"
export function kb(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}
