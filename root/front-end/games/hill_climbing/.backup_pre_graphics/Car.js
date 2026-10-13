// Car.js — Hill Climb style off-road hill climber
//
// PHYSICS RULES (unchanged constraints of the engine):
//   1. Every chassis collision hull MUST be convex — Box2D rejects concave ones.
//   2. No bodywork may stick out past the wheels, or it drags on the terrain.
//   3. Angular damping on the chassis stays 0 — any value fights terrain tilt.
//
// The drawing is deliberately separate from the collision hull: the hull is two
// simple convex boxes, while the visible truck is drawn on top of it.
class Car {
    constructor(x, y) {
        this.wheels   = [];
        this.startingPosition = createVector(x, y);

        this.chassisWidth  = 126;
        this.chassisHeight = 44;     // taller tub — reads as a truck, not a kart
        this.wheelSize     = 27;     // big off-road tyres

        this.carDensity     = 2.2;
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
        this.wheelSlip     = 0;      // 0..1, drives the spray + engine pitch feel
        this.shapes        = [];

        // ── Chassis body ──────────────────────────────────────────
        var bd = new b2BodyDef();
        bd.type = b2DynamicBody;
        bd.position.x = x / SCALE;
        bd.position.y = y / SCALE;

        var W = this.chassisWidth, H = this.chassisHeight;

        var fd = new b2FixtureDef();
        fd.density     = this.carDensity;
        fd.friction    = 0.4;
        fd.restitution = this.carRestitution;
        fd.shape       = new b2PolygonShape();

        // Lower hull — a convex tub. Kept inside the wheelbase.
        var verts = [
            new Vec2(-W/2,      H/2),
            new Vec2( W/2,      H/2),
            new Vec2( W/2 + 6, -H/6),
            new Vec2( W/4,     -H/2),
            new Vec2(-W/2 + 6, -H/2),
            new Vec2(-W/2 - 4, -H/8),
        ];
        verts.reverse();                       // Box2D wants counter-clockwise
        for (var v of verts) { v.x /= SCALE; v.y /= SCALE; }
        fd.shape.SetAsArray(verts, verts.length);
        this.shapes.push(verts);
        this.chassisBody = world.CreateBody(bd);

        var filt = new b2FilterData();
        filt.categoryBits = CHASSIS_CATEGORY;
        filt.maskBits     = CHASSIS_MASK;
        this.chassisBody.CreateFixture(fd).SetFilterData(filt);

        // Cab — second convex box sitting on the tub.
        var fd2 = new b2FixtureDef();
        fd2.density = this.carDensity*0.7; fd2.friction = 0.3; fd2.restitution = this.carRestitution;
        fd2.shape = new b2PolygonShape();
        var cab = [
            new Vec2(-W/2+10, -H/2),
            new Vec2( W/6,    -H/2),
            new Vec2( W/8,    -H/2-34),
            new Vec2(-W/2+16, -H/2-34),
        ];
        cab.reverse();
        for (var v of cab) { v.x /= SCALE; v.y /= SCALE; }
        fd2.shape.SetAsArray(cab, cab.length);
        this.chassisBody.CreateFixture(fd2).SetFilterData(filt);
        this.shapes.push(cab);

        this.chassisBody.SetLinearDamping(0.05);
        this.chassisBody.SetAngularDamping(0.0);   // MUST stay 0

        // ── Wheels ────────────────────────────────────────────────
        // A wide wheelbase and tyres this size make the truck far harder to
        // pitch end-over-end than the old short F1 setup.
        var wr = this.wheelSize;
        var wy = y + H/2 + wr*0.62;
        var rearX  = x - W/2 + wr*0.62;
        var frontX = x + W/2 - wr*0.42;
        this.wheels.push(new Wheel(rearX,  wy, wr, this.chassisBody, 'rear'));
        this.wheels.push(new Wheel(frontX, wy, wr, this.chassisBody, 'front'));

        // ── Driver ────────────────────────────────────────────────
        // Seated inside the cab: low enough that the helmet clears the roof.
        var px = x - W*0.13, py = y - H*0.18;
        this.person = new Person(px, py, 14, 26);

        var rj = new b2RevoluteJointDef();
        rj.Initialize(this.person.torso.body, this.chassisBody, new Vec2(px/SCALE, py/SCALE));
        this.revJoint = world.CreateJoint(rj);

        var dj = new b2DistanceJointDef();
        dj.Initialize(
            this.person.torso.body, this.chassisBody,
            new Vec2(px/SCALE, (py - this.person.height*0.6)/SCALE),
            new Vec2((x + W/4)/SCALE, (y - H/2)/SCALE)
        );
        dj.frequencyHz = 15; dj.dampingRatio = 0.8; dj.length *= 1.1;
        this.distJoint = world.CreateJoint(dj);

        this.rotationTorque = 2;
    }

    // ── Drawing ───────────────────────────────────────────────────────────────
    show() {
        var x = this.chassisBody.GetPosition().x * SCALE;
        var y = this.chassisBody.GetPosition().y * SCALE;
        var a = this.chassisBody.GetAngle();

        // Draw order matters: suspension arms hide behind the body, wheels sit
        // behind it too, and the driver goes ON TOP so he is visible through the
        // cab opening instead of being painted over by the bodywork.
        this._drawSuspension(x, y, a);
        for (var w of this.wheels) w.show();

        push();
        translate(x - panX, y - panY);
        rotate(a);
        this._drawTruck();
        pop();

        this.person.show();

        this.distance = max(this.distance, floor((x - this.startingPosition.x) / 10));

        if (this.motorState !== 0 && !this.isFuelOut) {
            var ex = x + cos(a + PI) * this.chassisWidth * 0.46 + cos(a - HALF_PI) * 8;
            var ey = y + sin(a + PI) * this.chassisWidth * 0.46 + sin(a - HALF_PI) * 8;
            spawnExhaust(ex, ey);
        }

        if (!reset && (y > GROUND_BASE + 2200 || this.isFuelOut)) reset = true;
    }

    // A-arm from the body down to each hub, so the suspension travel is visible.
    _drawSuspension(cx, cy, ca) {
        var W = this.chassisWidth, H = this.chassisHeight;
        for (var i=0;i<this.wheels.length;i++) {
            var w  = this.wheels[i];
            var wx = w.body.GetPosition().x*SCALE;
            var wy = w.body.GetPosition().y*SCALE;

            // Body-side mount, in world space.
            var lx = (i===0 ? -W*0.30 : W*0.30), ly = H*0.20;
            var mx = cx + cos(ca)*lx - sin(ca)*ly;
            var my = cy + sin(ca)*lx + cos(ca)*ly;

            push(); translate(-panX,-panY);
            // Shock body
            stroke(38,42,52); strokeWeight(7); line(mx,my,wx,wy);
            stroke(150,158,172); strokeWeight(3);
            line(mx,my, lerp(mx,wx,0.45), lerp(my,wy,0.45));
            // Coil
            stroke(210,86,40); strokeWeight(2.4); noFill();
            var segs=7;
            for(var s=0;s<segs;s++){
                var t0=0.30+ (s/segs)*0.55, t1=0.30+((s+0.5)/segs)*0.55;
                var x0=lerp(mx,wx,t0), y0=lerp(my,wy,t0);
                var x1=lerp(mx,wx,t1), y1=lerp(my,wy,t1);
                var nx=-(wy-my), ny=(wx-mx), nl=sqrt(nx*nx+ny*ny)||1;
                nx=nx/nl*4.5; ny=ny/nl*4.5;
                line(x0+nx,y0+ny,x1-nx,y1-ny);
            }
            noStroke();
            pop();
        }
    }

    _drawTruck() {
        var W = this.chassisWidth, H = this.chassisHeight;
        noStroke();

        var RED_D = color(150, 24, 22);
        var RED   = color(206, 40, 34);
        var RED_L = color(238, 78, 62);

        // ── Skid plate / underbody ────────────────────────────────
        fill(30, 32, 40);
        rect(-W/2 - 4, H/2 - 5, W + 12, 8, 3);

        // ── Rear bumper + spare wheel ─────────────────────────────
        fill(46, 50, 60);
        rect(-W/2 - 12, H/2 - 16, 12, 13, 3);
        fill(26,26,30);  ellipse(-W/2 - 16, H/2 - 22, 26, 26);
        fill(70,74,84);  ellipse(-W/2 - 16, H/2 - 22, 12, 12);

        // ── Main body tub ─────────────────────────────────────────
        fill(RED);
        beginShape();
        vertex(-W/2 - 4, -H/8);
        vertex(-W/2 + 6, -H/2);
        vertex( W/4,     -H/2);
        vertex( W/2 + 6, -H/6);
        vertex( W/2 + 4,  H/2 - 2);
        vertex(-W/2,      H/2 - 2);
        endShape(CLOSE);

        // Lower shadow band gives the body some roundness.
        fill(RED_D);
        beginShape();
        vertex(-W/2,      H/2 - 2);
        vertex( W/2 + 4,  H/2 - 2);
        vertex( W/2 + 3,  H/2 - 12);
        vertex(-W/2 + 1,  H/2 - 10);
        endShape(CLOSE);

        // ── Cab ───────────────────────────────────────────────────
        var CT = -H/2 - 34;                       // cab roof line
        fill(RED);
        beginShape();
        vertex(-W/2 + 10, -H/2);
        vertex( W/6,      -H/2);
        vertex( W/8,      CT);
        vertex(-W/2 + 16, CT);
        endShape(CLOSE);

        // Roof + its highlight
        fill(RED_D);  rect(-W/2 + 13, CT - 4, W*0.36, 6, 2);
        fill(RED_L);  rect(-W/2 + 15, CT - 3, W*0.30, 2.5, 1);

        // ── Windscreen + side window ──────────────────────────────
        fill(120, 182, 212);
        beginShape();                              // windscreen (raked, front)
        vertex( W/9,      -H/2 - 5);
        vertex( W/8 + 1,  CT + 5);
        vertex(-W/2 + 40, CT + 5);
        vertex(-W/2 + 40, -H/2 - 5);
        endShape(CLOSE);
        fill(100, 164, 198);
        rect(-W/2 + 19, CT + 5, W*0.16, H*0.52);   // side window

        // Glass sheen
        fill(255, 255, 255, 110);
        beginShape();
        vertex(-W/2 + 43, -H/2 - 6);
        vertex(-W/2 + 57, -H/2 - 6);
        vertex(-W/2 + 49, CT + 6);
        vertex(-W/2 + 44, CT + 6);
        endShape(CLOSE);

        // B-pillar
        fill(RED_D); rect(-W/2 + 35, CT + 4, 4, H*0.55);

        // ── Roll cage over the cab ────────────────────────────────
        stroke(48, 52, 62); strokeWeight(4.5); noFill();
        line(-W/2 + 14, CT - 2, -W/2 + 10, CT - 13);
        line(-W/2 + 10, CT - 13, W/9,      CT - 13);
        line( W/9,      CT - 13, W/8 + 2,  CT - 2);
        strokeWeight(3);
        line(-W/2 + 12, CT - 13, -W/2 + 4, -H/2 - 2);   // rear brace
        noStroke();

        // Roof spotlights
        fill(58, 60, 68);
        rect(-W/2 + 16, CT - 17, 30, 4, 1);
        fill(252, 244, 200);
        ellipse(-W/2 + 22, CT - 20, 11, 9);
        ellipse(-W/2 + 39, CT - 20, 11, 9);
        fill(255, 255, 235, 200);
        ellipse(-W/2 + 21, CT - 21, 5, 4);
        ellipse(-W/2 + 38, CT - 21, 5, 4);

        // ── Side door + panel line ────────────────────────────────
        stroke(140, 22, 20); strokeWeight(1.6); noFill();
        line(-W/2 + 12, -H/2 + 4, -W/2 + 12, H/2 - 8);
        line( W/8,      -H/2 + 4,  W/8,      H/2 - 8);
        noStroke();

        // Racing stripe
        fill(250, 250, 250, 220);
        rect(-W/2 + 6, -H/8, W*0.72, 7, 2);
        fill(255, 200, 40, 230);
        rect(-W/2 + 6, -H/8 + 7, W*0.72, 3, 1);

        // Number roundel
        fill(250, 250, 252);
        ellipse(-W/6, H/5, 21, 21);
        fill(30, 32, 40);
        textAlign(CENTER, CENTER); textSize(13); textStyle(BOLD);
        text('8', -W/6, H/5);

        // ── Bonnet + grille ───────────────────────────────────────
        fill(RED_L);
        beginShape();
        vertex( W/4,     -H/2);
        vertex( W/2 + 6, -H/6);
        vertex( W/2 + 2, -H/6 + 4);
        vertex( W/4 - 2, -H/2 + 5);
        endShape(CLOSE);

        fill(38, 40, 48);
        rect(W/2 - 4, -H/8, 10, H*0.5, 2);
        stroke(96,100,110); strokeWeight(1.2);
        for (var i=0;i<3;i++) line(W/2 - 3, -H/8 + 3 + i*5, W/2 + 5, -H/8 + 3 + i*5);
        noStroke();

        // Headlight
        fill(255, 238, 170);
        ellipse(W/2 + 2, -H/6 + 2, 11, 9);
        fill(255, 255, 225, 190);
        ellipse(W/2 + 1, -H/6 + 1, 5, 4);

        // Front bumper + winch
        fill(52, 56, 66);
        rect(W/2 + 2, H/2 - 16, 11, 14, 3);
        fill(120, 126, 138);
        ellipse(W/2 + 8, H/2 - 9, 8, 8);

        // Tail light
        fill(230, 40, 40, 190 + sin(frameCount*0.4)*60);
        rect(-W/2 - 6, -H/8, 5, 8, 2);

        // ── Exhaust ───────────────────────────────────────────────
        fill(70, 74, 84);
        rect(-W/2 - 10, H/2 - 14, 10, 6, 3);
        if (this.motorState !== 0 && !this.isFuelOut) {
            fill(255, 140, 30, 60 + sin(frameCount*0.6)*45);
            ellipse(-W/2 - 12, H/2 - 11, 13, 9);
        }

        // Top edge light
        noFill(); stroke(255, 255, 255, 40); strokeWeight(1.4);
        line(-W/2 + 6, -H/2 + 1, W/4, -H/2 + 1);
        noStroke();
    }

    // ── Simulation ────────────────────────────────────────────────────────────
    update(dt) {
        if (reset) return;
        dt = dt || 1/60;

        // Fuel burn is per second of real time, not per drawn frame, so the tank
        // lasts the same on any machine.
        this.fuel -= (this.motorState !== 0 ? 1.25 : 0.30) * dt;
        if (this.fuel <= 0) { this.fuel = 0; this.isFuelOut = true; this.motorOff(); }

        var grounded = (window.carLeftWheelContact > 0 || window.carRightWheelContact > 0);

        // Tuned against a 13kg chassis on 4.8kg wheels. At 340 the truck stood
        // up on its back wheels the moment you touched the throttle and never
        // came down; these values give a lively launch that still settles.
        var maxTorque   = 190;
        var topSpeed    = 40;
        var WHEELIE_LIM = 0.28;   // rad of nose-up before the assist steps in
        var WHEELIE_ASSIST = 180;

        // Grip: sticky on the ground, nothing in the air so the wheels do not
        // act like gyros and lock the truck's rotation mid-jump.
        var fr = grounded ? 3.6 : 0.0;
        this.wheels[0].body.GetFixtureList().SetFriction(fr);
        this.wheels[1].body.GetFixtureList().SetFriction(fr);

        if (this.motorState !== 0 && !this.isFuelOut) {
            if (grounded) {
                // Torque builds instead of snapping on — this is what stops the
                // truck flipping backwards the instant you touch the throttle.
                this.currentTorque += (maxTorque - this.currentTorque) * min(1, 5.0*dt);

                var w0 = this.wheels[0].body.GetAngularVelocity();
                var w1 = this.wheels[1].body.GetAngularVelocity();
                var rpm = (abs(w0) + abs(w1)) * 0.5;

                // Torque curve: weak off idle, strong mid-range, tapering at top.
                var curve = 1.0;
                if      (rpm < 6)  curve = map(rpm, 0, 6, 0.55, 1.0);
                else if (rpm > 22) curve = map(rpm, 22, topSpeed, 1.0, 0.30);
                curve = constrain(curve, 0.30, 1.0);

                // ── Anti-wheelie assist ───────────────────────────
                // Past WHEELIE_LIM of nose-up the drive torque is bled off and
                // the nose is pushed back down, in proportion to how far over
                // it has gone. A wheelie is still very much possible (and looks
                // great) — it just cannot run away into a backflip on flat
                // ground. Mirrored for reverse.
                var ang   = this.chassisBody.GetAngle();
                var dir   = this.motorState === 1 ? 1 : -1;
                var pitch = -ang * dir;               // > 0 means the nose is lifting
                var wheelieCut = 1.0;
                if (pitch > WHEELIE_LIM) {
                    wheelieCut = constrain(map(pitch, WHEELIE_LIM, WHEELIE_LIM+0.55, 1.0, 0.25), 0.25, 1.0);
                    this.chassisBody.ApplyTorque(dir * WHEELIE_ASSIST * (pitch - WHEELIE_LIM));
                }

                var T  = this.currentTorque * curve * wheelieCut;
                var ts = this.motorState === 1 ? -topSpeed : topSpeed;
                this.wheels[0].joint.SetMaxMotorTorque(T);
                this.wheels[1].joint.SetMaxMotorTorque(T);
                this.wheels[0].joint.SetMotorSpeed(ts);
                this.wheels[1].joint.SetMotorSpeed(ts);

                if (abs(w0) > topSpeed) this.wheels[0].body.SetAngularVelocity(w0>0?topSpeed:-topSpeed);
                if (abs(w1) > topSpeed) this.wheels[1].body.SetAngularVelocity(w1>0?topSpeed:-topSpeed);

                // Wheel slip = tyre surface speed running ahead of the chassis.
                var surface = abs(w0) * (this.wheelSize/SCALE);
                var actual  = this.chassisBody.GetLinearVelocity().Length();
                this.wheelSlip = constrain((surface - actual) / 6, 0, 1);
                if (this.wheelSlip > 0.18) {
                    var wp = this.wheels[0].body.GetPosition();
                    spawnSpray(wp.x*SCALE, wp.y*SCALE + this.wheelSize*0.6,
                               this.motorState === 1 ? 1 : -1, this.wheelSlip*0.7);
                }
            } else {
                // Airborne: no drive, but you can rotate the truck to line up a
                // landing — the core skill of the game.
                this.currentTorque = 0;
                this.wheels[0].joint.SetMaxMotorTorque(0);
                this.wheels[1].joint.SetMaxMotorTorque(0);
                this.wheelSlip = 0;
                var cs = this.chassisBody.GetAngularVelocity();
                if (this.motorState ===  1 && cs <  3.2) this.chassisBody.ApplyTorque( 52);
                if (this.motorState === -1 && cs > -3.2) this.chassisBody.ApplyTorque(-52);
            }
        } else {
            this.currentTorque = 0;
            this.wheelSlip = 0;
            this.wheels[0].joint.SetMaxMotorTorque(0);
            this.wheels[1].joint.SetMaxMotorTorque(0);
            this.wheels[0].joint.EnableMotor(false);
            this.wheels[1].joint.EnableMotor(false);
        }

        // Downforce: the faster you go, the harder the truck is pressed into the
        // hill, so crests launch you less absurdly at speed.
        if (grounded) {
            var v = this.chassisBody.GetLinearVelocity().Length();
            if (v > 8) {
                var f = min((v - 8) * 2.4, 40);
                this.chassisBody.ApplyForce(new Vec2(0, f), this.chassisBody.GetWorldCenter());
            }
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
        this.wheelSlip = 0;
    }
}
