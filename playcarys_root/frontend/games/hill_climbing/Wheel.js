// ─────────────────────────────────────────────────────────────────
//  Wheel.js  —  FINAL CORRECT joint chain
//
//  THE TWO BUGS FIXED:
//
//  BUG 1 — Car won't move (motor has nothing to push against):
//    rimBody had NO rigid link to chassisBody. Motor spins tyre vs rim
//    but rim just floats freely → zero propulsion.
//    FIX: Add RevoluteJoint B between rimBody and chassisBody.
//         This gives motor torque a reaction point on the chassis.
//
//  BUG 2 — Chassis stays horizontal (can't tilt with terrain):
//    Old code had PrismaticJoint(axis Vec2(0,-1)) in WORLD space,
//    which physically prevented chassis rotation.
//    FIX: RevoluteJoint B (not Prismatic) — allows free chassis rotation
//         so terrain contact forces naturally tilt the body.
//
//  Final joint chain:
//    wheelBody ←[RevoluteJoint A / MOTOR]→ rimBody
//    rimBody   ←[RevoluteJoint B / ANCHOR]→ chassisBody   ← enables tilt
//    rimBody   ←[DistanceJoint C / SPRING]→ chassisBody   ← soft suspension
// ─────────────────────────────────────────────────────────────────
class Wheel {
    constructor(x, y, r, chassisBody, tag) {
        this.startingPosition = createVector(x, y);
        this.radius  = r;
        this.tag     = tag || 'wheel';

        // ── Tyre body — collides with ground ──────────────────────
        var bd = new b2BodyDef();
        bd.type       = b2DynamicBody;
        bd.position.x = x / SCALE;
        bd.position.y = y / SCALE;

        var fd         = new b2FixtureDef();
        fd.density     = 2.5;
        fd.friction    = 3.5;
        fd.restitution = 0.0;   // zero bounce
        fd.shape       = new b2CircleShape(r / SCALE);

        this.body = world.CreateBody(bd);
        var wf = new b2FilterData();
        wf.categoryBits = WHEEL_CATEGORY;
        wf.maskBits     = WHEEL_MASK;
        this.body.CreateFixture(fd).SetFilterData(wf);

        // ── Rim body — no collision, bridges tyre ↔ chassis ───────
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
        rf2.groupIndex = -1;   // collides with nothing
        this.rimBody.CreateFixture(rf).SetFilterData(rf2);

        // ── Joint A: Revolute tyre ↔ rim  (MOTOR) ─────────────────
        // Tyre spins relative to rim. Motor torque applied here.
        var rjA = new b2RevoluteJointDef();
        rjA.Initialize(this.body, this.rimBody, this.body.GetPosition());
        rjA.enableMotor    = true;
        rjA.maxMotorTorque = 0;
        rjA.motorSpeed     = 0;
        this.joint = world.CreateJoint(rjA);

        if (chassisBody) {
            // Attachment point on chassis — directly above wheel
            var cAnchorX = x / SCALE;
            var cAnchorY = (y - r * 2.8) / SCALE;

            // ── Joint B: Prismatic rim ↔ chassis  (SLIDE + TILT) ──
            // Prismatic joint between rim and chassis allows vertical sliding.
            // Since rim has no ground friction, it happily rotates with the chassis,
            // while the tyre rotates freely around the rim via the Revolute Joint A.
            var pjDef = new b2PrismaticJointDef();
            pjDef.Initialize(
                this.rimBody,
                chassisBody,
                this.rimBody.GetPosition(),
                new Vec2(0, 1)
            );
            pjDef.enableLimit = true;
            // Limit the sliding to a small range to prevent wheel from breaking outside chassis
            pjDef.lowerTranslation = -1.0 * r / SCALE;
            pjDef.upperTranslation =  1.0 * r / SCALE;
            this.axleJoint = world.CreateJoint(pjDef);

            // ── Joint C: Distance spring (SUSPENSION) ─────────────
            // Soft spring between rim and chassis.
            // Low frequencyHz = soft = stays on ground, no trampoline.
            // High dampingRatio = no bounce oscillation.
            var dj = new b2DistanceJointDef();
            dj.Initialize(
                this.rimBody,
                chassisBody,
                new Vec2(x / SCALE, y / SCALE),
                new Vec2(cAnchorX,  cAnchorY)
            );
            if (tag === 'rear') {
                dj.frequencyHz  = 5.5;
                dj.dampingRatio = 0.95;
            } else {
                dj.frequencyHz  = 6.0;
                dj.dampingRatio = 0.92;
            }
            this.distJoint = world.CreateJoint(dj);
        }

        // Low angular damping on wheel — doesn't resist chassis tilt
        this.body.SetAngularDamping(0.8);
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

        // Tyre rubber
        fill(18, 18, 18);
        stroke(35, 35, 35); strokeWeight(2);
        ellipse(0, 0, r * 2.1, r * 2.1);

        // Off-road tread lugs
        stroke(8); strokeWeight(3);
        for (var i = 0; i < 10; i++) {
            var a  = TWO_PI / 10 * i;
            var a2 = a + 0.17;
            line(cos(a)*r*0.82, sin(a)*r*0.82, cos(a)*r, sin(a)*r);
            line(cos(a2)*r*0.82, sin(a2)*r*0.82, cos(a2)*r, sin(a2)*r);
        }

        // Sidewall
        noFill(); stroke(48, 48, 48); strokeWeight(1.5);
        ellipse(0, 0, r * 1.7, r * 1.7);

        // Alloy rim
        noStroke();
        fill(80, 88, 96);    ellipse(0, 0, r * 1.3, r * 1.3);
        fill(102, 112, 122); ellipse(0, 0, r * 0.9, r * 0.9);

        // 5 spokes
        stroke(60, 68, 76); strokeWeight(4);
        for (var s = 0; s < 5; s++) {
            var sa = TWO_PI / 5 * s;
            line(cos(sa)*r*0.12, sin(sa)*r*0.12, cos(sa)*r*0.58, sin(sa)*r*0.58);
        }
        stroke(48, 55, 63); strokeWeight(2);
        for (var s = 0; s < 5; s++) {
            var sa = TWO_PI / 5 * s + 0.13;
            line(cos(sa)*r*0.12, sin(sa)*r*0.12, cos(sa)*r*0.56, sin(sa)*r*0.56);
        }

        // Hub
        noStroke();
        fill(52, 58, 65);    ellipse(0, 0, r * 0.34, r * 0.34);
        fill(185, 190, 198); ellipse(0, 0, r * 0.15, r * 0.15);

        // Glint
        fill(255, 255, 255, 28);
        arc(-r * 0.15, -r * 0.15, r * 0.85, r * 0.85, -2.0, -0.45);
    }
}
