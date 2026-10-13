// ============================================================
//  Hill Climbing — persistent per-player wallet.
//
//  Coins and diamonds are THIS GAME'S currency. They are deliberately NOT part
//  of the platform schema: db.js retired the elo/coins/diamonds columns from
//  match_results, and recordMatchResult still strips them (GAME_PRIVATE_FIELDS)
//  so a game cannot smuggle its own economy into the platform's ledger.
//
//  ── What changed ───────────────────────────────────────────
//  This used to live only in localStorage, under 'hillclimb_wallet_<userId>'.
//  localStorage is per-BROWSER, so a player's coins were stranded on whichever
//  laptop earned them: sign in from anywhere else and the wallet was empty. On
//  a phone the OS gives a game durable per-user storage; here it did not.
//
//  It now lives in the platform's per-game save storage
//  (GET/PUT /games/8/save), with localStorage kept as a fast local mirror so a
//  run never blocks on the network and an offline run is not lost.
//
//  ── Why the interface is still synchronous ─────────────────
//  finalizeSession() calls Wallet.deposit() inside p5's draw path. Making that
//  await a network round trip would stall the render loop — and an uncaught
//  error there is exactly what once froze the game with no game-over screen.
//  So: reads are served from an in-memory cache hydrated at boot, writes update
//  the cache and localStorage immediately and push to the server in the
//  background.
//
//  Shape is unchanged: { coins, diamonds, bestDistance, bestScore }
// ============================================================

var Wallet = (function () {
    'use strict';

    var GAME_ID = 8;
    var cache = {};        // userId -> wallet object
    var hydrated = {};     // userId -> true once the server has been consulted

    function keyFor(userId) {
        return 'hillclimb_wallet_' + String(userId);
    }

    function num(v) {
        var n = Number(v);
        return isFinite(n) && n > 0 ? n : 0;
    }

    function shape(raw) {
        raw = raw || {};
        return {
            coins: num(raw.coins),
            diamonds: num(raw.diamonds),
            bestDistance: num(raw.bestDistance),
            bestScore: num(raw.bestScore)
        };
    }

    function readLocal(userId) {
        try { return shape(JSON.parse(localStorage.getItem(keyFor(userId)) || '{}')); }
        catch (e) { return shape(null); }
    }

    function writeLocal(userId, wallet) {
        // Swallowed on purpose — a full or blocked localStorage must never cost
        // the player their game-over screen.
        try { localStorage.setItem(keyFor(userId), JSON.stringify(wallet)); }
        catch (e) { console.warn('[HillClimb] Wallet mirror not written:', e && e.message); }
    }

    function apiBase() {
        return window.PC_API ||
            ('http://' + (window.location.hostname || 'localhost') + ':3000/api/v1');
    }

    /** Background push. Failure is logged, never surfaced mid-run. */
    function pushToServer(userId, wallet) {
        if (userId == null) return;
        fetch(apiBase() + '/games/' + GAME_ID + '/save', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parseInt(userId, 10), data: wallet })
        }).then(function (res) {
            if (!res.ok) console.warn('[HillClimb] Wallet not saved to the platform:', res.status);
        }).catch(function (e) {
            console.warn('[HillClimb] Wallet save failed:', e && e.message);
        });
    }

    return {
        /**
         * Pull this player's wallet from the platform. Call once at boot.
         *
         * Merged field by field, keeping the HIGHER of local and remote — never
         * "whichever side we asked last wins".
         *
         * The first version of this let the server win outright, and that is a
         * data-loss bug: a player who earned coins in this browser while the
         * platform held an empty or partial save had those coins wiped, from
         * localStorage as well. Caught in testing with a 777-coin local wallet
         * against an empty server one.
         *
         * Taking the maximum is correct for THIS wallet specifically because
         * every field only ever goes up — coins and diamonds accumulate through
         * deposit(), and the two "best" fields are high-water marks. A game with
         * spendable currency could not merge this way; it would need a version
         * number and a real last-write-wins rule.
         *
         * The merged result is pushed back whenever it differs from what the
         * platform holds, which is also the one-time migration for players whose
         * coins were only ever in localStorage.
         */
        hydrate: function (userId) {
            if (userId == null) return Promise.resolve(shape(null));
            var local = readLocal(userId);

            return fetch(apiBase() + '/games/' + GAME_ID + '/save?userId=' + parseInt(userId, 10))
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (body) {
                    var remote = shape(body && body.data);
                    var merged = {
                        coins: Math.max(local.coins, remote.coins),
                        diamonds: Math.max(local.diamonds, remote.diamonds),
                        bestDistance: Math.max(local.bestDistance, remote.bestDistance),
                        bestScore: Math.max(local.bestScore, remote.bestScore)
                    };

                    cache[userId] = merged;
                    writeLocal(userId, merged);
                    hydrated[userId] = true;

                    var differs = merged.coins !== remote.coins ||
                                  merged.diamonds !== remote.diamonds ||
                                  merged.bestDistance !== remote.bestDistance ||
                                  merged.bestScore !== remote.bestScore;
                    if (differs) {
                        console.log('[HillClimb] Syncing this browser\'s wallet up to the platform.');
                        pushToServer(userId, merged);
                    }
                    return merged;
                })
                .catch(function () {
                    // Offline or the API is down: play on with what this browser has.
                    cache[userId] = local;
                    return cache[userId];
                });
        },

        /** Lifetime totals. Synchronous — served from the cache. */
        load: function (userId) {
            if (userId == null) return shape(null);
            if (!cache[userId]) cache[userId] = readLocal(userId);
            return cache[userId];
        },

        /**
         * Add one run's haul to the player's lifetime totals.
         * Currencies accumulate; distance and score keep the best ever.
         */
        deposit: function (userId, coins, diamonds, distance, score) {
            var current = this.load(userId);
            var next = {
                coins: current.coins + num(coins),
                diamonds: current.diamonds + num(diamonds),
                bestDistance: Math.max(current.bestDistance, num(distance)),
                bestScore: Math.max(current.bestScore, num(score))
            };
            if (userId == null) return next;

            cache[userId] = next;
            writeLocal(userId, next);   // instant, local, never blocks
            pushToServer(userId, next); // durable, cross-device, in the background
            return next;
        },

        /** True when this run beat the player's stored best distance. */
        isNewBest: function (userId, distance) {
            return num(distance) > this.load(userId).bestDistance;
        }
    };
})();

window.Wallet = Wallet;
