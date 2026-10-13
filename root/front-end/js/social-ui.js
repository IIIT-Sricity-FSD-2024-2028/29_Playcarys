// ============================================================
//  SOCIAL UI — player search, public profile, friends panel.
//
//  Separate from social.js so the API client stays testable on its own and the
//  markup lives in one place.
// ============================================================

(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var CSS_ID = 'pc-social-styles';
  var CSS = [
    '#pc-find{position:fixed;inset:0;z-index:9998;background:rgba(4,7,15,.72);backdrop-filter:blur(3px);',
    '  display:none;align-items:flex-start;justify-content:center;padding:6vh 1rem 1rem}',
    '#pc-find.open{display:flex}',
    '#pc-find-card{width:100%;max-width:520px;background:var(--bg-card,#141a2a);border:1px solid var(--border-primary,#26304a);',
    '  border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.6);max-height:82vh;display:flex;flex-direction:column}',
    '#pc-find-head{display:flex;align-items:center;gap:.6rem;padding:.85rem 1rem;border-bottom:1px solid var(--border-primary,#26304a)}',
    '#pc-find-head h3{margin:0;font-size:.95rem;flex:1;color:var(--text-primary,#e9edf7)}',
    '#pc-find-q{width:100%;background:var(--bg-secondary,#1b2334);border:1px solid var(--border-primary,#26304a);',
    '  color:var(--text-primary,#e9edf7);border-radius:9px;padding:.5rem .7rem;font-size:.85rem;outline:none}',
    '#pc-find-results{overflow-y:auto;padding:.5rem 1rem 1rem;display:flex;flex-direction:column;gap:.45rem}',
    '.pc-prow{display:flex;align-items:center;gap:.65rem;padding:.55rem .65rem;border-radius:10px;',
    '  background:var(--bg-secondary,#1b2334);border:1px solid var(--border-primary,#26304a)}',
    '.pc-prow-av{width:34px;height:34px;border-radius:50%;background:var(--accent-purple,#7c3aed);color:#fff;',
    '  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.75rem;flex-shrink:0;cursor:pointer}',
    '.pc-prow-info{flex:1;min-width:0}',
    '.pc-prow-name{font-size:.85rem;font-weight:700;color:var(--text-primary,#e9edf7);cursor:pointer}',
    '.pc-prow-sub{font-size:.7rem;color:var(--text-secondary,#93a0bd)}',
    '.pc-btn{border:none;border-radius:8px;padding:.3rem .6rem;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap}',
    '.pc-btn-primary{background:var(--accent-purple,#7c3aed);color:#fff}',
    '.pc-btn-ghost{background:rgba(255,255,255,.07);color:var(--text-secondary,#93a0bd)}',
    '.pc-btn-danger{background:rgba(239,68,68,.12);color:#f87171}',
    '.pc-btn[disabled]{opacity:.55;cursor:default}',
    '#pc-find-empty{color:var(--text-secondary,#93a0bd);font-size:.8rem;text-align:center;padding:1.5rem 1rem}'
  ].join('\n');

  function ensureDom() {
    if (!document.getElementById(CSS_ID)) {
      var st = document.createElement('style');
      st.id = CSS_ID; st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (document.getElementById('pc-find')) return;

    var wrap = document.createElement('div');
    wrap.id = 'pc-find';
    wrap.innerHTML = [
      '<div id="pc-find-card">',
      '  <div id="pc-find-head">',
      '    <h3>Find players</h3>',
      '    <button class="pc-btn pc-btn-ghost" id="pc-find-close">Close</button>',
      '  </div>',
      '  <div style="padding:.75rem 1rem 0">',
      '    <input id="pc-find-q" type="text" placeholder="Search by name — at least 2 letters" autocomplete="off"/>',
      '  </div>',
      '  <div id="pc-find-results"><div id="pc-find-empty">Type a name to search.</div></div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap);

    document.getElementById('pc-find-close').onclick = SocialUI.closeFind;
    wrap.addEventListener('click', function (e) { if (e.target === wrap) SocialUI.closeFind(); });

    var q = document.getElementById('pc-find-q');
    var timer = null;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      // Debounced: a request per keystroke would fire five for "night".
      timer = setTimeout(function () { runSearch(q.value); }, 260);
    });
  }

  function rowFor(p) {
    var pres = (typeof Social !== 'undefined') ? Social.presenceText(p.presence) : '';
    var sub = pres + ' · ' + p.matches + ' matches · ' + p.win_rate + '% win rate';

    var action;
    switch (p.relationship) {
      case 'friends':
        action =
          '<button class="pc-btn pc-btn-primary" onclick="SocialUI.chat(' + p.user_id + ',\'' + esc(p.user_name) + '\')">Message</button>' +
          '<button class="pc-btn pc-btn-danger" onclick="SocialUI.unfriend(' + p.user_id + ',\'' + esc(p.user_name) + '\')">Remove</button>';
        break;
      case 'sent':
        action = '<button class="pc-btn pc-btn-ghost" disabled>Request sent</button>';
        break;
      case 'received':
        action = '<button class="pc-btn pc-btn-ghost" disabled>Asked you already</button>';
        break;
      default:
        action = '<button class="pc-btn pc-btn-primary" onclick="SocialUI.add(' + p.user_id + ',\'' + esc(p.user_name) + '\')">Add friend</button>';
    }

    return [
      '<div class="pc-prow" data-uid="' + p.user_id + '">',
      '  <div class="pc-prow-av" onclick="SocialUI.viewProfile(' + p.user_id + ')">' + esc((p.user_name || 'P').substring(0, 2).toUpperCase()) + '</div>',
      '  <div class="pc-prow-info">',
      '    <div class="pc-prow-name" onclick="SocialUI.viewProfile(' + p.user_id + ')">' + esc(p.user_name) + '</div>',
      '    <div class="pc-prow-sub">' + esc(sub) + '</div>',
      '  </div>',
      '  <div style="display:flex;gap:.3rem">' + action + '</div>',
      '</div>'
    ].join('');
  }

  async function runSearch(q) {
    var box = document.getElementById('pc-find-results');
    if (!box) return;
    var term = String(q || '').trim();
    if (term.length < 2) {
      box.innerHTML = '<div id="pc-find-empty">Type at least 2 letters.</div>';
      return;
    }
    box.innerHTML = '<div id="pc-find-empty">Searching…</div>';
    try {
      var rows = await Social.searchPlayers(term);
      box.innerHTML = rows.length
        ? rows.map(rowFor).join('')
        : '<div id="pc-find-empty">No players match “' + esc(term) + '”.</div>';
    } catch (e) {
      box.innerHTML = '<div id="pc-find-empty">' + esc(e.message) + '</div>';
    }
  }

  var SocialUI = {
    openFind: function () {
      ensureDom();
      document.getElementById('pc-find').classList.add('open');
      var q = document.getElementById('pc-find-q');
      q.value = '';
      document.getElementById('pc-find-results').innerHTML = '<div id="pc-find-empty">Type a name to search.</div>';
      setTimeout(function () { q.focus(); }, 40);
    },

    /** Free the card's WebGL context — browsers cap them near 16. */
    _disposeCardAvatar: function () {
      var host = document.getElementById('pc-card-av');
      if (host && typeof Avatar3D !== 'undefined') Avatar3D.unmount(host);
    },

    closeFind: function () {
      // Free the card's WebGL context. Browsers cap them near 16, so opening a
      // dozen player cards in a session would otherwise stop the model from
      // rendering at all — with no error to explain why.
      if (typeof Avatar3D !== 'undefined') Avatar3D.unmount('pc-card-av');
      var el = document.getElementById('pc-find');
      if (el) el.classList.remove('open');
    },

    add: async function (userId, name) {
      try {
        var r = await Social.sendRequest(userId);
        if (typeof Toast !== 'undefined') Toast.success(r.message);
        runSearch(document.getElementById('pc-find-q').value);
      } catch (e) {
        // The server's message is the useful one — it explains the cooldown,
        // the duplicate, or that they already asked you.
        if (typeof Toast !== 'undefined') Toast.error(e.message);
      }
    },

    chat: async function (userId, name) {
      try {
        var p = await Social.profileOf(userId);
        Social.openChat(userId, name, Social.presenceText(p.presence));
      } catch (e) {
        Social.openChat(userId, name, '');
      }
      SocialUI.closeFind();
    },

    unfriend: function (userId, name) {
      var run = async function () {
        try {
          var r = await Social.removeFriend(userId);
          if (typeof Toast !== 'undefined') {
            Toast.info(name + ' removed. Your conversation was deleted for both of you.');
          }
          if (typeof Social !== 'undefined') Social.closeChat();
          SocialUI.refreshFriends();
          var q = document.getElementById('pc-find-q');
          if (q && q.value.trim().length >= 2) runSearch(q.value);
        } catch (e) {
          if (typeof Toast !== 'undefined') Toast.error(e.message);
        }
      };
      // Spell out what makes this different from clearing a conversation.
      var msg = 'This removes ' + name + ' from your friends, tells them, and deletes ' +
                'your conversation for BOTH of you. Continue?';
      if (typeof confirmAction === 'function') confirmAction('Remove friend', msg, run);
      else if (confirm(msg)) run();
    },

    viewProfile: async function (userId) {
      try {
        var p = await Social.profileOf(userId);
        SocialUI.showProfileModal(p);
      } catch (e) {
        if (typeof Toast !== 'undefined') Toast.error(e.message);
      }
    },

    showProfileModal: function (p) {
      ensureDom();
      var pres = Social.presenceText(p.presence);
      var canSpectate = p.presence && p.presence.state === 'playing' && p.presence.match_id &&
                        typeof GameLaunch !== 'undefined' && GameLaunch.canSpectate &&
                        GameLaunch.canSpectate(p.presence.game_id, { participants: [1, 2] });

      var actions;
      if (p.relationship === 'friends') {
        actions =
          '<button class="pc-btn pc-btn-primary" onclick="SocialUI.chat(' + p.user_id + ',\'' + esc(p.user_name) + '\')">Message</button>' +
          '<button class="pc-btn pc-btn-danger" onclick="SocialUI.unfriend(' + p.user_id + ',\'' + esc(p.user_name) + '\')">Remove friend</button>';
      } else if (p.relationship === 'sent') {
        actions = '<button class="pc-btn pc-btn-ghost" disabled>Request sent</button>';
      } else if (p.relationship === 'received') {
        actions = '<button class="pc-btn pc-btn-ghost" disabled>They asked you — check notifications</button>';
      } else {
        actions = '<button class="pc-btn pc-btn-primary" onclick="SocialUI.add(' + p.user_id + ',\'' + esc(p.user_name) + '\')">Add friend</button>';
      }

      // Gifts: an affordance, clearly not yet real. The doc asks for it to be
      // visible and marked coming soon rather than hidden.
      actions += '<button class="pc-btn pc-btn-ghost" disabled title="Coming soon">🎁 Gift (soon)</button>';

      if (canSpectate) {
        actions += '<button class="pc-btn pc-btn-ghost" onclick="Presence.spectate(\'' +
                   esc(p.presence.match_id) + '\')">👁 Spectate</button>';
      }

      // Cosmetics are server-owned, so they are read from the economy API
      // rather than from the client's DB copy, which can be a page behind an
      // equip. Fired after the card paints — the card must not wait on it.
      /**
       * Load the flat rig on demand.
       *
       * social-ui.js runs on every page, but avatar-model.js is only <script>-ed
       * on the shop and the profile — so the player card fell back to initials
       * everywhere else, which is most of the app. Fetching it here means the
       * card works wherever it opens, and pages that never open one never pay
       * for it.
       */
      function ensureRig() {
        if (typeof AvatarModel !== 'undefined') return Promise.resolve(true);
        if (ensureRig._p) return ensureRig._p;
        function inject(src) {
          return new Promise(function (done) {
            var el = document.createElement('script');
            // Resolved against the site root, not the page — the card opens
            // from pages at two different depths.
            el.src = src;
            el.onload = function () { done(true); };
            el.onerror = function () { done(false); };
            document.head.appendChild(el);
          });
        }
        // The flat rig first: it is the fallback Avatar3D itself falls back to,
        // so loading 3D without it would leave a blank box on a machine with no
        // WebGL rather than a drawn figure.
        ensureRig._p = inject('/js/avatar-model.js')
          .then(function () { return inject('/js/avatar-3d.js'); })
          .then(function () { return typeof AvatarModel !== 'undefined'; });
        return ensureRig._p;
      }

      function paintCardAvatar(userId) {
        if (typeof API === 'undefined') return;
        ensureRig().then(function (ok) { if (ok) doPaintCardAvatar(userId); });
      }

      function doPaintCardAvatar(userId) {
        API.get('/economy/catalogue?viewerId=' + encodeURIComponent(userId))
          .then(function (cat) {
            var host = document.getElementById('pc-card-av');
            if (!host) return;
            var equipped = (cat.items || []).filter(function (i) { return i.is_equipped; });
            if (!equipped.length) return;          // keep the initials
            host.textContent = '';
            host.style.background = 'transparent';

            // The real model, animated — this card is how you look at someone,
            // and a still thumbnail says less about them than their character
            // moving does. Avatar3D drops to the flat rig by itself when there
            // is no WebGL or the GLB fails, so there is no branch here.
            if (typeof Avatar3D !== 'undefined') {
              // 120px, not 64: the figure is a full body framed head to
              // heel, so at thumbnail size it reads as a smudge rather than a
              // character. This is the smallest box the pose still survives.
              host.style.width = '120px';
              host.style.height = '120px';
              host.style.borderRadius = '12px';
              Avatar3D.mount(host, { equipped: equipped, size: 120, autoRotate: true });
            } else {
              host.innerHTML = AvatarModel.render({ equipped: equipped, size: 64 });
            }
          })
          .catch(function () { /* initials stay — a shop outage must not break the card */ });
      }

      var box = document.getElementById('pc-find-results');
      document.getElementById('pc-find').classList.add('open');
      document.querySelector('#pc-find-head h3').textContent = p.user_name;
      var qWrap = document.getElementById('pc-find-q');
      if (qWrap) qWrap.parentElement.style.display = 'none';

      box.innerHTML = [
        '<div style="display:flex;gap:.85rem;align-items:center;padding:.6rem .2rem 1rem">',
        // The character, not initials. Deliberately the FLAT rig and not
        // Avatar3D: this is a small card inside a popup, and pulling 548 KB of
        // three.js plus a 1 MB body GLB to draw it at 64px would cost more
        // than the whole page around it. AvatarModel exists for exactly this.
        '  <div class="pc-prow-av" id="pc-card-av" style="width:64px;height:64px;font-size:1rem;overflow:hidden">' + esc((p.user_name || 'P').substring(0, 2).toUpperCase()) + '</div>',
        '  <div>',
        '    <div style="font-size:1rem;font-weight:800;color:var(--text-primary,#e9edf7)">' + esc(p.user_name) + '</div>',
        '    <div class="pc-prow-sub">' + esc(pres) + '</div>',
        '    <div class="pc-prow-sub">Joined ' + esc(p.joinDate || '—') + '</div>',
        '  </div>',
        '</div>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.9rem">',
        statCell('Matches', p.matches),
        statCell('Wins', p.wins),
        statCell('Win rate', p.win_rate + '%'),
        '</div>',
        '<div style="display:flex;gap:.4rem;flex-wrap:wrap">' + actions + '</div>',
        '<div style="margin-top:1rem"><button class="pc-btn pc-btn-ghost" onclick="SocialUI.openFind()">← Back to search</button></div>'
      ].join('');

      paintCardAvatar(p.user_id != null ? p.user_id : p.id);
    },

    /** Let the drawer re-render itself after a friends change. */
    refreshFriends: function () {
      if (typeof global._drawerFriendsRender === 'function') global._drawerFriendsRender();
    }
  };

  function statCell(label, value) {
    return '<div style="background:var(--bg-secondary,#1b2334);border:1px solid var(--border-primary,#26304a);' +
           'border-radius:10px;padding:.5rem;text-align:center">' +
           '<div style="font-size:1.05rem;font-weight:800;color:var(--text-primary,#e9edf7)">' + esc(value) + '</div>' +
           '<div style="font-size:.65rem;color:var(--text-secondary,#93a0bd);text-transform:uppercase;letter-spacing:.05em">' + esc(label) + '</div>' +
           '</div>';
  }

  // Reset the header when the finder is reopened after a profile view.
  var _openFind = SocialUI.openFind;
  SocialUI.openFind = function () {
    _openFind();
    var h = document.querySelector('#pc-find-head h3');
    if (h) h.textContent = 'Find players';
    var q = document.getElementById('pc-find-q');
    if (q) q.parentElement.style.display = '';
  };

  global.SocialUI = SocialUI;
})(window);
