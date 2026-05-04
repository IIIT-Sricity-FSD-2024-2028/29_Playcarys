// ============================================================
// ── Real-Time WebSockets Integration (Phase 4) ────────────────────────────────
function initPlayCarysWebSockets() {
  const script = document.createElement('script');
  script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
  script.onload = () => {
    try {
      window.playcarysSocket = io("http://localhost:3000", { transports: ["websocket"] });

      window.playcarysSocket.on("connect", () => {
        console.log("[PlayCarys IO] Connected to Real-Time Server", window.playcarysSocket.id);
      });

      window.playcarysSocket.on("session_updated", (data) => {
        console.log("[PlayCarys IO] Match Event Received:", data);
        // Refresh local UI if relevant
        if (typeof renderRooms === 'function') renderRooms();
        if (typeof updateStatus === 'function') updateStatus();
      });

      // Override the standard DB.save or add a hook if desired here
      // For now, attaching it to window so game-lobbies can emit events:
      // window.playcarysSocket.emit('join_room', { roomId: currentSession.id });
    } catch (e) {
      console.warn("[PlayCarys IO] Could not connect to WebSockets. Falling back to local state.", e);
    }
  };
  document.head.appendChild(script);
}

// Boot Sockets
setTimeout(initPlayCarysWebSockets, 500);

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

function showPageLoader() {
  const bar = document.createElement('div');
  bar.id = 'page-loader';
  bar.style.cssText = `
    position:fixed; top:0; left:0; height:2px; width:0%;
    background: linear-gradient(90deg, #00d4ff, #7c3aed);
    z-index:9999; transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
    box-shadow: 0 0 8px rgba(0,212,255,0.6);
  `;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.style.width = '80%');
}

window.navigate = function(page, delay = 80) {
  if (window._navigating) return;
  window._navigating = true;

  // Immediately trigger the visual feedback
  showPageLoader();
  document.body.classList.add('page-leaving');

  // Defer the heavy DB save until AFTER the browser paints the animation.
  // requestAnimationFrame + setTimeout(0) guarantees the first frame renders.
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (typeof DB !== 'undefined' && typeof DB.saveLocal === 'function') {
        try { DB.saveLocal(); } catch(e) {}
      }
    }, 0);
  });
  
  // Navigate after fade completes
  setTimeout(() => {
    window.location.href = page + '.html';
  }, delay);
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
    candy_crush: 'images/candy_crush.png'
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
    candy_crush: '🍬'
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

  login(user) {
    const session = {
      userId: user.user_id || user.id,
      role: user.role,
      username: user.user_name || user.username,
      avatar: user.avatar
    };
    const raw = JSON.stringify(session);
    sessionStorage.setItem(this.SESSION_KEY, raw);
    localStorage.setItem(this.SESSION_KEY, raw);  // persist across dev-server reloads
  },

  logout() {
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

const Economy = {
  getTierFromElo(elo) {
    if (elo >= 4000) return { name: "Vanguard", color: "#ef4444", bg: "linear-gradient(135deg, #ef4444, #991b1b)" };
    if (elo >= 3500) return { name: "Grandmaster", color: "#f87171", bg: "linear-gradient(135deg, #f87171, #ef4444)" };
    if (elo >= 3000) return { name: "Master", color: "#facc15", bg: "linear-gradient(135deg, #fef08a, #ca8a04)" };
    if (elo >= 2600) return { name: "Diamond", color: "#22d3ee", bg: "linear-gradient(135deg, #67e8f9, #0891b2)" };
    if (elo >= 2200) return { name: "Platinum", color: "#a78bfa", bg: "linear-gradient(135deg, #c4b5fd, #7c3aed)" };
    if (elo >= 1800) return { name: "Gold", color: "#fbbf24", bg: "linear-gradient(135deg, #fde047, #b45309)" };
    if (elo >= 1500) return { name: "Silver", color: "#cbd5e1", bg: "linear-gradient(135deg, #f1f5f9, #64748b)" };
    return { name: "Bronze", color: "#d97706", bg: "linear-gradient(135deg, #fcd34d, #78350f)" };
  },

  awardPostMatchProgression(userId, resultType, gameId) {
    const u = DB.users.find(x => String(x.id || x.user_id) === String(userId));
    const p = DB.player_profiles.find(x => String(x.user_id) === String(userId));
    if (!u) return { xpGain: 0, eloDelta: 0, pcpGain: 0, leveledUp: false };

    if (typeof u.xp === 'undefined') u.xp = 0;
    if (typeof u.level === 'undefined') u.level = 1;
    if (typeof u.elo === 'undefined') u.elo = 1200;

    let xpGain = resultType === 'win' ? 150 : resultType === 'draw' ? 75 : 25;
    let eloDelta = resultType === 'win' ? 25 : resultType === 'draw' ? 5 : -25;
    let pcpGain = this.calculatePCP(gameId, { winner: resultType === 'win' ? 'me' : resultType === 'draw' ? 'draw' : 'opp', myColor: 'me' });

    if (resultType === 'win') u.wins = (u.wins || 0) + 1;
    else if (resultType === 'loss') u.losses = (u.losses || 0) + 1;

    u.matches = (u.matches || 0) + 1;
    u.xp += xpGain;
    u.elo = Math.max(0, u.elo + eloDelta);
    if (p) p.carys_points = (p.carys_points || 0) + pcpGain;

    let leveledUp = false;
    const nextReq = Math.floor(1000 * Math.pow(u.level, 1.5));
    if (u.xp >= nextReq) {
      u.level++;
      leveledUp = true;
      if (p) p.carys_points += 100 * u.level;
    }

    // ── Publisher Royalty Engine ──────────────────────────────────
    // Every completed session earns the game's publisher a flat royalty.
    const royaltyPerSession = 15; // Base PCP per session play
    try {
      const game = DB.games.find(g => String(g.game_id || g.id) === String(gameId));
      if (game) {
        const pubId = game.game_publisher || game.publisherId;
        const pubProf = DB.publisher_profiles.find(pp => String(pp.user_id) === String(pubId));
        if (pubProf) {
          pubProf.revenue_pcp = (pubProf.revenue_pcp || 0) + royaltyPerSession;
          // Also increment game sessions counter
          game.sessions = (game.sessions || 0) + 1;
        }
      }
    } catch (e) { /* Silent fail — royalty is non-critical */ }

    DB.save();
    return { xpGain, eloDelta, pcpGain, leveledUp, level: u.level, elo: u.elo };
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
function buildNavbar(role, currentPage) {
  const session = Auth.getSession();
  if (!session) return;

  const navLinks = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'hub', label: 'Control Hub', icon: '⚡', page: 'hub' },
      { id: 'users', label: 'Users', icon: '👥', page: 'users' },
      { id: 'approvals', label: 'Approvals', icon: '✅', page: 'approvals' },
      { id: 'settings', label: 'Settings', icon: '⚙️', page: 'settings' }
    ],
    superuser: [
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
      { id: 'profile', label: 'Profile', icon: '👤', page: 'profile' }
    ],
    player: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'games', label: 'Games', icon: '🎮', page: 'games' },
      { id: 'tournaments', label: 'Tournaments', icon: '🏆', page: 'tournaments' },
      { id: 'profile', label: 'Profile', icon: '👤', page: 'profile' }
    ],
    guest: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', page: 'dashboard' },
      { id: 'games', label: 'Games', icon: '🎮', page: 'games' }
    ]
  };

  const roleBadgeMap = { superuser: 'SUPERUSER', admin: 'ADMIN', moderator: 'MODERATOR', publisher: 'PUBLISHER', player: 'PLAYER', guest: 'GUEST' };
  const links = navLinks[role] || [];
  const linksHTML = links.map(l =>
    `<div class="nav-link ${currentPage === l.page ? 'active' : ''}" data-page="${l.page}" onclick="navigate('${l.page}')">${l.icon} ${l.label}</div>`
  ).join('');

  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  navbar.setAttribute('data-role', role);
  const uid = parseInt(session.userId, 10);

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
      const isForMe = (n.toUser === uid) || (n.toRole === role && n.toUser == null);
      const isModAction = ['moderator', 'admin', 'superuser', 'system'].includes(n.fromRole);
      const isActionable = n.type === 'friend_request' || n.type === 'invite';
      if (!isForMe || !isModAction || isActionable || n.read) return;

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

      // ALWAYS mark as read — even if backend races and returns stale unread data
      n.read = true;
      dbChanged = true;
    });

    if (dbChanged) DB.save();
  }


  // ── Step 2: Compute unread count AFTER auto-read — badge will be correct ─────────────
  const roleNotifs = (DB.notifications || []).filter(n => n.toRole === role || n.toUser === uid);
  const unreadCount = roleNotifs.filter(n => !n.read).length;
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
      <div class="nav-avatar">${session.avatar || session.username.slice(0, 2).toUpperCase()}</div>
      <span class="nav-logout" onclick="Auth.logout()" title="Logout">⬅️</span>
    </div>
  `;

  // ── Step 3: Inject drawer AFTER notifications are already marked read ─────────────────
  injectSideDrawer(session);
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
  if (!el) return;
  el.querySelector('#confirm-title').textContent = title;
  el.querySelector('#confirm-msg').textContent = msg;
  const btn = el.querySelector('#confirm-btn');
  btn.className = `btn btn-${type === 'danger' ? 'red' : 'green'}`;
  btn.textContent = type === 'danger' ? 'Confirm' : 'Proceed';
  btn.onclick = () => { Modal.close('confirm-modal'); onConfirm(); };
  Modal.open('confirm-modal');
}

// ---- Shared Confirm Modal HTML -----------------------------------------------
function insertConfirmModal() {
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

  const st = user.status;
  document.getElementById('upm-status').style.background = (st === 'active' || st === 'Online' || st === 'In Game') ? 'var(--accent-green)' : 'var(--text-muted)';

  document.getElementById('upm-name').textContent = user.username || user.user_name;

  const rawRole = user.role || (DB.roles.find(r => r.role_id === user.role_id) || {}).role_name || 'PLAYER';
  const elo = user.elo || 1200;
  const tierInfo = (typeof Economy !== 'undefined' && Economy.getTierFromElo) ? Economy.getTierFromElo(elo) : { name: "Bronze", color: "#d97706", bg: "var(--accent-purple)" };

  const av = document.getElementById('upm-avatar');
  av.style.background = tierInfo.bg;
  av.style.boxShadow = `0 0 0 3px ${tierInfo.color}44, 0 0 15px ${tierInfo.color}33`;

  document.getElementById('upm-role').innerHTML = `${rawRole.toUpperCase()} &bull; <span style="color:${tierInfo.color}">${tierInfo.name} ${elo}</span>`;

  document.getElementById('upm-bio').textContent = prof?.bio || "A mysterious contender in the PlayCarys arena.";

  const pcp = prof?.carys_points || 0;
  document.getElementById('upm-pcp').textContent = pcp.toLocaleString();

  const matches = user.matches || 0;
  const wins = user.wins || 0;
  const wr = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  document.getElementById('upm-matches').textContent = matches;
  document.getElementById('upm-wins').textContent = wins;
  document.getElementById('upm-wr').textContent = wr + '%';

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
  const uid = parseInt(session.userId, 10);
  const count = (DB.notifications || []).filter(n => (n.toRole === session.role || n.toUser === uid) && !n.read).length;
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

window.toggleAddFriendUI = function () {
  const el = document.getElementById('add-friend-ui');
  if (!el) return;
  if (el.style.maxHeight === '0px' || !el.style.maxHeight) {
    el.style.maxHeight = '100px';
    setTimeout(() => {
      const input = document.getElementById('add-friend-input');
      if (input) input.focus();
    }, 200);
  } else {
    el.style.maxHeight = '0px';
  }
};

window.submitAddFriend = function () {
  const input = document.getElementById('add-friend-input');
  if (!input) return;
  const username = input.value.trim();
  if (!username) return;

  const session = Auth.getSession();
  const u = DB.users.find(x => String(x.id || x.user_id) === String(session.userId));
  const target = DB.users.find(x => (x.username || x.user_name || '').toLowerCase() === username.toLowerCase());

  if (!target) { Toast.error("Player not found in Database!"); return; }
  if (String(target.id || target.user_id) === String(u.id || u.user_id)) { Toast.error("You cannot add yourself."); return; }

  const tRole = target.role || (DB.roles.find(r => r.role_id === target.role_id) || {}).role_name;
  if (tRole !== 'player') { Toast.error("You can only add players as friends."); return; }

  if (!u.friends) u.friends = [];
  const tName = target.username || target.user_name;
  if (u.friends.find(f => f.name.toLowerCase() === tName.toLowerCase())) { Toast.info("Already in friends list."); return; }

  const pending = DB.notifications.find(n => n.type === 'friend_request' && String(n.toUser) === String(target.id || target.user_id) && String(n.fromUserId) === String(session.userId));
  if (pending) {
    Toast.info("Friend request already sent!");
    return;
  }

  DB.notifications.push({
    id: Date.now(),
    type: 'friend_request',
    toRole: null,
    toUser: target.user_id || target.id,
    from: session.username,
    avatar: session.avatar || session.username.substring(0, 2).toUpperCase(),
    fromRole: session.role,
    fromUserId: parseInt(session.userId, 10),
    msg: `<b>${session.username}</b> wants to add you as a friend.`,
    time: 'just now',
    read: false,
    replies: []
  });

  DB.save();
  Toast.success(`Friend request sent to ${tName}!`);

  // Refresh drawer by rebuilding while keeping it open
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

window.toggleFriendChat = function (friendName) {
  const el = document.getElementById(`friend-chat-${friendName}`);
  if (!el) return;
  if (el.style.maxHeight === '0px' || !el.style.maxHeight) {
    el.style.maxHeight = '100px';
    setTimeout(() => {
      const input = document.getElementById(`friend-chat-input-${friendName}`);
      if (input) input.focus();
    }, 200);
  } else {
    el.style.maxHeight = '0px';
  }
};

window.sendInlineMsg = function (friendName) {
  const input = document.getElementById(`friend-chat-input-${friendName}`);
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  const session = Auth.getSession();
  const target = DB.users.find(u => u.user_name.toLowerCase() === friendName.toLowerCase());
  if (!target) { Toast.error('User not found.'); return; }

  DB.notifications.push({
    id: Date.now(),
    toRole: null,
    toUser: target.user_id,
    from: session.username,
    avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
    fromRole: session.role,
    fromUserId: parseInt(session.userId, 10),
    msg: msg,
    time: 'just now',
    read: false,
    replies: []
  });
  DB.save();
  input.value = '';
  toggleFriendChat(friendName); // collapse after sending
  Toast.success('Message sent to ' + target.user_name + '! 📨');
};

window.dispatchRoleNotification = function (targetRole, fromSessionRole, fromSessionName, msg) {
  const users = DB.users.filter(u => u.role === targetRole);
  users.forEach((u, i) => {
    DB.notifications.push({
      id: Date.now() + i + Math.floor(Math.random() * 1000),
      type: 'system',
      toRole: targetRole,
      toUser: u.user_id || u.id,
      from: fromSessionName,
      avatar: '⚙️',
      fromRole: fromSessionRole,
      fromUserId: null,
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

  // ── Dedup guard: skip if an identical unread notification already exists for this user ──
  const alreadyExists = (DB.notifications || []).some(n =>
    !n.read && n.toUser === uid && n.msg === msg
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
    fromUserId: null,
    msg: msg,
    time: 'just now',
    read: false,
    replies: []
  });
  DB.save();
};

window.acceptFriendReq = function (notifId) {
  const notif = DB.notifications.find(n => n.id === notifId);
  if (!notif) return;
  const session = Auth.getSession();
  const me = DB.users.find(u => String(u.id || u.user_id) === String(session.userId));
  const requester = DB.users.find(u => String(u.id || u.user_id) === String(notif.fromUserId));

  if (me && requester) {
    if (!me.friends) me.friends = [];
    if (!requester.friends) requester.friends = [];

    const meName = me.username || me.user_name;
    const reqName = requester.username || requester.user_name;

    if (!me.friends.find(f => f.name === reqName)) {
      me.friends.push({
        name: reqName, avatar: requester.avatar || reqName.substring(0, 2).toUpperCase(),
        status: requester.status === 'active' ? 'Online' : 'Offline',
        statusColor: requester.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)'
      });
    }
    if (!requester.friends.find(f => f.name === meName)) {
      requester.friends.push({
        name: meName, avatar: me.avatar || meName.substring(0, 2).toUpperCase(),
        status: me.status === 'active' ? 'Online' : 'Offline',
        statusColor: me.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)'
      });
    }
  }

  notif.read = true;
  notif.msg = `<i>Friend request from ${notif.from} accepted.</i>`;
  notif.type = 'system'; // hide buttons
  DB.save();
  Toast.success("Friend request accepted!");
  if (typeof updateNavBadge !== 'undefined') updateNavBadge();

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
  const notif = DB.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    notif.msg = `<i>Friend request from ${notif.from} rejected.</i>`;
    notif.type = 'system';
    DB.save();
  }
  Toast.info("Friend request rejected.");
  if (typeof updateNavBadge !== 'undefined') updateNavBadge();

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

window.acceptInviteReq = function (notifId) {
  const notif = DB.notifications.find(n => n.id === notifId);
  if (!notif || !notif.sessionId) return;
  const session = Auth.getSession();
  const uid = String(session.userId);

  // Verify session exists
  const sid = String(notif.sessionId);
  const targetSession = DB.sessions.find(s => String(s.id) === sid || String(s.session_id) === sid);

  if (!targetSession) {
    Toast.error('This room no longer exists!');
    notif.read = true;
    DB.save();
    if (window._drawerNotifRender) window._drawerNotifRender();
    return;
  }

  if (targetSession.status === 'in-progress') {
    Toast.error('Game already started! You cannot join.');
    notif.read = true;
    DB.save();
    if (window._drawerNotifRender) window._drawerNotifRender();
    return;
  }

  if (!targetSession.players.includes(uid)) {
    if (targetSession.players.length >= targetSession.maxPlayers) {
      Toast.error('This room is full!');
      return;
    }
    DB.player_session.push({ player_id: uid, session_id: targetSession.session_id });
  }

  notif.read = true;
  DB.save();
  window.location.href = `join-session.html?gameId=${targetSession.game_id || targetSession.gameId}&sid=${sid}`;
};

window.rejectInviteReq = function (notifId) {
  const notif = DB.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    notif.msg = `<i>Invite declined.</i>`;
    notif.type = 'system';
    DB.save();
  }
  Toast.info("Room invite declined.");
  if (typeof updateNavBadge !== 'undefined') updateNavBadge();
  if (window._drawerNotifRender) window._drawerNotifRender();
};


window.removeFriend = function (friendName) {
  confirmAction('Remove Friend', `Are you sure you want to remove ${friendName} from your friends?`, () => {
    const session = Auth.getSession();
    const u = DB.users.find(x => String(x.user_id || x.id) === String(session.userId));
    if (u && u.friends) {
      u.friends = u.friends.filter(f => f.name !== friendName);
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
  const u = DB.users.find(x => String(x.user_id || x.id) === String(session.userId));

  // ── Friends (player only) ────────────────────────────────────────
  let friendsList = u && u.friends ? u.friends : [];
  // For demo users originally seeded without the 'friends' array, mock them:
  if (['DragonSlayer', 'NightHawk', 'ShadowMaster'].includes(session.username) && friendsList.length === 0 && !u.friends) {
    friendsList = [
      { name: 'NightHawk', avatar: 'NH', status: 'Online', statusColor: 'var(--accent-green)' },
      { name: 'PhoenixRise', avatar: 'PR', status: 'Online', statusColor: 'var(--accent-green)' },
      { name: 'ShadowMaster', avatar: 'SM', status: 'Offline', statusColor: 'var(--text-muted)' }
    ];
    if (u) u.friends = friendsList; // save back so we don't mock it next time
  }

  // Normalize all statuses so any old 'In Game' statuses become 'Online'
  friendsList = friendsList.map(f => {
    let stat = f.status === 'Offline' ? 'Offline' : 'Online';
    let color = stat === 'Online' ? 'var(--accent-green)' : 'var(--text-muted)';
    return { ...f, status: stat, statusColor: color };
  });

  const friendsHTML = friendsList.length ? friendsList.map(f => `
    <div class="drawer-friend-item" style="padding-bottom:0.4rem;padding-top:0.4rem;border-bottom:1px solid var(--border-primary);flex-wrap:wrap">
      <div class="drawer-friend-avatar">${f.avatar}</div>
      <div class="drawer-friend-info">
        <div class="drawer-friend-name" style="cursor:pointer" onclick="showUserProfile('${f.name}', event)">${f.name}</div>
        <div class="drawer-friend-status" style="color:${f.statusColor}">● ${f.status}</div>
      </div>
      <div style="display:flex;gap:0.3rem">
        <button class="btn btn-primary btn-sm" onclick="toggleFriendChat('${f.name}')" style="font-size:.65rem;padding:.2rem .4rem" title="Chat">Chat</button>
        <button class="btn btn-ghost btn-sm" onclick="removeFriend('${f.name}')" style="font-size:.65rem;padding:.2rem .4rem;color:var(--accent-red);background:rgba(239,68,68,0.1)" title="Remove Friend">✕</button>
      </div>
      <div id="friend-chat-${f.name}" style="flex-basis:100%;max-height:0;overflow:hidden;transition:max-height 0.3s ease;margin-top:0">
        <div style="display:flex;gap:0.4rem;padding-top:0.5rem;border-top:1px dashed var(--border-primary);margin-top:0.5rem">
          <input type="text" id="friend-chat-input-${f.name}" class="form-input" placeholder="Type a message..." style="flex:1;font-size:0.75rem;padding:0.2rem 0.45rem;height:26px" onkeydown="if(event.key==='Enter')sendInlineMsg('${f.name}')"/>
          <button class="btn btn-primary btn-sm" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px;min-height:26px" onclick="sendInlineMsg('${f.name}')">Send</button>
        </div>
      </div>
    </div>
  `).join('') : `
    <div style="text-align:center;padding:1rem;border:1px dashed var(--border-primary);border-radius:var(--radius-md)">
      <div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:0.75rem">You don't have any friends yet</div>
      <button class="btn btn-primary btn-sm" onclick="toggleAddFriendUI()">+ Search & Add Player</button>
    </div>
  `;

  // ── Notifications: show role broadcasts + direct DMs to this user ────
  const userId = parseInt(session.userId, 10);
  const roleNotifs = (DB.notifications || []).filter(n =>
    (n.toRole === session.role) || (n.toUser === userId)
  );

  function renderNotifList() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const visible = roleNotifs.filter(n => !n.read);
    if (!visible.length) {
      list.innerHTML = `<div style="text-align:center;padding:1rem 0;color:var(--text-secondary);font-size:0.82rem">💭 All caught up!</div>`;
      return;
    }
    list.innerHTML = visible.map(n => {
      const isDM = n.toUser != null;
      const isMod = n.fromRole === 'moderator';

      let canReply = true;
      if (session.role === 'player' && n.fromRole !== 'player') canReply = false;
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
          ` : n.type === 'invite' ? `
            <button class="btn btn-primary btn-sm" onclick="acceptInviteReq(${n.id})" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px;background:var(--accent-purple)">⚔ Join Room</button>
            <button class="btn btn-ghost btn-sm" onclick="rejectInviteReq(${n.id})" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px;color:var(--text-muted)">Decline</button>
          ` : canReply ? `
            <input type="text" id="reply-${n.id}" class="form-input" placeholder="Reply..." style="flex:1;font-size:0.75rem;padding:0.2rem 0.45rem;height:26px" onkeydown="if(event.key==='Enter')sendNotifReply(${n.id})"/>
            <button class="btn btn-primary btn-sm" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px" onclick="sendNotifReply(${n.id})">Send</button>
          ` : `
            <div style="color:var(--text-muted);font-size:0.75rem;font-style:italic">🔒 Read-only. You cannot reply to ${n.fromRole}s.</div>
          `}
          <button id="read-btn-${n.id}" class="btn btn-ghost btn-sm" style="font-size:0.68rem;padding:0.15rem 0.4rem;height:26px;transition:opacity 0.2s" onclick="markNotifRead(${n.id})" title="Mark read">✓ Read</button>
        </div>
      </div>`;
    }).join('');
  }

  // ── Drawer HTML ──────────────────────────────────────────────────
  const unread = roleNotifs.filter(n => !n.read).length;

  // Restrict full compose box: Guest cannot compose, Players now use the friend list 'Chat' instead.
  const canCompose = session.role !== 'guest' && session.role !== 'player' && session.role !== 'publisher';

  let composeNote = "";
  if (session.role === 'moderator') composeNote = "You can message admins, moderators, and players.";
  else if (['admin', 'superuser'].includes(session.role)) composeNote = "You can message anyone.";

  function renderPubConversations() {
    if (session.role !== 'publisher') return;
    const list = document.getElementById('pub-conversations-list');
    if (!list) return;
    const uid = parseInt(session.userId, 10);
    const convos = (DB.notifications || []).filter(n =>
      (n.fromUserId === uid && n.toUser) ||
      (n.toUser === uid && n.fromRole === 'admin')
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
      const isSent = c.fromUserId === uid;
      let targetName = 'Admin';
      let contactEmail = '';
      if (isSent) {
        const targetUser = DB.users.find(u => (u.user_id || u.id) === c.toUser);
        if (targetUser) {
          targetName = targetUser.username || targetUser.user_name || 'Admin';
          contactEmail = targetUser.email || '';
        }
      } else {
        targetName = c.from || 'Admin';
        const fromUser = DB.users.find(u => (u.user_id || u.id) === c.fromUserId);
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

        ${isPlayer ? `
        <!-- Friends Section -->
        <div class="drawer-section">
          <!-- Header strip -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(0,212,255,0.03)">
            <div class="drawer-section-title">👥 Friends <span style="background:rgba(0,212,255,0.15);color:var(--accent-cyan);border-radius:99px;padding:0.05rem 0.4rem;font-size:0.62rem;font-family:monospace">${friendsList.length}</span></div>
            <button class="btn btn-ghost btn-sm" style="font-size:0.62rem;padding:0.1rem 0.35rem;height:22px" onclick="toggleAddFriendUI()">+ Add</button>
          </div>
          <!-- Add friend collapse -->
          <div id="add-friend-ui" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease">
            <div style="display:flex;gap:0.4rem;padding:0.5rem 1rem;background:rgba(0,212,255,0.04);border-bottom:1px solid rgba(255,255,255,0.05)">
              <input type="text" id="add-friend-input" class="form-input" placeholder="Exact username..." style="flex:1;font-size:0.75rem;padding:0.2rem 0.45rem;height:26px" onkeydown="if(event.key==='Enter')submitAddFriend()"/>
              <button class="btn btn-primary btn-sm" style="font-size:0.68rem;padding:0.15rem 0.45rem;height:26px" onclick="submitAddFriend()">Add</button>
            </div>
          </div>
          <!-- Friends list -->
          <div style="padding:0.4rem 1rem 0.75rem">${friendsHTML}</div>
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

        ${canCompose ? `
        <!-- Send Direct Message -->
        <div class="drawer-section">
          <!-- Header strip -->
          <div style="padding:0.7rem 1rem 0.6rem;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(124,58,237,0.04)">
            <div class="drawer-section-title">📩 Send Message</div>
          </div>
          <div style="padding:0.75rem 1rem;display:flex;flex-direction:column;gap:0.4rem">
            <input id="dm-to" class="form-input" placeholder="Username (exact)" style="font-size:0.78rem;height:30px;padding:0.2rem 0.5rem"/>
            <textarea id="dm-msg" class="form-input" rows="2" placeholder="Your message..." style="font-size:0.78rem;padding:0.35rem 0.5rem;resize:none"></textarea>
            <button class="btn btn-primary" style="font-size:0.78rem;font-weight:700;width:100%" onclick="sendDirectMessage()">📤 Send Message</button>
            <div style="font-size:0.67rem;color:var(--text-muted);font-style:italic;margin-top:0.1rem">ℹ️ ${composeNote}</div>
          </div>
        </div>` : ''}

        ${session.role === 'publisher' ? `
        <!-- Publisher Support Hub -->
        <div class="drawer-section" style="padding:0;overflow:hidden;border-radius:var(--radius-lg);border:1px solid rgba(124,58,237,0.25);background:linear-gradient(160deg,rgba(124,58,237,0.05) 0%,rgba(0,212,255,0.03) 100%)">

          <!-- Publisher Identity Card -->
          <div style="padding:0.9rem 1rem 0.75rem;border-bottom:1px solid rgba(124,58,237,0.15);background:rgba(124,58,237,0.06)">
            <div style="display:flex;align-items:center;gap:0.6rem">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:900;color:#000;flex-shrink:0;box-shadow:0 0 10px rgba(0,212,255,0.3)">${session.avatar || session.username.slice(0, 2).toUpperCase()}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.78rem;font-weight:800;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${session.username}</div>
                <div style="font-size:0.62rem;color:var(--accent-purple);font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Publisher Studio</div>
              </div>
              <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:99px;padding:0.15rem 0.5rem;font-size:0.6rem;font-weight:800;color:var(--accent-green);white-space:nowrap">● Active</div>
            </div>
          </div>

          <!-- Compose Panel -->
          <div style="padding:0.85rem 1rem" id="pub-compose-panel">
            <div style="font-size:0.7rem;font-weight:800;color:var(--accent-cyan);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem">📨 New Message to Admin</div>

            <!-- Subject/Category -->
            <div style="margin-bottom:0.45rem">
              <select id="pub-subject" class="form-input" style="font-size:0.75rem;height:30px;padding:0.1rem 0.45rem;width:100%;background:rgba(0,0,0,0.3);border-color:rgba(124,58,237,0.3);color:var(--text-primary)">
                <option value="General Inquiry">💬 General Inquiry</option>
                <option value="Game Approval">✅ Game Approval Issue</option>
                <option value="Revenue & Payments">💰 Revenue & Payments</option>
                <option value="Technical Support">🔧 Technical Support</option>
                <option value="Policy Question">📋 Policy Question</option>
                <option value="Urgent">🚨 Urgent / Escalation</option>
              </select>
            </div>

            <!-- Message Body -->
            <div style="position:relative;margin-bottom:0.45rem">
              <textarea id="pub-msg" class="form-input" rows="3" maxlength="500" placeholder="Describe your issue or question clearly..." style="font-size:0.78rem;padding:0.45rem 0.6rem;resize:none;width:100%;line-height:1.5;border-color:rgba(124,58,237,0.25)" oninput="document.getElementById('pub-char-count').textContent=(500-this.value.length)+' chars left'"></textarea>
              <div id="pub-char-count" style="position:absolute;bottom:0.35rem;right:0.5rem;font-size:0.6rem;color:var(--text-muted)">500 chars left</div>
            </div>

            <!-- Send Button -->
            <button type="button" id="pub-send-btn" class="btn btn-primary" style="width:100%;font-size:0.8rem;font-weight:700;padding:0.5rem;background:linear-gradient(135deg,var(--accent-purple),var(--accent-cyan));border:none;transition:all 0.2s;letter-spacing:0.03em" onclick="sendPublisherMessage()">
              📤 Send to Admin Support
            </button>

            <!-- Status line -->
            <div id="pub-send-status" style="text-align:center;font-size:0.68rem;color:var(--text-secondary);margin-top:0.4rem;min-height:1rem"></div>
          </div>

          <!-- Divider -->
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,0.3),transparent);margin:0 1rem"></div>

          <!-- Conversation History -->
          <div style="padding:0.85rem 1rem">
            <div style="font-size:0.7rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.65rem;display:flex;align-items:center;justify-content:space-between">
              <span>💬 Conversation History</span>
              <span id="pub-convo-count" style="background:rgba(0,0,0,0.3);border-radius:99px;padding:0.1rem 0.4rem;font-size:0.6rem"></span>
            </div>
            <div id="pub-conversations-list" style="max-height:280px;overflow-y:auto;padding-right:0.2rem"></div>
          </div>
        </div>
        ` : ''}

      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = drawerHTML;
  while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);

  // render initial list after DOM is injected
  renderNotifList();
  if (session.role === 'publisher') renderPubConversations();

  // expose helpers globally
  window._drawerNotifRender = () => {
    renderNotifList();
    if (session.role === 'publisher') {
      renderPubConversations();
      // Update conversation count badge
      const uid = parseInt(session.userId, 10);
      const count = (DB.notifications || []).filter(n =>
        (n.fromUserId === uid && n.toUser) ||
        (n.toUser === uid && n.fromRole === 'admin')
      ).length;
      const badge = document.getElementById('pub-convo-count');
      if (badge) badge.textContent = count > 0 ? count + ' messages' : '';
    }
  };
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

  const text = input.value.trim();
  notif.replies.push(session.username + ': ' + text);
  notif.read = true;

  // Create a reply notification back to the original sender (if we know who they are)
  if (notif.fromUserId != null && notif.fromUserId !== parseInt(session.userId, 10)) {
    DB.notifications.push({
      id: Date.now(),
      toRole: null,
      toUser: notif.fromUserId,
      from: session.username,
      avatar: session.avatar || session.username.slice(0, 2).toUpperCase(),
      fromRole: session.role,
      fromUserId: parseInt(session.userId, 10),
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
  if (notif) { notif.read = true; }
  DB.save();
  updateNavBadge();
  _smoothRemoveNotif(notifId);   // disappears smoothly — no full re-render
};

window.markAllNotifRead = function () {
  const session = Auth.getSession();
  if (!session) return;
  const uid = parseInt(session.userId, 10);
  (DB.notifications || []).filter(n => n.toRole === session.role || n.toUser === uid).forEach(n => n.read = true);
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
  if (target.user_id === parseInt(session.userId, 10)) { Toast.error('You cannot message yourself.'); return; }

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
    fromUserId: parseInt(session.userId, 10),
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
  }
}

function closeDrawer() {
  const overlay = document.getElementById('drawer-overlay');
  const panel = document.getElementById('drawer-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
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
    fromUserId: parseInt(session.userId, 10),
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
