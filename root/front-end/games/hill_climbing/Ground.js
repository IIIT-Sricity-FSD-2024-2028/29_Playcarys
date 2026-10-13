class Ground {
    constructor() {
        this.vectors    = [];
        this.pickups    = [];
        // Terrain is defined in fixed world pixels, NOT in canvas pixels, so the
        // level keeps its shape when the window resizes or goes fullscreen.
        this.distance   = TRACK_LEN;
        // Every terrain segment becomes two static Box2D edge bodies, so this
        // step size directly sets the body count. 10px keeps the hills smooth
        // while holding the world to a size Box2D builds instantly.
        this.smoothness = 10;
        this.grassThick = 7;
        this._blades    = [];   // per-vertex grass layout, built lazily in _tuft()
        this._generate();
        this._buildPhysics();
        this._spawnPickups();
    }

    // Steepest UPHILL gradient the track is allowed to present. Downhills are
    // deliberately not limited — a slope you fall down is never a dead end, and
    // clamping them is what flattened every jump's drop-away.
    //
    // Raised from 37°. The clamp exists so the track is never literally
    // unclimbable, not so it is comfortable; at 37° the truck walked up
    // everything at part throttle. 44° is still climbable with momentum carried
    // in from the descent before it, and is not climbable without.
    //
    // IMPORTANT: this is a safety net, not a shaping tool. Every feature in
    // _emit() is sized so that its PEAK gradient — not its average — lands
    // under it. If features routinely exceed it the clamp starts binding, and a
    // binding clamp rewrites whatever it touches into a uniform ramp of exactly
    // this angle, which is how the original generator ended up with a track
    // whose 90th, 99th and maximum gradients were all the same number.
    static get MAX_SLOPE() { return Math.tan(47 * Math.PI / 180); }

    // ── Track generation ─────────────────────────────────────────────────────
    // The old generator was a sum of sine waves plus noise, run through a
    // two-way slope clamp. Measured over a real track that produced a median
    // gradient of 14° and a 90th/99th/max percentile of 29.0/29.0/29.0 — the
    // clamp was binding almost everywhere, so every hill came out as the same
    // uniform-gradient ramp. There was nothing to read and nothing to time: no
    // crests, no gaps, no rhythm. Peak airtime over an eight-minute run was
    // 0.47s.
    //
    // This builds the track out of discrete FEATURES instead, the way the genre
    // actually works. Each one asks a different question of your throttle:
    // rollers punish a constant speed, crests launch you if you arrive too fast,
    // climbs need momentum carried in from the descent before them, and jumps
    // want a specific entry speed or you case the landing.
    _generate() {
        // Back wall so you cannot reverse off the start of the track.
        this.vectors.push(new Vec2(-60, -4000));
        this.vectors.push(new Vec2(-60,  GROUND_BASE + 900));

        var step = this.smoothness;
        var xs = [], hs = [];
        var self = this;
        function put(px, ph) { xs.push(px); hs.push(ph); }
        function q(v) { return max(step, round(v / step) * step); }   // keep the x-pitch uniform
        function smoothstep(u) { return u * u * (3 - 2 * u); }

        // Opening straight — room to get rolling before anything is asked.
        var x = 0, h = GROUND_BASE;
        var START_FLAT = q(340);
        for (; x < START_FLAT; x += step) put(x, h);

        var LO = GROUND_BASE - 2200, HI = GROUND_BASE + 320;
        var last = 'flat', feat = 0;

        while (x < this.distance) {
            var metres = x / 10;                                   // 10 world px = 1 m
            var lvl    = min(LEVEL_COUNT, floor(metres / LEVEL_LEN_M) + 1);   // 1..20
            var t      = (lvl - 1) / (LEVEL_COUNT - 1);            // 0 at L1, 1 at L20

            // Difficulty is now driven by the LEVEL, not by a fraction of the
            // whole track. That matters because it decouples the curve from the
            // track length: the old `prog * 1.55` term meant that making the
            // track longer silently made the first kilometre easier, since the
            // same distance was now a smaller fraction of the whole. Levels are
            // absolute — level 7 is the same terrain whether the track is 4 km
            // or 10 km long.
            //
            // `warm` eases the first 220m in from genuinely easy. Without it the
            // very first feature arrives at full level-1 difficulty with no
            // descent behind it to build speed on, and can stop a run at 30m.
            var warm = constrain(metres / 220, 0, 1);
            var d    = constrain(0.55 + warm * 0.45 + t * 1.50, 0.55, 2.35);
            var kind = this._pick(last, lvl, h, LO, HI, feat);
            var r    = this._emit(kind, put, q, smoothstep, x, h, d);
            x = r[0]; h = constrain(r[1], LO, HI);
            last = kind; feat++;
        }

        // ── Uphill-only slope limiter ─────────────────────────────
        // A single forward pass. y grows downward, so terrain rising as you
        // drive right means hs[k] < hs[k-1]; that is the only direction that can
        // strand you, and the only one worth clamping.
        var maxD = Ground.MAX_SLOPE * step;
        for (var k = 1; k < hs.length; k++) {
            if (hs[k] < hs[k-1] - maxD) hs[k] = hs[k-1] - maxD;
        }

        for (var k = 0; k < hs.length; k++) this.vectors.push(new Vec2(xs[k], hs[k]));

        this.vectors.push(new Vec2(xs[xs.length-1], GROUND_BASE + 1000));
        this.vectors.push(new Vec2(-60,             GROUND_BASE + 1000));

        for (var v of this.vectors) { v.x /= SCALE; v.y /= SCALE; }
    }

    // Chooses the next feature. Two rules do most of the work: never stack two
    // demanding features back to back, and always hand out a descent or a flat
    // before a climb so there is momentum available to spend on it.
    // Which features a level is allowed to use. The vocabulary widens as you go:
    // level 1 is rolling ground you can carry speed over, jumps arrive at 2,
    // ledges and stairs at 4, and from 9 onward the pool is weighted so that the
    // demanding features outnumber the recoveries.
    //
    // The old version gated on a FRACTION of the track (jumps after 8%, stairs
    // after 30%), which on a 10 km track would have meant no stairs until 3 km —
    // terrain almost nobody would ever see. Gating on level keeps the vocabulary
    // tied to how far you have actually earned your way in.
    _pool(lvl) {
        if (lvl <= 1) return ['rollers', 'flat', 'descent', 'crest', 'climb'];
        if (lvl <= 3) return ['rollers', 'crest', 'climb', 'descent', 'flat', 'jump'];
        if (lvl <= 8) return ['jump', 'crest', 'climb', 'rollers', 'descent',
                              'stairs', 'ledge', 'flat'];
        if (lvl <= 14) return ['jump', 'crest', 'climb', 'stairs', 'ledge',
                               'rollers', 'descent', 'jump', 'crest', 'climb'];
        // The last third: recoveries are rare and the hard features stack.
        return ['jump', 'ledge', 'stairs', 'climb', 'crest', 'jump', 'stairs',
                'climb', 'ledge', 'crest', 'rollers', 'descent'];
    }

    _pick(last, lvl, h, LO, HI, feat) {
        // The first two features are always something you can roll through. You
        // leave the start line from a standstill with no momentum banked, so a
        // climb or a stair set here is not a challenge, it is a wall.
        if (feat < 2) return ['rollers', 'descent', 'crest', 'flat'][floor(random(4))];
        if (h < LO + 150) return random() < 0.75 ? 'descent' : 'flat';   // too high, come down
        if (h > HI - 120) return 'climb';                                // too low, climb out

        // Never stack two demanding features, and always hand out a descent or a
        // flat before a climb so there is momentum available to spend on it.
        // This relaxes with level: by the end you get far less breathing room.
        var mercy = constrain(0.65 - lvl * 0.022, 0.18, 0.65);
        if (last === 'climb' || last === 'stairs') return random() < mercy ? 'descent' : (random() < 0.5 ? 'flat' : 'rollers');
        if (last === 'jump'  || last === 'crest')  return random() < mercy * 0.62 ? 'flat' : 'rollers';
        if (last === 'ledge') return random() < 0.5 ? 'flat' : 'climb';

        var pool = this._pool(lvl);
        return pool[floor(random(pool.length))];
    }

    // Feature geometry is derived from the PEAK gradient each shape produces,
    // not from a raw amplitude — that is the only way to keep everything under
    // MAX_SLOPE (see the note on it). The three shapes and their peaks:
    //
    //   cosine roller, amplitude A over wavelength L  →  peak = pi*A/L
    //   sine crest,    height    H over length     L  →  peak = pi*H/L
    //   smoothstep ramp of angle a                    →  peak = 1.5*tan(a)
    //   stair riser R over run W (rise packed into W/2) →  peak = 3*R/W
    //
    // So every size below is expressed as a FRACTION OF ITS OWN LENGTH, scaled
    // by `g`. Sizing a roller as "18 to 38 pixels tall" independently of its
    // wavelength is what produced 43° whoops 40m from the start line.
    _emit(kind, put, q, smoothstep, x0, h0, d) {
        var step = this.smoothness;
        var x = x0, h = h0, i, u, len;
        // Steepness multiplier. Difficulty grows lengths, gaps and drop depths
        // directly via `d`; it grows ANGLES only through this, and only within a
        // band that keeps peaks under MAX_SLOPE.
        //
        // The ceiling has to sit slightly above what the top level asks for or
        // the ramp flattens early: at 0.30/1.20 the multiplier saturated at
        // level 15.8, so the last five levels were geometrically identical and
        // only differed in feature mix. 0.32/1.30 is reached exactly at level 20.
        var g = constrain(0.55 + d * 0.32, 0.55, 1.30);

        if (kind === 'flat') {
            // Shorter breathers. A 380px straight is 38m of nothing happening,
            // which at speed is several seconds of the game asking you for
            // nothing at all.
            len = q(random(120, 280));
            for (i = 0; i < len; i += step) put(x + i, h);
            return [x + len, h];
        }

        if (kind === 'rollers') {
            // Whoops. Hold a constant throttle through these and the suspension
            // resonates and pitches you; you have to drive the rhythm.
            var n   = floor(random(3, 8));
            var wl  = q(random(72, 130));
            var amp = wl * random(0.06, 0.17) * g;   // peak grad = pi*amp/wl
            len = n * wl;
            for (i = 0; i < len; i += step) {
                u = (i % wl) / wl;
                put(x + i, h - (1 - cos(u * TWO_PI)) * 0.5 * amp);
            }
            return [x + len, h];
        }

        if (kind === 'climb') {
            // `ca` is the AVERAGE gradient; smoothstep makes the middle of the
            // climb 1.5x steeper, so 27° here is a 39° wall at its steepest.
            // The old 17-27° averaged out to a gradient the truck walked up from
            // a standstill; these demand a run-up.
            var ca = radians(random(19, 27) * g);
            len = q(random(320, 780) * min(d, 1.4));
            var rise = tan(ca) * len;
            for (i = 0; i < len; i += step) put(x + i, h - rise * smoothstep(i / len));
            return [x + len, h - rise];
        }

        if (kind === 'descent') {
            // Downhills are not clamped, so these can be — and should be —
            // steeper than anything you have to climb. This is where the speed
            // for the next climb comes from.
            var da = radians(random(18, 32) * g);
            len = q(random(280, 640));
            var fall = tan(da) * len;
            for (i = 0; i < len; i += step) put(x + i, h + fall * smoothstep(i / len));
            return [x + len, h + fall];
        }

        if (kind === 'crest') {
            // A hilltop that falls away on the far side. Arrive too fast and you
            // are launched blind over the back of it. Tighter and taller than
            // before: the old 200-340px width over a 38-88px hump was a gentle
            // dome you drove across, not a lip you had to respect.
            len = q(random(150, 280));
            var ht = len * random(0.12, 0.24) * g;   // peak grad = pi*ht/len
            for (i = 0; i < len; i += step) put(x + i, h - sin((i / len) * PI) * ht);
            return [x + len, h];
        }

        if (kind === 'jump') {
            // Ramp, gap, landing slope. The gap curves away quadratically so the
            // lip throws you clear instead of letting you ride it down.
            var rl = q(random(100, 170));
            var ra = radians(random(22, 32) * g);   // linear, so this IS the peak
            var up = tan(ra) * rl;
            for (i = 0; i < rl; i += step) put(x + i, h - up * (i / rl));
            x += rl; h -= up;

            // Wider gap and a deeper hole under it. This is the feature that
            // decides a run: too slow and you drop into the gap, too fast and
            // you overshoot the landing slope onto the flat past it.
            var gap  = q(random(130, 280) * d);
            var drop = up + random(70, 190) * d;
            for (i = 0; i < gap; i += step) { u = i / gap; put(x + i, h + drop * u * u); }
            x += gap; h += drop;

            var ll = q(random(140, 260));
            var la = radians(random(11, 21));
            var ld = tan(la) * ll;
            for (i = 0; i < ll; i += step) put(x + i, h + ld * (i / ll));
            return [x + ll, h + ld];
        }

        if (kind === 'ledge') {
            // A short, near-vertical drop-off. Nothing in the old feature set
            // could pitch the vehicle nose-down hard enough to put the rider's
            // head into the ground, so nothing ever did — every death came from
            // a slow rollover. Drive off one of these flat out and you land on
            // your face. The cubic keeps the lip square instead of rounding it
            // into a ramp.
            len = q(random(60, 110));
            var lf = random(90, 200) * d;
            for (i = 0; i < len; i += step) { u = i / len; put(x + i, h + lf * u * u * u); }
            x += len; h += lf;
            var run2 = q(random(120, 220));
            for (i = 0; i < run2; i += step) put(x + i, h);
            return [x + run2, h];
        }

        // stairs — a stepped climb. Each riser tries to stop you dead, so you
        // need enough speed to carry across all of them in one go.
        var n2 = floor(random(3, 7));
        var run = q(random(60, 105));
        var riseS = run * random(0.13, 0.25) * g;   // peak grad = 3*riseS/run
        for (var s = 0; s < n2; s++) {
            for (i = 0; i < run; i += step) put(x + i, h - riseS * smoothstep(min(1, (i / run) * 2)));
            x += run; h -= riseS;
        }
        return [x, h];
    }

    // Collapses runs of near-collinear vertices into single spans. Returns a
    // list of index pairs covering the whole polyline with no gaps.
    //
    // The terrain is sampled on a uniform 10px pitch because that is what keeps
    // the DRAWN hills smooth — but the physics does not need that resolution.
    // Building one edge per sample meant a 40 000px track became ~8000 static
    // bodies (4000 dirt + 4000 grass), all of which Box2D has to hold in its
    // broadphase and walk on every step. Most of them were redundant: a 600px
    // constant-gradient climb is one straight line described 60 times over.
    // Merging anything that stays inside a 0.6px corridor typically removes
    // half to two thirds of them, and is invisible to the player because the
    // corridor is thinner than the tyre's contact patch.
    _collinearRuns() {
        var v = this.vectors, n = v.length;
        var tol = 0.8 / SCALE;      // max sag between the real surface and the span
        // Bounds the O(len^2) verification below. 48 was leaving long flats and
        // constant-gradient ramps chopped into 480px pieces for no reason; on a
        // 10km track that is thousands of avoidable bodies, and static bodies
        // are the dominant cost of a physics step here.
        var MAXRUN = 160;
        var runs = [];
        var s = 0;
        while (s < n - 1) {
            var e = s + 1;
            while (e < n - 1 && (e - s) < MAXRUN && this._withinCorridor(s, e + 1, tol)) e++;
            runs.push([s, e]);
            s = e;
        }
        return runs;
    }

    // True if every vertex strictly between a and b sits within `tol` of the
    // straight line a→b.
    _withinCorridor(a, b, tol) {
        var v = this.vectors;
        var ax = v[a].x, ay = v[a].y;
        var dx = v[b].x - ax, dy = v[b].y - ay;
        var len = Math.sqrt(dx*dx + dy*dy);
        if (len < 1e-9) return false;
        var nx = -dy / len, ny = dx / len;          // unit normal
        for (var k = a + 1; k < b; k++) {
            var d = (v[k].x - ax) * nx + (v[k].y - ay) * ny;
            if (d > tol || d < -tol) return false;
        }
        return true;
    }

    // ── Streamed terrain collision ────────────────────────────────────────────
    // The merged spans are computed once and kept as DATA; only the spans near
    // the camera are ever real Box2D bodies.
    //
    // Building the whole track at once does not scale: every static body lives
    // in the broadphase for the entire run, whether or not anything can reach
    // it, and on the 10km track that was 5394 bodies costing 6.3ms of every
    // frame — most of a 60fps budget spent on hillside the player passed
    // minutes ago or will not see for another eight kilometres. With streaming
    // the cost is set by the size of the window, so the track can be any length.
    _buildPhysics() {
        this.runs = this._collinearRuns();
        this.runL = new Float64Array(this.runs.length);   // span extents in world px
        this.runR = new Float64Array(this.runs.length);
        for (var r = 0; r < this.runs.length; r++) {
            var ax = this.vectors[this.runs[r][0]].x * SCALE;
            var bx = this.vectors[this.runs[r][1]].x * SCALE;
            this.runL[r] = min(ax, bx);
            this.runR[r] = max(ax, bx);
        }
        this.live = [];          // runIndex -> [dirtBody, grassBody]
        this.aLo = 0; this.aHi = -1;
        this.dirtBodies = []; this.grassBodies = [];   // live bodies, for diagnostics
        this.syncPhysics(0, 2000);
    }

    _createRun(i) {
        var gt = this.grassThick / SCALE;
        var a = this.vectors[this.runs[i][0]], b = this.vectors[this.runs[i][1]];
        var d = this._edge(a, b, DIRT_MASK, DIRT_CATEGORY, 0.8);
        var g = this._edge(new Vec2(a.x, a.y - gt), new Vec2(b.x, b.y - gt),
                           GRASS_MASK, GRASS_CATEGORY, 4.0);
        this.live[i] = [d, g];
    }

    _destroyRun(i) {
        var pair = this.live[i];
        if (!pair) return;
        world.DestroyBody(pair[0]);
        world.DestroyBody(pair[1]);
        this.live[i] = null;
    }

    // Keeps the live span set equal to everything overlapping [left, right].
    // Spans are sorted by x, so the live set is always a contiguous index range
    // and the update is just the difference between two ranges.
    //
    // MUST be called outside world.Step() — destroying a body mid-step is not
    // allowed. The margin is generous enough that terrain is always solid well
    // before the vehicle can reach it, even at full speed off a big drop.
    syncPhysics(left, right) {
        var n = this.runs.length, lo, hi, m;
        lo = 0; hi = n;
        while (lo < hi) { m = (lo + hi) >> 1; if (this.runR[m] < left) lo = m + 1; else hi = m; }
        var newLo = lo;
        lo = 0; hi = n;
        while (lo < hi) { m = (lo + hi) >> 1; if (this.runL[m] <= right) lo = m + 1; else hi = m; }
        var newHi = lo - 1;
        if (newHi < newLo) { newLo = 0; newHi = -1; }

        for (var i = this.aLo; i <= this.aHi; i++) if (i < newLo || i > newHi) this._destroyRun(i);
        for (var j = newLo; j <= newHi; j++) if (j < this.aLo || j > this.aHi) this._createRun(j);
        this.aLo = newLo; this.aHi = newHi;

        this.dirtBodies.length = 0; this.grassBodies.length = 0;
        for (var k = newLo; k <= newHi; k++) {
            if (this.live[k]) { this.dirtBodies.push(this.live[k][0]); this.grassBodies.push(this.live[k][1]); }
        }
    }

    // Gas can spacing, in METRES, set against the published spacing in Hill
    // Climb Racing itself: most of its levels place cans on a flat 90 m pitch
    // (Cave runs 120 m from the 150 m mark, and a few late levels start at 90 m
    // and stretch the interval past ~2000 m).
    //
    // 100 m here rather than a literal 90 because this track's features are
    // denser than HCR's, so a can every 90 m would land one inside almost every
    // jump gap.
    //
    // The number that matters is the RATIO to a tank's range, and the previous
    // values were nowhere near what their own comment claimed: it advertised a
    // 500-625 m tank against 235 m spacing, but the measured range was 907 m —
    // a ratio of 3.9, i.e. you could sail past three cans in a row and never
    // look at the gauge. Range is now ~300 m against 100 m spacing (see the burn
    // curve in Car.update), so: take every can and fuel never crosses your mind,
    // miss one and you make the next on fumes, miss two and you are walking.
    static get GAS_SPACING_M() { return 100; }

    // Restore every collected pickup. Called on restart — see Pickup.respawn().
    resetPickups() {
        for (var i = 0; i < this.pickups.length; i++) this.pickups[i].respawn();
    }

    _spawnPickups() {
        // vertices per metre — the track is sampled every `smoothness` px and
        // 10 px is 1 m.
        var vpm = 10 / this.smoothness;
        var gasEvery = Ground.GAS_SPACING_M * vpm;
        var nextGas = 40;
        for (var i = 38; i < this.vectors.length - 12; i += floor(random(10,22))) {
            var v = this.vectors[i], px = v.x*SCALE, py = v.y*SCALE - 52;
            if (i >= nextGas) {
                this.pickups.push(new Pickup(px, py-20, 'gas'));
                // Fuel thins out as you get deeper — but gently, and capped, so
                // the back half of the track does not become a fuel puzzle.
                var stretch = min(1.18, 1 + (i / vpm) / 11000);
                nextGas = i + gasEvery * stretch + floor(random(-18, 18));
                continue;
            }
            if (random() < 0.10) {
                this.pickups.push(new Pickup(px, py, 'diamond'));
            } else {
                for (var j=0;j<4;j++) {
                    var ci = i+j*2;
                    if (ci < this.vectors.length) {
                        var cv = this.vectors[ci];
                        this.pickups.push(new Pickup(cv.x*SCALE, cv.y*SCALE - 46 - sin(j*0.9)*20, 'coin'));
                    }
                }
                i += 8;
            }
        }
    }

    // Only the slice of terrain actually on screen is drawn. With a 120 000px
    // track and a fullscreen canvas this is the difference between 60fps and a
    // slideshow — the old code walked all 15 000 vertices every single frame.
    _visibleRange() {
        var left  = (panX - 120) / SCALE;
        var right = (panX + viewW + 120) / SCALE;
        var lo = 2, hi = this.vectors.length - 3;
        var step = this.smoothness / SCALE;
        var i0 = max(lo, floor(left  / step) - 2);
        var i1 = min(hi, ceil (right / step) + 2);
        return [i0, i1];
    }

    // Traces the terrain surface (offset down by yOff) and closes it off at
    // `deep`, giving a fillable slab of hillside.
    _slab(ctx, i0, i1, yOff, deep) {
        ctx.beginPath();
        ctx.moveTo(this.vectors[i0].x*SCALE, this.vectors[i0].y*SCALE + yOff);
        for (var i=i0+1;i<=i1;i++) ctx.lineTo(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE + yOff);
        ctx.lineTo(this.vectors[i1].x*SCALE, deep);
        ctx.lineTo(this.vectors[i0].x*SCALE, deep);
        ctx.closePath();
    }

    show() {
        var r = this._visibleRange(), i0 = r[0], i1 = r[1];
        if (i1 <= i0) return;

        var deep = GROUND_BASE + 1400;
        var gt   = this.grassThick;

        push(); translate(-panX, -panY);
        var ctx = drawingContext;
        noStroke();

        // ── Bedrock ───────────────────────────────────────────────
        this._slab(ctx, i0, i1, 96, deep);
        ctx.fillStyle = '#3b2a20';
        ctx.fill();

        // ── Subsoil ───────────────────────────────────────────────
        this._slab(ctx, i0, i1, 40, deep);
        ctx.fillStyle = '#5c3c22';
        ctx.fill();

        // ── Topsoil, with depth falloff ───────────────────────────
        // The single flat brown fill is what made this read as a wall. A
        // gradient anchored to the terrain baseline gives it a floor.
        this._slab(ctx, i0, i1, 0, deep);
        var tg = ctx.createLinearGradient(0, GROUND_BASE - 520, 0, GROUND_BASE + 420);
        tg.addColorStop(0.00, '#9a6636');
        tg.addColorStop(0.35, '#89572c');
        tg.addColorStop(0.70, '#6d4322');
        tg.addColorStop(1.00, '#4e2f18');
        ctx.fillStyle = tg;
        ctx.fill();

        // Everything below is confined to the soil.
        ctx.save();
        this._slab(ctx, i0, i1, 0, deep);
        ctx.clip();

        // Grain overlay. The pattern rides the world transform, so it stays
        // locked to the hillside instead of swimming with the camera.
        var tex = vfxSoilTexture();
        if (tex) {
            var pat = ctx.createPattern(tex, 'repeat');
            if (pat) { ctx.fillStyle = pat; ctx.fillRect(panX - 40, panY - 40, viewW + 80, viewH + 80); }
        }

        // Geological strata at fixed world heights.
        var xL = this.vectors[i0].x*SCALE, xR = this.vectors[i1].x*SCALE;
        for (var s = 0; s < 7; s++) {
            var sy = GROUND_BASE + 70 + s * 96;
            var sh = 34 + (s % 3) * 12;
            // Soft-edged: a hard-edged band spans the full view and reads as a
            // drawing mistake rather than as bedding in the soil.
            var sg = ctx.createLinearGradient(0, sy, 0, sy + sh);
            var a  = (s % 2 === 0) ? 0.15 : 0.07;
            var c  = (s % 2 === 0) ? '38,22,10' : '176,132,84';
            sg.addColorStop(0.0, 'rgba(' + c + ',0)');
            sg.addColorStop(0.5, 'rgba(' + c + ',' + a + ')');
            sg.addColorStop(1.0, 'rgba(' + c + ',0)');
            ctx.fillStyle = sg;
            ctx.fillRect(xL, sy, xR - xL, sh);
        }

        // Embedded stones, pinned to their vertex index.
        for (var i = i0; i < i1; i++) {
            var v = this.vectors[i], vx = v.x*SCALE, vy = v.y*SCALE;
            var h1 = vfxHash01(i * 5 + 11);
            if (h1 > 0.86) {
                var rr = 5 + vfxHash01(i * 9 + 3) * 11;
                var ox = (vfxHash01(i * 3 + 7) - 0.5) * 16;
                var oy = 24 + vfxHash01(i * 17 + 2) * 90;
                ctx.fillStyle = 'rgba(96,88,80,0.85)';
                ctx.beginPath(); ctx.ellipse(vx+ox, vy+oy, rr*1.45, rr, 0.3, 0, 6.2832); ctx.fill();
                ctx.fillStyle = 'rgba(150,142,132,0.55)';
                ctx.beginPath(); ctx.ellipse(vx+ox-rr*0.25, vy+oy-rr*0.28, rr*0.68, rr*0.40, 0.3, 0, 6.2832); ctx.fill();
            }
            var h2 = vfxHash01(i * 23 + 41);
            if (h2 > 0.72) {
                ctx.fillStyle = 'rgba(70,42,18,0.30)';
                var pw = 14 + vfxHash01(i*31)*30;
                ctx.beginPath();
                ctx.ellipse(vx + (vfxHash01(i*37)-0.5)*14, vy + 14 + vfxHash01(i*41)*46,
                            pw, 4 + vfxHash01(i*43)*7, 0, 0, 6.2832);
                ctx.fill();
            }
        }

        // Contact shadow just under the turf — reads as overhang.
        ctx.strokeStyle = 'rgba(24,12,4,0.34)';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(this.vectors[i0].x*SCALE, this.vectors[i0].y*SCALE + 9);
        for (var i=i0+1;i<=i1;i++) ctx.lineTo(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE + 9);
        ctx.stroke();
        ctx.restore();

        // ── Turf ──────────────────────────────────────────────────
        // Four passes, each a plain polyline. These were curveVertex(), which
        // fits a Catmull-Rom spline through every point — four splines through
        // ~240 points each, every frame. At a 10px sample pitch the spline and
        // the polyline are within a fraction of a pixel of each other, so it
        // was paying a curve solve per point for nothing.
        noFill();
        var TURF = [[28,78,26, gt*3.00, gt*0.15],
                    [58,142,44, gt*1.70, gt*1.00],
                    [118,202,74, gt*0.85, gt*1.70]];
        for (var t2 = 0; t2 < 3; t2++) {
            var L = TURF[t2];
            ctx.strokeStyle = 'rgb('+L[0]+','+L[1]+','+L[2]+')';
            ctx.lineWidth = L[3];
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath();
            for (var i=i0;i<=i1;i++) {
                var vx2 = this.vectors[i].x*SCALE, vy2 = this.vectors[i].y*SCALE - L[4];
                if (i===i0) ctx.moveTo(vx2, vy2); else ctx.lineTo(vx2, vy2);
            }
            ctx.stroke();
        }
        // Rim light. Thin — a heavy line here becomes a hard baseline that the
        // blades appear to stand on, which is half of the picket-fence read.
        ctx.strokeStyle = 'rgba(186,240,130,0.59)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (var i=i0;i<=i1;i++) {
            var vx3 = this.vectors[i].x*SCALE, vy3 = this.vectors[i].y*SCALE - gt*2.15;
            if (i===i0) ctx.moveTo(vx3, vy3); else ctx.lineTo(vx3, vy3);
        }
        ctx.stroke();

        // ── Blades ────────────────────────────────────────────────
        // Tufted, not one-per-vertex. Evenly spaced blades of similar height at
        // a fixed 10px vertex pitch line up into a picket fence; clustering them
        // at irregular intervals and varying the height breaks the rhythm.
        //
        // Bucketed into three tones and stroked as three batched paths — a
        // stroke()/strokeWeight() pair per blade is several hundred full style
        // re-applications every frame for no visible gain.
        //
        // The per-blade layout is deterministic, so it is computed once per
        // vertex and kept. Rebuilding it every frame meant ~5 hash evaluations
        // per blade times ~800 visible blades — 4000 hashes a frame to arrive at
        // exactly the same numbers as the frame before. Only the sway is live.
        var TONES = [[74,164,54,0.55], [104,190,66,0.68], [138,214,86,0.80]];
        var buckets = [[],[],[]];
        var swayT = frameCount * 0.028;
        for (var i=i0;i<i1;i++) {
            var tuft = this._tuft(i);
            if (!tuft) continue;                             // gaps between tufts
            var v=this.vectors[i], vx=v.x*SCALE, vy=v.y*SCALE - gt*1.85;
            var phase = swayT + vx*0.04;
            for (var b=0;b<tuft.n;b++){
                var o  = b*3;
                var bx = vx + tuft.d[o];
                var sway = sin(phase + b*1.7) * 1.5 + tuft.lean;
                buckets[tuft.d[o+2]].push(bx, vy, bx+sway, vy - tuft.d[o+1]);
            }
        }
        for (var t=0;t<3;t++) {
            var pts = buckets[t];
            if (!pts.length) continue;
            var T = TONES[t];
            ctx.strokeStyle = 'rgba('+T[0]+','+T[1]+','+T[2]+','+T[3]+')';
            ctx.lineWidth = 0.9 + t*0.25;
            ctx.beginPath();
            for (var k=0;k<pts.length;k+=4) { ctx.moveTo(pts[k], pts[k+1]); ctx.lineTo(pts[k+2], pts[k+3]); }
            ctx.stroke();
        }
        noStroke();

        pop();

        // Cull off-screen pickups. _spawnPickups walks the track from the start,
        // so this list is already sorted by x and the visible window can be
        // found by bisection instead of by scanning the whole thing. On a 10km
        // track that is ~3900 pickups examined every frame to draw the twenty or
        // so actually on screen.
        var pl = panX - 80, pr = panX + viewW + 80;
        var lo = 0, hi = this.pickups.length;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (this.pickups[mid].x < pl) lo = mid + 1; else hi = mid; }
        for (var pi = lo; pi < this.pickups.length; pi++) {
            var p = this.pickups[pi];
            if (p.x > pr) break;
            if (!p.collected) p.show();
        }
    }

    // Blade layout for one terrain vertex, built on first sight and kept.
    // `null` means this vertex carries no tuft.
    _tuft(i) {
        var c = this._blades[i];
        if (c !== undefined) return c;
        if (vfxHash01(i*13+7) < 0.42) return (this._blades[i] = null);
        var n = 3 + floor(vfxHash01(i*7+13) * 4);
        var d = new Float32Array(n*3);                       // ox, height, tone bucket
        for (var b = 0; b < n; b++) {
            var seed = i*61 + b*17;
            d[b*3]     = (vfxHash01(seed) - 0.5) * 7;
            d[b*3 + 1] = 3.5 + vfxHash01(seed+3) * 7.5;
            d[b*3 + 2] = min(2, floor(vfxHash01(seed+5) * 3));
        }
        return (this._blades[i] = {
            n: n,
            lean: (vfxHash01(i*19+5) - 0.5) * 3.2,           // whole tuft leans together
            d: d
        });
    }

    _edge(v1, v2, mask, category, friction) {
        var bd = new b2BodyDef(); bd.type = b2StaticBody;
        bd.position.x = 0; bd.position.y = 0;
        var fd = new b2FixtureDef(); fd.friction = friction||3.0; fd.restitution = 0.0;
        fd.shape = new b2PolygonShape(); fd.shape.SetAsEdge(v1, v2);
        var filt = new b2FilterData(); filt.categoryBits = category; filt.maskBits = mask;
        var body = world.CreateBody(bd); body.CreateFixture(fd).SetFilterData(filt);
        return body;
    }
}
