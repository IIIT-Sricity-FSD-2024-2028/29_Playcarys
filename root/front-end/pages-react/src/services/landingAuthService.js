// Login and sign-up logic of the landing page, copied from the script in the old index.html
// and from `Auth` in js/utils.js. Nothing here touches the page: the components call these
// functions and show the answers.
import { validateField } from './adminValidation';

// ── Demo account passwords ──────────────────────────────────────────
// Only pre-fills the form (the "Use →" chips). The server still checks the password.
// These must match the seed in data/db.js.
export const DEMO_ACCOUNTS = {
  GodMode: 'godmode#2024',
  SuperAdmin: 'superadm!n24',
  SystemAdmin: 'sysadm1n#24',
  ModeratorOne: 'Mod3r@tor1!',
  ModeratorTwo: 'Mod3r@tor2!',
  EpicGamesStudio: 'Epic#Studio25',
  IndieDevStudios: 'Ind!eDev#2024',
  DragonSlayer: 'Dr@gon$lay3r',
  NightHawk: 'N!ghtH@wk99',
  PhoenixRise: 'Ph03n!xR1se',
  ShadowMaster: 'Sh@d0wM@st3r'
};

// ── What each login panel looks like ────────────────────────────────
// Admin and superuser share one "Staff Sign In" panel with two tabs, so they are handled in
// LoginPanel itself; the other roles are plain one-column panels described here.
export const PANEL_CONFIGS = {
  player: {
    role: 'player',
    icon: '🎮',
    iconBg: 'rgba(0,212,255,0.15)',
    title: 'Player Sign In',
    inputId: 'p-username',
    passId: 'p-password',
    btnLabel: '🎮 Sign In as Player',
    btnClass: 'btn-primary',
    demos: [
      { label: '🎮 DragonSlayer', user: 'DragonSlayer' },
      { label: '🎮 NightHawk', user: 'NightHawk' },
      { label: '🎮 ShadowMaster', user: 'ShadowMaster' }
    ]
  },
  publisher: {
    role: 'publisher',
    icon: '👑',
    iconBg: 'rgba(124,58,237,0.2)',
    title: 'Publisher Sign In',
    inputId: 'pub-username',
    passId: 'pub-password',
    inputLabel: 'Username or Phone',
    inputPlaceholder: 'Studio name or +123...',
    btnLabel: '👑 Sign In as Publisher',
    btnClass: 'btn-purple',
    demos: [
      { label: '👑 EpicGamesStudio', user: 'EpicGamesStudio' },
      { label: '👑 IndieDevStudios', user: 'IndieDevStudios' }
    ]
  },
  moderator: {
    role: 'moderator',
    icon: '⚠️',
    iconBg: 'rgba(245,158,11,0.15)',
    title: 'Moderator Sign In',
    inputId: 'mod-username',
    passId: 'mod-password',
    btnLabel: '⚠️ Sign In as Moderator',
    btnClass: 'btn-yellow',
    demos: [
      { label: '⚠️ ModeratorOne', user: 'ModeratorOne' },
      { label: '⚠️ ModeratorTwo', user: 'ModeratorTwo' }
    ]
  }
};

// The two tabs of the staff panel.
export const STAFF_TABS = {
  admin: {
    loginRole: 'admin',
    btnLabel: '🎮 Sign In as Admin',
    btnClass: 'btn-green',
    demos: [
      { label: '🛡️ SuperAdmin', user: 'SuperAdmin' },
      { label: '🛡️ SystemAdmin', user: 'SystemAdmin' }
    ]
  },
  superuser: {
    loginRole: 'superuser',
    btnLabel: '⚡ Sign In as Superuser',
    btnClass: 'btn-primary',
    demos: [{ label: '⚡ GodMode', user: 'GodMode' }]
  }
};

// Where each role lands after signing in. A path starting with /pages/ is an old .html page
// (moderator and superuser have no React pages yet); everything else is a React route.
export const HOME_PAGE = {
  superuser: '/pages/superuser/hub.html',
  admin: '/admin/dashboard',
  moderator: '/pages/moderator/dashboard.html',
  publisher: '/publisher/dashboard',
  player: '/player/dashboard',
  guest: '/player/dashboard'
};

export function homeFor(role) {
  return HOME_PAGE[role] || HOME_PAGE.player;
}

function newToken(prefix) {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return prefix + Date.now() + '_' + Math.random().toString(36).slice(2);
}

// ── Demo chips ──────────────────────────────────────────────────────
// The live row wins when it still carries a password (offline / not yet synced); after the
// first sync the server strips passwords, so fall back to the DEMO_ACCOUNTS list.
export function demoPassword(username) {
  const wanted = String(username).toLowerCase();
  const row = (typeof DB !== 'undefined' && Array.isArray(DB.users))
    ? DB.users.find((u) => String(u.user_name || u.username || '').toLowerCase() === wanted)
    : null;
  return (row && row.password) || DEMO_ACCOUNTS[username] || '';
}

// ── Sign in ─────────────────────────────────────────────────────────
// Looks the typed name (or, for publishers, phone number) up in the local copy of the users
// and runs the checks that need no password. Returns { user, role, username } or { error }.
export function findLoginUser(inputVal, expectedRole) {
  const cleanInput = inputVal.replace(/[\s-]/g, '').toLowerCase();

  const user = DB.users.find((u) => {
    const name = u.username || u.user_name;
    const nameMatch = name && name.toLowerCase() === inputVal.toLowerCase();
    const dbPhone = u.phone || u.phone_number;
    const phoneMatch = dbPhone && dbPhone.replace(/[\s-]/g, '').toLowerCase() === cleanInput;
    return nameMatch || (expectedRole === 'publisher' && phoneMatch);
  });

  if (!user) {
    return { error: 'Account not found.', badUsername: true };
  }
  if (user.status === 'banned') {
    return { error: 'Your account has been banned. You cannot login.' };
  }
  if (user.status === 'suspended' && user.role !== 'player') {
    return { error: 'Your staff account has been suspended. Contact a superuser.' };
  }

  const roleObj = DB.roles.find((r) => r.role_id === user.role_id);
  const role = user.role || (roleObj ? roleObj.role_name : null);

  // Each panel only accepts its own kind of account.
  if (role !== expectedRole) {
    const labels = { player: 'Player', publisher: 'Publisher', moderator: 'Moderator', admin: 'Admin', superuser: 'Superuser' };
    return { error: `This login is for ${labels[expectedRole] || expectedRole} accounts only.` };
  }

  // (The user rows have a read-only `role`, so the answers are returned, not written back.)
  return { user, role, username: user.username || user.user_name };
}

// The password is checked by the server (POST /auth/login), which also claims the
// one-account-one-session slot. Returns { status: 'ok' | 'conflict' | 'banned' | 'bad' | 'offline', data? }.
export async function serverLogin(body) {
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
  if (res.status === 409) {
    return { status: 'conflict' };
  }
  let message = '';
  try {
    const j = await res.json();
    message = String(j.message || '');
  } catch (e) {
    // no JSON body: treat as a plain wrong-password answer
  }
  if (/banned/i.test(message)) {
    return { status: 'banned' };
  }
  return { status: 'bad' };
}

// ── Another device already holds the account ────────────────────────
const lastDeniedAt = {};
const HANDOFF_COOLDOWN_MS = 15000;

function deviceLabel() {
  const ua = navigator.userAgent || '';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'a device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${os} • ${browser}` : os;
}

// Asks the other device (over the socket) to approve this sign-in.
// Answers 'approved' | 'denied' | 'timeout' | 'unreachable'.
function requestDeviceHandoff(userId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const sock = window.playcarysSocket;
    if (!sock || !sock.connected) {
      resolve('unreachable');
      return;
    }
    const requestId = newToken('req_');
    let settled = false;
    let timer;
    let ackTimer;

    function finish(status) {
      if (settled) return;
      settled = true;
      sock.off('device_login_response', onResponse);
      sock.off('device_login_ack', onAck);
      clearTimeout(timer);
      clearTimeout(ackTimer);
      resolve(status);
    }
    function onResponse(data) {
      if (data.requestId !== requestId) return;
      finish(data.approved ? 'approved' : (data.reason || 'denied'));
    }
    function onAck(data) {
      if (data.requestId !== requestId) return;
      clearTimeout(ackTimer);
    }

    sock.on('device_login_response', onResponse);
    sock.on('device_login_ack', onAck);
    ackTimer = setTimeout(() => finish('unreachable'), 2500);
    timer = setTimeout(() => finish('timeout'), timeoutMs);
    sock.emit('device_login_request', { userId: String(userId), requestId, deviceLabel: deviceLabel() });
  });
}

// askToSignInHere() is given by the page: it shows the "Sign In Here?" box and answers
// true or false. Returns { ok: true } (retry the login with force) or { ok: false, reason }.
export async function resolveSessionConflict(user, askToSignInHere) {
  const uid = String(user.user_id != null ? user.user_id : user.id);
  const now = Date.now();

  const lastDenied = lastDeniedAt[uid];
  if (lastDenied && now - lastDenied < HANDOFF_COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown', retryInSec: Math.ceil((HANDOFF_COOLDOWN_MS - (now - lastDenied)) / 1000) };
  }

  const status = await requestDeviceHandoff(uid);
  if (status === 'approved') {
    return { ok: true };
  }
  // Nobody is listening on the other device: ask this person to confirm instead.
  if (status === 'unreachable') {
    const proceed = await askToSignInHere();
    return proceed ? { ok: true } : { ok: false, reason: 'cancelled' };
  }

  lastDeniedAt[uid] = Date.now();
  return { ok: false, reason: status };
}

// The session object the rest of the app reads (same shape as the old Auth.login).
export function buildSession(user, sessionToken) {
  return {
    userId: user.user_id ?? user.id,
    role: user.role,
    username: user.user_name || user.username,
    avatar: user.avatar,
    sessionToken: sessionToken || null
  };
}

// ── Forgot password (three browser prompts, as before) ──────────────
export async function runForgotPassword() {
  const email = prompt('Enter the email address on your account:');
  if (!email) return;
  try {
    const res = await fetch(window.PC_API + '/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    });
    const data = await res.json().catch(() => ({}));
    alert(data.message ||
      'If that address has an account, a one-time code has been sent to the PlayCarys admins.');
  } catch (e) {
    alert('Could not reach the server. Check your connection and try again.');
    return;
  }

  const code = prompt('Enter the 6-digit code an admin gave you (leave blank to do this later):');
  if (!code) return;
  const pw = prompt('Choose a new password (at least 8 characters):');
  if (!pw) return;

  try {
    const res = await fetch(window.PC_API + '/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: code.trim(), new_password: pw })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert('Password updated. You can sign in with it now.');
    } else {
      alert(data.message || 'That code is not valid, or it has expired.');
    }
  } catch (e) {
    alert('Could not reach the server. Check your connection and try again.');
  }
}

// ── Sign up ─────────────────────────────────────────────────────────
// Each function returns { errors } (a message per field) or { user, sessionToken }.
function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstError(checks) {
  const errors = {};
  checks.forEach(([field, value, rules]) => {
    const msg = validateField(value, rules);
    if (msg) errors[field] = msg;
  });
  return errors;
}

export function registerPlayer(values) {
  const errors = firstError([
    ['username', values.username, [{ type: 'required' }, { type: 'minLen', n: 3, msg: 'Username must be at least 3 characters' }, { type: 'maxLen', n: 20, msg: 'Username max 20 characters' }]],
    ['email', values.email, [{ type: 'required' }, { type: 'email' }]],
    ['password', values.password, [{ type: 'required' }, { type: 'password' }]],
    ['confirm', values.confirm, [{ type: 'required' }, { type: 'match', targetValue: values.password, msg: 'Passwords do not match' }]]
  ]);
  if (Object.keys(errors).length > 0) return { errors };

  const username = values.username.trim();
  const emailVal = values.email.trim();

  if (DB.users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase())) {
    return { errors: { username: 'Username already taken' } };
  }
  // An address may hold one player account and one studio account, so only players are checked.
  if (DB.emailTakenForRole(emailVal, 'player')) {
    return { errors: { email: 'A player account already uses this email' } };
  }

  const numId = Date.now();
  const newUser = {
    user_id: numId,
    user_name: username,
    role_id: 4,
    id: String(numId),
    username: username,
    email: emailVal,
    password: values.password,
    role: 'player',
    avatar: username.slice(0, 2).toUpperCase(),
    status: 'active',
    joinDate: today(),
    lastSeen: today()
  };

  if (!DB.player_profiles) DB.player_profiles = [];
  DB.player_profiles.push({
    user_id: numId,
    player_name: username,
    carys_points: 100,
    play_time: 0,
    matches_won: 0,
    player_status: true
  });
  DB.users.push(newUser);
  const sessionToken = claimNewSession(newUser);
  DB.save();
  return { user: newUser, sessionToken };
}

export function registerPublisher(values) {
  const errors = firstError([
    ['username', values.username, [{ type: 'required' }, { type: 'minLen', n: 3, msg: 'Studio name must be at least 3 characters' }, { type: 'maxLen', n: 30, msg: 'Studio name max 30 characters' }]],
    ['email', values.email, [{ type: 'required' }, { type: 'email' }]],
    ['phone', values.phone, [{ type: 'required' }, { type: 'phone' }]],
    ['password', values.password, [{ type: 'required' }, { type: 'password' }]],
    ['confirm', values.confirm, [{ type: 'required' }, { type: 'match', targetValue: values.password, msg: 'Passwords do not match' }]]
  ]);
  if (Object.keys(errors).length > 0) return { errors };

  const username = values.username.trim();
  const emailVal = values.email.trim();
  let rawPhone = values.phone.trim();
  if (rawPhone.startsWith('0')) rawPhone = rawPhone.substring(1); // remove leading zero
  const phoneVal = values.countryCode + ' ' + rawPhone;

  if (DB.users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase())) {
    return { errors: { username: 'Studio name already taken' } };
  }
  if (DB.emailTakenForRole(emailVal, 'publisher')) {
    return { errors: { email: 'A studio account already uses this email' } };
  }

  const numId = Date.now();
  const newPublisher = {
    user_id: numId,
    user_name: username,
    role_id: 5,
    id: String(numId),
    username: username,
    email: emailVal,
    phone_number: phoneVal,
    password: values.password,
    role: 'publisher',
    avatar: username.slice(0, 2).toUpperCase(),
    status: 'active',
    joinDate: today(),
    lastSeen: today()
  };

  if (!DB.publisher_profiles) DB.publisher_profiles = [];
  DB.publisher_profiles.push({
    user_id: numId,
    total_games: 0,
    approved_games: 0,
    active_games: 0
  });
  DB.users.push(newPublisher);
  const sessionToken = claimNewSession(newPublisher);
  DB.save();
  return { user: newPublisher, sessionToken };
}

// The old Auth.claimSession for a brand-new account: nobody holds it yet, so just stamp it.
function claimNewSession(user) {
  const token = newToken('sess_');
  user.active_session_token = token;
  user.active_session_at = new Date().toISOString();
  return token;
}

// "Play as Guest": a throw-away player-like account that is never saved.
export function makeGuestUser() {
  return {
    id: generateId('u'),
    username: 'Guest_' + Math.floor(Math.random() * 10000),
    email: 'guest@playcarys.com',
    role: 'guest',
    avatar: 'G',
    status: 'active',
    rank: 'Unranked',
    carysPoints: 0
  };
}
