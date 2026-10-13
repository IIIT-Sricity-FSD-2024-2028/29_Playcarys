/**
 * Remove every runtime-created account from live_database.json, keeping only
 * the seeded demo accounts (user_id 0-11, the same twelve declared in
 * front-end/data/db.js).
 *
 * Cascades: an account is not just its `users` row. Every table that points at
 * a user_id is filtered too, otherwise the profile pages, leaderboards and
 * match history render rows whose owner no longer exists.
 *
 * Also writes `deleted_users` tombstones. `users` is an append-only table on
 * both the client merge and the backend db-import (a stale tab used to wipe
 * real accounts, so absence is not treated as deletion). Without a tombstone,
 * the first browser that still has these accounts in localStorage would sync
 * them straight back.
 *
 *   node purge-accounts.js <path-to-live_database.json> [--apply]
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!DB_PATH) { console.error('usage: node purge-accounts.js <live_database.json> [--apply]'); process.exit(1); }

// The demo accounts, exactly as seeded in front-end/data/db.js.
const DEMO_IDS = new Set(['0','1','2','3','4','5','6','7','8','9','10','11']);

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const sid = (v) => String(v);

const doomedUsers = (db.users || []).filter(u => !DEMO_IDS.has(sid(u.user_id)));
const doomedIds = new Set(doomedUsers.map(u => sid(u.user_id)));
const doomedNames = new Set(doomedUsers.map(u => String(u.user_name || '')).filter(Boolean));

// Tombstones from an earlier run count too. Re-running the script after a stale
// browser has pushed some of the deleted users' rows back must still clean
// them, and by then those accounts are no longer in `users` to be recognised.
(db.deleted_users || []).forEach(d => {
    const id = sid(d && typeof d === 'object' ? d.user_id : d);
    if (id && id !== 'undefined') doomedIds.add(id);
});

// ── Rows pointing at nobody ────────────────────────────────────────────────
//
// Some history rows carry a player id that never named an account:
//
//   NaN / null / undefined / ""  — a write that ran before the id was resolved.
//                                  Pure corruption, always safe to delete.
//   a numeric id not in `users`  — an account deleted before deleted_users
//                                  tombstones existed. Its history outlived it,
//                                  so Match History and the leaderboards render
//                                  a player who cannot be looked up.
//
// GUEST ids are deliberately NOT touched. `guest` is a supported role and its
// ids come from generateId('ums') — base36, never numeric — so a non-numeric
// dangling reference is real guest play history, not debris. That is the whole
// distinction this rule turns on.
const JUNK_REFS = new Set(['nan', 'null', 'undefined', '']);
const isJunkRef = (v) => JUNK_REFS.has(sid(v).trim().toLowerCase());
const looksLikeAccountId = (v) => /^\d+$/.test(sid(v));

const liveIds = new Set((db.users || []).map(u => sid(u.user_id)));
const USER_REFS = {
    match_results: ['player_id'], player_session: ['player_id'],
    player_tournament: ['player_id'], sessions: ['created_by', 'hostId'],
    notifications: ['toUser', 'fromUserId'], reviews: ['playerId'],
    highlights: ['userId'], transactions: ['user_id'],
    user_cosmetics: ['user_id'], subscriptions: ['user_id'],
    player_profiles: ['user_id'], publisher_profiles: ['user_id'],
};
const strayAccounts = new Set();
const guestRefs = new Set();
for (const [table, fields] of Object.entries(USER_REFS)) {
    for (const row of (db[table] || [])) {
        for (const f of fields) {
            if (!row || row[f] == null) continue;
            const v = sid(row[f]);
            if (liveIds.has(v) || doomedIds.has(v) || isJunkRef(v)) continue;
            if (looksLikeAccountId(v)) strayAccounts.add(v); else guestRefs.add(v);
        }
    }
}
// Treat a stray account exactly like one removed above: tombstoned and cascaded.
strayAccounts.forEach(id => doomedIds.add(id));

console.log(`Accounts to remove (${doomedUsers.length}):`);
doomedUsers.forEach(u => console.log(`  ${sid(u.user_id).padEnd(15)} ${String(u.user_name).padEnd(20)} ${u.email}`));
if (strayAccounts.size) {
    console.log(`\nOrphaned account ids found in history (no users row) — also removed:`);
    strayAccounts.forEach(id => console.log('  ' + id));
}
if (guestRefs.size) {
    console.log(`\nGuest play history — KEPT (${guestRefs.size} id(s)): ${[...guestRefs].join(', ')}`);
}

const isDoomed = (v) => doomedIds.has(sid(v));
const report = [];

// Tables where a row without an owner is meaningless. NaN does not survive
// JSON (it is written as null), so a missing owner has to be caught as null as
// well as as the string "NaN". `sessions` and `notifications` are deliberately
// NOT here: a null is legitimate on both (an unhosted room; a notification
// addressed to a whole role through toRole).
const OWNER_REQUIRED = {
    match_results: 'player_id', player_session: 'player_id',
    player_tournament: 'player_id', player_profiles: 'user_id',
    publisher_profiles: 'user_id', reviews: 'playerId',
};

/** Drop rows whose user reference is not an id at all (NaN / null / ""). */
function dropJunkRefs() {
    let removed = 0;
    for (const [table, owner] of Object.entries(OWNER_REQUIRED)) {
        if (!Array.isArray(db[table])) continue;
        const before = db[table].length;
        db[table] = db[table].filter(r => r && r[owner] != null && !isJunkRef(r[owner]));
        const n = before - db[table].length;
        if (n) { report.push(`${table} (unidentifiable player): -${n}`); removed += n; }
    }
    return removed;
}

/** Drop array rows where ANY of `fields` names a removed account. */
function filterRows(table, fields) {
    const rows = db[table];
    if (!Array.isArray(rows)) return;
    const before = rows.length;
    db[table] = rows.filter(r => !(r && typeof r === 'object' && fields.some(f => r[f] != null && isDoomed(r[f]))));
    const removed = before - db[table].length;
    if (removed) report.push(`${table}: -${removed} of ${before}`);
}

filterRows('users',              ['user_id']);
filterRows('player_profiles',    ['user_id']);
filterRows('publisher_profiles', ['user_id']);
filterRows('subscriptions',      ['user_id']);
filterRows('user_cosmetics',     ['user_id']);
filterRows('transactions',       ['user_id']);
filterRows('highlights',         ['userId']);
filterRows('match_results',      ['player_id']);
filterRows('player_session',     ['player_id']);
filterRows('player_tournament',  ['player_id']);
filterRows('reviews',            ['playerId']);
filterRows('game_reviews',       ['reviewer_id']);
filterRows('reports',            ['reported_by', 'reported_user']);
filterRows('moderator_actions',  ['moderator_id']);
filterRows('bans',               ['playerId', 'bannedById']);
filterRows('notifications',      ['toUser', 'fromUserId']);
filterRows('sessions',           ['created_by', 'hostId']);
filterRows('games',              ['game_publisher']);
filterRows('tournaments',        ['organizer']);
filterRows('quickPlayQueue',     ['uid', 'user_id', 'player_id']);
filterRows('live_events',        ['user_id', 'userId', 'player_id']);
filterRows('telemetry',          ['user_id', 'userId', 'player_id']);

// Rows whose player id is NaN / null / "" — no account was ever named, so there
// is no tombstone to write, just debris to sweep.
dropJunkRefs();

// `favorites` is an object keyed by user_id, not an array.
if (db.favorites && typeof db.favorites === 'object' && !Array.isArray(db.favorites)) {
    let n = 0;
    for (const k of Object.keys(db.favorites)) { if (isDoomed(k)) { delete db.favorites[k]; n++; } }
    if (n) report.push(`favorites: -${n} key(s)`);
}

// A session's chess block records which colour each player had; a match that
// still names a removed account is unreadable, so drop those sessions too.
if (Array.isArray(db.sessions)) {
    const before = db.sessions.length;
    db.sessions = db.sessions.filter(s => {
        const colours = s && s.chess && s.chess.colors;
        if (colours && Object.keys(colours).some(isDoomed)) return false;
        if (Array.isArray(s && s.players) && s.players.some(isDoomed)) return false;
        return true;
    });
    const removed = before - db.sessions.length;
    if (removed) report.push(`sessions (chess/players refs): -${removed}`);
}

// Replies are plain "Name: text" strings, so they can only be matched by name.
if (Array.isArray(db.notifications)) {
    let n = 0;
    db.notifications.forEach(nt => {
        if (!Array.isArray(nt.replies)) return;
        const kept = nt.replies.filter(r => {
            const who = String(r).split(':')[0].trim();
            return !doomedNames.has(who);
        });
        n += nt.replies.length - kept.length;
        nt.replies = kept;
    });
    if (n) report.push(`notification replies: -${n}`);
}

// Tombstones — this is what stops a stale browser tab syncing them back.
const stamp = new Date().toISOString();
const existing = Array.isArray(db.deleted_users) ? db.deleted_users : [];
const known = new Set(existing.map(d => sid(d && typeof d === 'object' ? d.user_id : d)));
db.deleted_users = existing.concat(
    doomedUsers
        .filter(u => !known.has(sid(u.user_id)))
        .map(u => ({ user_id: sid(u.user_id), email: u.email || null, deleted_at: stamp })),
    // Accounts that were already gone from `users` but still had history
    // pointing at them. They need a tombstone as much as the rest, or the next
    // client with them in localStorage re-creates the same orphan rows.
    [...strayAccounts]
        .filter(id => !known.has(id))
        .map(id => ({ user_id: id, email: null, deleted_at: stamp })),
);

console.log('\nCascade:');
report.forEach(r => console.log('  ' + r));
console.log(`  deleted_users tombstones: ${db.deleted_users.length}`);
console.log(`\nRemaining accounts: ${db.users.length}`);
db.users.forEach(u => console.log(`  ${sid(u.user_id).padEnd(4)} ${String(u.user_name).padEnd(18)} ${u.email}`));

if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); process.exit(0); }

const backup = DB_PATH + '.bak-before-account-purge';
if (!fs.existsSync(backup)) fs.copyFileSync(DB_PATH, backup);
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`\nWritten. Backup at ${path.basename(backup)}`);
