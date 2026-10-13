/* ============================================================
 *  PlayCarys — Game Launch Resolver
 *
 *  One place that answers "can this game be played, and where does
 *  it live?". Before this existed, five separate pages each carried
 *  their own copy of:
 *
 *      const implemented = ['7', '8'];   // chess, hill climbing
 *
 *  which meant a publisher could submit a perfectly good game and it
 *  would still show "Coming Soon" forever, because nothing read the
 *  game record. Every caller now delegates here instead.
 *
 *  Three delivery kinds are resolved:
 *    builtin    — the two games shipped inside front-end/games/
 *    hosted     — Model A: publisher uploaded a .zip, unpacked by the
 *                 backend to front-end/<play_path>/
 *    selfhosted — Model B: publisher hosts it; we embed their URL
 *
 *  Loaded by: player/games.html, player/dashboard.html,
 *             tournaments.html, dashboard.html, play.html
 * ============================================================ */

(function (global) {
  'use strict';

  /* Games that ship with the platform. Keyed by game_id, matching the
     seed rows in back-end/src/data/store.ts. These predate the publisher
     pipeline and are launched by direct navigation, not the iframe
     wrapper, so their existing behaviour is untouched. */
  var BUILTIN = {
    '7': { slug: 'chess',         supportsAi: true,  spectator: true  },
    '8': { slug: 'hill_climbing', supportsAi: false, spectator: false }
  };

  /* ── How a game does multiplayer ────────────────────────────
   *
   * The platform has its own matchmaker: quick-play parks a waiter in
   * localStorage, pairs the next player, writes a session row and launches both
   * tabs with ?sid=&color=. That was built for chess and it is correct — for
   * chess. It is wrong for every game that ships its own lobby.
   *
   * TOSIOS has Colyseus rooms. agar.io has a socket.io world you simply join.
   * PvP and the NetplayJS demos negotiate WebRTC between peers. Running the
   * platform matchmaker in front of any of those produces a session row nothing
   * reads, a "waiting for another player" screen that resolves to a game which
   * then asks you to pick a room anyway, and a Play button that lies about what
   * happens next.
   *
   *   'platform' — we matchmake, we own the session, we can spectate it
   *   'self'     — the game owns its own lobby; hand the player over and
   *                get out of the way
   *   'solo'     — single player; no lobby, no session to join
   *
   * Uploaded games default to 'self' when their declared player range allows
   * more than one player, because a publisher's build always brings its own
   * networking — the SDK has no matchmaking message for us to drive.
   */
  // 'platform' is no longer one of the answers. It meant "WE run the
  // matchmaking for this game", and chess — the only game it ever applied to —
  // now finds its own opponents inside its own UI, using the same socket
  // pairing service the platform's quick-play was calling anyway.
  //
  // So chess is 'self' like every other multiplayer game: it opens, and it
  // handles finding someone to play. The difference between chess and a
  // publisher's game is now only that we happen to ship chess.
  var MULTIPLAYER = {
    '7': 'self',       // chess — brings its own matchmaking
    '8': 'solo'        // hill climbing — single player by construction
  };

  /** Highest player count the game's own metadata claims, e.g. "1-4" -> 4. */
  function maxPlayersOf(game) {
    if (!game) return 1;
    var raw = String(game.players || game.maxPlayers || '1');
    var nums = raw.match(/\d+/g);
    if (!nums || !nums.length) return 1;
    return Math.max.apply(null, nums.map(Number));
  }

  /**
   * Absolute-from-site-root prefix, derived from wherever the caller sits.
   * Pages live at /pages/<role>/x.html and games at /games/..., so we
   * cannot assume a fixed number of "../" hops — deriving it keeps the
   * resolver correct whether the site is served from / or a subfolder.
   */
  function webRoot() {
    var p = global.location.pathname;
    var i = p.indexOf('/pages/');
    if (i >= 0) return p.slice(0, i + 1);
    var j = p.indexOf('/games/');
    if (j >= 0) return p.slice(0, j + 1);
    return p.replace(/[^/]*$/, '');
  }

  /**
   * data/db.js declares `const DB` at script top level, which is a lexical
   * binding — it never lands on `window`, so `window.DB` does NOT reach it.
   * Resolve the bare identifier through the scope chain instead, falling back
   * to a global for any page that sets one.
   */
  function getDB() {
    try {
      if (typeof DB !== 'undefined' && DB && Array.isArray(DB.games)) return DB;
    } catch (e) { /* not defined on this page */ }
    return (global.DB && Array.isArray(global.DB.games)) ? global.DB : null;
  }

  function findGame(gameId) {
    var db = getDB();
    if (!db) return null;
    var wanted = String(gameId == null ? '' : gameId).replace(/^g/, '');
    return db.games.find(function (g) {
      return String(g.game_id != null ? g.game_id : g.id) === wanted;
    }) || null;
  }

  /* The record can arrive from two directions with two naming styles:
     the NestJS store (snake_case, via db-export) or the publisher form
     (camelCase, written straight into the mock DB). Read both. */
  function field(game, snake, camel) {
    if (!game) return null;
    var v = game[snake] != null && game[snake] !== '' ? game[snake] : game[camel];
    return v == null || v === '' ? null : v;
  }

  /**
   * A build is served the moment it is unpacked, but it is only *reviewed*
   * once an admin approves it. Those are different events, and the gap
   * between them is exactly where an unreviewed bundle would otherwise be
   * reachable by anyone holding the game id.
   *
   * Enforced here because this is the one place every launch path goes
   * through. Builtins are checked before this and are unaffected.
   *
   * Admins and superusers are exempt: reviewing a game means playing it, and
   * the review console launches through this same resolver.
   */
  function isReviewCleared(game) {
    if (!game) return false;
    var status = game.game_approval_status || game.status;
    if (status === 'approved') return true;

    try {
      var session = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      if (session && (session.role === 'admin' || session.role === 'superuser')) return true;
      // A publisher may always launch their own submission to test it.
      if (session && session.role === 'publisher' &&
          String(game.game_publisher) === String(session.userId)) return true;
    } catch (e) { /* no session helper on this page — fall through to denied */ }

    return false;
  }

  var GameLaunch = {
    BUILTIN: BUILTIN,

    /**
     * Resolve how a game is played.
     * @returns {{kind:string, url:string, embeddable:boolean, slug:string|null,
     *            origin:string|null, game:object|null}|null} null when unplayable.
     */
    resolve: function (gameId, params) {
      var gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
      var game = findGame(gid);
      var qs = this.buildQuery(params);

      if (BUILTIN[gid]) {
        return {
          kind: 'builtin',
          slug: BUILTIN[gid].slug,
          url: webRoot() + 'games/' + BUILTIN[gid].slug + '/index.html' + qs,
          embeddable: false, // navigated to directly, exactly as before
          origin: global.location.origin,
          game: game
        };
      }

      if (!game) return null;
      if (!isReviewCleared(game)) return null;

      var playPath = field(game, 'play_path', 'playPath');
      if (playPath) {
        var clean = String(playPath).replace(/^\/+|\/+$/g, '');
        return {
          kind: 'hosted',
          slug: clean.replace(/^games\//, ''),
          url: webRoot() + clean + '/index.html' + qs,
          embeddable: true,
          origin: global.location.origin,
          game: game
        };
      }

      var url = field(game, 'game_url', 'gameUrl');
      if (url) {
        var parsed = null;
        try { parsed = new URL(url, global.location.href); } catch (e) { return null; }
        // Only ever embed http(s). A javascript:/data: "URL" in a game record
        // would otherwise execute in the wrapper's own context.
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return {
          kind: 'selfhosted',
          slug: null,
          url: parsed.href + (parsed.search ? '&' : '?') + qs.replace(/^\?/, ''),
          embeddable: true,
          origin: parsed.origin,
          game: game
        };
      }

      return null;
    },

    buildQuery: function (params) {
      if (!params) return '';
      var parts = [];
      Object.keys(params).forEach(function (k) {
        var v = params[k];
        if (v === undefined || v === null || v === '') return;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      });
      return parts.length ? '?' + parts.join('&') : '';
    },

    /** True when the game can actually be started. */
    hasEngine: function (gameId) {
      return this.resolve(gameId) !== null;
    },

    /** Legacy helper kept for callers that only want the folder name. */
    pathFor: function (gameId) {
      var r = this.resolve(gameId);
      return r && r.slug ? r.slug : null;
    },

    /** True when the game runs inside the iframe wrapper rather than a redirect. */
    isEmbedded: function (gameId) {
      var r = this.resolve(gameId);
      return !!(r && r.embeddable);
    },

    /**
     * Send the player into a game. Builtins keep their historical direct
     * navigation; everything else goes through the wrapper so the SDK
     * handshake and result reporting have a host to talk to.
     */
    launch: function (gameId, params) {
      var r = this.resolve(gameId, params);
      if (!r) return false;

      // Count the open. `views` was a seeded number nothing ever incremented,
      // reported to studios as "Total Views" — this is what makes it a real
      // measurement. Fire-and-forget and never awaited: a counter must never
      // stand between a player and the game they asked for.
      if (typeof API !== 'undefined') {
        API.post('/games/' + String(gameId).replace(/^g/, '') + '/view', {})
           .catch(function () { /* a missed view is not worth an error */ });
      }

      if (r.embeddable) {
        var wrapperParams = Object.assign({ gameId: String(gameId).replace(/^g/, '') }, params || {});
        global.location.href = webRoot() + 'pages/player/play.html' + this.buildQuery(wrapperParams);
      } else {
        global.location.href = r.url;
      }
      return true;
    },

    /**
     * How this game handles multiplayer: 'platform' | 'self' | 'solo'.
     *
     * Callers use this to decide what to OFFER, not just what to do. A 'self'
     * game must not be shown "Create Room" or a quick-play queue, because the
     * platform cannot fill either — the game's own lobby does that.
     */
    multiplayerMode: function (gameId) {
      var gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
      var game = findGame(gid);

      // What the PUBLISHER declared, when they declared it. This is the whole
      // point of the game_mode field: it is a fact about the game, stated once,
      // rather than something re-derived on every call.
      if (game && (game.game_mode === 'single' || game.game_mode === 'multi')) {
        return game.game_mode === 'multi' ? 'self' : 'solo';
      }

      if (MULTIPLAYER[gid]) return MULTIPLAYER[gid];
      if (!game) return 'solo';

      // Last resort for a listing published before game_mode existed: read the
      // largest number out of the free-text player blurb. Kept only as a
      // fallback — "1-6", "2 to 4" and "Single player" all had to be parsed by
      // regex, and a publisher writing prose got a coin flip.
      return maxPlayersOf(game) > 1 ? 'self' : 'solo';
    },

    /**
     * Can a third party watch this match?
     *
     * Two conditions, both required. The GAME has to implement a watch-only view
     * — chess does; hill_climbing is single-player by construction and has no
     * second seat to watch from. And the SESSION has to be genuinely multiplayer,
     * because a solo run has nothing to show a spectator.
     *
     * Publisher-uploaded games report false: the SDK has no spectator message in
     * its protocol yet, so there is nothing to hook. That is a deliberate no
     * rather than an oversight — see the note in js/playcarys-sdk.js.
     */
    canSpectate: function (gameId, match) {
      var gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
      var game = findGame(gid);
      var builtin = BUILTIN[gid];

      // Two routes to a watchable match, and they are genuinely different.
      //
      //   A builtin we ship (chess): we own the page, so its spectator view
      //   joins the same socket room the players are in and asks for the
      //   position. That never depended on a session ROW — only on the room
      //   key — so it survives the rooms being removed.
      //
      //   A publisher's game: only they can offer a spectator view, because
      //   only their server knows the match. They declare supports_spectate
      //   and give us a URL template to open. Nothing to infer.
      var watchable = (builtin && builtin.spectator) || (game && game.supports_spectate);
      if (!watchable) return false;

      // A solo run has nothing to show a spectator.
      if (!match) return true;
      if (Array.isArray(match.participants)) return match.participants.length > 1;
      return true;
    },

    /**
     * Is a self-hosted game's server actually answering?
     *
     * A Model B listing is only a URL. If whatever was behind it is not running,
     * the listing still looks perfectly playable — the player clicks, watches a
     * spinner for twenty seconds, and is then told the publisher's server did
     * not respond. That is a bad way to learn a game is offline, and with three
     * of these served from local processes it is not a rare case.
     *
     * The probe is `no-cors`, so nothing about the response can be read — but
     * the request still REJECTS when the connection is refused, and that is the
     * only bit we need. Hosted and builtin games always resolve true: their
     * files are served by the same origin as this page, so if you can read this
     * code they are reachable.
     *
     * @returns {Promise<boolean>}
     */
    probe: function (gameId, timeoutMs) {
      var r = this.resolve(gameId);
      if (!r) return Promise.resolve(false);
      if (r.kind !== 'selfhosted') return Promise.resolve(true);

      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 3000);

      return fetch(r.origin, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined
      }).then(
        function () { clearTimeout(timer); return true; },
        function () { clearTimeout(timer); return false; }
      );
    },

    /** Open a live match in watch-only mode. */
    spectate: function (gameId, sessionId) {
      var gid = String(gameId == null ? '' : gameId).replace(/^g/, '');
      var builtin = BUILTIN[gid];
      if (!builtin || !builtin.spectator) return false;
      global.location.href = webRoot() + 'games/' + builtin.slug + '/index.html' +
        this.buildQuery({ sid: sessionId, spectate: '1' });
      return true;
    },

    /** Human-readable reason a game can't be launched, for toasts. */
    unplayableReason: function (gameId) {
      var game = findGame(gameId);
      if (!game) return 'That game could not be found.';
      if (!isReviewCleared(game)) {
        var status = game.game_approval_status || game.status;
        return status === 'rejected'
          ? 'This game did not pass review and is not available.'
          : 'This game is still being reviewed by our team and is not playable yet.';
      }
      return 'This game has no playable build yet — the publisher still needs to upload it.';
    }
  };

  global.GameLaunch = GameLaunch;
})(window);
