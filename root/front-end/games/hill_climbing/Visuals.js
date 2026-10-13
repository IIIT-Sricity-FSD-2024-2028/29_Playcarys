// ─────────────────────────────────────────────────────────────────────────────
//  Visuals.js — atmosphere, background, particles and HUD.
//
//  Everything in here is presentation only: it reads the world (camX/camY/panX/
//  panY/car) but never writes to it, so the physics and scoring in sketch.js are
//  untouched by anything below.
//
//  Three rules the rest of this file follows:
//    1. Anything static is rendered ONCE into an offscreen buffer and blitted.
//       Gradients and soft shapes are expensive per-frame; the sky, the clouds
//       and the particle sprites are all pre-baked.
//    2. Anything scattered across the world (trees, rocks, grass) is seeded from
//       its own world coordinate, never from random(). A frame-to-frame random
//       makes the scenery boil.
//    3. Distance is drawn, not implied: far layers lose contrast and saturation
//       toward the horizon colour. That single trick is what turns flat
//       silhouettes into depth.
// ─────────────────────────────────────────────────────────────────────────────

var vfx = {
    sky:        null,   // pre-rendered sky + sun
    clouds:     [],     // pre-rendered cloud sprites
    puffDust:   null,   // soft particle sprites
    puffSmoke:  null,
    puffSpark:  null,
    grads:      {},     // cached canvas gradients, keyed by purpose+size
    built:      false,
    fontHUD:    'Rajdhani, Segoe UI, sans-serif',
    fontTitle:  'Righteous, Segoe UI, sans-serif'
};

// Horizon colour — the tint everything distant fades toward.
var HAZE = [196, 222, 238];

// ── Build-once assets ────────────────────────────────────────────────────────
function vfxBuild() {
    vfxBuildCloudSprites();
    vfxBuildParticleSprites();
    vfx.built = true;
}

function vfxBuildCloudSprites() {
    vfx.clouds = [];
    for (var v = 0; v < 5; v++) {
        var W = 460, H = 240;
        var g = createGraphics(W, H);
        var ctx = g.drawingContext;

        // A cloud is a run of lobes along a shallow arc. Building the silhouette
        // from radial gradients rather than hard ellipses is the whole reason
        // these read as vapour instead of as overlapping circles.
        var lobes = [];
        var n = 7 + floor(random(4));
        for (var i = 0; i < n; i++) {
            var t = i / (n - 1);
            lobes.push({
                x: 70 + t * (W - 140) + random(-20, 20),
                y: H * 0.60 - Math.sin(t * Math.PI) * H * 0.24 + random(-12, 12),
                r: (30 + Math.sin(t * Math.PI) * 52) * random(0.78, 1.18)
            });
        }

        // Pass 1 — shaded underbelly, offset down.
        for (var i = 0; i < lobes.length; i++) {
            var L = lobes[i];
            var cy = L.y + L.r * 0.30;
            var rg = ctx.createRadialGradient(L.x, cy, L.r * 0.05, L.x, cy, L.r);
            rg.addColorStop(0.0, 'rgba(158,186,214,0.90)');
            rg.addColorStop(0.6, 'rgba(176,201,224,0.60)');
            rg.addColorStop(1.0, 'rgba(190,212,232,0)');
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(L.x, cy, L.r, 0, 6.2832); ctx.fill();
        }
        // Pass 2 — the lit mass.
        for (var i = 0; i < lobes.length; i++) {
            var L = lobes[i];
            var cy = L.y - L.r * 0.06;
            var rg2 = ctx.createRadialGradient(L.x - L.r * 0.25, cy - L.r * 0.28, L.r * 0.05,
                                               L.x, cy, L.r * 0.98);
            rg2.addColorStop(0.0, 'rgba(255,255,255,1)');
            rg2.addColorStop(0.5, 'rgba(252,253,255,0.97)');
            rg2.addColorStop(0.85, 'rgba(240,246,252,0.55)');
            rg2.addColorStop(1.0, 'rgba(236,243,250,0)');
            ctx.fillStyle = rg2;
            ctx.beginPath(); ctx.arc(L.x, cy, L.r * 0.98, 0, 6.2832); ctx.fill();
        }
        // Pass 3 — sun-side rim, upper left.
        for (var i = 0; i < lobes.length; i++) {
            var L = lobes[i];
            var rg3 = ctx.createRadialGradient(L.x - L.r * 0.34, L.y - L.r * 0.40, L.r * 0.02,
                                               L.x - L.r * 0.34, L.y - L.r * 0.40, L.r * 0.62);
            rg3.addColorStop(0.0, 'rgba(255,252,236,0.85)');
            rg3.addColorStop(1.0, 'rgba(255,252,236,0)');
            ctx.fillStyle = rg3;
            ctx.beginPath(); ctx.arc(L.x - L.r * 0.30, L.y - L.r * 0.36, L.r * 0.62, 0, 6.2832); ctx.fill();
        }
        vfx.clouds.push(g);
    }
}

// Soft round sprites, drawn once and then blitted per particle. Flat ellipses
// with an alpha are what made the old dust read as grey dots.
function vfxBuildParticleSprites() {
    function puff(r, g, b, coreA, edgeSoft) {
        var S = 64;
        var gr = createGraphics(S, S);
        var ctx = gr.drawingContext;
        var rg = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
        rg.addColorStop(0.0,  'rgba(' + r + ',' + g + ',' + b + ',' + coreA + ')');
        rg.addColorStop(edgeSoft, 'rgba(' + r + ',' + g + ',' + b + ',' + (coreA * 0.45) + ')');
        rg.addColorStop(1.0,  'rgba(' + r + ',' + g + ',' + b + ',0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, S, S);
        return gr;
    }
    vfx.puffDust  = puff(198, 164, 118, 1.0, 0.45);
    vfx.puffSmoke = puff(96,  98,  106, 0.85, 0.35);
    vfx.puffSpark = puff(255, 236, 170, 1.0, 0.30);
}

// ── Sky ──────────────────────────────────────────────────────────────────────
function buildSky() {
    vfx.sky = createGraphics(width, height);
    var ctx = vfx.sky.drawingContext;

    // Deep at the zenith, warm and pale at the horizon.
    var g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0.00, '#1b4a91');
    g.addColorStop(0.22, '#2f74c4');
    g.addColorStop(0.45, '#5aa2df');
    g.addColorStop(0.68, '#93c8ec');
    g.addColorStop(0.86, '#c5e2f3');
    g.addColorStop(1.00, '#e6f2f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Sun, upper left — matches the highlight side the truck is painted with.
    var sx = width * 0.19, sy = height * 0.15;

    // Wide atmospheric bloom.
    var halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, height * 0.62);
    halo.addColorStop(0.00, 'rgba(255,247,206,0.80)');
    halo.addColorStop(0.18, 'rgba(255,243,190,0.34)');
    halo.addColorStop(0.45, 'rgba(255,238,186,0.12)');
    halo.addColorStop(1.00, 'rgba(255,238,186,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    // Tight inner glow + disc.
    var core = ctx.createRadialGradient(sx, sy, 0, sx, sy, height * 0.11);
    core.addColorStop(0.00, 'rgba(255,255,246,1)');
    core.addColorStop(0.42, 'rgba(255,251,222,0.95)');
    core.addColorStop(1.00, 'rgba(255,244,196,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(sx, sy, height * 0.11, 0, 6.2832); ctx.fill();

    // No light shafts here. Wedges radiating from the sun sound good on paper,
    // but over a saturated blue they render as hard-edged triangles no matter
    // how low the alpha goes — the eye locks onto the straight boundary. The
    // radial bloom above already carries the "bright sun" read.
}

function drawSky() {
    if (!vfx.built) vfxBuild();
    if (!vfx.sky || vfx.sky.width !== width || vfx.sky.height !== height) buildSky();
    image(vfx.sky, 0, 0);
    drawClouds();
    drawBirds();
}

function drawBirds() {
    push();
    stroke(48, 62, 84, 130); strokeWeight(1.8); noFill();
    for (var i = 0; i < birds.length; i++) {
        var b = birds[i];
        b.x += b.sp;
        var bx = (b.x - camX * 0.03) % (width + 180); if (bx < -90) bx += width + 180;
        var by = b.y - (camY - GROUND_BASE) * 0.06;
        var flap = sin(frameCount * 0.13 + b.ph) * 4;
        var s = 0.8 + sin(b.ph) * 0.25;
        arc(bx - 7 * s, by, 15 * s, (10 + flap) * s, PI, TWO_PI);
        arc(bx + 7 * s, by, 15 * s, (10 + flap) * s, PI, TWO_PI);
    }
    pop();
}

function drawClouds() {
    if (!vfx.clouds.length) return;
    var ctx = drawingContext;
    ctx.save();
    for (var i = 0; i < clouds.length; i++) {
        var c = clouds[i];
        var sp = vfx.clouds[c.v % vfx.clouds.length];
        var w = c.w, h = w * (sp.height / sp.width);
        var cx = ((c.x - camX * 0.055) % (width + w + 120));
        if (cx < -w - 60) cx += width + w * 2 + 120;
        var cy = c.y - (camY - GROUND_BASE) * 0.10;
        ctx.globalAlpha = c.alpha / 255;
        ctx.drawImage(sp.elt || sp.canvas, cx - w / 2, cy - h / 2, w, h);
        c.x += c.speed;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

// ── Parallax ─────────────────────────────────────────────────────────────────
//
// Each backdrop layer is a 1D heightfield sampled from Perlin noise. It used to
// be resampled from scratch every frame: three octaves per point, every 8px
// across the window, for four ridges and two treelines — roughly 4000 noise()
// evaluations a frame producing numbers almost identical to the frame before,
// because the camera had moved a couple of pixels.
//
// The layers are now sampled on a FIXED WORLD LATTICE and cached. Scrolling
// picks a different window of the same lattice and shifts the whole strip by
// the sub-lattice remainder, so the motion stays perfectly smooth while a given
// world position is only ever evaluated once. After a second of driving the
// noise cost is essentially zero.
var vfxLattice = [];
var RIDGE_STEP = 8;

function vfxRidgeH(id, n, freq, amp) {
    var c = vfxLattice[id] || (vfxLattice[id] = {});
    var v = c[n];
    if (v === undefined) {
        var wx = n * RIDGE_STEP;
        v = noise(wx * freq) * amp
          + noise(wx * freq * 2.7) * amp * 0.38
          + noise(wx * freq * 6.1) * amp * 0.12;
        c[n] = v;
    }
    return v;
}

function vfxTree(id, n, step, scale) {
    var c = vfxLattice[id] || (vfxLattice[id] = {});
    var t = c[n];
    if (t === undefined) {
        var nx = n * step * 0.021;
        var th = (20 + noise(nx) * 42) * scale;
        t = {
            dx: (noise(nx * 3.3) - 0.5) * step * 1.4,
            dy: (noise(nx * 0.7) - 0.5) * 8 * scale,
            th: th,
            tw: th * 0.46,
            b:  min(2, floor(noise(nx * 5.1) * 3))
        };
        c[n] = t;
    }
    return t;
}

function drawParallax() {
    // Layers are painted in screen space but anchored to the world, so they do
    // not slide out from under the terrain as the camera climbs.
    var horizon = height * 0.72 - (camY - GROUND_BASE) * 0.35;

    // Furthest first. Each layer steps down in haze and up in saturation — the
    // tonal gap between layers is what separates them, so keep it wide.
    drawRidge(0, camX * 0.035, horizon - height * 0.17, [ 92, 128, 172], 0.0038, 210, true,  0.70);
    drawRidge(1, camX * 0.075, horizon - height * 0.07, [ 62, 100, 142], 0.0062, 165, true,  0.44);
    drawRidge(2, camX * 0.140, horizon + height * 0.02, [ 40,  76, 104], 0.0100, 112, true,  0.22);
    // Haze goes BETWEEN layers, not over the top of all of them. A single pass
    // at the end veils the near hills just as much as the far ones, which flattens
    // the whole backdrop into one pale band — exactly the depth cue it was
    // supposed to create.
    vfxHazeBand(horizon - height * 0.02, height * 0.20, 0.30);

    drawTreeLine(4, camX * 0.240, horizon + height * 0.062, [30, 70, 68], 0.16, 0.85);
    drawRidge(3, camX * 0.320, horizon + height * 0.095, [ 26,  58,  62], 0.0148,  64, false, 0.06);

    vfxHazeBand(horizon + height * 0.05, height * 0.16, 0.14);

    drawTreeLine(5, camX * 0.460, horizon + height * 0.140, [18, 50, 38], 0.02, 1.30);
}

function vfxHazeBand(top, h, strength) {
    var ctx = drawingContext;
    var y0 = top - h * 0.5;
    var g = ctx.createLinearGradient(0, y0, 0, top + h);
    g.addColorStop(0.0, 'rgba(' + HAZE[0] + ',' + HAZE[1] + ',' + HAZE[2] + ',0)');
    g.addColorStop(0.6, 'rgba(' + HAZE[0] + ',' + HAZE[1] + ',' + HAZE[2] + ',' + (strength * 0.8) + ')');
    g.addColorStop(1.0, 'rgba(' + HAZE[0] + ',' + HAZE[1] + ',' + HAZE[2] + ',' + strength + ')');
    ctx.save();
    ctx.fillStyle = g;
    // Run the fill all the way to the bottom of the canvas. A rect that ends
    // where the gradient ends leaves a crisp horizontal seam across the hills —
    // past the last stop the colour just clamps, and the terrain covers it.
    ctx.fillRect(0, y0, width, height - y0);
    ctx.restore();
}

// One mountain layer. `mix` is how far its colour is pulled toward the horizon
// haze — that is the atmospheric perspective, and it is doing most of the work.
function drawRidge(id, offset, baseY, rgb, freq, amp, snow, mix) {
    var col = [
        lerp(rgb[0], HAZE[0], mix),
        lerp(rgb[1], HAZE[1], mix),
        lerp(rgb[2], HAZE[2], mix)
    ];

    // Snap the sample window to the lattice and carry the remainder as a
    // sub-pixel shift of the whole strip.
    var base = Math.floor(offset / RIDGE_STEP) * RIDGE_STEP;
    var frac = offset - base;

    var pts = [];
    for (var x = -24; x <= width + 32; x += RIDGE_STEP) {
        pts.push([x - frac, baseY - vfxRidgeH(id, (x + base) / RIDGE_STEP, freq, amp)]);
    }

    push();
    noStroke();

    // Body, with a vertical gradient so the base sits into the haze.
    var ctx = drawingContext;
    var bg = ctx.createLinearGradient(0, baseY - amp * 1.5, 0, baseY + height * 0.30);
    bg.addColorStop(0.0, 'rgb(' + floor(col[0] * 0.86) + ',' + floor(col[1] * 0.88) + ',' + floor(col[2] * 0.92) + ')');
    bg.addColorStop(0.55, 'rgb(' + floor(col[0]) + ',' + floor(col[1]) + ',' + floor(col[2]) + ')');
    bg.addColorStop(1.0, 'rgb(' + floor(lerp(col[0], HAZE[0], 0.55)) + ',' +
                                  floor(lerp(col[1], HAZE[1], 0.55)) + ',' +
                                  floor(lerp(col[2], HAZE[2], 0.55)) + ')');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-20, height + 10);
    for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(width + 30, height + 10);
    ctx.closePath();
    ctx.fill();

    // Sunlit west face: brighten the stretches that fall away to the left.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-20, height + 10);
    for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(width + 30, height + 10);
    ctx.closePath();
    ctx.clip();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(255,252,238,' + (0.30 + (1 - mix) * 0.32) + ')';
    ctx.beginPath();
    var drawing = false;
    for (var i = 1; i < pts.length; i++) {
        var rising = pts[i][1] < pts[i - 1][1];   // going up as x grows
        if (rising) {
            if (!drawing) { ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); drawing = true; }
            ctx.lineTo(pts[i][0], pts[i][1]);
        } else drawing = false;
    }
    ctx.stroke();

    // Shadowed east face.
    ctx.lineWidth = 3.0;
    ctx.strokeStyle = 'rgba(24,40,64,' + (0.10 + (1 - mix) * 0.16) + ')';
    ctx.beginPath();
    drawing = false;
    for (var i = 1; i < pts.length; i++) {
        var falling = pts[i][1] > pts[i - 1][1];
        if (falling) {
            if (!drawing) { ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); drawing = true; }
            ctx.lineTo(pts[i][0], pts[i][1]);
        } else drawing = false;
    }
    ctx.stroke();
    ctx.restore();

    // Snow: a band that follows the ridge above a snowline, not loose triangles
    // scattered near the peaks. Peaks that never cross the line get no cap.
    if (snow) {
        // Three octaves of noise average out well below their own peak, so a
        // threshold set from `amp` alone puts the snowline above almost every
        // summit and nothing gets capped. Too low and the far range turns into
        // one white mass that reads as more cloud.
        var snowLine = baseY - amp * 0.80;
        ctx.save();
        ctx.beginPath();
        var open = false;
        for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            if (p[1] < snowLine) {
                if (!open) { ctx.moveTo(p[0], snowLine); open = true; }
                ctx.lineTo(p[0], p[1]);
            } else if (open) {
                ctx.lineTo(pts[i - 1][0], snowLine);
                ctx.closePath();
                open = false;
            }
        }
        if (open) { ctx.lineTo(pts[pts.length - 1][0], snowLine); ctx.closePath(); }
        // Distant snow is tinted toward the haze, not left pure white, or the far
        // caps read as brighter than the near ones and the depth order inverts.
        var sgr = ctx.createLinearGradient(0, baseY - amp * 1.5, 0, snowLine);
        sgr.addColorStop(0.0, 'rgba(' + floor(lerp(255, HAZE[0], mix * 0.7)) + ',' +
                                        floor(lerp(255, HAZE[1], mix * 0.7)) + ',' +
                                        floor(lerp(255, HAZE[2], mix * 0.5)) + ',' + (0.92 - mix * 0.40) + ')');
        sgr.addColorStop(1.0, 'rgba(206,226,244,' + (0.30 - mix * 0.20) + ')');
        ctx.fillStyle = sgr;
        ctx.fill();
        ctx.restore();
    }
    pop();
}

// A band of conifers. Two calls at different depths give the treeline volume.
//
// Batched on purpose. Drawing each tree as its own fill()+triangle() calls cost
// ~5ms a frame across the two bands — around a thousand p5 draw calls, each one
// re-applying the full style state. Collecting the geometry first and issuing
// one path per (tier, shade bucket) drops that to a couple of dozen fills for
// pixel-identical output.
function drawTreeLine(id, offset, baseY, rgb, mix, scale) {
    var col = [
        lerp(rgb[0], HAZE[0], mix),
        lerp(rgb[1], HAZE[1], mix),
        lerp(rgb[2], HAZE[2], mix)
    ];
    var ctx = drawingContext;
    // Integer pitch so the lattice indices below stay whole numbers.
    var step = max(4, round(11 * scale));
    var BUCKETS = 3;

    var base = Math.floor(offset / step) * step;
    var frac = offset - base;

    var trees = [];
    for (var x = -2 * step; x < width + 40; x += step) {
        // Seeded from world position, so a tree keeps its shape as it scrolls.
        var t = vfxTree(id, (x + base) / step, step, scale);
        trees.push({ x: x - frac + t.dx, y: baseY + t.dy, th: t.th, tw: t.tw, b: t.b });
    }

    ctx.save();

    // Trunks — one path.
    ctx.fillStyle = 'rgb(' + floor(col[0] * 0.55) + ',' + floor(col[1] * 0.52) + ',' + floor(col[2] * 0.55) + ')';
    ctx.beginPath();
    for (var i = 0; i < trees.length; i++) {
        var t0 = trees[i];
        ctx.rect(t0.x - 1.2 * scale, t0.y, 2.4 * scale, t0.th * 0.16);
    }
    ctx.fill();

    // Canopy: three tiers, three shade buckets each.
    for (var tier = 0; tier < 3; tier++) {
        for (var b = 0; b < BUCKETS; b++) {
            var shade = (b + 0.5) / BUCKETS * 26;
            ctx.fillStyle = 'rgb(' +
                floor(min(255, col[0] * (0.80 + tier * 0.10) + shade * 0.20)) + ',' +
                floor(min(255, col[1] * (0.84 + tier * 0.10) + shade * 0.35)) + ',' +
                floor(min(255, col[2] * (0.80 + tier * 0.10) + shade * 0.20)) + ')';
            ctx.beginPath();
            var any = false;
            for (var i = 0; i < trees.length; i++) {
                var tr = trees[i];
                if (tr.b !== b) continue;
                var yTop  = tr.y - tr.th * (0.18 + tier * 0.30);
                var halfW = tr.tw * (0.60 - tier * 0.15);
                ctx.moveTo(tr.x, yTop - tr.th * 0.30);
                ctx.lineTo(tr.x - halfW, yTop);
                ctx.lineTo(tr.x + halfW, yTop);
                ctx.closePath();
                any = true;
            }
            if (any) ctx.fill();
        }
    }

    // Sun-side slivers — one path.
    ctx.fillStyle = 'rgba(255,250,226,' + (0.135 * (1 - mix)) + ')';
    ctx.beginPath();
    for (var i = 0; i < trees.length; i++) {
        var tr2 = trees[i];
        ctx.moveTo(tr2.x, tr2.y - tr2.th * 0.78);
        ctx.lineTo(tr2.x - tr2.tw * 0.20, tr2.y - tr2.th * 0.30);
        ctx.lineTo(tr2.x, tr2.y - tr2.th * 0.30);
        ctx.closePath();
    }
    ctx.fill();

    ctx.restore();
}

// ── Terrain helpers ──────────────────────────────────────────────────────────
// Deterministic 0..1 from an integer. Scenery scattered with random() reseeds
// every time the visible range shifts, which makes rocks and grass crawl along
// the hillside as you drive; hashing the vertex index instead pins them down.
function vfxHash01(n) {
    n = (n << 13) ^ n;
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
}

// A tiling grain overlay. Flat fills are what made the old ground read as a
// slab of mud; a little high-frequency noise is most of the fix.
var vfxSoilPattern = null;
function vfxSoilTexture() {
    if (vfxSoilPattern) return vfxSoilPattern;
    var S = 180;
    var g = createGraphics(S, S);
    var ctx = g.drawingContext;
    ctx.clearRect(0, 0, S, S);
    for (var i = 0; i < 1400; i++) {
        var x = vfxHash01(i * 3 + 1) * S;
        var y = vfxHash01(i * 7 + 5) * S;
        var r = 0.6 + vfxHash01(i * 11 + 3) * 2.4;
        var d = vfxHash01(i * 13 + 9);
        ctx.fillStyle = d > 0.5
            ? 'rgba(46,28,14,' + (0.05 + d * 0.10) + ')'
            : 'rgba(214,176,124,' + (0.03 + d * 0.09) + ')';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    // A few longer erosion streaks break up the even speckle.
    for (var i = 0; i < 60; i++) {
        var x = vfxHash01(i * 17 + 2) * S, y = vfxHash01(i * 19 + 6) * S;
        var len = 8 + vfxHash01(i * 23) * 26;
        ctx.strokeStyle = 'rgba(40,24,12,0.07)';
        ctx.lineWidth = 0.8 + vfxHash01(i * 29) * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.3, y + len); ctx.stroke();
    }
    vfxSoilPattern = ctx.canvas;
    return vfxSoilPattern;
}

// ── Particles ────────────────────────────────────────────────────────────────
function spawnDust(x, y, v) {
    var n = floor(map(v, 4, 20, 6, 20));
    for (var i = 0; i < n; i++) {
        particles.push({ x: x, y: y, vx: random(-3.0, 3.0), vy: random(-3.4, -0.3),
                         life: 1, decay: random(0.024, 0.052), r: random(6, 15),
                         rot: random(TWO_PI), spin: random(-0.04, 0.04), type: 'dust' });
    }
}
function spawnBurst(x, y, type) {
    var c = type === 'gas'     ? [255, 96,  72]
          : type === 'diamond' ? [126, 196, 255]
          :                      [255, 206,  84];
    for (var i = 0; i < 16; i++) {
        var a = random(TWO_PI), s = random(2.4, 7.5);
        particles.push({ x: x, y: y, vx: cos(a) * s, vy: sin(a) * s,
                         life: 1, decay: random(0.045, 0.09), r: random(4, 11),
                         col: c, type: 'spark' });
    }
    // A soft flash at the pickup point. Additive, so it blows out fast — keep it
    // small and short or it leaves a white hole next to the truck.
    particles.push({ x: x, y: y, vx: 0, vy: -0.4, life: 1, decay: 0.22,
                     r: 17, col: c, type: 'flash' });
}
function spawnExhaust(x, y) {
    if (random() > 0.16) return;
    // Small and thin. Scaled up, a soft additive-ish puff next to the truck
    // reads as a cotton ball stuck to the bodywork, not as exhaust.
    particles.push({ x: x + random(-3, 3), y: y + random(-3, 3),
                     vx: random(-2.4, -0.6), vy: random(-1.2, -0.15),
                     life: 1, decay: random(0.040, 0.070), r: random(3.5, 8),
                     rot: random(TWO_PI), spin: random(-0.03, 0.03), type: 'smoke' });
}
function spawnSpray(x, y, dir, amount) {
    if (random() > amount) return;
    particles.push({ x: x, y: y, vx: -dir * random(2.5, 8), vy: random(-4.0, -0.6),
                     life: 1, decay: random(0.032, 0.062), r: random(3, 8),
                     rot: random(TWO_PI), spin: random(-0.06, 0.06), type: 'dust' });
}

function tickParticles() {
    if (!vfx.built) vfxBuild();
    var ctx = drawingContext;
    ctx.save();
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.rot !== undefined) p.rot += p.spin;

        if (p.type === 'smoke')      { p.vy -= 0.035; p.vx *= 0.985; }
        else if (p.type === 'flash') { /* stays put */ }
        else                         { p.vy += 0.14;  p.vx *= 0.992; }

        if (p.life <= 0) { particles.splice(i, 1); continue; }

        var px = p.x - panX, py = p.y - panY;

        if (p.type === 'spark') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = p.life;
            var s = p.r * (0.5 + p.life * 0.9);
            ctx.drawImage(vfx.puffSpark.elt || vfx.puffSpark.canvas, px - s, py - s, s * 2, s * 2);
            ctx.globalCompositeOperation = 'source-over';
        } else if (p.type === 'flash') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = p.life * p.life * 0.45;
            var fs = p.r * (1.9 - p.life * 0.9);
            ctx.drawImage(vfx.puffSpark.elt || vfx.puffSpark.canvas, px - fs, py - fs, fs * 2, fs * 2);
            ctx.globalCompositeOperation = 'source-over';
        } else {
            var sprite = (p.type === 'smoke') ? vfx.puffSmoke : vfx.puffDust;
            // Dust swells as it disperses; smoke swells faster and fades harder.
            var grow = (p.type === 'smoke') ? (1.9 - p.life * 0.9) : (1.5 - p.life * 0.5);
            var r = p.r * grow;
            ctx.globalAlpha = p.life * (p.type === 'smoke' ? 0.30 : 0.60);
            ctx.drawImage(sprite.elt || sprite.canvas, px - r, py - r, r * 2, r * 2);
        }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ── HUD ──────────────────────────────────────────────────────────────────────
// Small vector icons. The old HUD used emoji, which the canvas renderer either
// mis-measures or drops entirely depending on the platform font stack — on this
// machine they rendered as empty boxes.
function vfxIconFuel(x, y, s) {
    push(); translate(x, y); noStroke();
    fill(232, 64, 58);   rect(-s * 0.42, -s * 0.50, s * 0.72, s * 1.00, s * 0.12);
    fill(255, 255, 255, 55); rect(-s * 0.34, -s * 0.42, s * 0.24, s * 0.84, s * 0.08);
    fill(198, 44, 40);   rect(-s * 0.30, -s * 0.20, s * 0.50, s * 0.30, s * 0.06);
    stroke(214, 78, 70); strokeWeight(s * 0.13); noFill();
    line(s * 0.32, -s * 0.30, s * 0.32, s * 0.28);
    line(s * 0.32, -s * 0.30, s * 0.16, -s * 0.44);
    noStroke(); fill(232, 64, 58); ellipse(s * 0.32, s * 0.34, s * 0.22, s * 0.22);
    pop();
}
function vfxIconCoin(x, y, s) {
    push(); translate(x, y); noStroke();
    fill(180, 128, 20);  ellipse(0, s * 0.08, s, s);
    fill(252, 202, 60);  ellipse(0, 0, s, s);
    fill(255, 232, 150); ellipse(-s * 0.13, -s * 0.13, s * 0.52, s * 0.46);
    fill(190, 138, 26);  ellipse(0, 0, s * 0.60, s * 0.60);
    fill(252, 216, 110); ellipse(0, 0, s * 0.44, s * 0.44);
    pop();
}
function vfxIconDiamond(x, y, s) {
    push(); translate(x, y); noStroke();
    fill(56, 130, 214);
    beginShape(); vertex(0, -s * 0.54); vertex(s * 0.52, 0); vertex(0, s * 0.58); vertex(-s * 0.52, 0); endShape(CLOSE);
    fill(126, 196, 255);
    beginShape(); vertex(0, -s * 0.54); vertex(s * 0.20, -s * 0.06); vertex(0, s * 0.58); vertex(-s * 0.24, -s * 0.06); endShape(CLOSE);
    fill(226, 244, 255);
    triangle(0, -s * 0.54, s * 0.18, -s * 0.08, -s * 0.06, -s * 0.08);
    pop();
}
// The chequered flag has all its visual mass in the banner, so the geometry is
// balanced about the banner rather than about the pole — otherwise it sits
// visibly higher than the coin and diamond in the same row.
function vfxIconFlag(x, y, s) {
    push(); translate(x, y); noStroke();
    fill(198, 208, 222); rect(-s * 0.42, -s * 0.46, s * 0.13, s * 0.96, s * 0.05);
    fill(248, 250, 252); rect(-s * 0.29, -s * 0.42, s * 0.70, s * 0.52, s * 0.04);
    fill(32, 38, 52);
    rect(-s * 0.29, -s * 0.42, s * 0.175, s * 0.26);
    rect(-s * 0.115, -s * 0.16, s * 0.175, s * 0.26);
    rect(s * 0.06,  -s * 0.42, s * 0.175, s * 0.26);
    rect(s * 0.235, -s * 0.16, s * 0.175, s * 0.26);
    pop();
}

// A peak with a snow cap — the level marker.
function vfxIconPeak(x, y, s) {
    push(); translate(x, y); noStroke();
    fill(74, 96, 128);
    beginShape(); vertex(0, -s * 0.52); vertex(s * 0.56, s * 0.44); vertex(-s * 0.56, s * 0.44); endShape(CLOSE);
    fill(226, 240, 252);
    beginShape(); vertex(0, -s * 0.52); vertex(s * 0.22, -s * 0.06); vertex(s * 0.06, -s * 0.14);
    vertex(-s * 0.10, -s * 0.02); vertex(-s * 0.22, -s * 0.06); endShape(CLOSE);
    fill(52, 70, 98);
    beginShape(); vertex(0, -s * 0.52); vertex(s * 0.56, s * 0.44); vertex(s * 0.10, s * 0.44); endShape(CLOSE);
    pop();
}

// Rounded translucent panel with a hairline border — the base for every chip.
function vfxPanel(x, y, w, h, r, alpha) {
    push(); noStroke();
    drawingContext.save();
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = 'rgba(0,0,0,0.45)';
    fill(10, 16, 28, alpha === undefined ? 175 : alpha);
    rect(x, y, w, h, r);
    drawingContext.restore();
    noFill(); stroke(255, 255, 255, 30); strokeWeight(1);
    rect(x + 0.5, y + 0.5, w - 1, h - 1, r);
    noStroke();
    pop();
}

// Height of the HTML top bar floating above the canvas, in canvas pixels.
// The bar (Leave / title / Garage / Fullscreen) is a DOM element laid out in CSS
// pixels and the canvas HUD is drawn in its own scaled space, so the two knew
// nothing about each other — the Leave button sat directly on top of the fuel
// gauge and the Fullscreen button on top of the speedo. Measured from the real
// element so it stays correct if the bar wraps on a narrow window.
var vfxBarInset = { w: 0, h: 0, v: 0 };
function vfxTopInset() {
    if (vfxBarInset.w !== width || vfxBarInset.h !== height) {
        var bar = (typeof document !== 'undefined') ? document.getElementById('top-bar') : null;
        var cssH = bar ? bar.offsetHeight : 52;
        // Canvas is stretched to the window by CSS, so convert CSS px -> canvas px.
        var scaleY = (bar && window.innerHeight) ? (height / window.innerHeight) : 1;
        vfxBarInset = { w: width, h: height, v: (cssH + 6) * scaleY };
    }
    return vfxBarInset.v;
}

function drawHUD() {
    push();
    var u = constrain(height / 720, 0.82, 1.6);
    var pad = 18 * u;
    var top = vfxTopInset();          // clear the HTML bar

    textFont(vfx.fontHUD);

    // ── Fuel + stats cluster, top left ───────────────────────────
    var panW = 268 * u, panH = 44 * u;
    vfxPanel(pad, top, panW, panH, 12 * u);

    vfxIconFuel(pad + 24 * u, top + panH / 2, 24 * u);

    var bX = pad + 46 * u, bW = panW - 62 * u, bH = 15 * u;
    var bY = top + panH / 2 - bH / 2;

    noStroke(); fill(6, 10, 18, 220); rect(bX, bY, bW, bH, bH / 2);

    var fr = constrain(car.fuel / 100, 0, 1);
    if (fr > 0.005) {
        var fc = car.fuel < 25 ? [239, 68, 68] : car.fuel < 50 ? [250, 176, 32] : [64, 214, 108];
        var fg = drawingContext.createLinearGradient(bX, bY, bX, bY + bH);
        fg.addColorStop(0, 'rgb(' + min(255, fc[0] + 46) + ',' + min(255, fc[1] + 46) + ',' + min(255, fc[2] + 46) + ')');
        fg.addColorStop(0.5, 'rgb(' + fc[0] + ',' + fc[1] + ',' + fc[2] + ')');
        fg.addColorStop(1, 'rgb(' + floor(fc[0] * 0.72) + ',' + floor(fc[1] * 0.72) + ',' + floor(fc[2] * 0.72) + ')');
        drawingContext.save();
        drawingContext.shadowBlur = 10 * u;
        drawingContext.shadowColor = 'rgba(' + fc[0] + ',' + fc[1] + ',' + fc[2] + ',0.55)';
        drawingContext.fillStyle = fg;
        vfxRoundRectPath(drawingContext, bX, bY, max(bH, bW * fr), bH, bH / 2);
        drawingContext.fill();
        drawingContext.restore();
    }
    // Tick marks so the bar reads as a gauge rather than a progress bar.
    stroke(0, 0, 0, 55); strokeWeight(1);
    for (var t = 1; t < 4; t++) line(bX + bW * t / 4, bY + 2, bX + bW * t / 4, bY + bH - 2);
    noStroke();

    if (car.fuel < 25) {
        fill(255, 104, 96, 130 + sin(frameCount * 0.22) * 110);
        textAlign(LEFT, CENTER); textSize(12 * u); textStyle(BOLD);
        text('LOW FUEL', pad + panW + 10 * u, top + panH / 2);
    }

    // ── Score chips ──────────────────────────────────────────────
    var cy = top + panH + 10 * u;
    var chipH = 30 * u;
    var cx = pad;
    cx = vfxChip(cx, cy, chipH, u, vfxIconCoin,    '' + car.coins,          [252, 202, 60]);
    cx = vfxChip(cx, cy, chipH, u, vfxIconDiamond, '' + car.diamonds,       [126, 196, 255]);
    cx = vfxChip(cx, cy, chipH, u, vfxIconFlag,    car.distance + 'm',      [236, 242, 250]);
    cx = vfxChip(cx, cy, chipH, u, vfxIconPeak,
                 levelAt(car.distance) + '/' + LEVEL_COUNT,                 [178, 214, 255]);

    // ── Speed dial, top right ────────────────────────────────────
    vfxSpeedo(width - pad - 46 * u, top + 46 * u, 42 * u, u);

    // ── Air time ─────────────────────────────────────────────────
    if (window.airTimer > 0.35) {
        var aw = 118 * u, ah = 30 * u;
        var ax = width - pad - aw, ay = pad + 100 * u;
        vfxPanel(ax, ay, aw, ah, 10 * u, 190);
        fill(255, 214, 72); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(15 * u);
        drawingContext.save();
        drawingContext.shadowBlur = 12 * u; drawingContext.shadowColor = 'rgba(255,196,40,0.8)';
        text('AIR  ' + nf(window.airTimer, 1, 1) + 's', ax + aw / 2, ay + ah / 2);
        drawingContext.restore();
    }
    pop();
}

function vfxChip(x, y, h, u, iconFn, label, tint) {
    push();
    textFont(vfx.fontHUD); textStyle(BOLD); textSize(15 * u);
    var tw = textWidth(label);
    var w = h + tw + 16 * u;
    vfxPanel(x, y, w, h, h / 2, 165);
    iconFn(x + h * 0.52, y + h / 2, h * 0.60);
    fill(tint[0], tint[1], tint[2]);
    textAlign(LEFT, CENTER);
    text(label, x + h * 0.94, y + h / 2 + 1);
    pop();
    return x + w + 7 * u;
}

// Sweeping arc dial. Reads at a glance in a way a number never does.
function vfxSpeedo(cx, cy, r, u) {
    var spd = floor(car.chassisBody.GetLinearVelocity().Length() * 4.2);
    var maxS = 170;
    var t = constrain(spd / maxS, 0, 1);
    var a0 = PI * 0.78, a1 = PI * 2.22;

    push();
    drawingContext.save();
    drawingContext.shadowBlur = 16; drawingContext.shadowColor = 'rgba(0,0,0,0.5)';
    noStroke(); fill(10, 16, 28, 170); ellipse(cx, cy, r * 2, r * 2);
    drawingContext.restore();

    noFill(); stroke(255, 255, 255, 26); strokeWeight(1); ellipse(cx, cy, r * 2, r * 2);

    // Track
    stroke(4, 8, 16, 200); strokeWeight(r * 0.19); strokeCap(ROUND);
    arc(cx, cy, r * 1.48, r * 1.48, a0, a1);

    // Value, colour-shifting toward red at the top end
    var col = t < 0.6 ? [86, 214, 255] : t < 0.85 ? [255, 198, 64] : [255, 92, 78];
    drawingContext.save();
    drawingContext.shadowBlur = 12; drawingContext.shadowColor = 'rgba(' + col + ',0.85)';
    stroke(col[0], col[1], col[2]); strokeWeight(r * 0.17);
    if (t > 0.004) arc(cx, cy, r * 1.48, r * 1.48, a0, a0 + (a1 - a0) * t);
    drawingContext.restore();

    // Ticks
    stroke(255, 255, 255, 42); strokeWeight(1.4);
    for (var i = 0; i <= 8; i++) {
        var a = a0 + (a1 - a0) * (i / 8);
        var r1 = r * 0.86, r2 = r * 0.95;
        line(cx + cos(a) * r1, cy + sin(a) * r1, cx + cos(a) * r2, cy + sin(a) * r2);
    }
    noStroke();

    textFont(vfx.fontHUD); textAlign(CENTER, CENTER);
    fill(248, 250, 252); textStyle(BOLD); textSize(r * 0.62);
    text(spd, cx, cy - r * 0.06);
    fill(150, 166, 186); textStyle(NORMAL); textSize(r * 0.24);
    text('KM/H', cx, cy + r * 0.34);
    pop();
}

function vfxRoundRectPath(ctx, x, y, w, h, r) {
    r = min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);   ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);   ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);       ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Crossing into a new level. There is no loading break, so this banner is the
// only thing that tells you the ground is about to get harder — without it the
// twenty stages would be invisible and the game would just feel like it was
// drifting out of control on its own.
function drawLevelBanner() {
    push();
    var u = constrain(height / 720, 0.82, 1.6);
    var T = window.levelBannerTimer;
    // Slide in fast, hold, fade out.
    var a  = T > 100 ? map(T, 130, 100, 0, 255) : (T < 40 ? map(T, 0, 40, 0, 255) : 255);
    var dy = T > 100 ? map(T, 130, 100, -34 * u, 0) : 0;
    a = constrain(a, 0, 255);

    translate(width / 2, height * 0.20 + dy);
    textAlign(CENTER, CENTER);

    var bw = 240 * u, bh = 62 * u;
    noStroke();
    drawingContext.save();
    drawingContext.shadowBlur = 26 * u;
    drawingContext.shadowColor = 'rgba(0,0,0,0.55)';
    fill(10, 16, 28, a * 0.80);
    rectMode(CENTER);
    rect(0, 0, bw, bh, 14 * u);
    drawingContext.restore();

    fill(126, 196, 255, a);
    rect(0, -bh / 2 + 2 * u, bw * 0.34, 3 * u, 2 * u);

    textFont(vfx.fontTitle); textSize(23 * u); fill(236, 244, 254, a);
    text('LEVEL ' + window.levelBannerNum, 0, -8 * u);
    textFont(vfx.fontHUD); textStyle(NORMAL); textSize(13 * u);
    fill(150, 176, 206, a);
    text(window.levelBannerNum >= LEVEL_COUNT ? 'FINAL STAGE' : 'THE CLIMB STEEPENS', 0, 16 * u);

    rectMode(CORNER);
    pop();
}

function drawAirBonus() {
    push();
    var u = constrain(height / 720, 0.82, 1.6);
    var a = window.airBonusTimer > 20 ? 255 : map(window.airBonusTimer, 0, 20, 0, 255);
    var pop_ = window.airBonusTimer > 78 ? map(window.airBonusTimer, 90, 78, 0.4, 1.0) : 1.0;

    translate(width / 2, height * 0.30);
    scale(constrain(pop_, 0.4, 1.0));
    textFont(vfx.fontTitle); textAlign(CENTER, CENTER);

    drawingContext.save();
    drawingContext.shadowBlur = 26; drawingContext.shadowColor = 'rgba(255,180,20,0.9)';
    fill(255, 236, 140, a); textSize(36 * u);
    text('AIR TIME', 0, 0);
    fill(255, 206, 56, a); textSize(48 * u);
    text('+' + window.airBonus, 0, 48 * u);
    drawingContext.restore();
    pop();
}
