/**
 * PlayCarys — Avatar Model
 * =========================
 *
 * A layered character the player actually wears their cosmetics on.
 *
 * The shop sold 30 items and none of them went anywhere: every seeded category
 * (profile_theme, avatar_frame, banner, name_effect, victory_animation,
 * chat_emote) decorates the space AROUND a player. Buying a "Diamond Ring"
 * drew a gem in a box. There was no figure, so there was nothing to dress.
 *
 * This renders a rig — an ordered stack of slots — and composes whatever the
 * player has equipped onto it.
 *
 * WORKS WITH NO ARTWORK. Every slot falls back to a built-in vector figure or
 * to the item's existing `preview` (a CSS gradient or an emoji), so the model
 * is usable today. Each generated PNG dropped into /assets/avatar/ upgrades one
 * layer, with no migration and no code change: set `asset_url` on the row.
 *
 * Canonical frame: 512 x 512, transparent, figure centred, feet on y=470.
 * See docs/AVATAR-ASSET-SPEC.md for what each layer must look like.
 */
(function () {
  'use strict';

  // Paint order. Back to front — an aura is behind the body, a visor in front
  // of the head. Explicit numbers rather than array order so an item can
  // override one (a cape needs to sit behind the body but in front of the aura).
  var SLOT_LAYER = {
    aura: 10,
    pet: 20,
    body: 30,
    outfit: 40,
    hair: 50,
    headgear: 60,
    face: 70
  };

  /**
   * The default figure, drawn in SVG.
   *
   * Deliberately neutral and unmistakably a placeholder silhouette rather than
   * an attempt at a character: it exists so the rig is never empty, and so a
   * generated body PNG has something to be compared against for scale. It uses
   * the same 512-box and the same ground line as every real asset must.
   */
  function defaultBody(skin) {
    var s = skin || '#c68642';
    return [
      '<svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">',
        '<rect x="222" y="330" width="30" height="140" rx="15" fill="#2b3450"/>',
        '<rect x="262" y="330" width="30" height="140" rx="15" fill="#2b3450"/>',
        '<rect x="196" y="196" width="120" height="150" rx="46" fill="#38415e"/>',
        '<rect x="166" y="206" width="28" height="120" rx="14" fill="', s, '"/>',
        '<rect x="318" y="206" width="28" height="120" rx="14" fill="', s, '"/>',
        '<rect x="240" y="168" width="32" height="40" rx="14" fill="', s, '"/>',
        '<circle cx="256" cy="132" r="56" fill="', s, '"/>',
      '</svg>'
    ].join('');
  }

  /** An equipped item is art if it names one, otherwise it is a preview token. */
  function layerHtml(item) {
    if (!item) return '';
    var z = item.layer != null ? item.layer : (SLOT_LAYER[item.slot] || 50);
    var base = 'position:absolute;inset:0;z-index:' + z + ';' +
      'background-repeat:no-repeat;background-position:center;background-size:contain;';

    if (item.asset_url) {
      return '<div class="pc-av-layer" style="' + base +
             'background-image:url(' + JSON.stringify(item.asset_url) + ')"' +
             ' data-slot="' + (item.slot || '') + '"></div>';
    }

    // No art yet. An emoji preview is drawn as a badge on the right slot rather
    // than stretched over the whole figure, which is what made the old preview
    // boxes read as "a gem in a box".
    var p = String(item.preview || '');
    var isEmoji = p && p.indexOf('gradient') === -1 && p.indexOf('#') === -1 && p.length <= 6;
    if (isEmoji) {
      var spots = { headgear: '12%', face: '26%', hair: '16%', pet: '70%', aura: '40%' };
      var spot = spots[item.slot] || '40%';
      return '<div class="pc-av-layer" style="' + base + 'display:flex;align-items:flex-start;' +
             'justify-content:center;font-size:2.4rem;padding-top:' + spot + '"' +
             ' data-slot="' + (item.slot || '') + '">' + p + '</div>';
    }
    if (p.indexOf('gradient') !== -1) {
      return '<div class="pc-av-layer" style="' + base + 'background-image:' + p +
             ';opacity:.5;mix-blend-mode:screen;border-radius:50%"' +
             ' data-slot="' + (item.slot || '') + '"></div>';
    }
    return '';
  }

  var AvatarModel = {
    SLOT_LAYER: SLOT_LAYER,

    /** Slots in paint order — the shop uses this to lay out its slot picker. */
    slots: function () {
      return Object.keys(SLOT_LAYER).sort(function (a, b) {
        return SLOT_LAYER[a] - SLOT_LAYER[b];
      });
    },

    /**
     * Render the figure.
     *
     * @param {Object} opts
     * @param {Array}  opts.equipped  cosmetic rows the player has equipped
     * @param {String} opts.name      shown under the figure
     * @param {Number} opts.size      px, square. Default 260.
     */
    render: function (opts) {
      var o = opts || {};
      var equipped = (o.equipped || []).filter(Boolean);
      var size = o.size || 260;

      var bySlot = {};
      equipped.forEach(function (i) { if (i.slot) bySlot[i.slot] = i; });

      // Decorations still render where they always did — around the figure,
      // not on it. This is the distinction the `slot` field draws.
      var theme = equipped.filter(function (i) { return i.category === 'profile_theme'; })[0];
      var frame = equipped.filter(function (i) { return i.category === 'avatar_frame'; })[0];
      var nameFx = equipped.filter(function (i) { return i.category === 'name_effect'; })[0];

      var stage = Object.keys(bySlot)
        .sort(function (a, b) { return (SLOT_LAYER[a] || 0) - (SLOT_LAYER[b] || 0); })
        .map(function (s) { return layerHtml(bySlot[s]); })
        .join('');

      // A real body PNG replaces the vector figure entirely.
      var bodyArt = (bySlot.body && bySlot.body.asset_url)
        ? ''
        : '<div style="position:absolute;inset:0;z-index:' + SLOT_LAYER.body + '">' +
            defaultBody(o.skin) + '</div>';

      var themeBg = (theme && String(theme.preview || '').indexOf('gradient') !== -1)
        ? theme.preview
        : 'radial-gradient(circle at 50% 30%, rgba(124,58,237,.22), transparent 70%)';

      var ring = frame
        ? '<div style="position:absolute;inset:0;border-radius:50%;z-index:90;' +
          'box-shadow:0 0 0 3px rgba(0,212,255,.55), 0 0 26px rgba(0,212,255,.35);' +
          'pointer-events:none"></div>' +
          '<div style="position:absolute;right:6%;top:6%;z-index:91;font-size:1.4rem">' +
          (frame.preview || '') + '</div>'
        : '';

      var nameStyle = 'font-weight:700;';
      if (nameFx) {
        var np = String(nameFx.preview || '');
        if (np.indexOf('gradient') !== -1) {
          nameStyle += 'background:' + np + ';-webkit-background-clip:text;' +
                       'background-clip:text;color:transparent;';
        } else if (np.indexOf('#') !== -1) {
          nameStyle += 'text-shadow:' + np + ';';
        }
      }

      return '' +
        '<div class="pc-avatar" style="width:' + size + 'px">' +
          '<div style="position:relative;width:' + size + 'px;height:' + size + 'px;' +
               'border-radius:50%;overflow:hidden;background:' + themeBg + '">' +
            stage + bodyArt + ring +
          '</div>' +
          (o.name
            ? '<div style="text-align:center;margin-top:.6rem;' + nameStyle + '">' + o.name + '</div>'
            : '') +
        '</div>';
    },

    /** Paint into an element. */
    mount: function (el, opts) {
      var node = typeof el === 'string' ? document.getElementById(el) : el;
      if (node) node.innerHTML = this.render(opts);
      return node;
    }
  };

  window.AvatarModel = AvatarModel;
})();
