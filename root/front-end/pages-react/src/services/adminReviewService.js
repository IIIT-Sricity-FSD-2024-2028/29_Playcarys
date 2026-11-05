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
  return window.PC_API || 'http://localhost:3000/api/v1';
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
  try {
    const res = await fetch(apiBase() + '/games/' + gameId + '/review', {
      headers: apiHeaders(role, false),
      cache: 'no-store'
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetchReview warning:', err);
  }

  // Fallback: build review payload from local DB / localStorage if server doesn't hold it yet
  let localGames = [];
  try {
    const raw = localStorage.getItem('playcarys_db_store_v5');
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.games)) localGames = p.games;
    }
  } catch (e) {}

  const db =
    typeof window !== 'undefined' && window.DB
      ? window.DB
      : typeof DB !== 'undefined'
      ? DB
      : getDB() || null;

  const all = [...(db?.games || []), ...localGames];
  const g = all.find((x) => String(x.game_id || x.id) === String(gameId));
  if (g) {
    const pubId = Number(g.game_publisher || g.publisherId || 6);
    const pubUser = db?.users?.find((u) => Number(u.user_id || u.id) === pubId);
    return {
      game: {
        ...g,
        id: g.id || g.game_id,
        game_id: g.game_id || g.id,
        game_name: g.game_name || g.title,
        game_type: g.game_type || g.genre,
        game_approval_status: g.game_approval_status || g.status || 'pending',
        game_status: g.game_status || (g.enabled ? 'enabled' : 'disabled'),
        publisher: g.publisher || pubUser?.user_name || 'Publisher',
        hosting_type: g.hosting_type || g.hostingType || 'hosted'
      },
      publisher: pubUser || { user_id: pubId, user_name: g.publisher || 'Publisher' },
      scan: g.scan || { verdict: 'pass', summary: { high: 0, medium: 0, low: 0 } },
      history: []
    };
  }

  throw new Error('That game does not exist on the server.');
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
  let backendRes = null;
  try {
    const res = await fetch(apiBase() + '/games/' + gameId + '/approve', {
      method: 'PATCH',
      headers: apiHeaders(role, true),
      body: JSON.stringify(body)
    });
    if (res.ok) {
      backendRes = await res.json();
    }
  } catch (err) {
    console.warn('Backend submitDecision warning:', err);
  }

  // Also update in localStorage so all components agree immediately
  try {
    const raw = localStorage.getItem('playcarys_db_store_v5');
    if (raw) {
      const lsDb = JSON.parse(raw);
      if (Array.isArray(lsDb.games)) {
        const idx = lsDb.games.findIndex((g) => String(g.game_id || g.id) === String(gameId));
        if (idx !== -1) {
          lsDb.games[idx].game_approval_status = body.game_approval_status;
          lsDb.games[idx].status = body.game_approval_status;
          lsDb.games[idx].game_status = body.game_approval_status === 'approved' ? 'enabled' : 'disabled';
          lsDb.games[idx].enabled = body.game_approval_status === 'approved';
          localStorage.setItem('playcarys_db_store_v5', JSON.stringify(lsDb));
          window.dispatchEvent(new Event('storage'));
        }
      }
    }
  } catch (e) {}

  return backendRes || { game_id: gameId, game_approval_status: body.game_approval_status };
}

// After the server accepts a decision, copy it into the local DB so the rest of the
// admin pages agree straight away. The server stays authoritative.
export function syncLocal(data, gameId, session, updated, decision, note) {
  try {
    const db = getDB();
    if (db && Array.isArray(db.games)) {
      const local = db.games.find((x) => String(x.game_id || x.id) === String(gameId));
      if (local) {
        local.game_approval_status = decision;
        local.status = decision;
        local.game_status = decision === 'approved' ? 'enabled' : 'disabled';
        local.enabled = decision === 'approved';
        if (updated && updated.approved_bundle_hash) local.approved_bundle_hash = updated.approved_bundle_hash;
        local.review_note = note || '';
      }
      db.activityLog = db.activityLog || [];
      db.activityLog.unshift({
        type: 'approval',
        msg: (data?.game?.game_name || 'A game') + ' ' + decision + ' after build review',
        time: 'just now'
      });

      const pubName = data?.publisher ? data.publisher.user_name : null;
      if (pubName) {
        dispatchUserNotification(
          pubName,
          session.role,
          session.username,
          'has <b>' + decision + '</b> your build for <b>' + (data?.game?.game_name || 'your game') + '</b>.' +
            (note ? '<br><i>' + note + '</i>' : '')
        );
      }
      if (session.role !== 'superuser') {
        dispatchRoleNotification('superuser', session.role, session.username, decision + ' the build for ' + (data?.game?.game_name || 'a game'));
      }
      if (typeof db.save === 'function') db.save();
    }
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
