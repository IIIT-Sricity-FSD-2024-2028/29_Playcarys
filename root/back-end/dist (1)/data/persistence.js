"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnIfCredentialsMissing = warnIfCredentialsMissing;
exports.rememberPassthrough = rememberPassthrough;
exports.snapshot = snapshot;
exports.saveNow = saveNow;
exports.scheduleSave = scheduleSave;
exports.isPending = isPending;
exports.lastWriteError = lastWriteError;
exports.installShutdownFlush = installShutdownFlush;
const fs = require("fs");
const path = require("path");
const store = require("./store");
function storeTables() {
    return {
        roles: store.roles,
        users: store.users,
        player_profiles: store.player_profiles,
        publisher_profiles: store.publisher_profiles,
        games: store.games,
        tournaments: store.tournaments,
        sessions: store.sessions,
        match_results: store.match_results,
        reports: store.reports,
        moderator_actions: store.moderator_actions,
        player_tournament: store.player_tournament,
        player_session: store.player_session,
        bans: store.bans,
        notifications: store.notifications,
        tournament_matches: store.tournament_matches,
        tournament_results: store.tournament_results,
        deleted_tournaments: store.deleted_tournaments,
        deleted_users: store.deleted_users,
        favorites: store.favorites,
        reviews: store.reviews,
        game_reviews: store.game_reviews,
        deleted_games: store.deleted_games,
        friendships: store.friendships,
        achievements: store.achievements,
        player_achievements: store.player_achievements,
        password_resets: store.password_resets,
    };
}
let passthrough = {};
function warnIfCredentialsMissing() {
    const active = store.users.filter((u) => u.status !== 'banned');
    const without = active.filter((u) => !u.password);
    if (!without.length)
        return;
    console.error(`[persistence] ${without.length} of ${active.length} active accounts have NO password — ` +
        `they cannot sign in. This usually means live_database.json was overwritten with ` +
        `/db-export output, which strips credentials. Restore from a .bak file.`);
    console.error(`[persistence] affected: ${without.slice(0, 8).map((u) => u.user_name).join(', ')}` +
        (without.length > 8 ? ` … +${without.length - 8} more` : ''));
}
function loadPassthroughFromDisk() {
    try {
        const raw = fs.readFileSync(dbPath(), 'utf8');
        const parsed = JSON.parse(raw);
        const owned = new Set(Object.keys(storeTables()));
        for (const key of Object.keys(parsed)) {
            if (!owned.has(key))
                passthrough[key] = parsed[key];
        }
    }
    catch {
    }
}
function rememberPassthrough(body) {
    if (!body || typeof body !== 'object')
        return;
    const owned = new Set(Object.keys(storeTables()));
    for (const key of Object.keys(body)) {
        if (!owned.has(key))
            passthrough[key] = body[key];
    }
}
function snapshot() {
    return { ...passthrough, ...storeTables() };
}
function dbPath() {
    return (process.env.DB_FILE ||
        path.join(__dirname, '..', '..', '..', 'front-end', 'live_database.json'));
}
let timer = null;
let writing = false;
let dirtyWhileWriting = false;
let lastError = null;
function saveNow() {
    if (writing) {
        dirtyWhileWriting = true;
        return;
    }
    writing = true;
    const target = dbPath();
    const tmp = `${target}.tmp-${process.pid}`;
    try {
        fs.writeFileSync(tmp, JSON.stringify(snapshot(), null, 2), 'utf8');
        fs.renameSync(tmp, target);
        lastError = null;
    }
    catch (err) {
        lastError = err.message;
        console.error('[persistence] Could not write live_database.json:', lastError);
        try {
            fs.rmSync(tmp, { force: true });
        }
        catch { }
    }
    finally {
        writing = false;
        if (dirtyWhileWriting) {
            dirtyWhileWriting = false;
            scheduleSave();
        }
    }
}
function scheduleSave(delayMs = 300) {
    if (timer)
        clearTimeout(timer);
    timer = setTimeout(() => { timer = null; saveNow(); }, delayMs);
    if (typeof timer.unref === 'function')
        timer.unref();
}
function isPending() {
    return timer !== null || dirtyWhileWriting;
}
function lastWriteError() {
    return lastError;
}
function installShutdownFlush() {
    const flush = () => { if (timer) {
        clearTimeout(timer);
        timer = null;
    } saveNow(); };
    process.once('SIGINT', () => { flush(); process.exit(0); });
    process.once('SIGTERM', () => { flush(); process.exit(0); });
    process.once('beforeExit', flush);
}
loadPassthroughFromDisk();
//# sourceMappingURL=persistence.js.map