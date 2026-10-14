// Keeping the admin page alive, copied from the old js/utils.js:
//  - pullServerState(): the old "PlayCarysLive" poll, so new notifications and messages show
//    up without pressing refresh
//  - sendHeartbeat(): the old Presence beat, so the server knows this admin is still here
//  - releaseSession(): hands the account back to the server on logout
import { getDB, sameId } from './adminService';

const DB_KEY = 'playcarys_db_store_v5';
let pulling = false;
let lastPayload = null;

// Fetch the server's copy, merge it into DB, and say whether anything changed.
export async function pullServerState() {
  const db = getDB();
  if (!db || typeof db.mergeRemoteState !== 'function' || pulling) return false;
  pulling = true;
  try {
    // Never replace our own write that is still on its way to the server.
    if (typeof db.whenSynced === 'function') await db.whenSynced(1500);
    const res = await fetch(window.PC_API + '/db-export?_=' + Date.now());
    if (!res.ok) return false;
    const remote = await res.json();
    db.mergeRemoteState(remote);
    if (typeof db.saveLocal === 'function') db.saveLocal();
    const payload = localStorage.getItem(DB_KEY);
    if (payload === lastPayload) return false; // nothing actually moved
    lastPayload = payload;
    return true;
  } catch (e) {
    // Backend down: the next tick simply tries again.
    return false;
  } finally {
    pulling = false;
  }
}

// Prove this session is still alive. If another device took the account, onEvicted runs.
export function sendHeartbeat(session, onEvicted) {
  if (!session || !session.sessionToken || !window.PC_API) return;

  const db = getDB();
  const u = db && db.users.find((x) => sameId(x.user_id != null ? x.user_id : x.id, session.userId));
  if (u) {
    u.lastSeen = new Date().toISOString();
    u.active_session_token = session.sessionToken;
    u.active_session_at = new Date().toISOString();
  }

  fetch(window.PC_API + '/auth/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: parseInt(session.userId, 10),
      session_token: session.sessionToken
    })
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((res) => {
      if (res && res.evicted) onEvicted();
    })
    .catch(() => {
      // backend down; the server frees an abandoned session after 15 seconds
    });
}

// Give the account back right away, so it can sign in somewhere else without waiting 15 seconds.
// `keepalive` lets the request finish even though the page is about to change.
export function releaseSession(session) {
  if (!session || !session.sessionToken || !window.PC_API) return;
  try {
    fetch(window.PC_API + '/auth/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: parseInt(session.userId, 10),
        session_token: session.sessionToken
      }),
      keepalive: true
    });
  } catch (e) {
    // best effort
  }
}
