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
    constructor(x, y, r, chassisBody, tag) {
        this.startingPosition = createVector(x, y);
        this.radius  = r;
        this.tag     = tag || 'wheel';
        this.restY   = y;

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
            // Longer travel than before (0.55r → 1.0r of droop) so the hills are
            // absorbed by the springs instead of punting the whole truck.
            pjDef.lowerTranslation = -0.55 * r / SCALE;
            pjDef.upperTranslation =  1.00 * r / SCALE;
            this.axleJoint = world.CreateJoint(pjDef);

            // ── Joint C: the spring ───────────────────────────────
            // Softer and less critically damped than the old setup: the wheels
            // now follow the ground over bumps rather than skipping off them,
            // and the travel is big enough to actually see.
            var dj = new b2DistanceJointDef();
            dj.Initialize(this.rimBody, chassisBody, new Vec2(x/SCALE, y/SCALE), new Vec2(cAnchorX, cAnchorY));
            if (tag === 'rear') { dj.frequencyHz = 4.2; dj.dampingRatio = 0.62; }
            else                { dj.frequencyHz = 4.8; dj.dampingRatio = 0.66; }
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
        var r = this.radius;

        // Contact shadow under the tyre
        noStroke(); fill(0, 0, 0, 45);
        ellipse(0, r*0.55, r*1.9, r*0.7);

        // ── Tyre carcass ──────────────────────────────────────────
        fill(26, 26, 30);
        stroke(14, 14, 16); strokeWeight(2);
        ellipse(0, 0, r*2.1, r*2.1);

        // ── Chunky off-road tread blocks ──────────────────────────
        noStroke();
        var lugs = 12;
        for (var i = 0; i < lugs; i++) {
            var a = TWO_PI/lugs*i;
            push();
            rotate(a);
            fill(44, 44, 50);
            rect(-r*0.15, -r*1.05, r*0.30, r*0.26, 2);
            fill(12, 12, 14);
            rect(-r*0.15, -r*0.86, r*0.30, r*0.07, 1);
            pop();
        }

        // Sidewall rings
        noFill(); stroke(52, 52, 60); strokeWeight(1.6);
        ellipse(0, 0, r*1.72, r*1.72);
        stroke(38, 38, 44); strokeWeight(1);
        ellipse(0, 0, r*1.52, r*1.52);

        // ── Rim ───────────────────────────────────────────────────
        // Kept small and mid-toned. A big bright rim swallows the tyre and the
        // wheel stops reading as chunky rubber.
        noStroke();
        fill(206, 210, 218); ellipse(0, 0, r*0.92, r*0.92);
        fill(158, 165, 176); ellipse(0, 0, r*0.80, r*0.80);

        // 5 spoke cut-outs
        fill(96, 102, 114);
        for (var s = 0; s < 5; s++) {
            var sa = TWO_PI/5*s;
            push(); rotate(sa);
            ellipse(0, -r*0.30, r*0.18, r*0.24);
            pop();
        }

        // Hub
        fill(76, 82, 94);   ellipse(0, 0, r*0.34, r*0.34);
        fill(206, 40, 34);  ellipse(0, 0, r*0.15, r*0.15);

        // Specular glint so the wheel reads as round while spinning
        noStroke(); fill(255, 255, 255, 38);
        arc(-r*0.16, -r*0.16, r*0.92, r*0.92, -2.05, -0.5);
    }
}
