// ─────────────────────────────────────────────────────────────────
//  Wheel.js  —  tyre + hub + suspension
//
//  Joint chain (unchanged in shape, retuned for travel):
//    tyreBody ←[RevoluteJoint A / MOTOR ]→ rimBody
//    rimBody  ←[PrismaticJoint B / SLIDE]→ chassisBody
//    rimBody  ←[DistanceJoint C / SPRING]→ chassisBody
//
//  Why it is built this way:
//    * The motor needs a reaction point on the chassis, so the rim is rigidly
//      carried by the body while the tyre spins freely around it.
//    * The prismatic joint lets the hub travel up and down; the distance joint
//      is the spring that pushes it back. Together they are the suspension.
//    * A revolute (not prismatic) chassis link would let the body rotate freely
//      of the hub, which reads as a wobble — the slide keeps the wheel under the
//      truck while the chassis still tilts with the terrain.
//
//  Box2D 2.1a has no b2WheelJoint, so this two-joint pair is the equivalent.
// ─────────────────────────────────────────────────────────────────
class Wheel {
    constructor(x, y, r, chassisBody, tag, susp, style) {
        this.startingPosition = createVector(x, y);
        this.radius  = r;
        this.tag     = tag || 'wheel';
        this.style   = style || 'truck';
        this.restY   = y;
        // Per-vehicle spring rates; the bike runs softer and longer-travel.
        this.susp    = susp || { rearHz: 4.2, rearD: 0.62, frontHz: 4.8, frontD: 0.66, droop: 1.00 };

        // ── Tyre — the only part that touches the ground ──────────
        var bd = new b2BodyDef();
        bd.type       = b2DynamicBody;
        bd.position.x = x / SCALE;
        bd.position.y = y / SCALE;

        var fd         = new b2FixtureDef();
        fd.density     = 2.2;
        fd.friction    = 3.6;
        fd.restitution = 0.02;
        fd.shape       = new b2CircleShape(r / SCALE);

        this.body = world.CreateBody(bd);
        var wf = new b2FilterData();
        wf.categoryBits = WHEEL_CATEGORY;
        wf.maskBits     = WHEEL_MASK;
        this.body.CreateFixture(fd).SetFilterData(wf);

        // ── Rim — collides with nothing, bridges tyre ↔ chassis ───
        var rd = new b2BodyDef();
        rd.type       = b2DynamicBody;
        rd.position.x = x / SCALE;
        rd.position.y = y / SCALE;

        var rf         = new b2FixtureDef();
        rf.density     = 0.5;
        rf.friction    = 0.1;
        rf.restitution = 0.0;
        rf.shape       = new b2CircleShape(r * 0.4 / SCALE);

        this.rimBody = world.CreateBody(rd);
        var rf2 = new b2FilterData();
        rf2.groupIndex = -1;
        this.rimBody.CreateFixture(rf).SetFilterData(rf2);

        // ── Joint A: motor ────────────────────────────────────────
        var rjA = new b2RevoluteJointDef();
        rjA.Initialize(this.body, this.rimBody, this.body.GetPosition());
        rjA.enableMotor    = true;
        rjA.maxMotorTorque = 0;
        rjA.motorSpeed     = 0;
        this.joint = world.CreateJoint(rjA);

        if (chassisBody) {
            var cAnchorX = x / SCALE;
            var cAnchorY = (y - r * 2.4) / SCALE;

            // ── Joint B: suspension travel ────────────────────────
            var pjDef = new b2PrismaticJointDef();
            pjDef.Initialize(this.rimBody, chassisBody, this.rimBody.GetPosition(), new Vec2(0, 1));
            pjDef.enableLimit = true;
            // SIGN: the joint is initialised with the rim as body A, so a
            // POSITIVE translation moves the chassis down the axis relative to
            // the hub — that is COMPRESSION, not droop. The two limits were the
            // wrong way round, which meant `droop` was silently setting how far
            // the tyre could be squashed UP into the bodywork. Measured on the
            // bike: the hub sat 32px below the chassis centre at rest and was
            // driven to 8px, i.e. 24px of compression on a frame 24px tall, so
            // the wheel spent much of its life drawn through the middle of the
            // bike. `bump` limits compression; `droop` limits how far the wheel
            // hangs when the vehicle is airborne.
            pjDef.lowerTranslation = -(this.susp.droop || 1.0) * r / SCALE;
            pjDef.upperTranslation =  (this.susp.bump  || 0.55) * r / SCALE;
            this.axleJoint = world.CreateJoint(pjDef);

            // ── Joint C: the spring ───────────────────────────────
            // Softer and less critically damped than the old setup: the wheels
            // now follow the ground over bumps rather than skipping off them,
            // and the travel is big enough to actually see.
            var dj = new b2DistanceJointDef();
            dj.Initialize(this.rimBody, chassisBody, new Vec2(x/SCALE, y/SCALE), new Vec2(cAnchorX, cAnchorY));
            if (tag === 'rear') { dj.frequencyHz = this.susp.rearHz;  dj.dampingRatio = this.susp.rearD; }
            else                { dj.frequencyHz = this.susp.frontHz; dj.dampingRatio = this.susp.frontD; }
            this.distJoint = world.CreateJoint(dj);
        }

        this.body.SetAngularDamping(0.6);
        this.rimBody.SetAngularDamping(0.3);
    }

    show() {
        var x     = this.body.GetPosition().x * SCALE;
        var y     = this.body.GetPosition().y * SCALE;
        var angle = this.body.GetAngle();
        push();
        translate(x - panX, y - panY);
        rotate(angle);
        this._draw();
        pop();
    }

    _draw() {
        if (this.style === 'bike') return this._drawBikeWheel();
        var r = this.radius;
        var ctx = drawingContext;

        // Contact shadow under the tyre
        noStroke(); fill(0, 0, 0, 52);
        ellipse(0, r*0.58, r*1.95, r*0.72);

        // ── Tyre carcass ──────────────────────────────────────────
        // Radial gradient rather than a flat black: rubber has a lit shoulder and
        // a dark core, and that is what makes it read as a round volume.
        var tg = ctx.createRadialGradient(-r*0.35, -r*0.40, r*0.10, 0, 0, r*1.10);
        tg.addColorStop(0.00, '#4a4a54');
        tg.addColorStop(0.42, '#26262c');
        tg.addColorStop(0.86, '#131317');
        tg.addColorStop(1.00, '#0a0a0d');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(0, 0, r*1.06, 0, 6.2832); ctx.fill();

        // ── Tread blocks ──────────────────────────────────────────
        var lugs = 14;
        for (var i = 0; i < lugs; i++) {
            var a = TWO_PI/lugs*i;
            push();
            rotate(a);
            // Block face, then a shadowed groove behind it — the pair is what
            // gives the tread apparent depth.
            fill(58, 58, 66);  rect(-r*0.16, -r*1.06, r*0.32, r*0.24, 2);
            fill(30, 30, 36);  rect(-r*0.16, -r*0.90, r*0.32, r*0.09, 1);
            fill(84, 84, 94, 150); rect(-r*0.14, -r*1.05, r*0.28, r*0.06, 1.5);
            pop();
        }

        // Sidewall
        noFill();
        stroke(64, 64, 74, 190); strokeWeight(1.7); ellipse(0, 0, r*1.74, r*1.74);
        stroke(20, 20, 26, 220); strokeWeight(1.2); ellipse(0, 0, r*1.54, r*1.54);
        stroke(46, 46, 54, 140); strokeWeight(1.0); ellipse(0, 0, r*1.30, r*1.30);
        noStroke();

        // ── Rim ───────────────────────────────────────────────────
        var rg = ctx.createLinearGradient(-r*0.5, -r*0.5, r*0.45, r*0.55);
        rg.addColorStop(0.00, '#eef1f6');
        rg.addColorStop(0.34, '#b9c0cc');
        rg.addColorStop(0.62, '#79818f');
        rg.addColorStop(1.00, '#4a515d');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, r*0.50, 0, 6.2832); ctx.fill();

        fill(52, 57, 66); ellipse(0, 0, r*0.86, r*0.86);

        // Spokes
        for (var s = 0; s < 6; s++) {
            var sa = TWO_PI/6*s;
            push(); rotate(sa);
            fill(178, 186, 198);
            beginShape();
            vertex(-r*0.075, -r*0.10); vertex(r*0.075, -r*0.10);
            vertex(r*0.115, -r*0.40);  vertex(-r*0.115, -r*0.40);
            endShape(CLOSE);
            fill(226, 232, 240, 130);
            rect(-r*0.055, -r*0.38, r*0.045, r*0.27);
            pop();
        }

        // Hub + lug nuts
        fill(96, 104, 118); ellipse(0, 0, r*0.36, r*0.36);
        fill(58, 64, 74);
        for (var n = 0; n < 5; n++) {
            var na = TWO_PI/5*n + 0.3;
            ellipse(cos(na)*r*0.12, sin(na)*r*0.12, r*0.055, r*0.055);
        }
        fill(206, 40, 34); ellipse(0, 0, r*0.15, r*0.15);
        fill(255, 120, 110, 160); ellipse(-r*0.02, -r*0.02, r*0.07, r*0.07);

        // Specular arc across the upper-left shoulder
        noFill(); stroke(255, 255, 255, 34); strokeWeight(r*0.10);
        arc(0, 0, r*1.60, r*1.60, -2.30, -0.75);
        noStroke();
    }

    // A motocross wheel is mostly rim and spoke with a thin knobbly tyre around
    // it. Reusing the truck's fat carcass here made the bike look like it was
    // riding on monster-truck tyres.
    _drawBikeWheel() {
        var r = this.radius;

        noStroke(); fill(0, 0, 0, 48);
        ellipse(0, r*0.62, r*1.75, r*0.60);

        // Proportions taken from a real motocross tyre rather than guessed. An
        // 80/100-21 front is a 533mm rim inside a 693mm overall diameter, so the
        // sidewall is (693-533)/2 = 80mm on a 346mm radius: the rubber is 0.23 r
        // deep and the rim sits at 0.77 r. The old drawing used a 0.34 r band on
        // a 0.66 r rim, which is a quad tyre — far too much sidewall and far too
        // little wheel, and it is most of why the tyres visually swamped the bike.
        var RIM  = 0.77;                 // rim radius, in wheel radii
        var WALL = 1.00 - RIM;           // 0.23 r of rubber

        // Tyre carcass — an annulus, not a disc.
        noFill();
        stroke(18, 18, 22); strokeWeight(r*WALL);
        ellipse(0, 0, r*(RIM + 0.5*WALL)*2, r*(RIM + 0.5*WALL)*2);

        // Knobbly tread — short radial ticks standing off the crown.
        stroke(52, 52, 62); strokeWeight(r*0.09);
        var knobs = 22;
        for (var i = 0; i < knobs; i++) {
            var a = TWO_PI/knobs*i;
            var c = cos(a), s = sin(a);
            line(c*r*0.94, s*r*0.94, c*r*1.05, s*r*1.05);
        }

        // Rim: a deep hoop, which is what a 21-inch wheel actually looks like.
        stroke(206, 212, 224); strokeWeight(r*0.085);
        ellipse(0, 0, r*RIM*2, r*RIM*2);
        stroke(132, 140, 154); strokeWeight(r*0.04);
        ellipse(0, 0, r*(RIM-0.07)*2, r*(RIM-0.07)*2);

        // Spokes — long, because the hub is small relative to a 21in rim.
        stroke(190, 196, 208, 190); strokeWeight(r*0.03);
        for (var s2 = 0; s2 < 16; s2++) {
            var sa = TWO_PI/16*s2;
            line(cos(sa)*r*0.14, sin(sa)*r*0.14,
                 cos(sa + 0.20)*r*(RIM-0.05), sin(sa + 0.20)*r*(RIM-0.05));
        }
        noStroke();

        // Brake disc + hub. A real 260mm disc on a 346mm wheel radius is 0.38 r
        // in radius; the hub carrier is about a third of that.
        noFill(); stroke(150, 158, 172, 130); strokeWeight(r*0.05);
        ellipse(0, 0, r*0.76, r*0.76);
        noStroke();
        fill(120, 128, 142, 110); ellipse(0, 0, r*0.70, r*0.70);
        fill(86, 92, 106);        ellipse(0, 0, r*0.26, r*0.26);
        fill(214, 62, 50);        ellipse(0, 0, r*0.11, r*0.11);

        noFill(); stroke(255, 255, 255, 30); strokeWeight(r*0.07);
        arc(0, 0, r*1.86, r*1.86, -2.30, -0.85);
        noStroke();
    }
}
