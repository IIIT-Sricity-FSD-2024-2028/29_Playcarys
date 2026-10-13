# PlayCarys — 3D Avatar Spec (approach B)

One base skeleton. One GLB per cosmetic, parented to a bone at runtime.

This is what keeps the shop real: a single baked character per look cannot swap
an outfit without re-exporting the whole model, so nothing could be sold
separately. Here the base body owns the skeleton and every hat, visor and pet is
its own small file attached to a named bone.

**It is already running.** `tools/make-placeholder-avatar.mjs` generates a rigged
placeholder body and crown, and `profile.html` renders them. Replace the two
files with real art and nothing else changes.

---

## 1. Where to get the models

Ranked for this project.

| Source | Licence | Why |
|---|---|---|
| **Mixamo** (Adobe) | Free with an Adobe ID | Rigged humanoids **already using the `mixamorig` bone names this rig expects**. Download as FBX → convert to GLB in Blender. Start here. |
| **Ready Player Me** | Free | Emits GLB on the same bone names. Good base body; their wardrobe is theirs, so use it for the **body only** and sell your own wearables on top. |
| **Quaternius / Kenney / Poly Pizza** | CC0 | Low-poly, tiny files. Best fit for the payload budget. Usually unrigged — fine for hats, not for the body. |
| **Sketchfab** | Filter **Downloadable + CC** | Widest choice. Check the licence per model; many are not free to use. |
| **Meshy / Tripo / Luma Genie** | Freemium | Real text-to-3D GLB. Good for props (crown, visor, pet). Weak at rigged humanoids — do not use for the body. |

> Gemini generates **images, not rigged 3D models**. Use it for the 2D layer art
> in `AVATAR-ASSET-SPEC.md`, not for these.

**Cheapest credible route:** one Mixamo character as the body, then hats and pets
from Quaternius or a text-to-3D tool.

---

## 2. Hard requirements

| Property | Value |
|---|---|
| Format | **`.glb`** (binary glTF 2.0). Not FBX, not OBJ, not `.gltf` + separate files |
| Up axis | **+Y** |
| Facing | **+Z** (toward the camera) |
| Scale | **1 unit = 1 metre**, character ≈ **1.7 m** tall |
| Origin | **Between the feet**, on the floor — not the hips, not the centre of mass |
| Body budget | ≤ **2 MB**, ≤ 30k triangles |
| Wearable budget | ≤ **300 KB**, ≤ 3k triangles |
| Textures | ≤ 1024², embedded in the GLB |
| Compression | Draco if you can — `DRACOLoader.js` is already vendored |

Scale and origin are auto-corrected at load (the viewer normalises height to
1.7 m and drops the model to the floor), so a model in the wrong units still
renders. Everything else is on you.

---

## 3. The skeleton

Bone names are the **mixamorig** set. Run the generator to see the reference:

```bash
node tools/make-placeholder-avatar.mjs
```

```
mixamorigHips
└─ mixamorigSpine → mixamorigSpine2
   ├─ mixamorigNeck → mixamorigHead
   ├─ mixamorigLeftArm  → mixamorigLeftHand
   └─ mixamorigRightArm → mixamorigRightHand
```

Matching normalises the name and prefers an **exact** hit, so
`attach_bone: "Head"` finds `mixamorig:Head`, `mixamorigHead`, `Head` or
`Armature|Head` — and not `HeadTop_End`. You do not have to rename anything
from Mixamo or Ready Player Me. See §3b for the details.

If a named bone genuinely is not found, the item is attached to the root and a
warning is logged — visibly wrong rather than silently missing, so a broken
purchase is obvious rather than looking like it did nothing.

---

## 3b. Converting an FBX (and the version trap)

**Check the version before doing anything else.** It is four bytes and it
decides whether any of your tools can open the file:

```bash
node -e "console.log(require('fs').readFileSync('character.fbx').readUInt32LE(23))"
```

| Reported | Meaning |
|---|---|
| **7100–7700** | Modern. Blender imports it, `FBX2glTF` converts it |
| **6400–7000** | three.js `FBXLoader` accepts it; Blender does **not** |
| **≤ 6100** | Legacy. **Blender and three.js both refuse it.** Convert first |

`character.fbx` in this repo is **6100** — a complete, correct 65-bone Mixamo
rig (`mixamorig:Hips` … `mixamorig:LeftToe_End`, with fingers and a "Take 001"
clip) wrapped in a container nothing modern will open. Verified: three.js
`FBXLoader` throws *"FBX version not supported, FileVersion: 6100"*, and
Blender's importer requires 7100 or later.

The content is fine. Only the container is wrong.

### Recommended: Collada → GLB, no Blender

Download the character from Mixamo as **Collada (.dae)** and convert it here:

```bash
node tools/dae-to-glb.mjs ../character.dae front-end/assets/avatar3d/101-standard-build.glb
```

That is the whole step. The tool reads the `.dae` with three.js, **normalises
height to 1.7 m and drops the origin to the feet** (Mixamo exports in
centimetres, so a raw import is 100× too large), keeps the skeleton and the
animation clip, writes the GLB, and prints the real bone names so you can set
`attach_bone` against the rig instead of guessing.

It also warns when a file has no bones — usable as a prop, not as a base body —
and when the result exceeds the 2 MB budget.

Its one dependency lives in `tools/` and is build-time only:

```bash
cd tools && npm install
```

### If you would rather use Blender

1. **Re-download as FBX Binary** and re-run the version check. 7100+ imports
   directly.
2. **Autodesk FBX Converter** (free, Windows) reads 6100 — convert to 7.x first.

Export with **+Y up**, **1 unit = 1 m**, origin **between the feet**, and
*Include → Armature* ticked.


### Units, and why `attach_offset` is in metres regardless

A Mixamo GLB keeps its authoring units on the scene node rather than baking
them into the vertices — the X Bot's bones sit at a **world scale of 0.0094**.
Anything parented to a bone inherits that, so a 0.13 m crown attached with
`attach_scale: 1` was drawn 1.2 mm across (invisible), and `attach_offset:
[0, 0.14, 0]` moved it 1.3 mm rather than 14 cm.

`Avatar3D` divides both by the bone's world scale, so **offsets and scales are
always true metres** no matter what units the base body was exported in. Author
to real-world size and ignore the model's internals.

Measured on the shipped X Bot, for reference when placing headgear:

| | |
|---|---|
| Head bone | y = **1.503 m** |
| Top of skull | y = **1.700 m** |
| Head bone → skull top | **0.197 m** |
| Bone world scale | 0.0094 |

`Crown of Carys` sits at `attach_offset: [0, 0.13, 0]`, `attach_scale: 0.85`.

### The conversion pipeline, end to end

```bash
# 1. Collada → GLB, normalised to 1.7 m with feet at y=0
node tools/dae-to-glb.mjs "../X Bot/X Bot.dae" /tmp/raw.glb

# 2. Weld + quantize down to something a page can load
node tools/optimize-glb.mjs /tmp/raw.glb front-end/assets/avatar3d/101-standard-build.glb
```

Measured on the X Bot: **7.96 MB → 0.98 MB (88% smaller)** with the rig intact
— 65 bones, 2 skinned meshes, 1 clip. Nearly all of it came from welding: the
Collada exporter writes non-indexed triangles, so 147,336 vertices collapsed to
28,374 for the same 49,112 triangles.

If a model is still over 2 MB after that, decimate:

```bash
node tools/optimize-glb.mjs in.glb out.glb --ratio 0.5
```

### Bone names in the wild

Mixamo writes a namespace: `mixamorig:Head`, not `mixamorigHead`. The matcher
normalises both — it strips anything before a `:` or `|`, drops a leading
`mixamorig`, removes punctuation, then matches **exactly** before falling back
to a substring. So `attach_bone: "Head"` finds `mixamorig:Head` and *not*
`mixamorig:HeadTop_End`, and `"Spine2"` does not collide with `"Spine"`.

Exact-first matters on a real 65-bone rig: plain substring matching would let
`"Arm"` land on `ForeArm` or `LeftArm` depending on traversal order. Name the
bone precisely (`LeftHand`, not `Hand`) and it is unambiguous.

---

## 4. Two kinds of wearable

### Bone-attached (headgear, face, pet, aura)

A **plain mesh**, no skeleton, **modelled at the origin**. The viewer positions
it in the bone's local space, so a crown authored at head height ends up twice
as high.

```ts
{ id: 106, name: 'Crown of Carys', slot: 'headgear',
  model_url: '/assets/avatar3d/106-crown-of-carys.glb',
  attach_bone: 'Head',
  attach_offset: [0, 0.14, 0],   // metres, bone-local
  attach_rotation: [0, 0, 0],    // radians
  attach_scale: 1 }
```

Tune `attach_offset` rather than re-exporting — that is exactly why it is data.

### Skinned (outfit)

A **skinned mesh bound to the same skeleton**, with the same bone names. It is
added beside the body, not parented to a bone, so it deforms with animation.
Leave `attach_bone` unset — the `outfit` slot is what selects this path.

In Blender: import the base body, model the clothing over it, parent to the same
armature with automatic weights, then export **only the clothing mesh** with
*Include → Armature* ticked.

> If the outfit covers the body, also hide the body underneath or you get
> z-fighting where they intersect. Simplest fix is modelling the outfit slightly
> proud of the skin.

---

## 5. Where files go

```
front-end/assets/avatar3d/<id>-<slug>.glb

front-end/assets/avatar3d/101-standard-build.glb
front-end/assets/avatar3d/106-crown-of-carys.glb
```

Then set `model_url` in `AVATAR_WEARABLES` in `back-end/src/data/store.ts`. The
seed **backfills rig fields onto rows already on disk**, so adding a model to an
item that shipped without one works without a migration — rebuild and restart.

---

## 6. Performance rules

The platform's per-page payload was just cut 61%. A careless GLB gives it all
back:

- **Never** route models through `db-export`. They are static files under
  `/assets/`, fetched by the viewer, and nothing else.
- The 3D viewer loads **only on a profile**. three.js (548 KB vendored) is
  dynamically imported inside `Avatar3D.mount()` and costs nothing elsewhere.
- Every other surface — shop cards, nav, match rows — uses the flat 2D rig.
- Total for one profile view: three.js + body + equipped wearables. **Keep it
  under ~3 MB.**

`Avatar3D.unmount()` disposes the WebGL context on `pagehide`; browsers cap
contexts at roughly 16, so a profile visited repeatedly would otherwise stop
rendering.

---

## 7. Checking a model before doing the whole set

Do the **body first** — everything else is positioned relative to it.

1. Export to `front-end/assets/avatar3d/101-standard-build.glb`
2. Rebuild the backend, open `/pages/player/profile.html`
3. Expect: figure upright, facing you, feet at the bottom, slowly rotating
4. Then equip Crown of Carys and confirm it sits **on the head**

| Symptom | Cause |
|---|---|
| Lying on its back | Z-up export. Re-export Y-up |
| Facing away | Rotate 180° on Y before export |
| Crown inside the skull | `attach_offset` too low — raise Y |
| Crown at the feet | Bone not found; check the console warning |
| Outfit does not move | Exported without the armature |

---

## 8. Deliberately not supported

- **Per-game skins.** These are platform-wide profile cosmetics; what a game
  bundle does internally is the publisher's business.
- **Physics** — no cloth or hair simulation.
- **Facial animation / morph targets.** The rig plays the base body's first
  animation clip and nothing else.
