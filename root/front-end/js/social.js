// ============================================================
//  SOCIAL — friends, player search and stored chat.
//
//  Every operation here is a REAL REST CALL to its own endpoint.
//
//  That is deliberate and it is the opposite of how the rest of this app has
//  worked. Everything else mutates the local `DB` object and then POSTs the
//  ENTIRE database to /db-import. Two consequences, both of which bite here in
//  particular: whichever tab saves last wins, so a message sent on one laptop
//  could be erased by an unrelated save on another; and the graded requirement
//  "all CRUD operations must be backend-driven" was failing everywhere except
//  one page.
//
//  Chat is the worst possible feature to build on a whole-database sync — two
//  people typing at once is exactly the case it loses.
// ============================================================

(function (global) {
  'use strict';

  function base() {
    return global.PC_API || ('http://' + (global.location.hostname || 'localhost') + ':3000/api/v1');
  }

  function myId() {
    try {
      var s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      return s && s.userId != null ? Number(s.userId) : null;
    } catch (e) { return null; }
  }

  function headers() {
    var h = { 'Content-Type': 'application/json' };
    try {
      var s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
      if (s && s.role) h['role'] = s.role;
      var tok = localStorage.getItem('playcarys_api_token');
      if (tok) h['Authorization'] = 'Bearer ' + tok;
    } catch (e) { /* signed out */ }
    return h;
  }

  async function call(path, method, body) {
    var opts = { method: method || 'GET', headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(base() + path, opts);
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      // Surface the server's own words. These messages are written to be read
      // by a player ("ToxicPlayer declined recently. You can ask again in 24
      // hour(s)."), so replacing them with a generic failure loses the reason.
      throw new Error((data && data.message) || ('Request failed (' + res.status + ')'));
    }
    return data;
  }

  var Social = {
    // ── reads ───────────────────────────────────────────────
    searchPlayers: function (q) {
      return call('/players/search?q=' + encodeURIComponent(q) + '&viewerId=' + myId());
    },
    profileOf: function (userId) {
      return call('/players/' + userId + '/profile?viewerId=' + myId());
    },
    friends: function () { return call('/friends/' + myId()); },
    requests: function () { return call('/friends/' + myId() + '/requests'); },
    conversation: function (withUserId) { return call('/messages/' + myId() + '/' + withUserId); },

    // ── writes ──────────────────────────────────────────────
    sendRequest: function (toUser) {
      return call('/friends/request', 'POST', { from_user: myId(), to_user: Number(toUser) });
    },
    respond: function (requestId, action) {
      return call('/friends/requests/' + requestId + '/respond', 'POST', { user_id: myId(), action: action });
    },
    removeFriend: function (friendId) {
      return call('/friends/' + myId() + '/' + friendId, 'DELETE');
    },
    sendMessage: function (toUser, body) {
      return call('/messages', 'POST', { from_user: myId(), to_user: Number(toUser), body: body });
    },
    /** Recipient-side receipt. Never called by the sender — see the endpoint. */
    markDelivered: function (fromUser) {
      return call('/messages/delivered', 'POST', { user_id: myId(), from_user: Number(fromUser) });
    },
    deleteConversation: function (withUserId) {
      return call('/messages/' + myId() + '/' + withUserId, 'DELETE');
    },

    myId: myId
  };

  // ══════════════════════════════════════════════════════════
  //  CHAT OVERLAY — draggable, closable, and it remembers.
  //
  //  What this replaces: toggleFriendChat(), which slid open a bare input box
  //  under the friend's name. Nothing was ever stored, so there was no history
  //  to show — it rendered an empty box every time, and the "message" it sent
  //  was actually a NOTIFICATION addressed to the other player. A conversation
  //  made of notifications cannot be a conversation: you could not see your own
  //  side of it.
  // ══════════════════════════════════════════════════════════

  var CSS_ID = 'pc-chat-styles';
  var CSS = [
    '#pc-chat{position:fixed;z-index:9999;width:330px;max-width:calc(100vw - 24px);',
    '  background:var(--bg-card,#141a2a);border:1px solid var(--border-primary,#26304a);',
    '  border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden}',
    '#pc-chat.open{display:flex}',
    '#pc-chat-head{display:flex;align-items:center;gap:.55rem;padding:.6rem .7rem;cursor:move;',
    '  background:rgba(124,58,237,.12);border-bottom:1px solid var(--border-primary,#26304a);user-select:none}',
    '#pc-chat-av{width:28px;height:28px;border-radius:50%;background:var(--accent-purple,#7c3aed);color:#fff;',
    '  display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;flex-shrink:0}',
    '#pc-chat-who{flex:1;min-width:0}',
    '#pc-chat-name{font-size:.85rem;font-weight:700;color:var(--text-primary,#e9edf7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#pc-chat-pres{font-size:.68rem;color:var(--text-secondary,#93a0bd);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.pc-chat-ico{background:none;border:none;color:var(--text-secondary,#93a0bd);cursor:pointer;font-size:.9rem;',
    '  padding:.15rem .3rem;border-radius:6px;line-height:1}',
    '.pc-chat-ico:hover{background:rgba(255,255,255,.08);color:var(--text-primary,#e9edf7)}',
    '#pc-chat-body{flex:1;min-height:190px;max-height:46vh;overflow-y:auto;padding:.6rem .7rem;display:flex;flex-direction:column;gap:.4rem}',
    '.pc-msg{max-width:78%;padding:.35rem .55rem;border-radius:10px;font-size:.78rem;line-height:1.35;word-break:break-word}',
    '.pc-msg.me{align-self:flex-end;background:var(--accent-purple,#7c3aed);color:#fff;border-bottom-right-radius:3px}',
    '.pc-msg.them{align-self:flex-start;background:var(--bg-secondary,#1b2334);color:var(--text-primary,#e9edf7);border-bottom-left-radius:3px}',
    '.pc-meta{font-size:.6rem;opacity:.75;margin-top:.15rem;text-align:right}',
    '#pc-chat-foot{display:flex;gap:.4rem;padding:.55rem .7rem;border-top:1px solid var(--border-primary,#26304a)}',
    '#pc-chat-emote{background:transparent;border:1px solid var(--border-primary,#26304a);',
    '  border-radius:8px;cursor:pointer;font-size:1rem;padding:0 .5rem;line-height:1}',
    '#pc-chat-emote:hover{border-color:var(--accent-purple,#7c3aed)}',
    '#pc-chat-emotes{display:none;flex-wrap:wrap;gap:.25rem;padding:.5rem .7rem;',
    '  max-height:9rem;overflow-y:auto;border-top:1px solid var(--border-primary,#26304a)}',
    '#pc-chat-emotes.open{display:flex}',
    '#pc-chat-emotes button{background:transparent;border:none;cursor:pointer;font-size:1.25rem;',
    '  line-height:1;padding:.18rem .28rem;border-radius:6px}',
    '#pc-chat-emotes button:hover{background:rgba(124,58,237,.22)}',
    '#pc-chat-emotes .pc-emote-empty{font-size:.7rem;color:var(--text-secondary,#8b96ad);padding:.2rem}',
    '#pc-chat-input{flex:1;background:var(--bg-secondary,#1b2334);border:1px solid var(--border-primary,#26304a);',
    '  color:var(--text-primary,#e9edf7);border-radius:8px;padding:.35rem .5rem;font-size:.78rem;outline:none}',
    '#pc-chat-send{background:var(--accent-purple,#7c3aed);color:#fff;border:none;border-radius:8px;',
    '  padding:.35rem .7rem;font-size:.75rem;font-weight:700;cursor:pointer}',
    '#pc-chat-empty{margin:auto;text-align:center;color:var(--text-secondary,#93a0bd);font-size:.75rem;padding:1rem}'
  ].join('\n');

  var state = { withId: null, withName: '', poll: null };

  function ensureDom() {
    if (!document.getElementById(CSS_ID)) {
      var st = document.createElement('style');
      st.id = CSS_ID;
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (document.getElementById('pc-chat')) return;

    var box = document.createElement('div');
    box.id = 'pc-chat';
    box.innerHTML = [
      '<div id="pc-chat-head">',
      '  <div id="pc-chat-av"></div>',
      '  <div id="pc-chat-who"><div id="pc-chat-name"></div><div id="pc-chat-pres"></div></div>',
      '  <button class="pc-chat-ico" id="pc-chat-del" title="Delete this conversation (for you only)">🗑</button>',
      '  <button class="pc-chat-ico" id="pc-chat-close" title="Close">✕</button>',
      '</div>',
      '<div id="pc-chat-body"></div>',
      // The emote tray. Emote packs were sold for months and there was nowhere
      // to use one — this is the picker that makes owning them mean something.
      // It lists ONLY the glyphs the sender's packs grant.
      '<div id="pc-chat-emotes"></div>',
      '<div id="pc-chat-foot">',
      '  <button id="pc-chat-emote" title="Your emotes">🙂</button>',
      '  <input id="pc-chat-input" type="text" placeholder="Type a message…" maxlength="2000" autocomplete="off"/>',
      '  <button id="pc-chat-send">Send</button>',
      '</div>'
    ].join('');
    document.body.appendChild(box);

    // Bottom-right by default, and it stays where the player drags it.
    box.style.right = '18px';
    box.style.bottom = '18px';

    document.getElementById('pc-chat-close').onclick = Social.closeChat;
    document.getElementById('pc-chat-del').onclick = onDeleteConversation;
    document.getElementById('pc-chat-send').onclick = onSend;

    // ── Emote tray ────────────────────────────────────────────
    var emoteBtn = document.getElementById('pc-chat-emote');
    var tray = document.getElementById('pc-chat-emotes');
    if (emoteBtn && tray) {
      emoteBtn.onclick = function () {
        if (tray.classList.contains('open')) { tray.classList.remove('open'); return; }

        var me = (typeof Auth !== 'undefined' && Auth.getSession()) || {};
        var paint = function () {
          var glyphs = (typeof PlayerSkin !== 'undefined')
            ? PlayerSkin.emotes(me.userId) : [];
          if (!glyphs.length) {
            // Say why it is empty and where to fix it. An empty tray with no
            // explanation reads as broken rather than as "buy a pack".
            tray.innerHTML =
              '<div class="pc-emote-empty">No emote packs yet — the Shop sells them.</div>';
            return;
          }
          tray.innerHTML = glyphs.map(function (g) {
            return '<button type="button" data-e="' + g + '">' + g + '</button>';
          }).join('');
          Array.prototype.forEach.call(tray.querySelectorAll('button'), function (b) {
            b.onclick = function () {
              var input = document.getElementById('pc-chat-input');
              input.value += b.getAttribute('data-e');
              input.focus();
            };
          });
        };

        tray.classList.add('open');
        tray.innerHTML = '<div class="pc-emote-empty">Loading…</div>';
        if (typeof PlayerSkin !== 'undefined' && me.userId != null) {
          PlayerSkin.preload([me.userId]).then(paint);
        } else {
          paint();
        }
      };
    }
    document.getElementById('pc-chat-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); onSend(); }
    });

    makeDraggable(box, document.getElementById('pc-chat-head'));
  }

  function makeDraggable(box, handle) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('pc-chat-ico')) return;   // buttons are not a drag handle
      var r = box.getBoundingClientRect();
      // Switch from right/bottom anchoring to left/top the moment it moves, or
      // the box fights the drag.
      box.style.left = r.left + 'px';
      box.style.top = r.top + 'px';
      box.style.right = 'auto';
      box.style.bottom = 'auto';
      dragging = true; sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var nx = ox + (e.clientX - sx);
      var ny = oy + (e.clientY - sy);
      // Keep it on screen — a box dragged off the edge cannot be dragged back.
      nx = Math.max(4, Math.min(nx, window.innerWidth - box.offsetWidth - 4));
      ny = Math.max(4, Math.min(ny, window.innerHeight - 40));
      box.style.left = nx + 'px';
      box.style.top = ny + 'px';
    });
    document.addEventListener('mouseup', function () { dragging = false; });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeOf(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function paint() {
    var body = document.getElementById('pc-chat-body');
    if (!body || state.withId == null) return;

    var rows;
    try { rows = await Social.conversation(state.withId); }
    catch (e) { body.innerHTML = '<div id="pc-chat-empty">Could not load this conversation.</div>'; return; }

    if (!rows.length) {
      body.innerHTML = '<div id="pc-chat-empty">No messages yet.<br>Say something.</div>';
    } else {
      var me = Social.myId();
      body.innerHTML = rows.map(function (m) {
        var mine = Number(m.from_user) === Number(me);
        // Status is shown on MY messages only. Telling me that a message the
        // other person sent is "delivered" says nothing about anything I did.
        var meta = timeOf(m.sent_at) + (mine ? ' · ' + (m.status === 'delivered' ? '✓✓ Delivered' : '✓ Sent') : '');
        return '<div class="pc-msg ' + (mine ? 'me' : 'them') + '">' + esc(m.body) +
               '<div class="pc-meta">' + esc(meta) + '</div></div>';
      }).join('');
      body.scrollTop = body.scrollHeight;
    }

    // I have the messages on screen, so I can honestly say they arrived.
    try { await Social.markDelivered(state.withId); } catch (e) { /* not fatal */ }
  }

  async function onSend() {
    var input = document.getElementById('pc-chat-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || state.withId == null) return;
    input.value = '';
    try {
      await Social.sendMessage(state.withId, text);
      await paint();
    } catch (e) {
      input.value = text;                        // give it back rather than lose it
      if (typeof Toast !== 'undefined') Toast.error(e.message);
    }
  }

  function onDeleteConversation() {
    if (state.withId == null) return;
    var name = state.withName;
    var run = async function () {
      try {
        await Social.deleteConversation(state.withId);
        await paint();
        if (typeof Toast !== 'undefined') Toast.info('Conversation cleared for you. ' + name + ' still has their copy.');
      } catch (e) {
        if (typeof Toast !== 'undefined') Toast.error(e.message);
      }
    };
    // The wording matters: this is the one-sided delete, and a player has to be
    // able to tell it apart from removing the friend.
    if (typeof confirmAction === 'function') {
      confirmAction('Delete conversation',
        'This clears the conversation for YOU only — ' + name + ' keeps their copy. Continue?', run);
    } else if (confirm('Clear this conversation for you only?')) { run(); }
  }

  Social.openChat = async function (userId, name, presenceText) {
    ensureDom();
    state.withId = Number(userId);
    state.withName = name || 'Player';

    document.getElementById('pc-chat-name').textContent = state.withName;
    document.getElementById('pc-chat-av').textContent =
      (name || 'P').substring(0, 2).toUpperCase();
    document.getElementById('pc-chat-pres').textContent = presenceText || '';
    document.getElementById('pc-chat').classList.add('open');
    document.getElementById('pc-chat-input').focus();

    await paint();

    // Poll while the window is open. The socket only broadcasts db-import
    // saves, and these endpoints deliberately do not go through db-import.
    if (state.poll) clearInterval(state.poll);
    state.poll = setInterval(function () {
      if (!document.hidden) paint();
    }, 4000);
  };

  Social.closeChat = function () {
    var box = document.getElementById('pc-chat');
    if (box) box.classList.remove('open');
    if (state.poll) { clearInterval(state.poll); state.poll = null; }
    state.withId = null;
  };

  /** Human-readable presence, e.g. "Playing Hill Climbing". */
  Social.presenceText = function (p) {
    if (!p) return 'Offline';
    if (p.state === 'playing') return p.game ? ('Playing ' + p.game) : 'Playing';
    if (p.state === 'online') return 'Online';
    return 'Offline';
  };

  global.Social = Social;
})(window);
