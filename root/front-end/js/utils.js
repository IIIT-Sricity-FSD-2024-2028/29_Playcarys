// ── Social scripts ────────────────────────────────────────────────────────────
//
// Friends, search and chat live in js/social.js and js/social-ui.js. They are
// pulled in from here rather than added as <script> tags to every page: the
// side drawer is injected by THIS file on every player page, and the drawer is
// where the friends list lives, so anywhere utils.js runs is exactly where they
// are needed. One place to load them, no page left out by accident.
(function loadSocialScripts() {
  var here = document.currentScript && document.currentScript.src;
  var base = here ? here.replace(/\/[^/]*$/, '/') : '/js/';
  ['social.js', 'social-ui.js'].forEach(function (file) {
    if (document.querySelector('script[data-pc-social="' + file + '"]')) return;
    var s = document.createElement('script');
    s.src = base + file;
    s.async = false;                 // keep social.js before social-ui.js
    s.setAttribute('data-pc-social', file);
    document.head.appendChild(s);
  });
})();

// ============================================================
// ── Live state sync ───────────────────────────────────────────────────────────
//
// DB.save() emits 'global_db_update' to the gateway, which broadcasts
// 'global_db_update_received' to every other client — but NOTHING was listening
// for it, and DB.mergeRemoteState() was only ever reached from the boot hydrate.
// The result: the DB was only ever re-read on a full page load, so a friend
// request, a chat message, another player joining your room, or the host pressing
// Start were all invisible until you pressed F5. That is the "doesn't work without
// refresh" everyone hit.
//
// PlayCarysLive closes that loop: pull the server snapshot, merge it (append-only
// tables are unioned so nothing local is destroyed), then fire one DOM event that
// any page can subscribe to.
const PlayCarysLive = {
  DB_KEY: 'playcarys_db_store_v5',
  _pulling: false,
  _queued: false,
  _pollTimer: null,
  _lastSeenPayload: null,

  async pull(reason) {
    if (typeof DB === 'undefined' || typeof DB.mergeRemoteState !== 'function') return;
    // Collapse bursts: a save storm produces one broadcast per write.
    if (this._pulling) { this._queued = true; return; }
    this._pulling = true;
    try {
      // Never clobber our own in-flight write with an older server snapshot.
      if (typeof DB.whenSynced === 'function') await DB.whenSynced(1500);

      const res = await fetch(window.PC_API + '/db-export', { cache: 'no-store' });
      if (!res.ok) return;
      const remote = await res.json();
      DB.mergeRemoteState(remote);
      if (typeof DB.saveLocal === 'function') DB.saveLocal();

      const payload = localStorage.getItem(this.DB_KEY);
      if (payload === this._lastSeenPayload) return;   // nothing actually moved
      this._lastSeenPayload = payload;

      // Re-broadcast as a `storage` event.
      //
      // room-lobby, join-session and the chess board all listen for `storage` to
      // pick up the other player's moves — but the browser only fires that between
      // TABS OF THE SAME BROWSER. Two players on two laptops never exchanged a
      // single one, which is why "Start Game" only ever launched for the host and
      // the guest sat in the lobby forever. Synthesising it here means every one of
      // those existing listeners starts working across the network unchanged.
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.DB_KEY,
        newValue: payload,
        storageArea: localStorage
      }));

      document.dispatchEvent(new CustomEvent('playcarys:dbupdate', { detail: { reason } }));
    } catch (e) {
      // Backend down — the poll simply retries later. Not worth a console error
      // on every tick.
    } finally {
      this._pulling = false;
      if (this._queued) { this._queued = false; this.pull(reason); }
    }
  },

  /**
   * Poll as a safety net.
   *
   * This used to skip itself entirely whenever the socket was connected:
   *
   *     if (window.playcarysSocket && window.playcarysSocket.connected) return;
   *
   * The comment said "socket already covers us". It does not. The gateway only
   * relays `global_db_update`, which is emitted by ANOTHER BROWSER inside
   * DB.save(). Anything that changes server state without a browser saying so —
   * a REST call, an admin action through the API, a game webhook, a backend
   * migration — was never broadcast, and this poll had opted out of noticing.
   *
   * Reproduced 2026-08-14: a friend request created via POST /notifications
   * never reached an open, socket-connected tab. 12s later it still had the old
   * 99 notifications; one manual pull() delivered it instantly. The merge and
   * the rendering were never broken — nothing was triggering them.
   *
   * So the poll now always runs. It just runs more slowly while the socket is
   * up, because then it is only a backstop rather than the main channel.
   */
  startPolling(ms) {
    if (this._pollTimer) return;
    const base = ms || 5000;
    let tick = 0;
    this._pollTimer = setInterval(() => {
      if (document.hidden) return;   // a hidden tab catches up on visibilitychange below
      tick++;
      const socketUp = !!(window.playcarysSocket && window.playcarysSocket.connected);
      // socket up  -> every 3rd tick (~15s), purely as a backstop
      // socket down -> every tick, because it is the only channel left
      if (socketUp && tick % 3 !== 0) return;
      this.pull(socketUp ? 'poll-backstop' : 'poll');
    }, base);

    // Coming back to a backgrounded tab is the single most likely moment for the
    // view to be stale, and the interval above deliberately does nothing while
    // hidden. Pull once, immediately, on the way back in.
    if (!this._visBound) {
      this._visBound = true;
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.pull('visible');
      });
    }
  }
};
window.PlayCarysLive = PlayCarysLive;

// Default subscribers: the notification badge and the hamburger drawer are on every
// page, so refresh them centrally instead of making each page remember to.
document.addEventListener('playcarys:dbupdate', () => {
  if (typeof updateNavBadge === 'function') updateNavBadge();
  if (typeof window._drawerNotifRender === 'function') window._drawerNotifRender();
  if (typeof window._drawerFriendsRender === 'function') window._drawerFriendsRender();
  // Fresh server state just landed — the earliest point we could learn that
  // another device claimed our account, so check right here rather than
  // waiting for the next 45s Presence tick.
  if (typeof Auth !== 'undefined' && Auth.checkSessionOwnership) Auth.checkSessionOwnership();
});

// ── Real-Time WebSockets Integration (Phase 4) ────────────────────────────────
function initPlayCarysWebSockets() {
  // Load the socket.io CLIENT from our own backend, not from a CDN.
  //
  // The server already serves it at /socket.io/socket.io.js (that is socket.io's
  // default), and it is guaranteed to be the matching version. The CDN was a
  // hard internet dependency on a LAN app: two laptops on a phone hotspot with
  // no data, or a college network that blocks cdn.socket.io, got no socket at
  // all — no live chess sync, no matchmaking, no device handoff — and the only
  // sign was one console warning. The CDN stays as a fallback for the case
  // where the backend is unreachable but the internet is not.
  const backend = window.PC_BACKEND || `http://${window.location.hostname}:3000`;

  const connect = () => {
    try {
      // Allow the polling transport as well as websocket. Websocket-only meant
      // that any proxy or firewall that blocks the Upgrade handshake produced a
      // socket that never connected, rather than one that fell back.
      window.playcarysSocket = io(backend, { transports: ["websocket", "polling"] });

      window.playcarysSocket.on("connect", () => {
        console.log("[PlayCarys IO] Connected to Real-Time Server", window.playcarysSocket.id);
        // Re-announce "I am signed in as this user" on every (re)connect — a
        // fresh socket has a fresh client id, so the server's old mapping is
        // gone and a device-handoff request would find nobody home otherwise.
        const session = (typeof Auth !== 'undefined') ? Auth.getSession() : null;
        if (session && session.role !== 'guest') {
          window.playcarysSocket.emit('register_identity', { userId: String(session.userId) });
        }
      });

      // The half of the round trip that was missing.
      window.playcarysSocket.on("global_db_update_received", () => {
        PlayCarysLive.pull('socket');
      });

      // A new device is trying to sign in as us — surface the approval banner.
      window.playcarysSocket.on('device_login_incoming', (data) => {
        if (typeof showDeviceHandoffBanner === 'function') showDeviceHandoffBanner(data);
      });

      window.playcarysSocket.on("session_updated", (data) => {
        console.log("[PlayCarys IO] Match Event Received:", data);
        // Pull first so the re-render below sees the change that caused the event.
        PlayCarysLive.pull('session_updated').then(() => {
          if (typeof renderRooms === 'function') renderRooms();
          if (typeof updateStatus === 'function') updateStatus();
        });
      });
      document.dispatchEvent(new CustomEvent('playcarys:socketready', {
        detail: { socket: window.playcarysSocket }
      }));
    } catch (e) {
      console.warn("[PlayCarys IO] Could not connect to WebSockets. Falling back to local state.", e);
    }
  };

  // Already loaded by another script on this page.
  if (typeof window.io === 'function') { connect(); return; }

  const load = (src, onFail) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = connect;
    script.onerror = onFail;
    document.head.appendChild(script);
  };

  load(backend + '/socket.io/socket.io.js', () => {
    console.warn('[PlayCarys IO] Backend did not serve the socket.io client — trying the CDN.');
    load('https://cdn.socket.io/4.7.2/socket.io.min.js', () => {
      console.warn('[PlayCarys IO] No socket.io client available — falling back to polling.');
    });
  });
}

// Boot Sockets + the polling fallback that covers us whenever they are unavailable.
setTimeout(initPlayCarysWebSockets, 500);
setTimeout(() => PlayCarysLive.startPolling(5000), 1500);

// ============================================================
//  Format Date Helper
// ============================================================
function formatDate(dateString) {
  if (!dateString) return 'Unknown Date';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Invalid Date';
  }
}

// ============================================================
//  PlayCarys — Shared Utilities
// ============================================================

/**
 * PATH_PREFIX Logic: 
 * Determines how many levels up to go to reach the root directory from current file.
 */
function getPathPrefix() {
  const path = window.location.pathname;
  if (path.includes('/pages/')) {
    // Correctly handle structures like /pages/role/page.html
    const parts = path.split('/pages/');
    const subParts = parts[1].split('/');
    return '../'.repeat(subParts.length);
  }
  return '';
}

// Add prefetch logic to load pages on hover
document.addEventListener('mouseover', e => {
  const link = e.target.closest('[onclick]');
  if (!link) return;

  const match = link.getAttribute('onclick')?.match(/navigate\(['"]([^'"]+)['"]\)/);
  if (!match) return;

  const url = match[1] + '.html';
  if (!document.querySelector(`link[rel=prefetch][href="${url}"]`)) {
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = url;
    document.head.appendChild(prefetch);
  }
});

// How long body.page-leaving actually takes. Keep in step with the `pageLeave`
// keyframes in css/variables.css.
const PAGE_LEAVE_MS = 220;

function showPageLoader() {
  const bar = document.createElement('div');
  bar.id = 'page-loader';
  bar.style.cssText = `
    position:fixed; top:0; left:0; height:2px; width:0%;
    background: linear-gradient(90deg, #00d4ff, #7c3aed);
    z-index:9999; transition: width ${PAGE_LEAVE_MS}ms cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 0 8px rgba(0,212,255,0.6);
  `;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.style.width = '90%');
}

/**
 * Shared exit animation + hand-off used by navigate() and navigateTo().
 *
 * The old code played a 220ms `pageLeave` animation and then changed
 * location.href after only 80ms, so the fade was cut off at about a third and
 * the page visibly jumped — that is the "transitions aren't smooth" everyone
 * noticed. It also ran a full DB.saveLocal() (JSON.stringify of the entire
 * store) one frame into the animation, stalling the main thread across exactly
 * the frames that needed to be smooth. beforeunload already calls saveLocal, so
 * that mid-animation copy was pure jank for no benefit.
 */
function _leavePageThen(go) {
  if (window._navigating) return;
  window._navigating = true;

  // Tell the pagehide handler this is an in-app page change, not the tab
  // closing — otherwise every click would release the account and sign the
  // player out. Cleared on the next page's load.
  try { sessionStorage.setItem('pc_navigating', '1'); } catch (e) { }

  showPageLoader();
  document.body.classList.add('page-leaving');

  let done = false;
  const finish = () => { if (done) return; done = true; go(); };

  // Prefer the real animationend so this stays correct if the CSS timing changes;
  // fall back on a timer in case the element is missing or animations are off.
  const target = document.querySelector('.page-wrapper, .dash-shell');
  if (target) target.addEventListener('animationend', finish, { once: true });
  setTimeout(finish, PAGE_LEAVE_MS + 40);
}

window.navigate = function (page) {
  _leavePageThen(() => {
    const target = page.includes('?') ? page.replace('?', '.html?') : page + '.html';
    window.location.href = target;
  });
};

/**
 * navigateTo — navigate to an explicit href, waiting for the pending backend
 * write to land first.
 *
 * THIS FUNCTION DID NOT EXIST. It was listed as a global in .eslintrc.js and
 * referenced by name in a db.js comment, but no implementation was ever present,
 * so all 25 call sites across join-session, room-lobby, match-history,
 * my-tournaments, leaderboard and notifications threw ReferenceError and simply
 * did nothing. That is why "Back to Dashboard" was dead, why joining a room
 * never opened the lobby, and why the host pressing START stayed put while the
 * match had already begun.
 *
 * Unlike navigate() it takes a complete href (extension and query included) and
 * awaits DB.whenSynced(), so a write like "the match has started" reaches the
 * backend before this client walks away from it.
 */
window.navigateTo = function (href) {
  _leavePageThen(() => {
    const jump = () => { window.location.href = href; };
    if (typeof DB !== 'undefined' && typeof DB.whenSynced === 'function') {
      DB.whenSynced(1500).then(jump, jump);
    } else {
      jump();
    }
  });
};

const GAME_ASSETS = {
  COLORS: [
    'linear-gradient(135deg,#1a3a2a,#0d2a1a)', // Green
    'linear-gradient(135deg,#1a1a3a,#0d0d2a)', // Blue
    'linear-gradient(135deg,#3a1a1a,#2a0d0d)', // Red
    'linear-gradient(135deg,#1a2a3a,#0d1a2a)', // Teal
    'linear-gradient(135deg,#3a2a1a,#2a1a0d)'  // Orange/Gold
  ],
  get GENRES() {
    return (DB.genres || []).map(g => g.name);
  },
  // Keys should match game.img field
  IMG_MAP: {
    call_of_duty: 'images/cod_beta.png', // Renamed key to match new ID
    deadshot: 'images/deadshot.png',
    carrom: 'images/carrom.png',
    horror_escape: 'images/horror_escape.png',
    f1_2022: 'images/f1_2022.png',
    pubg_lite: 'images/pubg_lite.png',
    chess: 'images/chess.png',
    hill_climbing: 'images/hill_climbing.png',
    candy_crush: 'images/candy_crush.png',
    // Cover art for the open-source games added to the catalogue. Each image is
    // taken from that game's own build or repository, so nothing here is a
    // placeholder or a third-party asset we have no right to.
    hexgl: 'images/hexgl.jpg',
    game_2048: 'images/game_2048.png',
    hextris: 'images/hextris.png',
    // tosios / open_agar removed 2026-08-14 along with their listings — their
    // servers never existed, so the games were never playable.
    ancient_beast: 'images/ancient_beast.png'
  },
  EMOJI_MAP: {
    call_of_duty: '🔫',
    deadshot: '🎯',
    carrom: '🎲',
    horror_escape: '👻',
    f1_2022: '🏎️',
    pubg_lite: '🪂',
    chess: '♟️',
    hill_climbing: '🚙',
    candy_crush: '🍬',
    // Fallbacks for the same six — getGameIconHTML swaps to the emoji tile if
    // an image ever fails to load, so every game degrades to something
    // recognisable rather than a blank square.
    hexgl: '🛸',
    game_2048: '🔢',
    hextris: '⬡',
    ancient_beast: '🐉'
  }
};

/**
 * Returns consistent HTML for a game icon/thumbnail.
 * Handles real image thumbnails with fallback to stylized patterns.
 * @param {string} size - CSS size for icons (e.g. '60px') or 'tile' for dashboard cards
 */
function getGameIconHTML(game, index = 0, size = '60px', extraStyles = '') {
  const prefix = getPathPrefix();
  const imgKey = game.img || '';
  const imgSrc = (imgKey.startsWith('data:image/') || imgKey.startsWith('http'))
    ? imgKey
    : ((GAME_ASSETS.IMG_MAP[imgKey]) ? prefix + GAME_ASSETS.IMG_MAP[imgKey] : null);
  const emoji = GAME_ASSETS.EMOJI_MAP[imgKey] || '🎮';
  const bgColor = GAME_ASSETS.COLORS[index % GAME_ASSETS.COLORS.length];

  // Tile mode for Dashboards
  if (size === 'tile') {
    const bg = imgSrc ? `url(${imgSrc})` : bgColor;
    return `
      <div class="game-tile-visual" style="width:100%; height:130px; background:${bg}; background-size:cover; background-position:center; position:relative; overflow:hidden; border-radius:var(--radius-lg) var(--radius-lg) 0 0; ${extraStyles}">
        ${!imgSrc ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:3rem; filter:drop-shadow(0 4px 12px rgba(0,0,0,0.4))">${emoji}</div>` : ''}
        <div style="position:absolute; inset:0; background:linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8) 100%)"></div>
      </div>`;
  }

  // Standard Icon mode
  if (imgSrc) {
    return `
      <div style="position:relative; width:${size}; height:${size}; flex-shrink:0; ${extraStyles}">
        <img src="${imgSrc}" alt="${game.title}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius-md); border:1px solid var(--border-primary); display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div style="display:none; width:100%; height:100%; background:${bgColor}; border-radius:var(--radius-md); border:1px solid var(--border-primary); align-items:center; justify-content:center; font-size:calc(${size} * 0.5)">${emoji}</div>
      </div>`;
  } else {
    return `<div style="width:${size}; height:${size}; background:${bgColor}; border-radius:var(--radius-md); border:1px solid var(--border-primary); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:calc(${size} * 0.5); ${extraStyles}">${emoji}</div>`;
  }
}

// ---- Session / Auth -----------------------------------------------
const Auth = {
  SESSION_KEY: 'playcarys_session',
  // The server-signed session token from POST /auth/login. This is what the
  // backend guard trusts: the `role` header it used to read was written by the
  // client, so `role: superuser` authorised anyone. Staff endpoints now refuse
  // anything without a valid signature here.
  API_TOKEN_KEY: 'playcarys_api_token',

  /** Store the signed token issued at sign-in. */
  setApiToken(token) {
    try {
      if (token) {
        sessionStorage.setItem(this.API_TOKEN_KEY, token);
        localStorage.setItem(this.API_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(this.API_TOKEN_KEY);
        localStorage.removeItem(this.API_TOKEN_KEY);
      }
    } catch (e) { /* storage blocked — the request simply goes unauthenticated */ }
  },

  getApiToken() {
    try {
      return sessionStorage.getItem(this.API_TOKEN_KEY) || localStorage.getItem(this.API_TOKEN_KEY) || null;
    } catch (e) { return null; }
  },

  /** Headers for an authenticated API call. Safe to spread when signed out. */
  apiAuthHeaders() {
    const token = this.getApiToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  },

  // A tab is presumed dead (crash, laptop sleep, tab closed without signing
  // out) once it has missed three heartbeats. Heartbeats are 5s, so the account
  // frees itself ~15s after the last tab goes away.
  //
  // This used to be 100s, because the only keep-alive was Presence.beat() —
  // which POSTed the WHOLE database and so could not run more than every 45s.
  // The result was an owner being told "your account is open somewhere" for
  // nearly two minutes after they closed their own tab. There is a dedicated
  // POST /auth/heartbeat now, a few dozen bytes, so the window can be tight.
  SESSION_STALE_MS: 15000,
  /** How often a signed-in tab proves it is still there. */
  HEARTBEAT_MS: 5000,

  login(user, sessionToken) {
    const session = {
      // `||` not `??` meant a user_id of 0 fell through to `user.id`, which no
      // user row has — and the superuser is the only account with id 0. So the
      // superuser, alone among every role, signed in with session.userId
      // undefined: /notifications/directory?viewerId=undefined answered 400 and
      // the staff messaging directory never loaded for the one account meant to
      // reach everybody.
      userId: user.user_id ?? user.id,
      role: user.role,
      username: user.user_name || user.username,
      avatar: user.avatar,
      sessionToken: sessionToken || null
    };
    // Keep the signed API token, not just the session id.
    //
    // api.js already attaches Auth.apiAuthHeaders() to every request, and
    // setApiToken() already existed — but nothing ever called it on sign-in;
    // only logout cleared it. getApiToken() therefore always returned null and
    // EVERY @Roles-gated endpoint refused the browser with "staff access
    // requires a signed session", whoever was signed in. The token arrives on
    // the login response, so it is kept here instead of being discarded.
    if (user && user.token) this.setApiToken(user.token);

    const raw = JSON.stringify(session);
    sessionStorage.setItem(this.SESSION_KEY, raw);
    localStorage.setItem(this.SESSION_KEY, raw);  // persist across dev-server reloads

    // The socket's own "connect" handler re-announces identity on every
    // (re)connect, but if the socket connected BEFORE this login happened
    // (e.g. browsing as a guest, then signing in) that event has already
    // fired and won't fire again — announce here too so a handoff request can
    // find this tab immediately instead of only after the next reconnect.
    if (session.role !== 'guest' && window.playcarysSocket && window.playcarysSocket.connected) {
      window.playcarysSocket.emit('register_identity', { userId: String(session.userId) });
    }
  },

  // One account, one active session. Without this, sharing (or guessing) a
  // password lets someone else sign in and walk straight into a live match the
  // real player is in the middle of. Called right before Auth.login() on every
  // real (non-guest) sign-in; returns {ok:false} if another tab/device already
  // holds the account and is still heartbeating.
  claimSession(user) {
    if (!user || user.role === 'guest') return { ok: true, token: null };
    const now = Date.now();
    const lastBeat = user.active_session_at ? Date.parse(user.active_session_at) : NaN;
    const isFree = !user.active_session_token || isNaN(lastBeat) || (now - lastBeat) > this.SESSION_STALE_MS;
    if (!isFree) return { ok: false };
    const token = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : ('sess_' + now + '_' + Math.random().toString(36).slice(2));
    user.active_session_token = token;
    user.active_session_at = new Date(now).toISOString();
    return { ok: true, token };
  },

  // Claims the session unconditionally — used after either an explicit human
  // approval (device handoff) or an explicit "yes, end other sessions"
  // confirmation, where the staleness check in claimSession() is beside the
  // point because a person just made the call directly.
  forceClaimSession(user) {
    const token = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : ('sess_' + Date.now() + '_' + Math.random().toString(36).slice(2));
    user.active_session_token = token;
    user.active_session_at = new Date().toISOString();
    return token;
  },

  // Rough, honest device label for the approval banner — not a fingerprint,
  // just enough for a human to recognise "oh, that's my phone" vs "that's not me."
  _deviceLabel() {
    const ua = navigator.userAgent || '';
    const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'a device';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
      : /Safari\//.test(ua) ? 'Safari' : '';
    return browser ? `${os} • ${browser}` : os;
  },

  // No live device answered the handoff request, but tell the user what
  // signing in here will do before it happens, instead of doing it silently.
  //
  // Only reached when the server has already said the account IS claimed
  // (login returned 409 SESSION_ACTIVE) — a merely stale claim never gets
  // here, because the server's own claimSession() lets a stale takeover
  // through with no prompt at all (see AuthService.claimSession). Prompting
  // for that case too used to make every ordinary login look stuck.
  _confirmNoActiveSession() {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-overlay show';
      wrap.style.zIndex = '10000';
      const body = "Your other device isn't responding. You can sign in here — that will end the session on the other device.";
      wrap.innerHTML = `
        <div class="modal" style="max-width:400px;text-align:center">
          <div style="font-size:2.25rem;margin-bottom:.5rem">🔐</div>
          <h3 class="modal-title" style="margin-bottom:.6rem">Sign In Here?</h3>
          <p style="color:var(--text-secondary);font-size:.875rem;margin-bottom:1.5rem">${body}</p>
          <div style="display:flex;gap:.75rem;justify-content:center">
            <button class="btn btn-ghost" id="dh-confirm-cancel">Cancel</button>
            <button class="btn btn-primary" id="dh-confirm-ok">Sign In</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      const cleanup = (result) => { wrap.remove(); resolve(result); };
      wrap.querySelector('#dh-confirm-ok').onclick = () => cleanup(true);
      wrap.querySelector('#dh-confirm-cancel').onclick = () => cleanup(false);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) cleanup(false); });
    });
  },

  // Case 1 — something IS active; ask that device to approve the handoff over
  // the socket and wait up to `timeoutMs` for an answer. Resolves to one of
  // 'approved' | 'denied' | 'timeout' | 'unreachable' (no live socket to ask).
  requestDeviceHandoff(userId, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const sock = window.playcarysSocket;
      if (!sock || !sock.connected) { resolve('unreachable'); return; }
      const requestId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ('req_' + Date.now() + '_' + Math.random().toString(36).slice(2));
      let settled = false;
      const finish = (status) => {
        if (settled) return;
        settled = true;
        sock.off('device_login_response', onResponse);
        sock.off('device_login_ack', onAck);
        clearTimeout(timer);
        clearTimeout(ackTimer);
        resolve(status);
      };
      const onResponse = (data) => {
        if (data.requestId !== requestId) return;
        finish(data.approved ? 'approved' : (data.reason || 'denied'));
      };
      // The old device ACKs as soon as it renders the prompt. No ACK quickly =
      // nothing is really listening (stale build with no handler, crashed page,
      // socket registered but tab gone), so report 'unreachable' rather than
      // making the user wait out the full timeout for an answer that is never
      // coming. An ACK means a human has it on screen — then we wait properly.
      const onAck = (data) => {
        if (data.requestId !== requestId) return;
        clearTimeout(ackTimer);
      };
      sock.on('device_login_response', onResponse);
      sock.on('device_login_ack', onAck);
      const ackTimer = setTimeout(() => finish('unreachable'), 2500);
      const timer = setTimeout(() => finish('timeout'), timeoutMs);
      sock.emit('device_login_request', { userId: String(userId), requestId, deviceLabel: this._deviceLabel() });
    });
  },

  // Tracks the last denial/timeout per account so a rejected requester can't
  // immediately hammer the other device with another prompt.
  _lastDeniedAt: {},
  HANDOFF_COOLDOWN_MS: 15000,

  /**
   * Server-authoritative login. POSTs credentials (and, once set, `force`) to
   * POST /auth/login and returns a typed outcome. Never mints a session token
   * locally — the token in a successful response IS the claim, minted by
   * AuthService.claimSession on the same request that verified the password,
   * so it is guaranteed to already match what the server holds. A
   * client-generated token could not make that promise: db-import strips
   * active_session_token/active_session_at from every row on the way in (see
   * the comment in app.controller.ts), so anything minted here was fiction
   * that the very next heartbeat or sync would catch — and immediately sign
   * the real, only, signed-in user back out. That was the actual bug behind
   * "you're signed in elsewhere" looping right after a successful login.
   *
   * Returns one of:
   *   {status:'ok', data}       — data is the full /auth/login response
   *   {status:'conflict'}       — 409 SESSION_ACTIVE; caller should resolve
   *                                via resolveSessionConflict() and retry
   *                                with force:true
   *   {status:'banned'}
   *   {status:'bad'}            — wrong credentials
   *   {status:'offline'}        — could not reach the server
   */
  async serverLogin(body) {
    let res;
    try {
      res = await fetch(window.PC_API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      return { status: 'offline' };
    }
    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', data };
    }
    if (res.status === 409) return { status: 'conflict' };
    let message = '';
    try { const j = await res.json(); message = String(j.message || ''); } catch (e) { }
    if (/banned/i.test(message)) return { status: 'banned' };
    return { status: 'bad' };
  },

  // Called after serverLogin() comes back {status:'conflict'} — the account
  // IS claimed by a live session. Ask that device to approve the handoff over
  // the socket; if nobody answers, fall back to an explicit human
  // confirmation. Resolves {ok:true} when the caller should retry
  // serverLogin with force:true added to the same body, or {ok:false, reason,
  // retryInSec?} otherwise.
  async resolveSessionConflict(user) {
    const uid = String(user.user_id != null ? user.user_id : user.id);
    const now = Date.now();

    const lastDenied = this._lastDeniedAt[uid];
    if (lastDenied && now - lastDenied < this.HANDOFF_COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown', retryInSec: Math.ceil((this.HANDOFF_COOLDOWN_MS - (now - lastDenied)) / 1000) };
    }

    const status = await this.requestDeviceHandoff(uid);
    if (status === 'approved') return { ok: true };

    // 'unreachable' means the server has NO live socket signed in as this
    // account, so there is literally nobody to answer the prompt. That is the
    // dead-battery / closed-laptop case. Nobody is listening, so fall back to
    // the explicit "this ends your other session" confirmation instead of
    // failing. 'timeout' is deliberately NOT included: there a device DID get
    // the prompt and chose not to answer, which is a real "no".
    if (status === 'unreachable') {
      const proceed = await this._confirmNoActiveSession();
      return proceed ? { ok: true } : { ok: false, reason: 'cancelled' };
    }

    this._lastDeniedAt[uid] = Date.now();
    return { ok: false, reason: status };
  },

  // Runs whenever fresh server state arrives (see PlayCarysLive). If another
  // device has since claimed this account, our token no longer matches the
  // user row's — this tab is stale and must not keep acting as this player.
  checkSessionOwnership() {
    const session = this.getSession();
    if (!session || session.role === 'guest' || !session.sessionToken) return;
    if (typeof DB === 'undefined' || !DB.users) return;
    const u = DB.users.find(x => sameId(x.user_id != null ? x.user_id : x.id, session.userId));
    if (!u || !u.active_session_token) return;
    if (u.active_session_token !== session.sessionToken) {
      this.logout('You were signed out because this account was signed in on another device or tab.');
    }
  },

  logout(reason) {
    // Drop the signed API token first. Leaving it behind would let a signed-out
    // browser keep making staff-authorised calls until it expired.
    this.setApiToken(null);
    const session = this.getSession();
    if (session && session.role === 'guest') {
      const uid = String(session.userId);
      // A signing-out guest leaves no room behind to tidy up any more — there
      // are no rooms. Their matches stay: a guest's play is still a play, and
      // the match_results hanging off it are real history.
      //
      // What DOES need closing is a match they walked out of, or it sits
      // 'in-progress' for ever and presence keeps reporting them as Playing.
      if (typeof DB !== 'undefined' && Array.isArray(DB.matches)) {
        (DB.matches || [])
          .filter(m => m.status === 'in-progress' && String(m.created_by) === uid)
          .forEach(m => DB.endMatch(m.match_id));
      }
    }
    // Release our claim so signing out here lets the same account sign in
    // elsewhere immediately, instead of waiting out SESSION_STALE_MS.
    //
    // This used to mutate the local row and push it via DB.save()/flushSync()
    // — but that never actually reached the server: db-import intentionally
    // ignores active_session_token/active_session_at on every row it
    // receives (see app.controller.ts — "the server's copy always wins, in
    // both directions"), so the release was a silent no-op and the account
    // stayed claimed until the 15s staleness window expired on its own.
    //
    // POST /auth/release is the endpoint built for exactly this. `fetch`
    // with `keepalive: true` is used, not sendBeacon: sendBeacon does not
    // reliably survive a CORS preflight for a JSON body cross-origin
    // (verified — the OPTIONS preflight succeeds but the beacon POST itself
    // comes back net::ERR_FAILED, silently, with nothing to catch). A
    // keepalive fetch goes through the normal, working CORS/preflight path
    // while still surviving the window.location.href redirect right below,
    // which fires in the same tick and would otherwise cancel an ordinary
    // fetch mid-flight before it left the browser.
    if (session && session.sessionToken && session.role !== 'guest' && window.PC_API) {
      try {
        fetch(window.PC_API + '/auth/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(session.userId, 10),
            session_token: session.sessionToken,
          }),
          keepalive: true,
        });
      } catch (e) { /* best-effort; the 15s staleness window is the fallback */ }
    }
    if (reason) { try { sessionStorage.setItem('pc_logout_reason', reason); } catch (e) { } }
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = getPathPrefix() + 'index.html';
  },

  getSession() {
    // sessionStorage first (tab-isolated), fall back to localStorage (persists across reloads)
    const raw = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Sync back to sessionStorage if it was missing (happens after live-server reload)
    if (!sessionStorage.getItem(this.SESSION_KEY)) {
      sessionStorage.setItem(this.SESSION_KEY, raw);
    }

    // ONE BROWSER IS ONE DEVICE — adopt a newer token for the SAME account.
    //
    // Auth.login() writes the session to both storages, but sessionStorage is
    // per-tab. So a second tab signing in minted token T2 while the first tab
    // still held T1 in its own sessionStorage — and Presence.beat() has every
    // tab re-assert its token to the server every 45s. The two tabs then
    // fought: whichever beat last owned the account, and the other tab's next
    // sync saw a token mismatch and logged itself out with "signed in on
    // another device". That is the random self-kick while just browsing.
    //
    // Same account + same browser is not a second device, so take the newest
    // token instead of competing with it. A DIFFERENT account in localStorage
    // is left alone — that is a genuine account switch, not a duplicate tab.
    try {
      const rawLocal = localStorage.getItem(this.SESSION_KEY);
      if (rawLocal && rawLocal !== raw) {
        const local = JSON.parse(rawLocal);
        if (local && sameId(local.userId, session.userId) &&
          local.sessionToken && local.sessionToken !== session.sessionToken) {
          sessionStorage.setItem(this.SESSION_KEY, rawLocal);
          return local;
        }
      }
    } catch (e) { /* malformed copy — keep the one we already parsed */ }

    return session;
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  requireAuth(allowedRoles) {
    const session = this.getSession();
    if (!session) { window.location.href = getPathPrefix() + 'index.html'; return null; }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      window.location.href = getPathPrefix() + 'index.html';
      return null;
    }
    return session;
  },

  gotoDashboard() {
    const session = this.getSession();
    if (!session) { this.logout(); return; }

    const roleMap = { superuser: 'superuser', admin: 'admin', moderator: 'moderator', publisher: 'publisher', player: 'player', guest: 'player' };
    const roleDir = roleMap[session.role] || 'player';
    const targetFile = session.role === 'superuser' ? 'hub.html' : 'dashboard.html';

    window.location.href = getPathPrefix() + 'pages/' + roleDir + '/' + targetFile;
  }
};

// ---- Presence -------------------------------------------------------
// Everyone used to read "Online" forever because the friend list stored a frozen
// snapshot taken from `user.status` — which is the ACCOUNT state (active/banned),
// not whether the person is at their keyboard. Real presence needs a heartbeat:
// the signed-in tab stamps `lastSeen` on its own user row, and every other client
// decides Online/Away/Offline from how stale that stamp is.
const Presence = {
  ONLINE_MS: 2 * 60 * 1000,   // seen within 2 min  → Online
  // (There used to be an AWAY_MS band here. Presence is three states now —
  //  Online / Playing / Offline — so a stale heartbeat simply reads Offline.)
  // Two laptops never agree on the clock to the second. Allow a stamp to sit a
  // little in the future and still count as "now"; anything beyond this is not
  // skew, it is bad data.
  SKEW_MS: 3 * 60 * 1000,
  // How long an 'in-progress' session may count as actually being played.
  SESSION_LIVE_MS: 3 * 60 * 60 * 1000,

  /**
   * How often this tab stamps its own lastSeen.
   *
   * 🚨 THIS CONSTANT WAS MISSING. Presence.start() does
   *
   *       setInterval(() => this.beat(), this.HEARTBEAT_MS)
   *
   * and `this` is Presence — but HEARTBEAT_MS was only ever defined on Auth.
   * So the delay was `undefined`, which setInterval treats as 0 and the browser
   * clamps to ~4ms. Every signed-in tab therefore ran the heartbeat about
   * 250 TIMES PER SECOND instead of once every five seconds.
   *
   * Measured 2026-08-14 on one idle dashboard: 622 beats in 3 seconds, gaps of
   * 4-5ms. Each beat POSTs /auth/heartbeat *and* calls DB.saveLocal(), which
   * serialises the entire database — so this alone was saturating the browser's
   * connection pool (net::ERR_INSUFFICIENT_RESOURCES on ordinary page assets),
   * hammering the backend, and burning CPU on JSON.stringify all day.
   *
   * Kept equal to Auth.HEARTBEAT_MS: the server frees an abandoned session claim
   * after 15s, so three beats inside that window is the intent.
   */
  HEARTBEAT_MS: 5000,

  _timer: null,

  /** Stamp the signed-in user's lastSeen. Pushes to the backend so other laptops see it. */
  beat(push = true) {
    const session = Auth.getSession();
    if (!session || session.role === 'guest') return;
    const u = DB.users.find(x => sameId(x.user_id != null ? x.user_id : x.id, session.userId));
    if (!u) return;
    u.lastSeen = new Date().toISOString();
    // Prove this session is still alive so claimSession() on another device
    // keeps seeing it as taken, and re-assert our token in case a merge ever
    // raced it — this tab IS the session of record until Auth.logout() clears it.
    if (session.sessionToken) {
      u.active_session_token = session.sessionToken;
      u.active_session_at = new Date().toISOString();
    }
    // The claim itself goes over the dedicated endpoint, not DB.save().
    //
    // A whole-database POST every few seconds is not a heartbeat, it is a
    // synchronisation storm — and it was also the thing that kept overwriting
    // server-side state with whatever this tab happened to be holding. This
    // sends the user id and the token, nothing else.
    if (session.sessionToken) this._ping(session);

    // The bulk save keeps its old, slow cadence: it carries real data, and
    // nothing about presence needs it to be fast.
    if (push) { try { DB.saveLocal(); } catch (e) { } }
    else { try { DB.saveLocal(); } catch (e) { } }
  },

  /** Cheap keep-alive. Also detects being signed out from another device. */
  _ping(session) {
    if (!window.PC_API) return;
    fetch(window.PC_API + '/auth/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: parseInt(session.userId, 10),
        session_token: session.sessionToken,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        // Another device took the account. Stop pretending we are signed in —
        // otherwise this tab keeps playing while the account lives elsewhere.
        if (res && res.evicted) {
          try { Auth.logout('Your account was signed in on another device.'); } catch (e) { }
        }
      })
      .catch(() => { /* backend down; the staleness window will handle it */ });
  },

  /**
   * Hand the account back the moment the tab really goes away.
   *
   * `pagehide` also fires when navigating between pages of this app, and every
   * navigation here is a full page load — so releasing unconditionally would
   * sign the player out on every click. The guard is `persisted === false` plus
   * "no other tab of this app is alive", tracked through a shared localStorage
   * counter. When the last tab goes, the beacon fires and the account frees
   * immediately instead of waiting out the 15s window.
   */
  releaseOnClose() {
    const session = Auth.getSession();
    if (!session || !session.sessionToken || session.role === 'guest') return;
    if (!window.PC_API) return;

    // `fetch` with `keepalive: true`, not sendBeacon — see the matching note
    // in Auth.logout(). sendBeacon does not reliably survive a CORS preflight
    // for a JSON body cross-origin; a keepalive fetch does, and still
    // survives the page unload the same way sendBeacon is meant to.
    try {
      fetch(window.PC_API + '/auth/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(session.userId, 10),
          session_token: session.sessionToken,
        }),
        keepalive: true,
      });
    } catch (e) { /* best-effort; the 15s staleness window is the fallback */ }
  },

  /**
   * Which live MATCH, if any, a user is actually playing right now.
   *
   * Reads `matches` rather than the old room table. Membership used to be
   * answered by the player_session junction — "who is sitting in this lobby" —
   * and is now a fixed list on the match itself, so either player of a chess
   * game counts, not just whoever started it.
   *
   * The staleness window survives the move unchanged: nothing closes a match
   * when a player simply shuts the tab, so without it anyone who had ever
   * pressed Play read as "Playing" for ever.
   */
  liveSessionOf(uid) {
    if (typeof DB.liveMatchOf !== 'function') return null;
    return DB.liveMatchOf(uid, this.SESSION_LIVE_MS);
  },

  /**
   * Resolve a user row (or username) to a live presence.
   *
   * Three states, deliberately — Online, Playing, Offline. There used to be a
   * fourth ("Away", 2-10 minutes since last heartbeat) but nothing rendered it
   * anywhere and a half-present state is not a thing a player can act on. A
   * stale heartbeat now simply reads Offline.
   *
   * Returns { state, label, color, session, gameId, canSpectate } so a caller can
   * both draw the badge and offer to watch the match without a second lookup.
   */
  statusOf(userOrName) {
    const u = typeof userOrName === 'string'
      ? DB.users.find(x => (x.user_name || x.username || '').toLowerCase() === userOrName.toLowerCase())
      : userOrName;

    const offline = {
      state: 'offline', label: 'Offline', color: 'var(--text-muted)',
      session: null, gameId: null, canSpectate: false
    };
    if (!u) return offline;
    // A banned or suspended account is never shown as reachable.
    if (u.status === 'banned' || u.status === 'suspended') return offline;

    const seen = u.lastSeen ? new Date(u.lastSeen).getTime() : NaN;
    if (!seen || isNaN(seen)) return offline;

    let age = Date.now() - seen;

    // A FUTURE lastSeen must never read as online.
    //
    // Several seeded/registered accounts carry dates in 2027 (the same future-dating
    // that already needed repairFutureMatchDates for match rows). A future stamp
    // makes `age` negative, negative is <= ONLINE_MS, so those users were pinned
    // "Online" forever — the exact symptom this presence system was meant to cure.
    // A few minutes ahead is ordinary clock skew between two laptops and still
    // counts as now; anything further ahead is bad data, not presence.
    if (age < 0) {
      if (-age <= this.SKEW_MS) age = 0;
      else return offline;
    }

    if (age > this.ONLINE_MS) return offline;

    // A player sitting in a live session reads as Playing rather than plain Online.
    const uid = u.user_id != null ? u.user_id : u.id;
    const session = this.liveSessionOf(uid);
    if (!session) {
      return {
        state: 'online', label: 'Online', color: 'var(--accent-green)',
        session: null, gameId: null, canSpectate: false
      };
    }

    const gameId = session.game_id != null ? session.game_id : session.gameId;
    return {
      state: 'playing',
      label: 'Playing',
      color: 'var(--accent-cyan)',
      session,
      gameId,
      // Only offer to watch a match that is genuinely watchable: more than one
      // player, and a game that actually implements a spectator view.
      canSpectate: !!(window.GameLaunch && GameLaunch.canSpectate(gameId, session))
    };
  },

  /**
   * Render a presence pill for a user, with a Spectate action when they are in
   * a live match somebody else can watch.
   *
   * Exists because statusOf() was computed in one place and drawn in exactly one
   * other (the dashboard friends list) — which is why a player's status never
   * appeared anywhere else in the app. Anything that shows a user can now show
   * their state by calling this.
   */
  badgeHTML(userOrName, opts) {
    opts = opts || {};
    const p = this.statusOf(userOrName);
    const dot = `<span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;flex-shrink:0"></span>`;
    const pill =
      `<span class="presence-pill" data-state="${p.state}" style="display:inline-flex;align-items:center;gap:.35rem;font-size:.75rem;font-weight:600;color:${p.color}">
         ${dot}${p.label}
       </span>`;

    if (!opts.spectate || !p.canSpectate) return pill;

    const sid = p.session.match_id != null ? p.session.match_id : p.session.session_id;
    return `${pill} <button class="btn btn-outline btn-sm" style="padding:.15rem .5rem;font-size:.7rem;margin-left:.4rem"
              onclick="event.stopPropagation();Presence.spectate('${sid}')">👁 Spectate</button>`;
  },

  /** Open a live match in watch-only mode. */
  spectate(matchId) {
    const m = (DB.matches || []).find(x => sameId(x.match_id, matchId));
    if (!m) { Toast.error('That match has already ended.'); return; }
    const gameId = m.game_id;
    if (!window.GameLaunch || !GameLaunch.canSpectate(gameId, m)) {
      Toast.info('This game does not support spectating yet.');
      return;
    }
    GameLaunch.spectate(gameId, matchId);
  },

  /** Start the heartbeat for this tab. Idempotent. */
  start() {
    if (this._timer) return;
    this.beat();
    // Guarded: an undefined delay here is not a slow heartbeat, it is a 250/s
    // flood (see HEARTBEAT_MS above). Never let this silently become 0 again.
    const every = Number(this.HEARTBEAT_MS) > 0 ? Number(this.HEARTBEAT_MS) : 5000;
    this._timer = setInterval(() => this.beat(), every);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.beat(false); });

    // ── Telling "navigated away" apart from "closed the tab" ──────────
    //
    // Every page change in this app is a full page load, so `pagehide` fires
    // constantly. Releasing the account there would sign a player out on every
    // single click.
    //
    // So each tab registers itself in a shared counter. A navigation decrements
    // then immediately re-increments on the next page, while a real close leaves
    // the count at zero. Only the last tab leaving hands the account back; if
    // this is wrong for any reason, the 15s heartbeat window still frees it.
    const KEY = 'pc_open_tabs';
    const bump = (n) => {
      try {
        const v = Math.max(0, (parseInt(localStorage.getItem(KEY), 10) || 0) + n);
        localStorage.setItem(KEY, String(v));
        return v;
      } catch (e) { return 1; }
    };
    bump(1);

    window.addEventListener('pagehide', (e) => {
      // A page going into the back/forward cache is not gone.
      if (e.persisted) return;
      this.beat(false);
      const left = bump(-1);
      // `pc_navigating` is set by navigate()/navigateTo() just before they leave,
      // so an in-app page change never looks like the last tab closing.
      let navigating = false;
      try { navigating = sessionStorage.getItem('pc_navigating') === '1'; } catch (err) { }
      if (left <= 0 && !navigating) this.releaseOnClose();
    });
  }
};
window.Presence = Presence;


/**
 * Money formatting. Everything on this platform is priced in Indian rupees and
 * stored as integer paise — 4.99 has no exact binary representation, and a
 * rounding error in a balance is not a bug you can apologise your way out of.
 *
 * The server sends a `*_display` string alongside most amounts; this exists for
 * the cases where a page has only the raw paise figure to work with.
 */
const Money = {
  /** 12345 -> "₹123.45", 500000 -> "₹5,000" */
  formatINR(paise, opts) {
    const p = Math.round(Number(paise) || 0);
    const rupees = p / 100;
    // Whole rupees for round amounts: "₹5,000" reads better than "₹5,000.00",
    // but ₹123.45 must not silently become ₹123.
    const decimals = (opts && opts.decimals != null)
      ? opts.decimals
      : (p % 100 === 0 ? 0 : 2);
    return '₹' + rupees.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /** Carys are whole numbers, grouped the Indian way (1,00,000). */
  formatCarys(carys) {
    return (Number(carys) || 0).toLocaleString('en-IN');
  }
};
window.Money = Money;

const Economy = {
  /**
   * PlayCarys Points are the platform's ONLY progression currency, so the tier a
   * player wears is read straight off their points.
   *
   * This used to be getTierFromElo(). Elo is a chess rating — a per-game concept
   * that the platform had no business storing, and which meant a Hill Climbing
   * player's tier moved on a number their game never produced. Every account also
   * started life on a fictional 1200, so "Bronze Tier" was really just "has an
   * account". There were also two conflicting elo tables (utils.js and economy.js)
   * disagreeing about where Silver began; this is now the single source.
   */
  POINT_TIERS: [
    { min: 25000, name: 'Master', color: '#facc15', bg: 'linear-gradient(135deg, #fef08a, #ca8a04)' },
    { min: 10000, name: 'Diamond', color: '#22d3ee', bg: 'linear-gradient(135deg, #67e8f9, #0891b2)' },
    { min: 5000, name: 'Platinum', color: '#a78bfa', bg: 'linear-gradient(135deg, #c4b5fd, #7c3aed)' },
    { min: 2500, name: 'Gold', color: '#fbbf24', bg: 'linear-gradient(135deg, #fde047, #b45309)' },
    { min: 1000, name: 'Silver', color: '#cbd5e1', bg: 'linear-gradient(135deg, #f1f5f9, #64748b)' },
    { min: 250, name: 'Bronze', color: '#d97706', bg: 'linear-gradient(135deg, #fcd34d, #78350f)' },
    { min: 0, name: 'Iron', color: '#6b7280', bg: 'linear-gradient(135deg, #9ca3af, #374151)' }
  ],

  getTierFromPoints(points) {
    const pcp = Number(points) || 0;
    return this.POINT_TIERS.find(t => pcp >= t.min) || this.POINT_TIERS[this.POINT_TIERS.length - 1];
  },

  /** Points a player currently holds, from their profile row. */
  pointsOf(userId) {
    const p = (DB.player_profiles || []).find(x => String(x.user_id) === String(userId));
    return p ? (p.carys_points || 0) : 0;
  },

  /** Convenience: resolve a user id straight to their tier. */
  tierOfUser(userId) {
    return this.getTierFromPoints(this.pointsOf(userId));
  },

  awardPostMatchProgression(userId, resultType, gameId, sessionId) {
    const u = DB.users.find(x => String(x.id || x.user_id) === String(userId));
    const p = DB.player_profiles.find(x => String(x.user_id) === String(userId));
    if (!u) return { xpGain: 0, pcpGain: 0, leveledUp: false };

    if (typeof u.xp === 'undefined') u.xp = 0;
    if (typeof u.level === 'undefined') u.level = 1;

    let xpGain = resultType === 'win' ? 150 : resultType === 'draw' ? 75 : 25;
    let pcpGain = this.calculatePCP(gameId, { winner: resultType === 'win' ? 'me' : resultType === 'draw' ? 'draw' : 'opp', myColor: 'me' });

    if (resultType === 'win') u.wins = (u.wins || 0) + 1;
    else if (resultType === 'loss') u.losses = (u.losses || 0) + 1;

    u.matches = (u.matches || 0) + 1;
    u.xp += xpGain;
    if (p) p.carys_points = (p.carys_points || 0) + pcpGain;

    let leveledUp = false;
    const nextReq = Math.floor(1000 * Math.pow(u.level, 1.5));
    if (u.xp >= nextReq) {
      u.level++;
      leveledUp = true;
    }

    // Optimistic, and deliberately not persisted: db-import discards any
    // carys_points a client sends, so this only affects what is on screen
    // until the server's number arrives.
    if (p) p.carys_points = (p.carys_points || 0) + pcpGain;

    const result = { xpGain, pcpGain, leveledUp, level: u.level, points: p ? p.carys_points : 0 };

    // The victory animation, finally fired.
    //
    // Five of these were on sale and nothing anywhere played one — the whole
    // category was a name and an emoji on a card. A win is the only moment it
    // was ever meant for, so this is that moment. PlayerSkin falls back to a
    // default burst when the player owns none, because a win should always
    // read as a win; the cosmetic makes it yours rather than granting it.
    if (resultType === 'win' && typeof PlayerSkin !== 'undefined') {
      PlayerSkin.preload([userId]).then(function () { PlayerSkin.victory(userId); });
    }

    // -- Publisher royalty: now server-side ------------------------
    // This used to credit publisher_profiles.revenue_pcp from the browser and
    // swallow every error under "silent fail - royalty is non-critical". A
    // royalty that silently does not accrue is a studio not getting paid, and
    // a balance a player's own browser can write is a balance they can forge.
    //
    // POST /economy/award is authoritative: it caps the award by the game's
    // max_carys_per_match, writes the carys_ledger row, and credits the
    // publisher. Not awaited, so the post-match screen is not held up by it;
    // the response corrects the on-screen balance when it lands.
    if (typeof API !== 'undefined') {
      API.post('/economy/award', {
        user_id: Number(userId),
        game_id: Number(String(gameId).replace(/^g/, '')),
        result: resultType === 'win' ? 'win' : resultType === 'draw' ? 'draw' : 'loss',
        session_id: sessionId != null ? Number(sessionId) : undefined
      }).then(res => {
        if (p && res && res.balance_carys != null) p.carys_points = res.balance_carys;
        result.pcpGain = res && res.carys_awarded != null ? res.carys_awarded : result.pcpGain;
      }).catch(err => {
        // Worth surfacing rather than swallowing: if this fails the player
        // was not actually paid, whatever the screen says.
        console.error('[Economy] match award failed - Carys not credited', err);
      });
    }

    DB.save();
    return result;
  },

  calculatePCP(gameId, result) {
    // result: { winner: 'w'|'b'|'draw'|'abort', reason: string, myColor: 'w'|'b' }
    if (result.winner === 'abort') return 0;

    let base = 10; // Default participation points
    if (result.winner === 'draw') base = 25;
    else if (result.winner === result.myColor) base = 100; // Win
    else base = 15; // Loss but completed

    // Multipliers based on game complexity
    const complexityMap = { '7': 1.5, '8': 1.1 }; // Chess is more complex
    const multi = complexityMap[String(gameId).replace('g', '')] || 1.0;

    return Math.round(base * multi);
  }
};

// ---- Toast Notifications -----------------------------------------------
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.35s ease forwards';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); }
};

// A session-locked-out tab (see Auth.checkSessionOwnership) redirects straight
// to index.html — there's no dedicated "you were logged out" page to render on,
// so the reason rides across the redirect in sessionStorage and surfaces here once.
(function showPendingLogoutReason() {
  try {
    const reason = sessionStorage.getItem('pc_logout_reason');
    if (reason) {
      sessionStorage.removeItem('pc_logout_reason');
      setTimeout(() => Toast.warning(reason), 300);
    }
  } catch (e) { }
})();

// ---- Device Handoff Banner -----------------------------------------------
// The "old device" side of Auth.requestDeviceHandoff(): a new sign-in attempt
// is waiting on us. Deliberately a slim, dismissible bottom bar rather than a
// modal, so it never blocks whatever the signed-in player is doing right now.
function showDeviceHandoffBanner({ requestId, deviceLabel, requesterClientId }) {
  const existing = document.getElementById('device-handoff-banner');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.id = 'device-handoff-banner';
  bar.innerHTML = `
    <span class="dh-icon">🔐</span>
    <span class="dh-text"><strong>Sign-in request</strong> — <span class="dh-device"></span> wants to use this account.</span>
    <div class="dh-actions">
      <button class="dh-btn dh-approve">Confirm</button>
      <button class="dh-btn dh-deny">Cancel</button>
    </div>
    <div class="dh-timerbar"></div>
  `;
  bar.querySelector('.dh-device').textContent = deviceLabel || 'Another device';
  document.body.appendChild(bar);

  // Tell the requester a human can actually see this, so it waits for a real
  // answer instead of giving up and offering a takeover (see requestDeviceHandoff).
  if (window.playcarysSocket) {
    window.playcarysSocket.emit('device_login_ack', { requestId, requesterClientId });
  }

  let settled = false;
  const respond = (approved) => {
    if (settled) return;
    settled = true;
    clearTimeout(autoTimer);
    if (window.playcarysSocket) {
      window.playcarysSocket.emit('device_login_response', { requestId, approved, requesterClientId });
    }
    bar.classList.remove('show');
    setTimeout(() => bar.remove(), 300);
    if (approved) {
      Auth.logout('You were signed out because you approved a sign-in on another device.');
    }
  };

  bar.querySelector('.dh-approve').onclick = () => respond(true);
  bar.querySelector('.dh-deny').onclick = () => respond(false);

  requestAnimationFrame(() => {
    bar.classList.add('show');
    const timerbar = bar.querySelector('.dh-timerbar');
    requestAnimationFrame(() => { timerbar.style.width = '0%'; });
  });

  // No response within the same window the requester is waiting on — default
  // to deny rather than leaving the requester hanging past its own timeout.
  const autoTimer = setTimeout(() => respond(false), 15000);
}

// ---- Modal -----------------------------------------------
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('show'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
  }
};


/**
 * Promise-based confirm dialog.
 *
 * Replaces window.confirm(), which was doing the asking for every purchase on
 * the platform. A native confirm cannot show what you are buying, cannot show
 * the price in the currency you are paying, cannot be styled, and on top of
 * that it blocks the main thread — so the shop froze behind an OS box while a
 * player decided.
 *
 * Confirm.show(...) resolves true/false and never throws, so a caller can
 * simply `if (!(await Confirm.show(...))) return;`.
 *
 *   await Confirm.show({
 *     title: 'Buy Neon Visor?',
 *     message: 'Equipped straight away.',
 *     art: '🥽',                       // emoji or a CSS gradient
 *     rows: [['Price', '1,000 Carys'], ['Balance after', '394 Carys']],
 *     confirmText: 'Buy',
 *     tone: 'primary'                  // or 'danger'
 *   });
 */
const Confirm = {
  _el: null,

  _build() {
    if (this._el) return this._el;
    const el = document.createElement('div');
    el.className = 'pc-confirm-overlay';
    el.innerHTML =
      '<div class="pc-confirm" role="dialog" aria-modal="true">' +
      '  <div class="pc-confirm-art" id="pc-cf-art"></div>' +
      '  <h3 class="pc-confirm-title" id="pc-cf-title"></h3>' +
      '  <p class="pc-confirm-msg" id="pc-cf-msg"></p>' +
      '  <div class="pc-confirm-rows" id="pc-cf-rows"></div>' +
      '  <div class="pc-confirm-actions">' +
      '    <button class="btn btn-ghost btn-sm" id="pc-cf-no"></button>' +
      '    <button class="btn btn-primary btn-sm" id="pc-cf-yes"></button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(el);
    this._el = el;
    return el;
  },

  show(opts) {
    const o = opts || {};
    const el = this._build();

    const art = el.querySelector('#pc-cf-art');
    const rows = el.querySelector('#pc-cf-rows');
    const yes = el.querySelector('#pc-cf-yes');
    const no = el.querySelector('#pc-cf-no');

    el.querySelector('#pc-cf-title').textContent = o.title || 'Are you sure?';
    const msg = el.querySelector('#pc-cf-msg');
    msg.textContent = o.message || '';
    msg.style.display = o.message ? '' : 'none';

    // `art` is either an emoji or a CSS gradient, matching how cosmetics
    // already store their preview.
    if (o.art && /gradient|#|rgb/i.test(o.art)) {
      art.style.background = o.art;
      art.textContent = '';
      art.style.display = '';
    } else if (o.art) {
      art.style.background = 'var(--bg-secondary, #12172150)';
      art.textContent = o.art;
      art.style.display = '';
    } else {
      art.style.display = 'none';
    }

    rows.innerHTML = (o.rows || [])
      .map((r) => '<div class="pc-confirm-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>')
      .join('');
    rows.style.display = (o.rows || []).length ? '' : 'none';

    yes.textContent = o.confirmText || 'Confirm';
    no.textContent = o.cancelText || 'Cancel';
    yes.className = 'btn btn-sm ' + (o.tone === 'danger' ? 'btn-danger' : 'btn-primary');

    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => yes.focus(), 30);

    return new Promise((resolve) => {
      const done = (v) => {
        el.classList.remove('open');
        document.body.style.overflow = '';
        yes.onclick = no.onclick = el.onclick = null;
        document.removeEventListener('keydown', key);
        resolve(v);
      };
      // Esc cancels, Enter confirms — the two things a native confirm gave for
      // free and the reason people trust one.
      const key = (e) => {
        if (e.key === 'Escape') done(false);
        if (e.key === 'Enter') done(true);
      };
      yes.onclick = () => done(true);
      no.onclick = () => done(false);
      el.onclick = (e) => { if (e.target === el) done(false); };
      document.addEventListener('keydown', key);
    });
  },
};
window.Confirm = Confirm;

// Injected rather than kept in variables.css so any page that loads utils.js
// gets the dialog looking right without also having to add a stylesheet.
(function injectConfirmCss() {
  if (document.getElementById('pc-confirm-css')) return;
  const st = document.createElement('style');
  st.id = 'pc-confirm-css';
  st.textContent = [
    '.pc-confirm-overlay{position:fixed;inset:0;z-index:9999;display:none;',
    '  align-items:center;justify-content:center;padding:1rem;',
    '  background:rgba(3,6,14,.72);backdrop-filter:blur(4px)}',
    '.pc-confirm-overlay.open{display:flex;animation:pcCfFade .14s ease}',
    '@keyframes pcCfFade{from{opacity:0}to{opacity:1}}',
    '.pc-confirm{width:min(24rem,100%);padding:1.4rem;text-align:center;',
    '  border:1px solid var(--border-primary,rgba(255,255,255,.1));border-radius:16px;',
    '  background:var(--bg-card,#11162099);box-shadow:0 24px 60px rgba(0,0,0,.55);',
    '  animation:pcCfPop .16s cubic-bezier(.2,.9,.3,1.2)}',
    '@keyframes pcCfPop{from{transform:translateY(8px) scale(.97);opacity:0}to{transform:none;opacity:1}}',
    '.pc-confirm-art{width:76px;height:76px;margin:0 auto .9rem;border-radius:14px;',
    '  display:flex;align-items:center;justify-content:center;font-size:2.1rem;',
    '  border:1px solid var(--border-primary,rgba(255,255,255,.08))}',
    '.pc-confirm-title{margin:0 0 .35rem;font-size:1.05rem;color:var(--text-primary,#e9edf7)}',
    '.pc-confirm-msg{margin:0 0 .9rem;font-size:.8rem;line-height:1.5;',
    '  color:var(--text-secondary,#8b96ad)}',
    '.pc-confirm-rows{margin:0 0 1rem;text-align:left;border-radius:10px;overflow:hidden;',
    '  border:1px solid var(--border-primary,rgba(255,255,255,.07))}',
    '.pc-confirm-row{display:flex;justify-content:space-between;gap:1rem;',
    '  padding:.5rem .7rem;font-size:.78rem;color:var(--text-secondary,#8b96ad)}',
    '.pc-confirm-row+.pc-confirm-row{border-top:1px solid var(--border-primary,rgba(255,255,255,.06))}',
    '.pc-confirm-row b{color:var(--text-primary,#e9edf7)}',
    '.pc-confirm-actions{display:flex;gap:.5rem;justify-content:center}',
    '.pc-confirm-actions .btn{min-width:7rem}',
  ].join('');
  document.head.appendChild(st);
})();

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});

// ---- Validation -----------------------------------------------
const Validate = {
  required(val) { return val !== null && val !== undefined && String(val).trim() !== ''; },
  email(val) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); },
  minLen(val, n) { return String(val).trim().length >= n; },
  maxLen(val, n) { return String(val).trim().length <= n; },
  password(val) { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(val); },
  noSpecial(val) { return /^[a-zA-Z0-9_\s]+$/.test(val); },
  phone(val) { return /^\+?[0-9]\d{6,14}$/.test(val.replace(/[\s-]/g, '').trim()); },
  numeric(val) { return !isNaN(parseFloat(val)) && isFinite(val); },
  positive(val) { return parseFloat(val) > 0; },
  url(val) { try { new URL(val); return true; } catch { return false; } },

  field(inputEl, rules) {
    const val = inputEl.value;
    const errEl = inputEl.parentElement.querySelector('.form-error') ||
      inputEl.closest('.form-group')?.querySelector('.form-error');
    let errorMsg = '';

    for (const rule of rules) {
      if (rule.type === 'required' && !this.required(val)) { errorMsg = rule.msg || 'This field is required'; break; }
      if (rule.type === 'email' && val && !this.email(val)) { errorMsg = rule.msg || 'Enter a valid email address'; break; }
      if (rule.type === 'minLen' && !this.minLen(val, rule.n)) { errorMsg = rule.msg || `Minimum ${rule.n} characters`; break; }
      if (rule.type === 'maxLen' && !this.maxLen(val, rule.n)) { errorMsg = rule.msg || `Maximum ${rule.n} characters`; break; }
      if (rule.type === 'password' && val && !this.password(val)) { errorMsg = rule.msg || 'Password must be 8+ chars with uppercase, lowercase and number'; break; }
      if (rule.type === 'match' && val !== rule.target.value) { errorMsg = rule.msg || 'Fields do not match'; break; }
      if (rule.type === 'numeric' && val && !this.numeric(val)) { errorMsg = rule.msg || 'Must be a number'; break; }
      if (rule.type === 'positive' && val && !this.positive(val)) { errorMsg = rule.msg || 'Must be a positive number'; break; }
      if (rule.type === 'phone' && val && !this.phone(val)) { errorMsg = rule.msg || 'Enter a valid mobile number with country code'; break; }
      if (rule.type === 'custom' && !rule.fn(val)) { errorMsg = rule.msg || 'Invalid value'; break; }
    }

    if (errorMsg) {
      inputEl.classList.add('error');
      if (errEl) { errEl.textContent = errorMsg; errEl.classList.add('show'); }
      return false;
    } else {
      inputEl.classList.remove('error');
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
      return true;
    }
  },

  clearField(inputEl) {
    inputEl.classList.remove('error');
    const errEl = inputEl.parentElement.querySelector('.form-error') ||
      inputEl.closest('.form-group')?.querySelector('.form-error');
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  },

  form(fields) {
    let valid = true;
    fields.forEach(f => { if (!this.field(f.el, f.rules)) valid = false; });
    return valid;
  }
};

// Real-time clear on input
document.addEventListener('input', e => {
  if (e.target.classList.contains('form-input') || e.target.classList.contains('form-textarea') || e.target.classList.contains('form-select')) {
    Validate.clearField(e.target);
  }
});

// ---- Navbar Helpers -----------------------------------------------

// The site's per-role page navigation. Module-level, because it now has TWO
// consumers: the horizontal navbar on a wide screen, and the hamburger drawer
// on a narrow one. It used to be a local inside buildNavbar(), which is how the
// mobile half went missing — see buildDrawerNavHTML() below.
const PC_NAV_LINKS = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'hub', label: 'Control Hub', icon: '⚡', page: 'hub' },
      { id: 'users', label: 'Users', icon: '👥', page: 'users' },
      { id: 'approvals', label: 'Approvals', icon: '✅', page: 'approvals' },
      { id: 'settings', label: 'Settings', icon: '⚙️', page: 'settings' }
    ],
    superuser: [
      // Dashboard was missing from this list, which left
      // pages/superuser/dashboard.html — the platform's only view of its own
      // books — unreachable from the UI entirely.
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'hub', label: 'Control Hub', icon: '⚡', page: 'hub' },
      { id: 'users', label: 'All Users', icon: '👥', page: 'users' },
      { id: 'admins', label: 'Admins', icon: '👑', page: 'admins' },
      { id: 'games', label: 'Games', icon: '🎮', page: 'games' },
      { id: 'settings', label: 'Settings', icon: '⚙️', page: 'settings' }
    ],
    moderator: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'reports', label: 'Reports', icon: '⚠️', page: 'reports' },
      { id: 'sessions', label: 'Sessions', icon: '🎮', page: 'sessions' },
      { id: 'bans', label: 'Bans', icon: '🛡️', page: 'bans' }
    ],
    publisher: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'publish', label: 'Publish Game', icon: '🎮', page: 'publish' },
      { id: 'publish-tournament', label: 'Publish Tournament', icon: '🏆', page: 'publish-tournament' },
      { id: 'mygames', label: 'My Games', icon: '🎮', page: 'mygames' },
      { id: 'earnings', label: 'Earnings', icon: '💰', page: 'earnings' },
      { id: 'profile', label: 'Profile', icon: '👤', page: 'profile' }
    ],
    player: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'games', label: 'Games', icon: '🎮', page: 'games' },
      { id: 'tournaments', label: 'Tournaments', icon: '🏆', page: 'tournaments' },
      // Groups and Teams are two halves of the same idea (who you play with),
      // so they live behind one nav entry with tabs rather than two that each
      // looked half-empty on their own.
      { id: 'community', label: 'Community', icon: '🛡️', page: 'community' },
      { id: 'shop', label: 'Shop', icon: '🛍️', page: 'shop' },
      { id: 'profile', label: 'Profile', icon: '👤', page: 'profile' }
    ],
    guest: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'games', label: 'Games', icon: '🎮', page: 'games' },
      { id: 'register', label: 'Create Account Now', icon: '✨', page: '../../index?action=register' }
    ]
};

/**
 * The same page links, as a block for inside the hamburger drawer.
 *
 * Below 900px the CSS hides `.nav-links` outright (`display: none !important`)
 * and expects a `.drawer-nav-mobile` block to carry them instead. That block was
 * styled — five rules for it in variables.css — but nothing ever built it. So on
 * every phone the horizontal nav was hidden and nothing replaced it: Dashboard,
 * Games, Tournaments and Profile had no route to them at all. The pages were
 * fine; there was simply no way to ask for one.
 */
function buildDrawerNavHTML(role, currentPage) {
  const links = PC_NAV_LINKS[role] || [];
  if (!links.length) return '';
  // The drawer is injected from injectSideDrawer(), which is not told which page
  // it is on — so work it out from the URL rather than leave every entry looking
  // unvisited.
  if (!currentPage) {
    currentPage = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  }
  return `
    <div class="drawer-nav-mobile">
      ${links.map(l => `
        <div class="nav-link ${currentPage === l.page ? 'active' : ''}"
             data-page="${l.page}"
             onclick="closeDrawer(); navigate('${l.page}')">${l.icon} ${l.label}</div>
      `).join('')}
    </div>`;
}

function buildNavbar(role, currentPage) {
  const session = Auth.getSession();
  if (!session) return;

  const navLinks = PC_NAV_LINKS;

  const roleBadgeMap = { superuser: 'SUPERUSER', admin: 'ADMIN', moderator: 'MODERATOR', publisher: 'PUBLISHER', player: 'PLAYER', guest: 'GUEST' };
  const links = navLinks[role] || [];
  const linksHTML = links.map(l =>
    `<div class="nav-link ${currentPage === l.page ? 'active' : ''}" data-page="${l.page}" onclick="navigate('${l.page}')">${l.icon} ${l.label}</div>`
  ).join('');

  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  navbar.setAttribute('data-role', role);
  // Keep the raw session id — parseInt() turned guest ids ("u_abc123") into NaN and
  // left registered accounts' string ids unable to === a stored number. sameId() below
  // handles both directions.
  const uid = session.userId;

  // ── Step 1: Auto-mark moderator/system notifications as read BEFORE counting ──────────
  // ALWAYS mark them read on every page load — prevents badge showing on every page.
  // Toast is shown only ONCE per session (tracked in sessionStorage).
  if (role === 'player' || role === 'guest') {
    const seenKey = 'playcarys_toasted_notifs';
    let toastedIds;
    try { toastedIds = new Set(JSON.parse(sessionStorage.getItem(seenKey) || '[]')); }
    catch (e) { toastedIds = new Set(); }

    let dbChanged = false;
    let toastDelay = 400;
    (DB.notifications || []).forEach(n => {
      const isForMe = notifIsForUser(n, uid, role);
      const isModAction = ['moderator', 'admin', 'superuser', 'system'].includes(n.fromRole);
      // 'invite' was a room invite and no longer exists. A friend request is
      // the only notification that still carries buttons.
      const isActionable = n.type === 'friend_request';
      if (!isForMe || !isModAction || isActionable || notifIsRead(n, uid)) return;

      // Show Toast only once per browser session
      if (!toastedIds.has(n.id)) {
        const msgCopy = n.msg;
        const fromRole = n.fromRole;
        setTimeout(() => {
          const icon = fromRole === 'moderator' ? '🛡️' : '📢';
          Toast.show(`${icon} ${msgCopy}`, 'info', 5000);
        }, toastDelay);
        toastDelay += 400;
        toastedIds.add(n.id);
        try { sessionStorage.setItem(seenKey, JSON.stringify([...toastedIds])); } catch (e) { }
      }

      // ALWAYS mark as read — even if backend races and returns stale unread data.
      // For a role broadcast this records "this user read it" instead of flipping
      // the shared flag, which used to silence the announcement for everyone else.
      setNotifRead(n, uid);
      dbChanged = true;
    });

    if (dbChanged) DB.save();
  }


  // ── Step 2: Compute unread count AFTER auto-read — badge will be correct ─────────────
  // notifIsVisible() is an exclusive test: a row addressed to a specific user is
  // NOT also delivered to their whole role. The old `toRole === role || toUser === uid`
  // was an inclusive OR, so a per-user row that also carried toRole (which is what
  // dispatchRoleNotification used to write) went to every account in the role.
  const roleNotifs = (DB.notifications || []).filter(n => notifIsVisible(n, uid, role));
  const unreadCount = roleNotifs.filter(n => !notifIsRead(n, uid)).length;
  const badgeHTML = `<span id="nav-badge" style="position:absolute;top:-4px;right:-4px;background:var(--accent-red);color:#fff;font-size:0.6rem;font-weight:800;border-radius:50%;width:16px;height:16px;display:${unreadCount > 0 ? 'flex' : 'none'};align-items:center;justify-content:center;font-family:'Orbitron',monospace;border:2px solid var(--bg-primary)">${unreadCount}</span>`;
  const hamburgerHTML = `<span class="hamburger-btn" style="position:relative" onclick="toggleDrawer(); event.stopPropagation()" title="Notifications & Menu">☰${badgeHTML}</span>`;

  navbar.innerHTML = `
    <div class="nav-brand" style="cursor:pointer" onclick="Auth.gotoDashboard()" title="Go to Dashboard">
      ${hamburgerHTML}
      <span class="logo-icon">🎮</span>
      <span class="logo-text">PlayCarys</span>
      <span class="role-badge">${roleBadgeMap[session.role] || session.role.toUpperCase()}</span>
    </div>
    <nav class="nav-links">${linksHTML}</nav>
    <div class="nav-user">
      <div style="text-align:right">
        <div class="nav-username">${session.username}</div>
        <div class="nav-role">${roleBadgeMap[session.role] || session.role.toUpperCase()}</div>
      </div>
      <div class="nav-avatar" id="pc-nav-avatar" style="cursor:pointer" title="View your profile"
           onclick="showUserProfile('${String(session.username).replace(/'/g, "\\'")}', event)">${session.avatar || session.username.slice(0, 2).toUpperCase()}</div>
      <span class="nav-logout" onclick="Auth.logout()" title="Logout">⬅️</span>
    </div>
  `;

  // Wear your frame and theme in the navbar.
  //
  // This is the avatar a player sees on every page, so it is the one place a
  // cosmetic has to appear for the purchase to feel real at all. Fired after
  // the markup lands and never awaited — the nav renders with or without it.
  if (typeof PlayerSkin !== 'undefined' && session.userId != null) {
    PlayerSkin.preload([session.userId]).then(function () {
      var el = document.getElementById('pc-nav-avatar');
      if (!el) return;
      var skin = PlayerSkin.of(session.userId);
      if (!skin.frame && !skin.theme) return;      // nothing equipped — leave it
      el.innerHTML = PlayerSkin.avatar(
        { user_id: session.userId, user_name: session.username, avatar: session.avatar },
        36
      );
      el.style.background = 'transparent';
      el.style.boxShadow = 'none';
    });
  }

  // ── Step 3: Inject drawer AFTER notifications are already marked read ─────────────────
  injectSideDrawer(session);

  // ── Step 4: Start this tab's presence heartbeat so other players see a real status ────
  // We have arrived, so any in-flight navigation is over. Clearing the flag here
  // means the NEXT pagehide is judged on its own merits — a real close releases
  // the account, another click does not.
  try { sessionStorage.removeItem('pc_navigating'); } catch (e) { }
  Presence.start();
}


// ---- Format Helpers -----------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

/**
 * Compare two ids that may be a number on one side and a string on the other.
 * Seeded accounts carry numeric user_ids while registered ones were stored as
 * strings, so a bare `===` quietly matched nothing and real accounts saw no
 * friend requests, DMs or notification badges. db.js now normalises the stored
 * ids; this keeps the comparison correct even for rows it has not touched
 * (guest ids like "u_abc123" are strings by design and compare fine here).
 */
function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
window.sameId = sameId;

function badgeHTML(status) {
  const map = {
    pending: 'badge-pending', 'under-review': 'badge-review', resolved: 'badge-resolved',
    approved: 'badge-approved', rejected: 'badge-rejected', banned: 'badge-banned',
    active: 'badge-active', waiting: 'badge-waiting', 'in-progress': 'badge-progress',
    upcoming: 'badge-upcoming', completed: 'badge-approved',
    player: 'badge-player', publisher: 'badge-publisher', moderator: 'badge-moderator', admin: 'badge-admin', superuser: 'badge-superuser',
    enabled: 'badge-enabled', disabled: 'badge-disabled', blacklisted: 'badge-disabled',
    suspended: 'badge-pending'
  };
  const cls = map[status] || 'badge-active';
  const label = status === 'in-progress' ? 'In Progress' : status === 'under-review' ? 'Under Review' : capitalize(status);
  return `<span class="badge ${cls}">${label}</span>`;
}

const UI = {
  avatarHTML(initials, size = '', color = '') {
    const sizeClass = size ? `avatar-${size}` : '';
    return `<div class="avatar ${sizeClass}" style="${color ? 'background:' + color : ''}">${initials}</div>`;
  },

  emptyState(msg, actionText = '', onAction = '') {
    return `
      <div class="empty-state">
        <div class="icon">🎮</div>
        <h3>No Data Found</h3>
        <p>${msg}</p>
        ${actionText ? `<button class="btn btn-primary mt-2" onclick="${onAction}">${actionText}</button>` : ''}
      </div>`;
  }
};
// Global Aliases for backward compatibility
const avatarHTML = UI.avatarHTML;
const emptyState = UI.emptyState;

// ---- Confirm Dialog -----------------------------------------------
function confirmAction(title, msg, onConfirm, type = 'danger') {
  const el = document.getElementById('confirm-modal');

  // No markup on this page? Use the injected dialog rather than returning.
  //
  // Returning silently was worse than having no helper at all: both callers
  // test `typeof confirmAction === 'function'` and only fall back to
  // window.confirm when it is missing. Since it always exists, "Remove friend"
  // and "Delete conversation" did NOTHING on every page that lacks the modal
  // — no dialog, no error, no action.
  if (!el) {
    Confirm.show({
      title,
      message: msg,
      confirmText: type === 'danger' ? 'Confirm' : 'Proceed',
      tone: type === 'danger' ? 'danger' : 'primary',
    }).then((ok) => { if (ok) onConfirm(); });
    return;
  }
  el.querySelector('#confirm-title').textContent = title;
  el.querySelector('#confirm-msg').textContent = msg;
  const btn = el.querySelector('#confirm-btn');
  btn.className = `btn btn-${type === 'danger' ? 'red' : 'green'}`;
  btn.textContent = type === 'danger' ? 'Confirm' : 'Proceed';
  btn.onclick = () => { Modal.close('confirm-modal'); onConfirm(); };
  Modal.open('confirm-modal');
}

/**
 * Guarantee that an injected .modal-overlay is HIDDEN by default.
 *
 * utils.js injects markup that relies on the platform stylesheet for its base
 * rules — `.modal-overlay { display:none }` and `.modal-overlay.show { flex }`.
 * The builtin games load utils.js (for Auth, Presence, Toast and the socket) but
 * NOT that stylesheet, because they ship their own look. So on the chess page
 * the class meant nothing, the overlay defaulted to `display:block`, and the
 * confirm dialog rendered as a stray "Confirm Action" heading and two buttons
 * sitting under the board — permanently, with nothing having asked for it.
 *
 * This probes for the rule and only supplies a fallback when it is genuinely
 * missing, so a page that DOES load the platform CSS is untouched and cannot
 * have its styling overridden by rules injected later than the stylesheet.
 */
function ensureOverlayBaseStyles() {
  if (document.getElementById('pc-overlay-fallback')) return;

  const probe = document.createElement('div');
  probe.className = 'modal-overlay';
  document.body.appendChild(probe);
  const alreadyHidden = getComputedStyle(probe).display === 'none';
  probe.remove();
  if (alreadyHidden) return;                 // platform CSS is present

  const st = document.createElement('style');
  st.id = 'pc-overlay-fallback';
  st.textContent = [
    '.modal-overlay{display:none;position:fixed;inset:0;z-index:9998;',
    '  background:rgba(0,0,0,.65);align-items:center;justify-content:center}',
    '.modal-overlay.show{display:flex}',
    '.modal{background:#141a2a;border:1px solid #26304a;border-radius:12px;',
    '  padding:1.25rem 1.5rem;max-width:420px;color:#e9edf7;font-family:inherit}',
    '.modal-title{margin:0 0 .5rem;font-size:1rem}',
    '.modal-header{display:flex;align-items:center;justify-content:space-between}',
    '.modal-close{cursor:pointer;opacity:.7}',
    '.modal-footer{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}'
  ].join('\n');
  document.head.appendChild(st);
}

// ---- Shared Confirm Modal HTML -----------------------------------------------
function insertConfirmModal() {
  ensureOverlayBaseStyles();
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="modal-overlay" id="confirm-modal">
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h3 class="modal-title" id="confirm-title">Confirm Action</h3>
          <span class="modal-close" onclick="Modal.close('confirm-modal')">✕</span>
        </div>
        <p id="confirm-msg" style="color:var(--text-secondary);font-size:0.9rem"></p>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="Modal.close('confirm-modal')">Cancel</button>
          <button class="btn btn-red" id="confirm-btn">Confirm</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
}

function injectProfilePopup() {
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="user-profile-modal" onclick="if(event.target.id === 'user-profile-modal') window.closeUserProfile()" style="position:fixed; inset:0; z-index:99999; display:none; flex-direction:column; justify-content:center; align-items:center; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); padding:2rem 0;">
      <div id="upm-card" style="position:relative; width:320px; max-height:85vh; background:linear-gradient(160deg, #111422 0%, #0b0d14 100%); padding:0; overflow-y:auto; overflow-x:hidden; border-radius:var(--radius-lg); border:1px solid var(--border-primary); box-shadow:0 10px 40px rgba(0,0,0,0.8); transform-origin: center center; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s; opacity:0; transform:scale(0.5);">
        <div style="position:relative; padding:1.5rem 1.5rem 0rem">
            <div style="position:absolute; top:-40px; right:-40px; width:150px; height:150px; border-radius:50%; background:rgba(0,212,255,0.08); filter:blur(40px); pointer-events:none;"></div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div id="upm-avatar" style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--accent-purple), var(--accent-cyan)); display:flex; align-items:center; justify-content:center; font-size:1.6rem; font-weight:900; box-shadow:0 0 0 3px rgba(0,212,255,0.3), 0 0 15px rgba(0,212,255,0.2); position:relative;">
                    ?
                    <div id="upm-status" style="position:absolute; bottom:2px; right:2px; width:12px; height:12px; border-radius:50%; background:var(--accent-green); border:2px solid #0b0d14;"></div>
                </div>
                <button class="btn btn-ghost" style="padding:0.2rem 0.5rem; color:var(--text-muted)" onclick="window.closeUserProfile()">✕</button>
            </div>
            <div style="margin-top:1rem;">
                <div id="upm-name" style="font-family:'Orbitron',monospace; font-weight:900; font-size:1.2rem; color:white;">Username</div>
                <div id="upm-role" style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent-cyan); font-weight:800; margin-top:0.2rem;">PLAYER</div>
                <div id="upm-presence" style="margin-top:0.45rem; display:flex; align-items:center; justify-content:center; gap:0.25rem; flex-wrap:wrap;"></div>
                <div id="upm-bio" style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.5rem; line-height:1.4;">No bio provided.</div>
            </div>
        </div>
        
        <div style="padding:1.25rem 1.5rem; border-bottom:1px solid var(--border-primary)">
            <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:var(--radius-md); padding:0.75rem; display:flex; align-items:center; gap:0.75rem;">
                <span style="font-size:1.5rem">💎</span>
                <div>
                    <div id="upm-pcp" style="font-family:'Orbitron',monospace; font-size:1.2rem; font-weight:900; color:var(--accent-yellow);">0</div>
                    <div style="font-size:0.65rem; text-transform:uppercase; color:var(--text-secondary);">PlayCarys Points</div>
                </div>
            </div>
        </div>

        <div id="upm-highlight-container" style="display:none; padding:1.25rem 1.5rem; border-bottom:1px solid var(--border-primary);">
            <div style="font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-secondary); margin-bottom:0.5rem; font-weight:800; display:flex; justify-content:space-between"><span>🎥 Auto-Highlight</span><span style="color:var(--accent-purple)">Hill Climbing</span></div>
            <div style="border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-primary); position:relative;">
                <img id="upm-highlight-img" src="" style="width:100%; height:auto; display:block;" />
                <div id="upm-highlight-meta" style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(2px); padding:0.4rem 0.5rem; font-size:0.65rem; color:var(--accent-cyan); font-family:'Orbitron',monospace;">Distance</div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem; padding:1.25rem 1.5rem; background:rgba(0,0,0,0.2);">
            <div style="text-align:center;">
                <div id="upm-matches" style="font-family:'Orbitron',monospace; font-size:1.1rem; font-weight:900;">0</div>
                <div style="font-size:0.6rem; text-transform:uppercase; color:var(--text-secondary); margin-top:0.2rem">Matches</div>
            </div>
            <div style="text-align:center;">
                <div id="upm-wins" style="font-family:'Orbitron',monospace; font-size:1.1rem; font-weight:900; color:var(--accent-green);">0</div>
                <div style="font-size:0.6rem; text-transform:uppercase; color:var(--text-secondary); margin-top:0.2rem">Wins</div>
            </div>
            <div style="text-align:center;">
                <div id="upm-wr" style="font-family:'Orbitron',monospace; font-size:1.1rem; font-weight:900; color:var(--accent-yellow);">0%</div>
                <div style="font-size:0.6rem; text-transform:uppercase; color:var(--text-secondary); margin-top:0.2rem">Win Rate</div>
            </div>
        </div>
        <div id="upm-actions" style="display:flex; gap:0.4rem; padding:0 1.5rem 1.25rem"></div>
      </div>
    </div>`;
  document.body.appendChild(div.firstElementChild);
}

window.showUserProfile = function (username, ev) {
  if (ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  if (!username) return;
  const user = DB.users.find(u => (u.username || u.user_name || '').toLowerCase() === String(username).toLowerCase());
  if (!user) {
    Toast.error('Player profile not found.');
    return;
  }

  const uid = user.id || user.user_id;
  const prof = DB.player_profiles.find(p => String(p.user_id) === String(uid));

  document.getElementById('upm-avatar').childNodes[0].nodeValue = user.avatar || (user.username || user.user_name).substring(0, 2).toUpperCase();

  // Live presence, not the account's active/banned flag (which made every profile
  // show a green dot regardless of whether the player was actually around).
  const pres = Presence.statusOf(user);
  const statusDot = document.getElementById('upm-status');
  statusDot.style.background = pres.color;
  statusDot.title = pres.label;

  // The dot alone told you a colour, not a state — and never offered the one
  // action a friend actually wants when someone is mid-match. Both live here now,
  // so every page that opens this popup gets them for free.
  const presEl = document.getElementById('upm-presence');
  if (presEl) presEl.innerHTML = Presence.badgeHTML(user, { spectate: true });

  document.getElementById('upm-name').textContent = user.username || user.user_name;

  const rawRole = user.role || (DB.roles.find(r => r.role_id === user.role_id) || {}).role_name || 'PLAYER';
  const points = prof?.carys_points || 0;
  const tierInfo = Economy.getTierFromPoints(points);

  const av = document.getElementById('upm-avatar');
  av.style.background = tierInfo.bg;
  av.style.boxShadow = `0 0 0 3px ${tierInfo.color}44, 0 0 15px ${tierInfo.color}33`;

  // Tier + points, not tier + elo. The elo shown here was a number the platform
  // invented and no game ever wrote to.
  document.getElementById('upm-role').innerHTML =
    `${rawRole.toUpperCase()} &bull; <span style="color:${tierInfo.color}">${tierInfo.name}</span>`;

  document.getElementById('upm-bio').textContent = prof?.bio || "A mysterious contender in the PlayCarys arena.";

  const pcp = points;
  document.getElementById('upm-pcp').textContent = pcp.toLocaleString();

  // Matches, wins and win rate from MATCH_RESULTS.
  //
  // These three lines used to read `user.matches` and `user.wins`. Neither field
  // exists on a user row anywhere in this database — not on the seeds, not on a
  // registered account, not after a match. So every profile this popup has ever
  // shown, for every player, displayed 0 matches, 0 wins and a 0% win rate, and
  // looked like a working feature while doing it.
  const myResults = (DB.match_results || []).filter(r => String(r.player_id) === String(uid));
  const matches = new Set(myResults.map(r => String(r.session_id))).size;
  const wins = myResults.filter(r => r.result === 'win').length;
  const wr = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  document.getElementById('upm-matches').textContent = matches;
  document.getElementById('upm-wins').textContent = wins;
  document.getElementById('upm-wr').textContent = wr + '%';

  // Friend actions — Add / Message / Remove, plus the coming-soon gift.
  //
  // The popup had no actions at all: you could look at somebody and that was
  // the end of it. Every page that opens this (dashboard, leaderboard, the
  // notification drawer) gets them from here.
  const actionsEl = document.getElementById('upm-actions');
  if (actionsEl && typeof Social !== 'undefined' && String(uid) !== String((Auth.getSession() || {}).userId)) {
    actionsEl.innerHTML = '<div style="font-size:.7rem;color:var(--text-secondary)">…</div>';
    Social.profileOf(uid).then(p => {
      const esc = s => String(s == null ? '' : s).replace(/'/g, "\\'");
      let btns;
      if (p.relationship === 'friends') {
        btns = `<button class="btn btn-primary btn-sm" style="flex:1;font-size:.7rem" onclick="closeUserProfile();SocialUI.chat(${uid},'${esc(p.user_name)}')">💬 Message</button>
                <button class="btn btn-ghost btn-sm" style="font-size:.7rem;color:var(--accent-red);background:rgba(239,68,68,.1)" onclick="closeUserProfile();SocialUI.unfriend(${uid},'${esc(p.user_name)}')">Remove</button>`;
      } else if (p.relationship === 'sent') {
        btns = `<button class="btn btn-ghost btn-sm" style="flex:1;font-size:.7rem" disabled>Request sent</button>`;
      } else if (p.relationship === 'received') {
        btns = `<button class="btn btn-ghost btn-sm" style="flex:1;font-size:.7rem" disabled>They asked you — see notifications</button>`;
      } else {
        btns = `<button class="btn btn-primary btn-sm" style="flex:1;font-size:.7rem" onclick="SocialUI.add(${uid},'${esc(p.user_name)}')">+ Add friend</button>`;
      }
      btns += `<button class="btn btn-ghost btn-sm" style="font-size:.7rem" disabled title="Coming soon">🎁</button>`;
      actionsEl.innerHTML = btns;
    }).catch(() => { actionsEl.innerHTML = ''; });
  } else if (actionsEl) {
    actionsEl.innerHTML = '';
  }

  const hls = (DB.highlights || []).filter(h => String(h.userId) === String(uid));
  const hlContainer = document.getElementById('upm-highlight-container');
  if (hls.length > 0) {
    hlContainer.style.display = 'block';
    document.getElementById('upm-highlight-img').src = hls[0].img;
    document.getElementById('upm-highlight-meta').textContent = "Crashed At: " + hls[0].distance + "m (Auto Capture)";
  } else {
    hlContainer.style.display = 'none';
  }

  const modalWrap = document.getElementById('user-profile-modal');
  const card = document.getElementById('upm-card');

  modalWrap.style.display = 'flex';

  // Trigger animation after layout
  requestAnimationFrame(() => {
    card.style.opacity = '1';
    card.style.transform = 'scale(1)';
  });
};

window.closeUserProfile = function () {
  const card = document.getElementById('upm-card');
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.5)';
    setTimeout(() => {
      const m = document.getElementById('user-profile-modal');
      if (m) m.style.display = 'none';
    }, 200);
  }
};

// ---- Toggle Switch -----------------------------------------------
function makeToggle(el, initialState, onChange) {
  el.classList.toggle('on', initialState);
  el.addEventListener('click', () => {
    el.classList.toggle('on');
    onChange(el.classList.contains('on'));
  });
}

// ---- Search Filter -----------------------------------------------
function filterList(items, query, fields) {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(q)));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  insertConfirmModal();
  injectProfilePopup();
});

// ---- Sidebar Drawer (Hamburger Tray) -----------------------------------------------
let _drawerInjected = false;

window.updateNavBadge = function () {
  const session = Auth.getSession();
  if (!session) return;
  const uid = session.userId;
  const count = (DB.notifications || []).filter(n => notifIsVisible(n, uid, session.role) && !notifIsRead(n, uid)).length;
  const navBadge = document.getElementById('nav-badge');
  if (navBadge) {
    navBadge.style.display = count > 0 ? 'flex' : 'none';
    navBadge.textContent = count;
  }
  const drawerBadge = document.getElementById('drawer-badge');
  if (drawerBadge) {
    drawerBadge.style.display = count > 0 ? 'inline-block' : 'none';
    drawerBadge.textContent = count + ' new';
  }
};

// ── REMOVED: toggleAddFriendUI / submitAddFriend / toggleFriendChat / sendInlineMsg
//
// The old friends UI, all four pieces of it:
//
//   toggleAddFriendUI + submitAddFriend  slid open a box that demanded an EXACT
//     username. A typo answered "Player not found in Database!" and offered
//     nothing further, so you had to already know precisely who you wanted.
//     Replaced by SocialUI.openFind() — substring search, with each result
//     showing stats, presence and the right button for your relationship.
//
//   toggleFriendChat + sendInlineMsg     slid open a bare input under a friend's
//     name. Nothing was ever stored, so there was no history to show and it
//     rendered empty every time; what it actually sent was a NOTIFICATION to the
//     other player, which meant you could not see your own side of the
//     conversation. Replaced by Social.openChat() — a real stored conversation
//     with Sent/Delivered, a one-sided delete, and a draggable window.
//
// Both replacements call their own REST endpoints instead of mutating the local
// DB and bulk-syncing it. See js/social.js.

/**
 * Fan a message out to every user in a role as SEPARATE private rows.
 *
 * Each copy is a direct notification (toUser set, toRole null). It used to set
 * BOTH fields, and every visibility filter is an OR of the two — so each copy was
 * ALSO delivered to the whole role. With 2 admins that meant each admin saw the
 * message twice; worse, it made "one row per recipient" indistinguishable from a
 * broadcast, so a per-user message written this way reached everyone in the role.
 * Separate rows also give each recipient their own read state and their own reply
 * thread instead of one shared row the whole role could read.
 */
window.dispatchRoleNotification = function (targetRole, fromSessionRole, fromSessionName, msg) {
  const session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const senderId = session ? session.userId : null;
  const users = DB.users.filter(u => u.role === targetRole);
  users.forEach((u, i) => {
    DB.notifications.push({
      id: Date.now() + i + Math.floor(Math.random() * 1000),
      type: 'system',
      toRole: null,
      toUser: u.user_id != null ? u.user_id : u.id,
      from: fromSessionName,
      avatar: '⚙️',
      fromRole: fromSessionRole,
      // Was hardcoded null, and sendNotifReply() skips rows with no fromUserId —
      // so replying to "your build was approved" silently went nowhere.
      fromUserId: senderId,
      msg: msg,
      time: 'just now',
      read: false,
      replies: []
    });
  });
  DB.save();
};

window.dispatchUserNotification = function (targetUsername, fromSessionRole, fromSessionName, msg) {
  const u = DB.users.find(usr => (usr.username || usr.user_name) === targetUsername);
  if (!u) return;
  const uid = u.user_id != null ? u.user_id : u.id;
  const session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const senderId = session ? session.userId : null;

  // ── Dedup guard: skip if an identical unread notification already exists for this user ──
  const alreadyExists = (DB.notifications || []).some(n =>
    !n.read && sameId(n.toUser, uid) && n.msg === msg
  );
  if (alreadyExists) return;

  DB.notifications.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'system',
    toRole: null,
    toUser: uid,
    from: fromSessionName,
    avatar: '⚙️',
    fromRole: fromSessionRole,
    // Same reason as dispatchRoleNotification: a null sender made the row unreplyable.
    fromUserId: senderId,
    msg: msg,
    time: 'just now',
    read: false,
    replies: []
  });
  DB.save();
};

/**
 * Answer a friend request.
 *
 * Both Accept and Reject go through POST /friends/requests/:id/respond, which
 * is what makes the OTHER person find out. Accepting used to be silent and
 * rejecting used to be silent — the requester was left watching a friends list,
 * guessing whether they had been turned down or simply not answered yet.
 *
 * The notification is looked up to find WHICH request it refers to; the request
 * itself is a separate record now, so rewriting the notification (as the old
 * code did, to hide the buttons) can no longer erase it.
 */
async function _respondToFriendRequest(notifId, action) {
  const notif = DB.notifications.find(n => n.id === notifId);
  if (!notif) return;
  const session = Auth.getSession();

  try {
    const reqs = await Social.requests();
    const match = (reqs.incoming || []).find(r => String(r.from_user) === String(notif.fromUserId));
    if (!match) {
      Toast.info('That request is no longer pending.');
    } else {
      const res = await Social.respond(match.id, action);
      Toast.success(res.message);
    }
  } catch (e) {
    Toast.error(e.message);
    return;
  }

  notif.read = true;
  notif.msg = `<i>Friend request from ${notif.from} ${action === 'accept' ? 'accepted' : 'rejected'}.</i>`;
  notif.type = 'system'; // hide the buttons; the REQUEST record keeps the facts
  DB.save();
  if (typeof updateNavBadge !== 'undefined') updateNavBadge();
  if (typeof window._drawerFriendsRender === 'function') window._drawerFriendsRender();
}

window.acceptFriendReq = function (notifId) {
  const session = Auth.getSession();
  _respondToFriendRequest(notifId, 'accept');

  // Refresh drawer while staying open
  const panelEl = document.getElementById('drawer-panel');
  const wasOpen = panelEl && panelEl.classList.contains('open');
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) document.body.removeChild(overlay);
  if (panelEl) document.body.removeChild(panelEl);
  _drawerInjected = false;
  injectSideDrawer(session);
  if (wasOpen) {
    setTimeout(() => {
      document.getElementById('drawer-overlay').classList.add('open');
      document.getElementById('drawer-panel').classList.add('open');
    }, 10);
  }
};

window.rejectFriendReq = function (notifId) {
  _respondToFriendRequest(notifId, 'reject');

  const session = Auth.getSession();
  // Refresh drawer
  const panelEl = document.getElementById('drawer-panel');
  const wasOpen = panelEl && panelEl.classList.contains('open');
  const overlay = document.getElementById('drawer-overlay');
  if (overlay) document.body.removeChild(overlay);
  if (panelEl) document.body.removeChild(panelEl);
  _drawerInjected = false;
  injectSideDrawer(session);
  if (wasOpen) {
    setTimeout(() => {
      document.getElementById('drawer-overlay').classList.add('open');
      document.getElementById('drawer-panel').classList.add('open');
    }, 10);
  }
};

// REMOVED: acceptInviteReq / rejectInviteReq.
//
// A room invite said "come and sit in my lobby": accepting looked the room up,
// checked it was not full or already started, wrote a player_session row and
// navigated you to join-session.html. Every one of those steps is a room
// operation, and all four things it touched are gone.
//
// Inviting a friend to PLAY is a real thing a player wants, and it is not this.
// It belongs with the friends work, where it can mean "join the game I am in"
// rather than "occupy a seat in a lobby I created first".


window.removeFriend = function (friendName) {
  // Kept for any older call site that still passes a NAME. The real path is
  // SocialUI.unfriend(id, name), which goes through DELETE /friends/:me/:them —
  // and that endpoint does the three things the doc asks for: tell the other
  // player, end it for both, and delete the conversation for both.
  const other = DB.users.find(x => (x.user_name || x.username || '') === friendName);
  if (other && typeof SocialUI !== 'undefined') {
    SocialUI.unfriend(other.user_id, friendName);
    return;
  }
  confirmAction('Remove Friend', `Are you sure you want to remove ${friendName} from your friends?`, () => {
    const session = Auth.getSession();
    const u = DB.users.find(x => String(x.user_id ?? x.id) === String(session.userId));
    if (u && other) {
      DB.removeFriendship(u.user_id, other.user_id);
      DB.save();
      Toast.info(`${friendName} removed from friends.`);

      // Rebuild drawer while keeping it open
      const panelEl = document.getElementById('drawer-panel');
      const wasOpen = panelEl && panelEl.classList.contains('open');

      const overlay = document.getElementById('drawer-overlay');
      if (overlay) document.body.removeChild(overlay);
      if (panelEl) document.body.removeChild(panelEl);
      _drawerInjected = false;
      injectSideDrawer(session);

      if (wasOpen) {
        setTimeout(() => {
          document.getElementById('drawer-overlay').classList.add('open');
          document.getElementById('drawer-panel').classList.add('open');
        }, 10);
      }
    }
  });
};

function injectSideDrawer(session) {
  if (_drawerInjected) return;
  _drawerInjected = true;

  const isPlayer = session && session.role === 'player';
  const u = DB.users.find(x => String(x.user_id ?? x.id) === String(session.userId));

  // ── Friends (player only) ────────────────────────────────────────
  // Built by a function, not a one-shot snapshot, so a friend accepted or a
  // presence change arriving over the live sync can re-render in place.
  function buildFriendsHTML() {
    const meNow = DB.users.find(x => String(x.user_id ?? x.id) === String(session.userId));

    // Read from the friendships table, by id.
    //
    // This used to read meNow.friends — a nested array of frozen snapshots —
    // and, when it was empty, INVENT three friends for the demo accounts and
    // write them back to the user row. That fabricated data then synced to the
    // backend as though it were real.
    //
    // DB.getFriends() returns live user rows, so name and avatar are always
    // current; Presence.statusOf() supplies the actual online state.
    // Painted asynchronously from GET /friends/:userId — see _drawerFriendsRender
    // below. The drawer renders instantly with a placeholder and fills in.
    return `<div id="drawer-friends-list">
      <div style="color:var(--text-secondary);font-size:0.8rem;padding:0.75rem 0">Loading friends…</div>
    </div>`;
  }
  const friendsHTML = buildFriendsHTML();

  // ── Notifications: show role broadcasts + direct DMs to this user ────
  const userId = session.userId;
  // Read DB.notifications on every render. This used to be a snapshot taken once at
  // injection time, so _drawerNotifRender() kept re-rendering the same stale array —
  // a message that arrived after page load could not appear no matter what.
  const myNotifs = () => (DB.notifications || []).filter(n => notifIsVisible(n, userId, session.role));

  function renderNotifList() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const visible = myNotifs().filter(n => !notifIsRead(n, userId));
    if (!visible.length) {
      list.innerHTML = `<div style="text-align:center;padding:1rem 0;color:var(--text-secondary);font-size:0.82rem">💭 All caught up!</div>`;
      return;
    }
    list.innerHTML = visible.map(n => {
      const isDM = n.toUser != null;
      const isMod = n.fromRole === 'moderator';

      let canReply = true;
      // A broadcast is one shared row: a reply typed into it is appended to the row
      // every other user in the role is reading. Replies only make sense on a
      // private row, so the box is hidden on broadcasts rather than leaking.
      if (isBroadcastNotif(n)) canReply = false;
      else if (session.role === 'player' && n.fromRole !== 'player') canReply = false;
      else if (session.role === 'publisher' && n.fromRole !== 'admin') canReply = false;
      else if (session.role === 'moderator' && ['superuser', 'publisher'].includes(n.fromRole)) canReply = false;

      const repliesHTML = (n.replies || []).map(r => `<div style="font-size:0.72rem;color:var(--accent-cyan);font-style:italic;margin-top:0.1rem">↳ ${r}</div>`).join('');
      return `
      <div id="notif-item-${n.id}" style="padding:0.75rem 0;border-bottom:1px solid var(--border-primary);overflow:hidden;transition:opacity 0.25s ease,max-height 0.4s ease 0.2s,padding 0.4s ease 0.2s">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem">
          <div class="drawer-friend-avatar" style="width:28px;height:28px;font-size:0.68rem;flex-shrink:0">${n.avatar || n.from.slice(0, 2).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" onclick="showUserProfile('${n.from}', event)">${n.from}</div>
            <div style="font-size:0.67rem;color:var(--text-secondary);display:flex;gap:0.4rem;align-items:center">
              ${n.time}
              ${isDM ? `<span style="background:rgba(124,58,237,0.15);color:var(--accent-purple);border-radius:99px;padding:0 0.3rem;font-size:0.62rem;font-weight:700">📩 DM</span>` : ''}
              ${isMod ? `<span style="background:rgba(239,68,68,0.12);color:var(--accent-red);border-radius:99px;padding:0 0.3rem;font-size:0.62rem;font-weight:700">🛡️ MOD</span>` : ''}
            </div>
          </div>
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-cyan);flex-shrink:0;box-shadow:0 0 6px rgba(0,212,255,0.6)"></span>
        </div>
        <div style="font-size:0.79rem;color:var(--text-primary);line-height:1.5;margin-bottom:0.45rem;padding-left:36px">${n.msg}</div>
        ${repliesHTML ? `<div style="padding-left:36px;margin-bottom:0.35rem">${repliesHTML}</div>` : ''}
        <div style="display:flex;gap:0.4rem;padding-left:36px;align-items:center">
          ${n.type === 'friend_request' ? `
            <button class="btn btn-primary btn-sm" onclick="acceptFriendReq(${n.id})" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px">Accept</button>
            <button class="btn btn-ghost btn-sm" onclick="rejectFriendReq(${n.id})" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px;color:var(--accent-red);background:rgba(239,68,68,0.1)">Reject</button>
          ` : canReply ? `
            <input type="text" id="reply-${n.id}" class="form-input" placeholder="Reply..." style="flex:1;font-size:0.75rem;padding:0.2rem 0.45rem;height:26px" onkeydown="if(event.key==='Enter')sendNotifReply(${n.id})"/>
            <button class="btn btn-primary btn-sm" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px" onclick="sendNotifReply(${n.id})">Send</button>
          ` : `
            <div style="color:var(--text-muted);font-size:0.75rem;font-style:italic">${isBroadcastNotif(n) ? '📢 Announcement to all ' + n.toRole + 's — read-only.' : '🔒 Read-only. You cannot reply to ' + n.fromRole + 's.'}</div>
          `}
          <button id="read-btn-${n.id}" class="btn btn-ghost btn-sm" style="font-size:0.68rem;padding:0.15rem 0.4rem;height:26px;transition:opacity 0.2s" onclick="markNotifRead(${n.id})" title="Mark read">✓ Read</button>
        </div>
      </div>`;
    }).join('');
  }

  // ── Drawer HTML ──────────────────────────────────────────────────
  const unread = myNotifs().filter(n => !notifIsRead(n, userId)).length;

  // Restrict full compose box: Guest cannot compose, Players now use the friend list 'Chat' instead.
  const canCompose = session.role !== 'guest' && session.role !== 'player' && session.role !== 'publisher';

  let composeNote = "";
  if (session.role === 'moderator') composeNote = "You can message admins, moderators, and players.";
  else if (['admin', 'superuser'].includes(session.role)) composeNote = "You can message anyone.";

  function renderPubConversations() {
    if (session.role !== 'publisher') return;
    const list = document.getElementById('pub-conversations-list');
    if (!list) return;
    const uid = session.userId;
    const convos = (DB.notifications || []).filter(n =>
      (sameId(n.fromUserId, uid) && n.toUser) ||
      (sameId(n.toUser, uid) && n.fromRole === 'admin')
    ).slice().reverse(); // newest first

    if (!convos.length) {
      list.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;padding:1.5rem 0.5rem;color:var(--text-secondary)">
          <div style="font-size:2rem;opacity:0.35">💬</div>
          <div style="font-size:0.8rem;text-align:center">No conversations yet.<br>Send a message to an admin to get started.</div>
        </div>`;
      return;
    }

    list.innerHTML = convos.map(c => {
      const isSent = sameId(c.fromUserId, uid);
      let targetName = 'Admin';
      let contactEmail = '';
      if (isSent) {
        const targetUser = DB.users.find(u => sameId(u.user_id != null ? u.user_id : u.id, c.toUser));
        if (targetUser) {
          targetName = targetUser.username || targetUser.user_name || 'Admin';
          contactEmail = targetUser.email || '';
        }
      } else {
        targetName = c.from || 'Admin';
        const fromUser = DB.users.find(u => (u.user_id ?? u.id) === c.fromUserId);
        if (fromUser) contactEmail = fromUser.email || '';
      }

      const repliesHTML = (c.replies || []).map(r => {
        const [who, ...rest] = r.split(': ');
        return `<div style="display:flex;gap:0.35rem;align-items:flex-start;margin-top:0.35rem">
          <div style="font-size:0.6rem;font-weight:800;color:var(--accent-cyan);white-space:nowrap;padding-top:0.1rem">↩ ${who || '?'}</div>
          <div style="font-size:0.72rem;color:var(--text-primary);line-height:1.4">${rest.join(': ')}</div>
        </div>`;
      }).join('');

      const timeStr = c.time || '';
      const subjectBadge = c.subject ? `<span style="background:rgba(124,58,237,0.15);color:var(--accent-purple);border-radius:99px;padding:0.05rem 0.45rem;font-size:0.6rem;font-weight:700;letter-spacing:0.04em">${c.subject}</span>` : '';

      if (isSent) {
        return `
        <div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:0.75rem">
          <div style="display:flex;align-items:center;gap:0.3rem;margin-bottom:0.25rem">
            ${subjectBadge}
            <span style="font-size:0.6rem;color:var(--text-secondary)">${timeStr}</span>
            <span style="font-size:0.62rem;font-weight:700;color:var(--accent-cyan)">You</span>
            <div style="width:20px;height:20px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:900;color:#000;flex-shrink:0">${session.avatar || session.username.slice(0, 2).toUpperCase()}</div>
          </div>
          <div style="max-width:88%;background:linear-gradient(135deg,rgba(0,212,255,0.15),rgba(124,58,237,0.1));border:1px solid rgba(0,212,255,0.2);border-radius:12px 2px 12px 12px;padding:0.55rem 0.75rem">
            <div style="font-size:0.78rem;color:var(--text-primary);line-height:1.5">${c.msg}</div>
          </div>
          <div style="font-size:0.6rem;color:var(--text-secondary);margin-top:0.15rem;display:flex;align-items:center;gap:0.25rem">
            <span>→ ${targetName}</span>
            ${contactEmail ? `<span style="color:var(--accent-purple)">(${contactEmail})</span>` : ''}
            <span style="color:var(--accent-green)">✓ Delivered</span>
          </div>
          ${repliesHTML ? `<div style="max-width:88%;background:rgba(255,255,255,0.03);border:1px solid var(--border-primary);border-radius:8px;padding:0.4rem 0.6rem;margin-top:0.3rem;width:100%">${repliesHTML}</div>` : ''}
        </div>`;
      } else {
        return `
        <div style="display:flex;flex-direction:column;align-items:flex-start;margin-bottom:0.75rem">
          <div style="display:flex;align-items:center;gap:0.3rem;margin-bottom:0.25rem">
            <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:900;color:#fff;flex-shrink:0">${targetName.slice(0, 2).toUpperCase()}</div>
            <span style="font-size:0.62rem;font-weight:700;color:var(--accent-red)">Admin · ${targetName}</span>
            <span style="font-size:0.6rem;color:var(--text-secondary)">${timeStr}</span>
            ${subjectBadge}
          </div>
          <div style="max-width:88%;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.18);border-radius:2px 12px 12px 12px;padding:0.55rem 0.75rem">
            <div style="font-size:0.78rem;color:var(--text-primary);line-height:1.5">${c.msg}</div>
          </div>
          ${contactEmail ? `<div style="font-size:0.6rem;color:var(--text-secondary);margin-top:0.15rem">Contact: <span style="color:var(--accent-purple)">${contactEmail}</span></div>` : ''}
          ${repliesHTML ? `<div style="max-width:88%;background:rgba(255,255,255,0.03);border:1px solid var(--border-primary);border-radius:8px;padding:0.4rem 0.6rem;margin-top:0.3rem;width:100%">${repliesHTML}</div>` : ''}
        </div>`;
      }
    }).join('');
  }

  const drawerHTML = `
    <div class="drawer-overlay" id="drawer-overlay" onclick="closeDrawer()"></div>
    <div class="drawer-panel" id="drawer-panel">
      <div class="drawer-header">
        <h3>🎮 PlayCarys</h3>
        <div class="drawer-close" onclick="closeDrawer()">✕</div>
      </div>
      <div class="drawer-body">

        <!-- Page navigation. On a phone this is the ONLY way to reach the other
             pages: the horizontal .nav-links bar is hidden below 900px. -->
        ${buildDrawerNavHTML(session.role)}

        ${isPlayer ? `
        <!-- Friends Section -->
        <div class="drawer-section">
          <!-- Header strip -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(0,212,255,0.03)">
            <div class="drawer-section-title">👥 Friends <span id="drawer-friend-count" style="background:rgba(0,212,255,0.15);color:var(--accent-cyan);border-radius:99px;padding:0.05rem 0.4rem;font-size:0.62rem;font-family:monospace">0</span></div>
            <!-- Was a "+ Add" toggle over a box demanding an EXACT username: a typo
                 answered "Player not found in Database!" and offered nothing else,
                 so you had to already know precisely who you were looking for. -->
            <button class="btn btn-ghost btn-sm" style="font-size:0.62rem;padding:0.1rem 0.35rem;height:22px" onclick="SocialUI.openFind()">🔍 Find</button>
          </div>
          <!-- Friends list -->
          <div id="drawer-friends-list" style="padding:0.4rem 1rem 0.75rem">${friendsHTML}</div>
        </div>` : ''}

        <!-- Notifications Section -->
        <div class="drawer-section">
          <!-- Header strip -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(239,68,68,0.03)">
            <div class="drawer-section-title">🔔 Notifications <span id="drawer-badge" style="display:${unread > 0 ? 'inline-block' : 'none'};background:var(--accent-red);color:#fff;font-size:0.6rem;padding:0.05rem 0.35rem;border-radius:99px;font-weight:800;margin-left:0.25rem">${unread}</span></div>
            <button class="btn btn-ghost btn-sm" style="font-size:0.62rem;padding:0.1rem 0.35rem;height:22px" onclick="markAllNotifRead()">Mark all read</button>
          </div>
          <div id="notif-list" style="padding:0 0.25rem"></div>
        </div>

        ${session.role !== 'player' && session.role !== 'guest' ? `
        <!-- ── Messages ───────────────────────────────────────────
             Two levels on purpose. Level one is WHO you can talk to; level
             two is the conversation with one of them.

             This replaces two separate blocks that both lived here: a generic
             "Send Message" box asking for a username typed from memory, and a
             publisher-only hub that listed every message from everyone in one
             flat scroll. Neither answered the question a staff member actually
             arrives with, which is "what did this person say to me". -->
        <div class="drawer-section" id="drawer-messages">
          <div style="padding:0.7rem 1rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(124,58,237,0.04)">
            <div class="drawer-section-title" id="msg-title">💬 Messages</div>
          </div>
          <div id="msg-body" style="padding:0.6rem 0.85rem">
            <div style="color:var(--text-secondary);font-size:0.78rem;padding:0.6rem 0">Loading…</div>
          </div>
        </div>` : ''}

      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = drawerHTML;
  while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

  // ── Drawer messages: contacts, then one conversation ──────────
  //
  // Kept off the top nav deliberately. Messaging is something staff reach for
  // occasionally, not a destination they navigate to — a nav slot for it
  // competed with Dashboard, Games and Earnings, which are why they came.
  //
  // Level one lists the people this role may contact (server-supplied, so the
  // options here and what the API accepts cannot drift). Level two opens one
  // person's thread. Nothing is fetched until the drawer is opened.
  let _msgDir = null;
  let _msgOpenWith = null;          // user_id of the thread being read, or null

  function msgThreadWith(otherId) {
    // Everything either party sent the other, oldest first — a conversation,
    // not two separate inboxes.
    return (DB.notifications || [])
      .filter(n =>
        (sameId(n.fromUserId, session.userId) && sameId(n.toUser, otherId)) ||
        (sameId(n.fromUserId, otherId) && sameId(n.toUser, session.userId)))
      .slice()
      .sort((a, b) => Number(a.id) - Number(b.id));
  }

  function msgUnreadFrom(otherId) {
    return msgThreadWith(otherId).filter(n =>
      sameId(n.fromUserId, otherId) && !notifIsRead(n, session.userId)).length;
  }

  window._drawerMsgOpen = function (otherId, name) {
    _msgOpenWith = { id: otherId, name };
    // Opening a thread is reading it.
    msgThreadWith(otherId).forEach(n => {
      if (sameId(n.fromUserId, otherId)) setNotifRead(n, session.userId);
    });
    DB.save();
    renderMessages();
  };

  window._drawerMsgBack = function () { _msgOpenWith = null; renderMessages(); };

  window._drawerMsgSend = async function () {
    const box = document.getElementById('msg-reply');
    const text = (box?.value || '').trim();
    if (!text || !_msgOpenWith) return;
    try {
      await API.post('/notifications', {
        toUser: Number(_msgOpenWith.id),
        fromUserId: Number(session.userId),
        fromRole: session.role,
        from: session.username,
        avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
        msg: text,
      });
      box.value = '';
      if (typeof Toast !== 'undefined') Toast.success('Sent');
      renderMessages();
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.error(e.message);
    }
  };

  function renderMessages() {
    const body = document.getElementById('msg-body');
    const title = document.getElementById('msg-title');
    if (!body) return;

    // ── Level 2: one conversation ──────────────────────────────
    if (_msgOpenWith) {
      const thread = msgThreadWith(_msgOpenWith.id);
      if (title) title.innerHTML = '💬 ' + _msgOpenWith.name;
      body.innerHTML =
        '<button class="btn btn-ghost btn-sm" style="font-size:0.7rem;padding:0.1rem 0.45rem;height:26px;margin-bottom:0.6rem" onclick="_drawerMsgBack()">← All contacts</button>' +
        (thread.length
          ? '<div style="max-height:15rem;overflow-y:auto;display:flex;flex-direction:column;gap:0.45rem;margin-bottom:0.6rem">' +
            thread.map(n => {
              const mine = sameId(n.fromUserId, session.userId);
              return '<div style="align-self:' + (mine ? 'flex-end' : 'flex-start') +
                ';max-width:85%;padding:0.4rem 0.6rem;border-radius:10px;font-size:0.76rem;line-height:1.45;' +
                (mine ? 'background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.25)'
                      : 'background:rgba(255,255,255,0.04);border:1px solid var(--border-primary)') + '">' +
                '<div style="color:var(--text-primary)">' + (n.msg || '') + '</div>' +
                '<div style="font-size:0.62rem;color:var(--text-muted);margin-top:0.15rem">' + (n.time || '') + '</div>' +
                '</div>';
            }).join('') + '</div>'
          : '<div style="color:var(--text-secondary);font-size:0.76rem;padding:0.5rem 0">No messages yet. Say something.</div>') +
        '<div style="display:flex;gap:0.35rem">' +
        '<input id="msg-reply" class="form-input" placeholder="Message…" ' +
        'style="flex:1;font-size:0.76rem;height:30px;padding:0.2rem 0.5rem" ' +
        'onkeydown="if(event.key===\'Enter\')_drawerMsgSend()"/>' +
        '<button class="btn btn-primary btn-sm" style="font-size:0.72rem;height:30px" onclick="_drawerMsgSend()">Send</button>' +
        '</div>';
      return;
    }

    // ── Level 1: who you can talk to ───────────────────────────
    if (title) title.innerHTML = '💬 Messages';

    if (!_msgDir) {
      body.innerHTML = '<div style="color:var(--text-secondary);font-size:0.78rem;padding:0.6rem 0">Loading…</div>';
      return;
    }
    if (!_msgDir.groups || !_msgDir.groups.length) {
      body.innerHTML = '<div style="color:var(--text-secondary);font-size:0.76rem;padding:0.6rem 0;line-height:1.5">Your role does not send staff messages.</div>';
      return;
    }

    body.innerHTML = _msgDir.groups.map(g => {
      if (!g.people.length) return '';
      return '<div style="margin-bottom:0.7rem">' +
        '<div style="font-size:0.6rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.3rem">' + g.role + '</div>' +
        g.people.map(p => {
          const un = msgUnreadFrom(p.user_id);
          const nm = String(p.user_name).replace(/'/g, "\\'");
          return '<button class="drawer-contact" onclick="_drawerMsgOpen(' + p.user_id + ", '" + nm + '\')" ' +
            'style="display:flex;align-items:center;gap:0.5rem;width:100%;text-align:left;cursor:pointer;' +
            'padding:0.4rem 0.55rem;margin-bottom:0.25rem;border-radius:9px;background:transparent;' +
            'border:1px solid var(--border-primary);color:var(--text-primary);font-size:0.78rem">' +
            '<span class="drawer-friend-avatar" style="width:26px;height:26px;font-size:0.62rem;flex-shrink:0">' +
            (p.avatar || String(p.user_name).slice(0, 2).toUpperCase()) + '</span>' +
            '<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.user_name + '</span>' +
            (un ? '<span style="background:var(--accent-red);color:#fff;font-size:0.6rem;font-weight:800;border-radius:99px;padding:0.05rem 0.35rem">' + un + '</span>' : '') +
            '</button>';
        }).join('') + '</div>';
    }).join('') || '<div style="color:var(--text-secondary);font-size:0.76rem;padding:0.6rem 0">Nobody to message yet.</div>';
  }

  window._drawerRenderMessages = renderMessages;

  // Fetched once, lazily — the drawer is closed on most page loads and a
  // directory nobody opened is a request nobody needed.
  if (session.role !== 'player' && session.role !== 'guest' && typeof API !== 'undefined') {
    API.get('/notifications/directory?viewerId=' + encodeURIComponent(session.userId))
      .then(d => { _msgDir = d; renderMessages(); })
      .catch(() => {
        const body = document.getElementById('msg-body');
        if (body) body.innerHTML = '<div style="color:var(--text-secondary);font-size:0.76rem;padding:0.6rem 0">Could not load contacts.</div>';
      });
  }

  // render initial list after DOM is injected
  renderNotifList();
  // renderPubConversations() retired — its host element is gone, replaced by
  // the unified contacts/thread view above.

  // expose helpers globally
  window._drawerNotifRender = () => {
    renderNotifList();
    // Contacts carry per-person unread counts, so they refresh on the same
    // signal as the notification list rather than on a timer of their own.
    renderMessages();
  };

  // Re-render the friends list in place (live presence, newly accepted friends)
  // without tearing the whole drawer down and losing its open/scroll state.
  //
  // Reads GET /friends/:userId. It used to build the list synchronously from
  // DB.getFriends() + Presence.statusOf(), which could report "Playing" but
  // never what — statusOf returned a gameId and nothing resolved it to a name.
  window._drawerFriendsRender = async () => {
    const host = document.getElementById('drawer-friends-list');
    if (!host || typeof Social === 'undefined') return;

    let friends = [];
    try { friends = await Social.friends(); }
    catch (e) {
      host.innerHTML = `<div style="color:var(--text-secondary);font-size:0.8rem;padding:0.75rem 0">Could not load friends.</div>`;
      return;
    }

    const countEl = document.getElementById('drawer-friend-count');
    if (countEl) countEl.textContent = friends.length;

    if (!friends.length) {
      host.innerHTML = `
        <div style="text-align:center;padding:1rem;border:1px dashed var(--border-primary);border-radius:var(--radius-md)">
          <div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:0.75rem">You don't have any friends yet</div>
          <button class="btn btn-primary btn-sm" onclick="SocialUI.openFind()">🔍 Find players</button>
        </div>`;
      return;
    }

    const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    host.innerHTML = friends.map(f => {
      const playing = f.presence && f.presence.state === 'playing';
      const online  = f.presence && f.presence.state === 'online';
      const label   = Social.presenceText(f.presence);
      const colour  = playing ? 'var(--accent-cyan)' :
        online ? 'var(--accent-green)' : 'var(--text-muted)';
      const unread  = f.unread > 0
        ? `<span style="background:var(--accent-purple);color:#fff;border-radius:99px;font-size:.6rem;font-weight:800;padding:.05rem .35rem;margin-left:.3rem">${f.unread}</span>`
        : '';
      return `
      <div class="drawer-friend-item" style="padding:0.4rem 0;border-bottom:1px solid var(--border-primary)">
        <div class="drawer-friend-avatar">${esc((f.user_name||'P').substring(0,2).toUpperCase())}</div>
        <div class="drawer-friend-info">
          <div class="drawer-friend-name" style="cursor:pointer" onclick="SocialUI.viewProfile(${f.user_id})">${esc(f.user_name)}${unread}</div>
          <div class="drawer-friend-status" style="color:${colour}">● ${esc(label)}</div>
        </div>
        <div style="display:flex;gap:0.3rem">
          <button class="btn btn-primary btn-sm" style="font-size:.65rem;padding:.2rem .4rem" title="Chat"
            onclick="SocialUI.chat(${f.user_id},'${esc(f.user_name)}')">Chat</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.65rem;padding:.2rem .4rem;color:var(--accent-red);background:rgba(239,68,68,0.1)" title="Remove friend"
            onclick="SocialUI.unfriend(${f.user_id},'${esc(f.user_name)}')">✕</button>
        </div>
      </div>`;
    }).join('') + `
      <div style="padding-top:.6rem">
        <button class="btn btn-primary btn-sm" style="width:100%" onclick="SocialUI.openFind()">🔍 Find players</button>
      </div>`;
  };

  // Fill it in as soon as the drawer exists.
  if (isPlayer) setTimeout(() => window._drawerFriendsRender(), 50);
}

window.sendNotifReply = function (notifId) {
  const session = Auth.getSession();
  const input = document.getElementById('reply-' + notifId);
  const notif = (DB.notifications || []).find(n => n.id === notifId);
  if (!session || !notif || !input || !input.value.trim()) return;

  const senderRole = session.role;
  const targetRole = notif.fromRole;

  // ── Role-based reply permissions ──
  if (senderRole === 'player' && targetRole !== 'player') {
    Toast.error('Players can only reply to other players.');
    return;
  } else if (senderRole === 'publisher' && targetRole !== 'admin') {
    Toast.error('Publishers can only reply to admins.');
    return;
  } else if (senderRole === 'moderator' && ['superuser', 'publisher'].includes(targetRole)) {
    Toast.error('Moderators cannot reply to superusers or publishers.');
    return;
  }

  // Never write a reply into a shared broadcast row — the whole role would read it.
  if (isBroadcastNotif(notif)) {
    Toast.error('This is an announcement to all ' + notif.toRole + 's. Use a direct message to reply.');
    return;
  }

  const text = input.value.trim();
  if (!Array.isArray(notif.replies)) notif.replies = [];
  notif.replies.push(session.username + ': ' + text);
  setNotifRead(notif, session.userId);

  // Create a reply notification back to the original sender (if we know who they are).
  // Compared with sameId(): parseInt() returns NaN for a registered account's string
  // id ("u_ab12"), so the self-reply guard never fired and the sender check misrouted.
  if (notif.fromUserId != null && !sameId(notif.fromUserId, session.userId)) {
    DB.notifications.push({
      id: Date.now(),
      toRole: null,
      toUser: notif.fromUserId,
      from: session.username,
      avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
      fromRole: session.role,
      fromUserId: session.userId,
      msg: '↩ ' + text,
      time: 'just now',
      read: false,
      replies: []
    });
  }

  input.value = '';
  DB.save();
  updateNavBadge();
  Toast.success('Reply sent!');
  // Smoothly remove the item now it is read
  _smoothRemoveNotif(notifId);
};

// Animate a notification item out and remove it from the DOM
function _smoothRemoveNotif(notifId) {
  const el = document.getElementById('notif-item-' + notifId);
  if (!el) { if (window._drawerNotifRender) window._drawerNotifRender(); return; }

  // 1) Fade and collapse the mark-read button immediately
  const readBtn = document.getElementById('read-btn-' + notifId);
  if (readBtn) {
    readBtn.style.transition = 'opacity 0.15s';
    readBtn.style.opacity = '0';
    setTimeout(() => readBtn.remove(), 150);
  }

  // 2) After brief pause, fade + collapse the whole item
  setTimeout(() => {
    const h = el.offsetHeight;
    el.style.maxHeight = h + 'px';
    el.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.25s ease, max-height 0.4s ease 0.15s, padding 0.4s ease 0.15s, margin 0.4s ease 0.15s';
      el.style.opacity = '0';
      el.style.maxHeight = '0';
      el.style.padding = '0';
      el.style.borderBottomWidth = '0';
    });
    setTimeout(() => {
      el.remove();
      // If list is now empty — show all-caught-up
      const list = document.getElementById('notif-list');
      if (list && !list.querySelector('[id^="notif-item-"]')) {
        list.innerHTML = `<div style="text-align:center;padding:1rem 0;color:var(--text-secondary);font-size:0.82rem">💭 All caught up!</div>`;
      }
    }, 600);
  }, 160);
}

window.markNotifRead = function (notifId) {
  const notif = (DB.notifications || []).find(n => n.id === notifId);
  const session = Auth.getSession();
  // Per-user on broadcasts: pressing "✓ Read" used to flip the shared flag and
  // clear the announcement from every other account in the role.
  if (notif) setNotifRead(notif, session ? session.userId : null);
  DB.save();
  updateNavBadge();
  _smoothRemoveNotif(notifId);   // disappears smoothly — no full re-render
};

window.markAllNotifRead = function () {
  const session = Auth.getSession();
  if (!session) return;
  const uid = session.userId;
  (DB.notifications || [])
    .filter(n => notifIsVisible(n, uid, session.role))
    .forEach(n => setNotifRead(n, uid));
  DB.save();
  updateNavBadge();
  if (window._drawerNotifRender) window._drawerNotifRender();
  Toast.info('All notifications marked as read');
};

// Send a direct message from the drawer compose form
window.sendDirectMessage = function () {
  const session = Auth.getSession();
  if (!session) return;
  const toInput = document.getElementById('dm-to');
  const msgInput = document.getElementById('dm-msg');
  if (!toInput || !msgInput) return;

  const targetName = toInput.value.trim();
  const msg = msgInput.value.trim();
  if (!targetName) { Toast.error('Enter a username.'); return; }
  if (!msg) { Toast.error('Message cannot be empty.'); return; }

  const target = DB.users.find(u => u.user_name.toLowerCase() === targetName.toLowerCase());
  if (!target) { Toast.error('User not found: ' + targetName); return; }
  // sameId, not parseInt: a registered account's id is a string, so the old check
  // was NaN === "u_ab12" and let you send yourself a message.
  if (sameId(target.user_id, session.userId)) { Toast.error('You cannot message yourself.'); return; }

  // ── Role-based messaging permissions ──
  const senderRole = session.role;
  const targetRole = target.role;

  if (senderRole === 'player') {
    if (targetRole !== 'player') {
      Toast.error('Players can only message other players.');
      return;
    }
  } else if (senderRole === 'publisher') {
    if (targetRole !== 'admin') {
      Toast.error('Publishers can only message admins.');
      return;
    }
  } else if (senderRole === 'moderator') {
    if (['superuser', 'publisher'].includes(targetRole)) {
      Toast.error('Moderators cannot message superusers or publishers.');
      return;
    }
  }

  DB.notifications.push({
    id: Date.now(),
    toRole: null,
    toUser: target.user_id,
    from: session.username,
    avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
    fromRole: session.role,
    fromUserId: session.userId,
    msg: msg,
    time: 'just now',
    read: false,
    replies: []
  });
  DB.save();
  toInput.value = '';
  msgInput.value = '';
  Toast.success('Message sent to ' + target.user_name + '! 📨');
};

function closeDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const panel = document.getElementById('drawer-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.body.classList.remove('drawer-open');
}

function toggleDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const panel = document.getElementById('drawer-panel');
  if (!overlay || !panel) return;
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    closeDrawer();
  } else {
    overlay.classList.add('open');
    panel.classList.add('open');
    document.body.classList.add('drawer-open');
  }
}

function copyInviteLink() {
  const input = document.getElementById('invite-url-input');
  if (!input) return;
  input.select();
  input.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(input.value);
    Toast.success('Invite link copied to clipboard! 📋');
  } catch {
    document.execCommand('copy');
    Toast.success('Invite link copied! 📋');
  }
}

function shareProgress() {
  const el = document.getElementById('progress-screenshot');
  if (!el) { Toast.info('Progress card generated! Take a screenshot to share.'); return; }
  // Highlight the card visually
  el.style.boxShadow = '0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(0,212,255,0.2)';
  el.style.transform = 'scale(1.02)';
  el.style.transition = 'all 0.3s ease';
  Toast.success('Your progress card is highlighted! Use your device screenshot tool to capture and share. 📸');
  setTimeout(() => {
    el.style.boxShadow = '';
    el.style.transform = '';
  }, 3000);
}

window.sendPublisherMessage = function () {
  const session = Auth.getSession();
  if (!session || session.role !== 'publisher') return;

  const msgInput = document.getElementById('pub-msg');
  const subjectSel = document.getElementById('pub-subject');
  const sendBtn = document.getElementById('pub-send-btn');
  const statusEl = document.getElementById('pub-send-status');
  const charCount = document.getElementById('pub-char-count');

  if (!msgInput) return;

  const msg = msgInput.value.trim();
  const subject = subjectSel ? subjectSel.value : 'General Inquiry';

  // ── Validation ──
  if (!msg) {
    if (statusEl) { statusEl.style.color = 'var(--accent-red)'; statusEl.textContent = '⚠ Please write a message before sending.'; }
    msgInput.style.borderColor = 'var(--accent-red)';
    setTimeout(() => { msgInput.style.borderColor = ''; if (statusEl) statusEl.textContent = ''; }, 3000);
    return;
  }

  // ── Find an admin ──
  const admins = (DB.users || []).filter(u => {
    const role = u.role || (DB.roles.find(r => r.role_id === u.role_id) || {}).role_name;
    return role === 'admin';
  });

  if (!admins.length) {
    if (statusEl) { statusEl.style.color = 'var(--accent-red)'; statusEl.textContent = '⚠ No admins available right now. Try again later.'; }
    return;
  }

  const target = admins[Math.floor(Math.random() * admins.length)];
  const targetId = target.user_id != null ? target.user_id : target.id;

  // ── Animate button to sending state ──
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Sending...';
    sendBtn.style.opacity = '0.7';
  }

  // ── Dispatch notification ──
  DB.notifications.push({
    id: Date.now(),
    type: 'publisher_support',
    subject: subject,
    toRole: null,
    toUser: targetId,
    from: session.username,
    avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
    fromRole: 'publisher',
    fromUserId: session.userId,
    msg: `[${subject}] ${msg}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false,
    replies: []
  });

  DB.save();

  // ── Reset form fields ──
  msgInput.value = '';
  if (subjectSel) subjectSel.selectedIndex = 0;
  if (charCount) charCount.textContent = '500 chars left';

  // ── Success animation ──
  setTimeout(() => {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = '✅ Message Sent!';
      sendBtn.style.opacity = '1';
      sendBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    }
    if (statusEl) {
      statusEl.style.color = 'var(--accent-green)';
      const adminName = target.username || target.user_name || 'an Admin';
      statusEl.textContent = `Delivered to ${adminName} · They will reply in your Notifications.`;
    }
    // Refresh conversation history
    if (window._drawerNotifRender) window._drawerNotifRender();

    // Reset button back after 3s
    setTimeout(() => {
      if (sendBtn) {
        sendBtn.textContent = '📤 Send to Admin Support';
        sendBtn.style.background = 'linear-gradient(135deg,var(--accent-purple),var(--accent-cyan))';
      }
      if (statusEl) statusEl.textContent = '';
    }, 3000);
  }, 600);
};
