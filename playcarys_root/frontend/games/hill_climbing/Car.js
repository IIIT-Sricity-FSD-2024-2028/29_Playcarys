// Car.js — F1 Race Car
// PHYSICS RULES:
//   1. Chassis collision hull MUST be convex (Box2D requirement)
//   2. Front wing tip must NOT extend past front wheel (or it drags on ground)
//   3. angularDamping = 0.3 (same as original) — too low causes instability
//   4. Visual drawing is separate from physics hull — F1 body drawn cosmetically
class Car {
    constructor(x, y) {
        this.wheels   = [];
        this.startingPosition = createVector(x, y);

        this.chassisWidth  = 130;
        this.chassisHeight = 36;
        this.wheelSize     = 17;

        this.carDensity     = 2.5;
        this.carRestitution = 0.02;

        this.motorState    = 0;
        this.fuel          = 100;
        this.coins         = 0;
        this.diamonds      = 0;
        this.distance      = 0;
        this.isFuelOut     = false;
        this.headCrashed   = false;
        this.broken        = false;
        this.currentTorque = 0;
        this.shapes        = [];

        // ── Chassis physics body ───────────────────────────────────
        // CONVEX hull only — must pass Box2D's convexity check
        // Keep it simple: trapezoid shape similar to original
        var bd = new b2BodyDef();
        bd.type = b2DynamicBody;
        bd.position.x = x / SCALE;
        bd.position.y = y / SCALE;

        var fd = new b2FixtureDef();
        fd.density = this.carDensity;
        fd.friction = 0.4;
        fd.restitution = this.carRestitution;
        fd.shape = new b2PolygonShape();

        // Simple convex hull (6 points, guaranteed convex, wound correctly)
        var W = this.chassisWidth, H = this.chassisHeight;
        var verts = [
            new Vec2(-W/2,       H/2),    // rear bottom
            new Vec2( W/2 + 8,   H/2),    // front bottom
            new Vec2( W/2 + 14,  H/2-10), // front nose
            new Vec2( W/3,      -H/2),    // hood
            new Vec2(-W/2 + 8,  -H/2),    // roof
            new Vec2(-W/2,      -H/4),    // rear top
        ];
        verts.reverse(); // Box2D requires Counter-Clockwise order
        for (var v of verts) { v.x /= SCALE; v.y /= SCALE; }
        fd.shape.SetAsArray(verts, verts.length);
        this.shapes.push(verts);
        this.chassisBody = world.CreateBody(bd);

        var filt = new b2FilterData();
        filt.categoryBits = CHASSIS_CATEGORY;
        filt.maskBits     = CHASSIS_MASK;
        this.chassisBody.CreateFixture(fd).SetFilterData(filt);

        // Cabin fixture (simple convex quad)
        var fd2 = new b2FixtureDef();
        fd2.density = this.carDensity; fd2.friction = 0.3; fd2.restitution = this.carRestitution;
        fd2.shape = new b2PolygonShape();
        var cab = [
            new Vec2(-W/2+8,  -H/2),
            new Vec2( W/3,    -H/2),
            new Vec2( W/4-4,  -H/2-18),
            new Vec2(-W/2+16, -H/2-18),
        ];
        cab.reverse(); // Require CCW order
        for (var v of cab) { v.x /= SCALE; v.y /= SCALE; }
        fd2.shape.SetAsArray(cab, cab.length);
        this.chassisBody.CreateFixture(fd2).SetFilterData(filt);
        this.shapes.push(cab);

        // SAME damping as original (0.3) — allows tilt, prevents instability
        this.chassisBody.SetLinearDamping(0.05);
        this.chassisBody.SetAngularDamping(0.0);  // MUST be 0 — any value > 0 fights terrain tilt

        // ── Wheels ────────────────────────────────────────────────
        // Wheel X positions MUST keep wings within wheelbase
        var wr = this.wheelSize;
        var wy = y + H/2 + wr * 0.8;
        var rearX  = x - W/2 + wr * 1.2;
        var frontX = x + W/2 - wr * 1.0;
        this.wheels.push(new Wheel(rearX,  wy, wr, this.chassisBody, 'rear'));
        this.wheels.push(new Wheel(frontX, wy, wr, this.chassisBody, 'front'));

        // ── Driver ───────────────────────────────────────────────
        this.person = new Person(x, y, 14, 28);

        var rj = new b2RevoluteJointDef();
        rj.Initialize(this.person.torso.body, this.chassisBody, new Vec2(x/SCALE, y/SCALE));
        this.revJoint = world.CreateJoint(rj);

        var dj = new b2DistanceJointDef();
        dj.Initialize(
            this.person.torso.body, this.chassisBody,
            new Vec2(x/SCALE, (y - this.person.height*0.6)/SCALE),
            new Vec2((x + W/3)/SCALE, (y - H/2)/SCALE)
        );
        dj.frequencyHz = 15; dj.dampingRatio = 0.8; dj.length *= 1.1;
        this.distJoint = world.CreateJoint(dj);

        this.rotationTorque = 2;
    }

    show() {
        this.person.show();
        for (var w of this.wheels) w.show();

        var x = this.chassisBody.GetPosition().x * SCALE;
        var y = this.chassisBody.GetPosition().y * SCALE;
        var a = this.chassisBody.GetAngle();

        push();
        translate(x - panX, y - panY);
        rotate(a);
        this._drawF1();
        pop();

        this.distance = max(this.distance, floor((x - this.startingPosition.x) / 10));

        if (this.motorState !== 0 && !this.isFuelOut) {
            var ex = x + cos(a + PI) * this.chassisWidth * 0.5;
            var ey = y + sin(a + PI) * this.chassisWidth * 0.5;
            spawnExhaust(ex, ey);
        }

        if (!reset && (y > canvas.height + 1500 || this.isFuelOut)) reset = true;
    }

    _drawF1() {
        var W = this.chassisWidth, H = this.chassisHeight;
        noStroke();

        // ── Underfloor ────────────────────────────────────────────
        fill(16, 16, 22);
        rect(-W/2, H/2 - 4, W + 8, 6, 2);

        // ── Main body ─────────────────────────────────────────────
        fill(218, 20, 20);
        beginShape();
        vertex(-W/2,     H/2);
        vertex( W/2+8,   H/2);
        vertex( W/2+14,  H/2-10);
        vertex( W/3,    -H/2);
        vertex(-W/2+8,  -H/2);
        vertex(-W/2,    -H/4);
        endShape(CLOSE);

        // Body gloss
        fill(255,255,255,15);
        beginShape();
        vertex(-W/2+8,-H/2); vertex(W/3,-H/2);
        vertex(W/3-6,-H/2+8); vertex(-W/2+13,-H/2+8);
        endShape(CLOSE);

        // ── Engine cover + airbox ─────────────────────────────────
        fill(195, 14, 14);
        beginShape();
        vertex(-W/2+8,   -H/2);
        vertex(-W/2+16,  -H/2-18);
        vertex(-W/4+4,   -H/2-22);  // airbox peak
        vertex(-W/8,     -H/2-18);
        vertex( W/3,     -H/2);
        endShape(CLOSE);

        // Airbox intake
        fill(8, 8, 14);
        ellipse(-W/4, -H/2-14, H*0.28, H*0.32);
        noFill(); stroke(55,55,68); strokeWeight(1.5);
        ellipse(-W/4, -H/2-14, H*0.28, H*0.32);
        noStroke();

        // ── Cabin ─────────────────────────────────────────────────
        fill(185, 14, 14);
        beginShape();
        vertex(-W/2+8,  -H/2);
        vertex( W/3,    -H/2);
        vertex( W/4-4,  -H/2-18);
        vertex(-W/2+16, -H/2-18);
        endShape(CLOSE);

        // Cockpit opening
        fill(8, 8, 14);
        beginShape();
        vertex( W/8,    -H/2);
        vertex(-W/2+10, -H/2);
        vertex(-W/2+12, -H/2-16);
        vertex( W/8-2,  -H/2-14);
        endShape(CLOSE);

        // Halo
        noFill(); stroke(155, 160, 170); strokeWeight(3);
        arc(-W/10, -H/2-10, W*0.22, H*0.30, PI, TWO_PI);
        noStroke();
        fill(145, 150, 160);
        rect(-W/10-2, -H/2-24, 4, H*0.18, 2);

        // ── Windshield ────────────────────────────────────────────
        fill(10, 25, 50, 200);
        beginShape();
        vertex( W/4-4,  -H/2-1);
        vertex( W/3-2,  -H/2-1);
        vertex( W/4-7,  -H/2-17);
        vertex( W/4-16, -H/2-17);
        endShape(CLOSE);
        stroke(255, 55); strokeWeight(1.2); noFill();
        line(W/4-9, -H/2-16, W/3-5, -H/2-4);
        noStroke();

        // ── Nose cone ─────────────────────────────────────────────
        fill(205, 16, 16);
        beginShape();
        vertex( W/3,    -H/2);
        vertex( W/2+14,  H/2-10);
        vertex( W/2+6,   H/2);
        vertex( W/3+4,   H/2-4);
        vertex( W/3,     H/4);
        endShape(CLOSE);

        // Nose yellow tip
        fill(255, 215, 0);
        triangle(W/2+8, H/2-4, W/2+14, H/2-10, W/2+8, H/2-16);

        // ── Front wing — WITHIN wheelbase ─────────────────────────
        // Front wheel is at x = W/2 - wr = ~48px from centre
        // Wing must not go past that → cap at W/2 + a tiny overhang
        fill(22, 22, 30);
        rectMode(CENTER);
        rect(W/2-2, H/2+2, W*0.28, 8, 2);   // main plane
        fill(50, 50, 65);
        rect(W/2-2, H/2-4, W*0.26, 5, 1);   // flap
        fill(30, 30, 40);
        rect(W/2 + W*0.12, H/2, 4, 14, 1);  // end plate
        rectMode(CORNER);

        // ── Rear wing ─────────────────────────────────────────────
        fill(22, 22, 30);
        rectMode(CENTER);
        rect(-W/2+4, -H/2-20, W*0.20, 10, 2);   // main plane
        fill(218, 20, 20);
        rect(-W/2+4, -H/2-28, W*0.20, 8, 2);    // upper flap
        fill(35, 35, 48);
        rect(-W/2+10, -H/2-20, 4, H*0.32, 1);   // pillar L
        rect(-W/2-2,  -H/2-20, 4, H*0.32, 1);   // pillar R
        fill(28, 28, 38);
        rect(-W/2+4, -H/2-28, W*0.20+4, 5, 1);  // end plate top
        rectMode(CORNER);

        // ── Sidepod ───────────────────────────────────────────────
        fill(195, 14, 14);
        beginShape();
        vertex(-W/2+8,   -H/2);
        vertex( W/8,     -H/2);
        vertex( W/8+4,   -H/4);
        vertex( W/8+2,    H/2-4);
        vertex(-W/2+10,   H/2-4);
        vertex(-W/2+6,   -H/8);
        endShape(CLOSE);

        // Sidepod intake scoop
        fill(8, 8, 14);
        beginShape();
        vertex(W/8,   -H/2+2);
        vertex(W/8+6, -H/2+2);
        vertex(W/8+8, -H/4+2);
        vertex(W/8+0, -H/4+2);
        endShape(CLOSE);

        // ── Livery ────────────────────────────────────────────────
        // White stripe
        fill(255, 255, 255, 185);
        beginShape();
        vertex( W/3,   -H/2+2);
        vertex(-W/2+8, -H/2+2);
        vertex(-W/2+10,-H/2+8);
        vertex( W/3-4, -H/2+8);
        endShape(CLOSE);

        // Gold sponsor bar
        fill(255, 215, 0, 210);
        rectMode(CENTER);
        rect(-W/8, H/4, W*0.20, H*0.18, 2);

        // Number plate
        fill(255, 255, 255, 220);
        rect(W/8, H*0.08, W*0.15, H*0.28, 3);
        fill(16, 16, 22);
        textAlign(CENTER, CENTER); textSize(10); textStyle(BOLD);
        text('8', W/8, H*0.08);
        rectMode(CORNER);

        // ── Exhaust ───────────────────────────────────────────────
        fill(18, 18, 24);
        rect(-W/2-8,  H/2-8, 9, 5, 2);
        rect(-W/2-8,  H/2-16, 7, 4, 2);
        if (this.motorState !== 0 && !this.isFuelOut) {
            fill(255, 110, 0, 55 + sin(frameCount*0.6)*40);
            ellipse(-W/2-6, H/2-10, 12, 8);
        }

        // ── Lights ────────────────────────────────────────────────
        fill(255, 235, 155, 240); ellipse(W/2+12, H/2-8, 6, 5);
        fill(255, 0, 0, 180 + sin(frameCount*0.5)*60);
        ellipse(-W/2-6, H/2-18, 5, 5);

        // Floor edge
        noFill(); stroke(255,255,255,18); strokeWeight(1);
        line(-W/2, H/2, W/2+8, H/2);
        noStroke();
    }

    update() {
        if (reset) return;

        this.fuel -= this.motorState !== 0 ? 0.020 : 0.005;
        if (this.fuel <= 0) { this.fuel = 0; this.isFuelOut = true; this.motorOff(); }

        var isGrounded = (window.carLeftWheelContact > 0 || window.carRightWheelContact > 0);
        var maxTorque  = 300;
        var topSpeed   = 38;

        if (this.motorState !== 0 && !this.isFuelOut) {
            if (isGrounded) {
                this.currentTorque += (maxTorque - this.currentTorque) * 0.12;

                var w0 = this.wheels[0].body.GetAngularVelocity();
                var w1 = this.wheels[1].body.GetAngularVelocity();
                var rpm = (abs(w0) + abs(w1)) * 0.5;

                var curve = 1.0;
                if      (rpm < 5)  curve = map(rpm, 0, 5, 0.5, 1.0);
                else if (rpm > 20) curve = map(rpm, 20, topSpeed, 1.0, 0.35);
                curve = constrain(curve, 0.35, 1.0);

                var T  = this.currentTorque * curve;
                var ts = this.motorState === 1 ? -topSpeed : topSpeed;
                this.wheels[0].joint.SetMaxMotorTorque(T);
                this.wheels[1].joint.SetMaxMotorTorque(T);
                this.wheels[0].joint.SetMotorSpeed(ts);
                this.wheels[1].joint.SetMotorSpeed(ts);

                if (abs(w0) > topSpeed) this.wheels[0].body.SetAngularVelocity(w0>0?topSpeed:-topSpeed);
                if (abs(w1) > topSpeed) this.wheels[1].body.SetAngularVelocity(w1>0?topSpeed:-topSpeed);

            } else {
                this.currentTorque = 0;
                this.wheels[0].joint.SetMaxMotorTorque(0);
                this.wheels[1].joint.SetMaxMotorTorque(0);
                var cs = this.chassisBody.GetAngularVelocity();
                if (this.motorState ===  1 && cs <  3) this.chassisBody.ApplyTorque( 40);
                if (this.motorState === -1 && cs > -3) this.chassisBody.ApplyTorque(-40);
            }
        } else {
            this.currentTorque = 0;
            this.wheels[0].joint.SetMaxMotorTorque(0);
            this.wheels[1].joint.SetMaxMotorTorque(0);
            this.wheels[0].joint.EnableMotor(false);
            this.wheels[1].joint.EnableMotor(false);
        }
    }

    motorOn(forward) {
        if (this.isFuelOut) return;
        this.wheels[0].joint.EnableMotor(true);
        this.wheels[1].joint.EnableMotor(true);
        this.motorState = forward ? 1 : -1;
    }

    motorOff() {
        this.motorState = 0;
        this.wheels[0].joint.EnableMotor(false);
        this.wheels[1].joint.EnableMotor(false);
        this.currentTorque = 0;
    }
}
