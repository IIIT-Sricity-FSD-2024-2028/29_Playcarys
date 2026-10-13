/**
 * PlayCarys — Player Skin
 * ========================
 *
 * How a player is DRAWN, given what they have equipped.
 *
 * The shop sold frames, themes, name effects, banners, emotes and victory
 * animations, and not one of them was read anywhere outside the shop itself.
 * Buying a Fire Ring flipped a card to "Equipped" and changed nothing a player
 * or their opponents could ever see.
 *
 * This is the single place that turns an equipped item into pixels, so a
 * cosmetic becomes real everywhere at once — navbar, profile, leaderboard,
 * player cards, chat — instead of being re-implemented per page and forgotten
 * on most of them.
 *
 * Usage:
 *   await PlayerSkin.preload([7, 8, 9]);        // one request for the whole list
 *   el.innerHTML = PlayerSkin.avatar(user, 40); // bubble + frame + theme
 *   el.innerHTML = PlayerSkin.name(user);       // name with its effect
 *   PlayerSkin.victory(7);                      // throw the win animation
 */
(function () {
  'use strict';

  // userId -> skin. Cached because a leaderboard, its rows and the navbar all
  // ask for the same people within one render.
  var cache = {};
  var inflight = {};

  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function idOf(u) {
    if (u == null) return null;
    if (typeof u === 'number' || typeof u === 'string') return String(u);
    return String(u.user_id != null ? u.user_id : u.id);
  }

  function initials(u) {
    var n = (u && (u.user_name || u.username || u.player_name)) || '';
    return (u && u.avatar) || n.substring(0, 2).toUpperCase() || 'PL';
  }

  var PlayerSkin = {
    /**
     * Fetch skins for a set of players.
     *
     * Ids already cached are dropped, and a request already in flight for an id
     * is awaited rather than duplicated — otherwise a page that renders a list
     * and a navbar in the same tick fires the same call twice.
     */
    preload: function (ids) {
      if (typeof API === 'undefined') return Promise.resolve({});
      var asked = (ids || []).map(idOf).filter(Boolean);
      var want = asked.filter(function (id) { return !cache[id] && !inflight[id]; });

      // Wait on requests already running for these ids.
      //
      // Returning early here without them was a real bug: the navbar preloads
      // the signed-in user on every page, so by the time a page asked for that
      // same id the request was IN FLIGHT, this resolved immediately against an
      // empty cache, and the caller read "no cosmetics equipped". It looked
      // like the skin was not applied at all, and only on first load — calling
      // the same code by hand afterwards worked, because by then it was cached.
      var pending = asked
        .map(function (id) { return inflight[id]; })
        .filter(Boolean);

      if (!want.length) {
        return pending.length ? Promise.all(pending).then(function () { return cache; })
                              : Promise.resolve(cache);
      }

      var p = API.get('/economy/skins?userIds=' + encodeURIComponent(want.join(',')))
        .then(function (res) {
          Object.keys(res || {}).forEach(function (k) { cache[k] = res[k]; });
          want.forEach(function (id) {
            // Cache the absence too, or a player with nothing equipped is
            // re-requested on every render.
            if (!cache[id]) cache[id] = {};
            delete inflight[id];
          });
          return cache;
        })
        .catch(function () {
          want.forEach(function (id) { cache[id] = {}; delete inflight[id]; });
          return cache;
        });

      want.forEach(function (id) { inflight[id] = p; });
      // Resolve only once this request AND any already-running ones are done,
      // so every id the caller asked about is in the cache when they read it.
      return pending.length ? Promise.all([p].concat(pending)).then(function () { return cache; })
                            : p;
    },

    /** The skin for one player, or an empty object if not loaded yet. */
    of: function (user) {
      return cache[idOf(user)] || {};
    },

    /**
     * A player's avatar bubble, wearing their frame and theme.
     *
     * Returns HTML rather than mutating a node so it drops into the template
     * strings these pages are built from.
     */
    avatar: function (user, size) {
      var px = size || 40;
      var s = this.of(user);
      var bg = (s.theme && s.theme.css) || 'linear-gradient(135deg,#7c3aed,#00d4ff)';

      var ring = '';
      var charm = '';
      if (s.frame) {
        ring = 'box-shadow:0 0 0 2px ' + (s.frame.color || '#7dd3fc') +
               ',0 0 12px ' + (s.frame.glow || 'rgba(125,211,252,.5)') + ';';
        // The charm is the emoji the item shipped with. Kept small and in the
        // corner: at 32px in a list a centred emoji hides the player entirely.
        charm = '<span style="position:absolute;right:-2px;bottom:-2px;' +
                'font-size:' + Math.max(9, Math.round(px * 0.3)) + 'px;' +
                'line-height:1;pointer-events:none">' + esc(s.frame.charm) + '</span>';
      }

      return '<span class="pc-skin-av" style="position:relative;display:inline-flex;' +
        'align-items:center;justify-content:center;flex:none;' +
        'width:' + px + 'px;height:' + px + 'px;border-radius:50%;' +
        'font-size:' + Math.round(px * 0.36) + 'px;font-weight:800;color:#fff;' +
        'background:' + bg + ';' + ring + '">' +
        esc(initials(user)) + charm + '</span>';
    },

    /** A player's name, wearing their name effect. */
    name: function (user, text) {
      var s = this.of(user);
      var label = text != null ? text
        : (user && (user.user_name || user.username || user.player_name)) || '';
      if (!s.name_effect) return esc(label);

      var css = String(s.name_effect.css || '');
      var style = css.indexOf('gradient') !== -1
        // A gradient name is painted through the text itself.
        ? 'background:' + css + ';-webkit-background-clip:text;background-clip:text;' +
          'color:transparent;'
        : 'text-shadow:' + css + ';';
      return '<span class="pc-skin-name" style="' + style + '">' + esc(label) + '</span>';
    },

    /** CSS background for a player's profile banner, or null. */
    banner: function (user) {
      var s = this.of(user);
      return (s.banner && s.banner.css) || null;
    },

    /** Every emote glyph this player owns, across all their packs. */
    emotes: function (user) {
      return this.of(user).emotes || [];
    },

    /**
     * Throw the player's victory animation across the screen.
     *
     * Falls back to a default burst when nothing is equipped, so a win always
     * reads as a win — the cosmetic makes it yours, it does not gate it.
     */
    victory: function (user) {
      var s = this.of(user);
      var glyphs = (s.victory && s.victory.burst && s.victory.burst.length)
        ? s.victory.burst : ['🎉', '✨'];

      var host = document.createElement('div');
      host.className = 'pc-victory';
      for (var i = 0; i < 26; i++) {
        var b = document.createElement('span');
        b.textContent = glyphs[i % glyphs.length];
        b.style.cssText =
          'position:absolute;left:' + (Math.random() * 100) + '%;' +
          'top:' + (Math.random() * 40 + 30) + '%;' +
          'font-size:' + (14 + Math.random() * 22) + 'px;' +
          'animation:pcVictory ' + (1.1 + Math.random() * 0.9) + 's ease-out forwards;' +
          'animation-delay:' + (Math.random() * 0.35) + 's;';
        host.appendChild(b);
      }
      document.body.appendChild(host);
      setTimeout(function () { host.remove(); }, 2400);
    },
  };

  // Styles injected here so any page loading this file gets them, rather than
  // every page having to remember a stylesheet.
  if (!document.getElementById('pc-skin-css')) {
    var st = document.createElement('style');
    st.id = 'pc-skin-css';
    st.textContent =
      '.pc-victory{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden}' +
      '@keyframes pcVictory{' +
      '0%{opacity:0;transform:translateY(0) scale(.4) rotate(0)}' +
      '15%{opacity:1}' +
      '100%{opacity:0;transform:translateY(-160px) scale(1.15) rotate(220deg)}}';
    document.head.appendChild(st);
  }

  window.PlayerSkin = PlayerSkin;
})();
