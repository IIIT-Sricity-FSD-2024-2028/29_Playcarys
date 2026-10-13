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
        this._generate();
        this._buildPhysics();
        this._spawnPickups();
    }

    // Steepest slope the truck is allowed to meet. Anything sharper than this
    // is simply not drivable — the tyres spin and the run dead-ends. The old
    // generator produced 84° cliffs, which is why a run always stalled at the
    // same spot; MAX_SLOPE is now enforced instead of hoped for.
    static get MAX_SLOPE() { return Math.tan(29 * Math.PI / 180); }

    _generate() {
        // Back wall so you cannot reverse off the start of the track.
        this.vectors.push(new Vec2(-60, -4000));
        this.vectors.push(new Vec2(-60,  GROUND_BASE + 900));

        var startFlat = 360;   // a short flat run-up before the first hill
        var blendEnd  = 760;
        var baseH     = GROUND_BASE;
        var step      = this.smoothness;

        // ── 1. Height field ───────────────────────────────────────
        var xs = [], hs = [];
        for (var i = 0; i < this.distance; i += step) {
            // Difficulty grows with distance, but it is CAPPED: this factor
            // multiplies amplitude, and amplitude drives slope, so letting it
            // run away is what created the cliffs.
            var diffFactor = min(1 + (i / 9000), 1.75);

            // Low frequency = the big climbs. Higher frequencies are kept small
            // so they add texture for the suspension without adding gradient.
            // Amplitudes are chosen so the raw profile mostly sits UNDER the
            // slope cap. When the cap has to bind it flattens the hill into a
            // long constant-gradient wall, which is exactly the terrain that
            // brings a run to a dead stop.
            var raw = ( sin(i*0.0022)*78
                      + sin(i*0.0051+0.9)*30
                      + sin(i*0.0104+1.8)*13
                      + (noise(i*0.0013)-0.5)*110
                      + (noise(i*0.0090)-0.5)*16 ) * diffFactor;

            var h = baseH - raw;

            if      (i < startFlat) h = baseH;
            else if (i < blendEnd)  h = lerp(baseH, h, (i-startFlat)/(blendEnd-startFlat));

            h = constrain(h, GROUND_BASE - 560, GROUND_BASE + 200);
            xs.push(i); hs.push(h);
        }

        // ── 2. Slope limiter ──────────────────────────────────────
        // Clamp each step against its neighbour, alternating direction until the
        // whole profile satisfies |dy/dx| <= MAX_SLOPE. Three sweeps is ample
        // for a field this smooth.
        var maxD = Ground.MAX_SLOPE * step;
        for (var pass = 0; pass < 3; pass++) {
            for (var k = 1; k < hs.length; k++) {
                if (hs[k] > hs[k-1] + maxD) hs[k] = hs[k-1] + maxD;
                if (hs[k] < hs[k-1] - maxD) hs[k] = hs[k-1] - maxD;
            }
            for (var k = hs.length-2; k >= 0; k--) {
                if (hs[k] > hs[k+1] + maxD) hs[k] = hs[k+1] + maxD;
                if (hs[k] < hs[k+1] - maxD) hs[k] = hs[k+1] - maxD;
            }
        }

        // Keep the opening stretch dead flat after limiting, so you always get a
        // clean launch off the start line.
        for (var k = 0; k < hs.length && xs[k] < startFlat; k++) hs[k] = baseH;

        for (var k = 0; k < hs.length; k++) this.vectors.push(new Vec2(xs[k], hs[k]));

        this.vectors.push(new Vec2(this.distance, GROUND_BASE + 1000));
        this.vectors.push(new Vec2(-60,           GROUND_BASE + 1000));

        for (var v of this.vectors) { v.x /= SCALE; v.y /= SCALE; }
    }

    _buildPhysics() {
        this.dirtBodies  = [];
        this.grassBodies = [];
        var gt = this.grassThick / SCALE;
        for (var i = 1; i < this.vectors.length; i++) {
            this.dirtBodies.push(this._edge(this.vectors[i-1], this.vectors[i], DIRT_MASK, DIRT_CATEGORY, 0.8));
            var v0 = new Vec2(this.vectors[i-1].x, this.vectors[i-1].y - gt);
            var v1 = new Vec2(this.vectors[i].x,   this.vectors[i].y   - gt);
            this.grassBodies.push(this._edge(v0, v1, GRASS_MASK, GRASS_CATEGORY, 4.0));
        }
    }

    _spawnPickups() {
        var nextGas = 40;
        for (var i = 38; i < this.vectors.length - 12; i += floor(random(10,22))) {
            var v = this.vectors[i], px = v.x*SCALE, py = v.y*SCALE - 52;
            if (i >= nextGas) {
                this.pickups.push(new Pickup(px, py-20, 'gas'));
                var gapIncrease = (i / 500) * 20;   // fuel gets scarcer with distance
                nextGas = i + 220 + gapIncrease + floor(random(-20,20));
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

    show() {
        var r = this._visibleRange(), i0 = r[0], i1 = r[1];
        if (i1 <= i0) return;

        var deep = GROUND_BASE + 1400;

        push(); translate(-panX, -panY);

        // ── Deep rock base ────────────────────────────────────────
        noStroke(); fill(58, 42, 32);
        beginShape();
        for (var i=i0;i<=i1;i++) vertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE + 46);
        vertex(this.vectors[i1].x*SCALE, deep);
        vertex(this.vectors[i0].x*SCALE, deep);
        endShape(CLOSE);

        // ── Dirt ──────────────────────────────────────────────────
        fill(104, 66, 32);
        beginShape();
        for (var i=i0;i<=i1;i++) vertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE);
        vertex(this.vectors[i1].x*SCALE, deep);
        vertex(this.vectors[i0].x*SCALE, deep);
        endShape(CLOSE);

        // ── Soil speckle + embedded rocks ─────────────────────────
        randomSeed(1337 + i0);
        for (var i=i0;i<i1;i+=2) {
            var v=this.vectors[i];
            var vx=v.x*SCALE, vy=v.y*SCALE;
            if (floor(random(3))===0) {
                fill(86, 52, 24, 190);
                ellipse(vx+random(-6,6), vy+random(14,42), random(20,44), random(6,15));
            }
            if (floor(random(9))===0) {
                fill(118, 112, 106, 200);
                var rr=random(7,15);
                ellipse(vx+random(-8,8), vy+random(26,74), rr*1.5, rr);
                fill(146,140,134,150);
                ellipse(vx+random(-8,8), vy+random(24,70), rr*0.7, rr*0.45);
            }
        }
        randomSeed(0);

        // ── Grass band ────────────────────────────────────────────
        var gt = this.grassThick;
        noFill();
        stroke(38, 104, 30); strokeWeight(gt*2.9);
        beginShape();
        for (var i=i0;i<=i1;i++) curveVertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE);
        endShape();
        stroke(74, 176, 52); strokeWeight(gt*1.2);
        beginShape();
        for (var i=i0;i<=i1;i++) curveVertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE - gt*0.9);
        endShape();
        stroke(126, 216, 84, 190); strokeWeight(1.8);
        beginShape();
        for (var i=i0;i<=i1;i++) curveVertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE - gt*1.7);
        endShape();

        // ── Individual grass blades along the crest ───────────────
        randomSeed(77 + i0);
        stroke(96, 196, 62, 210); strokeWeight(1.6);
        for (var i=i0;i<i1;i++) {
            var v=this.vectors[i], vx=v.x*SCALE, vy=v.y*SCALE - gt*1.4;
            var n = floor(random(2,4));
            for (var b=0;b<n;b++){
                var ox = random(-4,4);
                var hgt= random(5,12);
                var sway = sin(frameCount*0.03 + vx*0.05 + b)*1.8;
                line(vx+ox, vy, vx+ox+sway, vy-hgt);
            }
        }
        randomSeed(0);
        noStroke();

        pop();

        // Cull off-screen pickups too — there are hundreds along the track.
        var pl = panX - 80, pr = panX + viewW + 80;
        for (var p of this.pickups) {
            if (p.collected) continue;
            if (p.x < pl || p.x > pr) continue;
            p.show();
        }
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
