# PlayCarys — Avatar Asset Spec

What to generate, and exactly how it has to be shaped so it drops straight into
the rig with no code change.

The avatar renders today with no artwork at all: `js/avatar-model.js` falls back
to a vector figure plus the item's emoji `preview`. Every PNG you add replaces
one layer. Nothing breaks while the set is incomplete, and you can do one item
at a time.

---

## 1. The hard rules

Every asset, without exception:

| Property | Value |
|---|---|
| Format | **PNG-32 with real alpha** (not white, not checkerboard) |
| Canvas | **512 × 512**, square |
| Figure height | occupies **y = 60 → 470** |
| Ground line | feet rest on **y = 470** |
| Centre line | body centred on **x = 256** |
| Head centre | **(256, 132)**, head radius ≈ 56 px |
| View | straight-on **front view**, no 3/4 turn, no perspective |
| Pose | **identical A-pose in every asset** — arms slightly out, feet together |
| Lighting | flat, front-lit, soft top-left key. **No cast shadow on the ground** |
| Max size | **200 KB** per file (they are downloaded per profile view) |

The pose rule is the one that matters most. Every layer is stacked on the same
coordinates, so a jacket drawn with the arms lower than the body will float.
Generate the **body first**, then feed that exact image back to Gemini as a
reference for every other layer.

---

## 2. The slots

Painted back to front. The number is the z-order in `avatar-model.js`.

| z | slot | What it is | Must cover | Must NOT include |
|---|---|---|---|---|
| 10 | `aura` | Effect behind the figure — embers, glow, rings | Full 512 box | The figure itself |
| 20 | `pet` | Companion at the shoulder or feet | One corner only | Anything centre-frame |
| 30 | `body` | Bare figure, skin + underwear | y 60–470 | Clothes, hair, face detail |
| 40 | `outfit` | Torso + legs clothing | y ~190–470 | Head, hands above wrist |
| 50 | `hair` | Hair only | Around (256,132) | Face, ears |
| 60 | `headgear` | Helmet, cap, crown | y ~60–190 | Face below the brow |
| 70 | `face` | Visor, mask, glasses | y ~110–160 | Anything below the chin |

**Transparency is the whole mechanism.** An outfit PNG must be transparent
everywhere except the clothing, or it will paint over the head. A headgear PNG
that includes a face will hide the body's face underneath it.

---

## 3. Prompt template for Gemini

Use this skeleton and swap the bracketed part. Keep every other line — the
constraints are what make the layers stack.

```
A single [ITEM DESCRIPTION] for a 2D game avatar, front view, flat vector
game-art style, bold clean outlines, saturated cyberpunk palette (cyan #00d4ff,
violet #7c3aed, amber #f59e0b on dark).

Composition: centred on a 512x512 square canvas, fully transparent background,
subject occupies the vertical band y=[SLOT BAND] of the frame.

Strictly: transparent PNG with alpha, no background, no ground shadow, no
scenery, no text, no watermark, no border, no character other than the item
itself, front-facing straight-on view, flat even lighting.
```

### Ready-made prompts for the nine seeded items

| id | Item | Bracket text | Slot band |
|---|---|---|---|
| 101 | Standard Build | `neutral human figure in a plain grey bodysuit, A-pose, arms slightly away from the body, feet together` | y=60–470 |
| 102 | Street Jacket | `worn denim hooded jacket and dark cargo trousers, empty — no person wearing it, laid out in an A-pose silhouette` | y=190–470 |
| 103 | Circuit Suit | `sleek black bodysuit with glowing cyan circuit traces along the seams, empty, A-pose silhouette` | y=190–470 |
| 104 | Champion Plate | `ornate gold-and-violet tournament armour chestplate with layered pauldrons and greaves, empty, A-pose silhouette` | y=190–470 |
| 105 | Pilot Helm | `scuffed military flight helmet with a cracked chin strap, front view, hollow — no head inside` | y=60–190 |
| 106 | Crown of Carys | `ornate gold crown set with cyan gemstones, front view, floating, hollow` | y=60–190 |
| 107 | Neon Visor | `half-mirrored wraparound visor with a horizontal cyan light sweep, front view, floating, hollow` | y=110–160 |
| 108 | Ember Aura | `swirling ring of rising orange embers and soft heat glow, radial, hollow centre with nothing in the middle` | full frame |
| 109 | Pixel Companion | `small friendly cyan pixel-art drake with folded wings, hovering, side-on` | bottom-right quadrant only |

> For 102–104, "empty / no person wearing it" is load-bearing. If Gemini draws a
> model inside the jacket you get two bodies stacked once it is equipped.

---

## 4. Where files go

```
front-end/assets/avatar/<slot>/<id>-<slug>.png

front-end/assets/avatar/body/101-standard-build.png
front-end/assets/avatar/outfit/103-circuit-suit.png
front-end/assets/avatar/headgear/106-crown-of-carys.png
```

Then set `asset_url` on the row — that is the entire integration:

```js
// back-end/src/data/store.ts, in AVATAR_WEARABLES
{ id: 106, name: 'Crown of Carys', /* … */
  asset_url: '/assets/avatar/headgear/106-crown-of-carys.png' },
```

The rig prefers `asset_url` and falls back to `preview`, so a half-finished set
renders as art where it exists and emoji where it does not.

---

## 5. Checking a layer before committing to the set

Do **one** item first — 103 Circuit Suit is the best test, it spans the whole
torso — and confirm it lines up before generating the other eight:

1. Save it to `front-end/assets/avatar/outfit/103-circuit-suit.png`
2. Add `asset_url` to row 103
3. Rebuild the backend, open `/pages/player/shop.html`
4. The suit should sit on the shoulders with the head clear above it

If it floats high, the figure was drawn shorter than y=60–470. If the head is
covered, the alpha channel is not actually transparent — check it in an editor,
not in a preview that renders transparency as white.

---

## 6. What is deliberately NOT in scope

- **Animation.** `victory_animation` items are still CSS/emoji. Sprite sheets
  would need a frame-stepping renderer the rig does not have.
- **3D models.** The rig is a 2D layer stack. A glTF viewer is a different
  component; don't generate models expecting these slots to take them.
- **Per-game skins.** These are platform-wide profile cosmetics. A skin inside
  a game bundle is that publisher's business.
