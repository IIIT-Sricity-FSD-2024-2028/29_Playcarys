// Car.js — Hill Climb style off-road hill climber
//
// PHYSICS RULES (unchanged constraints of the engine):
//   1. Every chassis collision hull MUST be convex — Box2D rejects concave ones.
//   2. No bodywork may stick out past the wheels, or it drags on the terrain.
//   3. Angular damping on the chassis stays 0 — any value fights terrain tilt.
//
// The drawing is deliberately separate from the collision hull: the hull is one
// or two simple convex boxes, while the visible vehicle is drawn on top of it.

// ── Vehicle specs ────────────────────────────────────────────────────────────
// The truck is the forgiving pick; the bike is the skill pick. The difference is
// not cosmetic — short wheelbase, light chassis, a rider whose head sticks well
// above the frame, and NO anti-wheelie help at all. On the bike, cracking the
// throttle on a climb will loop you over backwards, exactly as it should.
//
// RETUNED. The previous numbers made the truck effectively un-crashable: 2.4x
// downforce pinning it to the hill at any speed, a cab that weighed less per
// unit area than the floor it sat on so the mass all hung between the axles,
// and a gentle enough track that none of it was ever tested. Runs ended when
// the tank ran dry, not when the driver made a mistake.
//
// The changes below give it more power to get into trouble with and much less
// automatic help getting out of it — but note that the single decisive number
// is wheelieRate, not any of the obvious ones. See its comment.
//
//   brakeTorque — the left pedal is a BRAKE, not a reverse gear (see update()).
//                 The truck's is deliberately weak: it is two tonnes of
//                 momentum and it does not stop just because you asked it to.
var VEHICLES = {
    truck: {
        label: 'TRUCK', blurb: 'Heavy, powerful, poor brakes. Momentum decides.',
        // wheelbase 98 reproduces exactly what the old W-derived formula gave,
        // so the truck's handling is unchanged by that refactor.
        W: 126, H: 44, wheel: 27, wheelbase: 98, density: 1.9, cabDensity: 1.15,
        maxTorque: 265, topSpeed: 44,
        brakeTorque: 62,                        // weak on purpose
        // wheelieRate is the pitch rate the assist holds you to, and it is the
        // number that decides whether the truck is driveable at all. Anything
        // above ~1.0 rad/s still carries you through 180° in under two seconds,
        // so the assist "works" and you loop over anyway — measured: at 1.10 a
        // standing-start full-throttle launch flipped in 2.3s, at 0.80 the same
        // launch ran 11.6s and 340m. The gain barely matters next to it.
        wheelieAssist: 110, wheelieRate: 0.75,
        // airControl was tuned when the rider weighed less than half what he
        // does now; his mass is coupled to the chassis through the hip joint, so
        // the same torque buys far less rotation than it used to.
        airControl: 900, downforce: 1.60, dfCap: 26,
        // 1.05 r of total travel, down from 1.55 r. Still far more than a road
        // vehicle — it is meant to be a trophy truck — but the old figure had
        // the coil-overs stretching to one and a half wheel diameters, which is
        // what made the suspension read as rubber bands.
        susp: { rearHz: 4.2, rearD: 0.62, frontHz: 4.8, frontD: 0.66, droop: 0.55, bump: 0.50 },
        // Same human as on the bike — a driver does not shrink because the
        // vehicle around him got bigger. Both were previously undersized, and
        // differently undersized from each other.
        rider: { x: -0.13, y: -0.46, w: 18, h: 34, seatX: 0.22, seatY: -0.62 },
        fuelBurn: 1.00               // multiplier on the shared burn curve
    },
    // ── The bike, scaled off a real motocross machine ─────────────────────────
    // Reference: KTM 250 SX-F. Wheelbase 1491mm, ground clearance 343mm, seat
    // height 958mm, suspension travel 310mm front / 300mm rear, tyres 80/100-21
    // front (693mm dia) and 110/90-19 rear (681mm dia) — so a wheel RADIUS of
    // ~343mm, which every dimension below is expressed in.
    //
    //                        real        was        now
    //   wheelbase            4.35 r     3.72 r     4.35 r
    //   ground clearance     1.00 r     2.02 r     1.00 r
    //   suspension travel    0.89 r     1.54 r     0.89 r
    //   seat height          2.79 r        —       2.80 r
    //
    // The travel figure is the answer to why the springs looked so long: the
    // wheels had 73% more stroke than a real bike, on a machine drawn at twice
    // the correct ride height. Both are now real numbers.
    bike: {
        label: 'BIKE', blurb: 'Light and sharp. Real brakes, no safety net.',
        // Hull is the FRAME, not the whole bike — it has to live between the
        // wheels (hubs at ±43.5, tyre inner faces at ±23.5) so that no bodywork
        // is ever drawn through a tyre.
        // W=40 (not 46) leaves a real gap: at 46 the hull grazed the tyres by
        // ~2px once the chassis rotated. Density is raised to hold the same mass
        // across the smaller hull.
        W: 40, H: 36, wheel: 20, wheelbase: 87, density: 1.67, wheelStyle: 'bike',
        maxTorque: 178, topSpeed: 54,
        brakeTorque: 118,                       // light bike, discs actually bite
        wheelieAssist: 0, wheelieRate: 99,      // none. you are on your own.
        airControl: 300, downforce: 0.9, dfCap: 15,
        hubDrop: 0.0,                           // axle level with the frame floor => 1.00 r clearance
        // 0.89 r of travel split the way a real bike is set up: about a third of
        // it is static sag, so from the resting position the wheel can drop 0.30 r
        // and be compressed 0.59 r.
        susp: { rearHz: 3.9, rearD: 0.54, frontHz: 4.4, frontD: 0.58, droop: 0.30, bump: 0.59 },
        // Scaled to the machine. A seated rider's head sits about 0.89x the seat
        // height above the ground; at w:12/h:23 this one measured 0.52, i.e. he
        // was roughly a 40% undersized figure perched on a correctly-scaled
        // bike, which is why he read as a doll rather than a person.
        rider: { x: -0.10, y: -0.545, w: 18, h: 34, seatX: 0.30, seatY: -0.45 },
        fuelBurn: 0.88               // lighter, smaller engine, goes further per litre
    }
};

class Car {
    constructor(x, y, type) {
        this.type = VEHICLES[type] ? type : 'truck';
        var S = VEHICLES[this.type];
        this.spec = S;

        this.wheels   = [];
        this.startingPosition = createVector(x, y);

        this.chassisWidth  = S.W;
        this.chassisHeight = S.H;
        this.wheelSize     = S.wheel;

        this.carDensity     = S.density;
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
        this.coastTimer    = 0;      // frames spent stationary after running dry
        this.rollTimer     = 0;      // seconds spent inverted AND stationary
        this.prevAng       = undefined;  // last normalised chassis angle, for the turn-rate gate
        this.deathCause    = null;
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

        var filt = new b2FilterData();
        filt.categoryBits = CHASSIS_CATEGORY;
        filt.maskBits     = CHASSIS_MASK;

        if (this.type === 'bike') {
            // Bike — one slim convex frame. Nothing wide or low to catch the
            // ground, so what stops a bike is the rider's head, not the bodywork.
            var verts = [
                new Vec2(-W/2,     H/2),
                new Vec2( W/2,     H/2),
                new Vec2( W/2 + 3, -H/4),
                new Vec2( W/6,     -H/2),
                new Vec2(-W/3,     -H/2),
                new Vec2(-W/2 - 3, -H/4),
            ];
            verts.reverse();
            for (var v of verts) { v.x /= SCALE; v.y /= SCALE; }
            fd.shape.SetAsArray(verts, verts.length);
            this.shapes.push(verts);
            this.chassisBody = world.CreateBody(bd);
            this.chassisBody.CreateFixture(fd).SetFilterData(filt);
        } else {
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
            this.chassisBody.CreateFixture(fd).SetFilterData(filt);

            // Scuttle — a low cowl in front of the driver, all that is left of
            // the old enclosed cab. The roof and its 34px-tall box are gone: the
            // truck is an open buggy now, so the driver is actually visible and,
            // more to the point, his head is the highest thing on the vehicle
            // and can reach the ground. A roof is a helmet you never take off.
            //
            // It stays HEAVIER per unit area than the floor so the centre of
            // mass is still above the axle line — a vehicle whose mass all sits
            // between the wheels cannot be rolled.
            var fd2 = new b2FixtureDef();
            fd2.density = this.carDensity*(S.cabDensity || 0.7); fd2.friction = 0.3; fd2.restitution = this.carRestitution;
            fd2.shape = new b2PolygonShape();
            var cowl = [
                new Vec2( W/8 - 26, -H/2),
                new Vec2( W/6,      -H/2),
                new Vec2( W/8,      -H/2-15),
                new Vec2( W/8 - 22, -H/2-15),
            ];
            cowl.reverse();
            for (var v of cowl) { v.x /= SCALE; v.y /= SCALE; }
            fd2.shape.SetAsArray(cowl, cowl.length);
            this.chassisBody.CreateFixture(fd2).SetFilterData(filt);
            this.shapes.push(cowl);
        }

        this.chassisBody.SetLinearDamping(0.05);
        this.chassisBody.SetAngularDamping(0.0);   // MUST stay 0

        // ── Wheels ────────────────────────────────────────────────
        // Wheelbase is the single biggest handling lever here: the truck's is
        // long enough to resist pitching, the bike's is deliberately not.
        // hubDrop is how far below the chassis floor the axle line sits, in wheel
        // radii. On the bike it has to clear a whole radius or the tyre occupies
        // the same space as the frame: at 0.62 the hub sat 24px below centre with
        // a 20px tyre on it, putting the top of the tyre 8px INSIDE a frame that
        // is only 24px tall, and suspension compression drove it 12px further in
        // again. The wheels and the bodywork were literally drawn through each
        // other. The truck has a deep body and wants its axles tucked up.
        // Wheelbase is now an explicit number rather than something derived from
        // the hull width. Deriving it meant the two could not be set
        // independently: making the frame narrower — which is what stops the
        // bodywork being drawn through the tyres — also dragged the wheels
        // closer together, and a bike's frame is much shorter than its
        // wheelbase. Real MX bike: 1491mm wheelbase on a 343mm wheel radius.
        var wr = this.wheelSize;
        var wy = y + H/2 + wr*(S.hubDrop !== undefined ? S.hubDrop : 0.62);
        var wb = S.wheelbase || (W - wr*1.04);   // fallback = the old derivation
        var rearX  = x - wb/2;
        var frontX = x + wb/2;
        this.wheels.push(new Wheel(rearX,  wy, wr, this.chassisBody, 'rear',  S.susp, S.wheelStyle));
        this.wheels.push(new Wheel(frontX, wy, wr, this.chassisBody, 'front', S.susp, S.wheelStyle));

        // ── Rider ─────────────────────────────────────────────────
        // In the truck he is tucked inside the cab. On the bike he sits proud of
        // the frame, which is what makes a head strike reachable.
        var R = S.rider;
        var px = x + W*R.x, py = y + H*R.y;
        this.person = new Person(px, py, R.w, R.h);

        // Hip pivot. LIMITED — this used to be a free revolute joint with only
        // the soft distance spring below holding the rider upright, and measured
        // over a normal run the torso reached 50° of backward lean relative to
        // the machine: he sat slumped over backwards as if facing the wrong way.
        // A spring tuned by feel cannot hold a body whose mass changes, so the
        // posture is now bounded by the joint itself.
        //
        // Sign: +x is the direction of travel, so a POSITIVE angle tips the
        // shoulders forward over the bars, negative tips them back. A rider gets
        // a lot of forward travel (attacking a climb, absorbing a landing) and
        // almost none backward.
        var rj = new b2RevoluteJointDef();
        rj.Initialize(this.person.torso.body, this.chassisBody, new Vec2(px/SCALE, py/SCALE));
        // CAREFUL WITH THE SIGN. Box2D measures this joint's angle as
        // bodyB - bodyA, and bodyA here is the TORSO, so the limits read
        // backwards from the rider's point of view: the joint's LOWER bound is
        // the rider's FORWARD lean. Setting them the intuitive way round gave
        // him 30° of backward slump and 9° of forward, i.e. exactly the posture
        // this was meant to fix.
        rj.enableLimit = true;
        rj.lowerAngle  = -0.52;                  // rider leans ~30° FORWARD
        rj.upperAngle  =  0.16;                  // rider leans ~9° back, no more
        // Weak motor biasing him toward a slight forward riding crouch, so he
        // settles into a posture instead of hanging off whichever limit he last
        // hit. Torque scales with his mass or it does nothing once he is scaled.
        rj.enableMotor = true;
        rj.motorSpeed = 0;
        // Strong enough to actually set the posture. At 34x mass the servo in
        // _posture() lost outright to the seat spring below and the rider sat
        // pinned against his backward limit, which is the "sitting reversed"
        // look. Still finite, so a hard landing can visibly jolt him.
        rj.maxMotorTorque = this.person.torso.body.GetMass() * 190;
        this.revJoint = world.CreateJoint(rj);

        var dj = new b2DistanceJointDef();
        dj.Initialize(
            this.person.torso.body, this.chassisBody,
            new Vec2(px/SCALE, (py - this.person.height*0.6)/SCALE),
            new Vec2((x + W*R.seatX)/SCALE, (y + H*R.seatY)/SCALE)
        );
        // Deliberately SOFT now. This joint's original job was holding the rider
        // upright, and at 20Hz it did that by pinning his shoulders to a fixed
        // point on the chassis — which fought the posture servo and won. The hip
        // limits plus the servo own the posture; this is left as a gentle damper
        // so he still sways over bumps instead of being welded on.
        dj.frequencyHz = 4; dj.dampingRatio = 0.7; dj.length *= 1.1;
        this.distJoint = world.CreateJoint(dj);

        this.rotationTorque = 2;
    }

    // Where wheel `i`'s hub actually is right now, expressed in chassis-local
    // pixels — i.e. the space _drawBike/_drawTruck draw in, after the caller's
    // translate+rotate. Anything bolted to a wheel has to be drawn from this and
    // not from the position the wheel was constructed at.
    _hubLocal(i) {
        var c = this.chassisBody.GetPosition();
        var a = this.chassisBody.GetAngle();
        var w = this.wheels[i].body.GetPosition();
        var dx = (w.x - c.x) * SCALE, dy = (w.y - c.y) * SCALE;
        var ca = Math.cos(-a), sa = Math.sin(-a);
        return { x: dx * ca - dy * sa, y: dx * sa + dy * ca };
    }

    // Where the rider's hands and feet belong, in WORLD pixels.
    //
    // In Hill Climb Racing the driver is a ragdoll that stays connected to the
    // machine — his hands stay on the bars and his foot visibly works the peg.
    // Here the rider's torso is a physics body joined to the chassis, so it
    // moves independently of it; without real attachment points his arms and
    // legs were rectangles pinned to the torso at fixed offsets, pointing at
    // nothing. Person solves a two-bone IK against these instead.
    attachPoints() {
        var c = this.chassisBody.GetPosition(), a = this.chassisBody.GetAngle();
        var cx = c.x * SCALE, cy = c.y * SCALE;
        var ca = Math.cos(a), sa = Math.sin(a);
        function w(lx, ly) { return { x: cx + lx*ca - ly*sa, y: cy + lx*sa + ly*ca }; }

        if (this.type === 'bike') {
            var r = this.wheelSize, axleY = this.chassisHeight / 2;
            var headX = r * 1.30, headY = axleY - r * 1.50;
            return {
                grip: w(headX + r * 0.10, headY - r * 0.90),   // just inboard of the bar end
                peg:  w(0, axleY - r * 0.05)                   // footpeg by the swingarm pivot
            };
        }
        var W = this.chassisWidth, CT = -this.chassisHeight/2 - 15;
        return {
            grip: w(W/8 - 21, CT + 4),   // steering wheel rim
            peg:  w(12, -8)              // pedals, forward in the footwell
        };
    }

    // ── Drawing ───────────────────────────────────────────────────────────────
    show() {
        var x = this.chassisBody.GetPosition().x * SCALE;
        var y = this.chassisBody.GetPosition().y * SCALE;
        var a = this.chassisBody.GetAngle();

        // Draw order matters: suspension arms hide behind the body, wheels sit
        // behind it too, and the driver goes ON TOP so he is visible through the
        // cab opening instead of being painted over by the bodywork.
        // The bike draws its own forks and swingarm, so it skips the truck's
        // coil-over arms entirely.
        if (this.type !== 'bike') this._drawSuspension(x, y, a);
        for (var w of this.wheels) w.show();

        // The buggy driver's legs go UNDER the bodywork — he is sitting down in
        // it, not perched on top of it. Painted in the normal pass with the rest
        // of him they hung over the side of the tub and down the body panel.
        if (this.type !== 'bike') this.person.showLegs();

        push();
        translate(x - panX, y - panY);
        rotate(a);
        if (this.type === 'bike') this._drawBike(); else this._drawTruck();
        pop();

        this.person.show();

        // Distance is frozen the instant the run ends. Physics keeps stepping
        // while the results card is up, so the wreck carries on tumbling down
        // the hill — and this kept crediting every metre of it. The number on
        // the card grew after you were already dead, and it was that inflated
        // figure that got saved to the match record.
        if (!reset) {
            this.distance = max(this.distance, floor((x - this.startingPosition.x) / 10));
        }

        if (this.motorState !== 0 && !this.isFuelOut) {
            var ex = x + cos(a + PI) * this.chassisWidth * 0.46 + cos(a - HALF_PI) * 8;
            var ey = y + sin(a + PI) * this.chassisWidth * 0.46 + sin(a - HALF_PI) * 8;
            spawnExhaust(ex, ey);
        }

        // Fell off the world. Running dry is handled in _settle(), which lets
        // the vehicle roll to a stop first.
        if (!reset && y > GROUND_BASE + 2200) { this.deathCause = 'fall'; reset = true; }
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
        var ctx = drawingContext;
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
        fill(38,40,48);  ellipse(-W/2 - 16, H/2 - 22, 6, 6);

        // ── Main body tub ─────────────────────────────────────────
        // Painted metal is a gradient, not a fill: a hot band along the shoulder,
        // the body colour through the middle, and a dark turn-under at the sill.
        var bodyG = ctx.createLinearGradient(0, -H/2, 0, H/2);
        bodyG.addColorStop(0.00, '#f2705a');
        bodyG.addColorStop(0.16, '#d8402f');
        bodyG.addColorStop(0.55, '#c22a24');
        bodyG.addColorStop(0.86, '#8e1a17');
        bodyG.addColorStop(1.00, '#5f100f');
        ctx.fillStyle = bodyG;
        ctx.beginPath();
        ctx.moveTo(-W/2 - 4, -H/8);
        ctx.lineTo(-W/2 + 6, -H/2);
        ctx.lineTo( W/4,     -H/2);
        ctx.lineTo( W/2 + 6, -H/6);
        ctx.lineTo( W/2 + 4,  H/2 - 2);
        ctx.lineTo(-W/2,      H/2 - 2);
        ctx.closePath();
        ctx.fill();

        // Wheel-arch shadow: darkens the body where the tyres tuck under.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-W/2 - 4, -H/8);
        ctx.lineTo(-W/2 + 6, -H/2);
        ctx.lineTo( W/4,     -H/2);
        ctx.lineTo( W/2 + 6, -H/6);
        ctx.lineTo( W/2 + 4,  H/2 - 2);
        ctx.lineTo(-W/2,      H/2 - 2);
        ctx.closePath();
        ctx.clip();
        var archG = ctx.createLinearGradient(0, H/2 - 20, 0, H/2);
        archG.addColorStop(0, 'rgba(40,6,6,0)');
        archG.addColorStop(1, 'rgba(40,6,6,0.55)');
        ctx.fillStyle = archG;
        ctx.fillRect(-W, H/2 - 20, W*2, 22);
        ctx.restore();

        // ── Open cockpit ──────────────────────────────────────────
        // No roof, no doors, no glasshouse. The driver sits in the open where
        // you can see him, which also means his helmet is the highest point on
        // the vehicle and is what hits the ground when this goes wrong. The old
        // enclosed cab both hid him and armoured him.
        //
        // Drawn BEFORE the driver (show() paints him afterwards), so everything
        // here is the stuff behind and beneath him: floor pan, seat, roll hoop.
        var CT = -H/2 - 15;                       // scuttle top — waist height now

        // Footwell / tub interior, so the cockpit reads as a hole in the body
        // rather than as a flat panel he is standing on.
        fill(46, 16, 15);
        rect(-W/2 + 14, -H/2 - 2, W*0.56, H*0.42, 3);
        fill(30, 10, 10);
        rect(-W/2 + 17, -H/2 - 1, W*0.50, 4, 2);

        // Seat: base and a back that rises behind the driver's shoulders.
        fill(38, 40, 50);
        rect(-W/2 + 20, -H/2 - 4, W*0.30, 7, 2);            // squab
        fill(28, 30, 38);
        ctx.beginPath();                                     // backrest, raked
        ctx.moveTo(-W/2 + 20, -H/2 - 2);
        ctx.lineTo(-W/2 + 30, -H/2 - 2);
        ctx.lineTo(-W/2 + 26, -H/2 - 30);
        ctx.lineTo(-W/2 + 16, -H/2 - 28);
        ctx.closePath();
        ctx.fill();
        fill(212, 62, 52, 200);
        rect(-W/2 + 19, -H/2 - 24, 8, 3, 1);                 // headrest flash

        // Scuttle / cowl in front of him — this is the shape that survived as a
        // collision fixture, so the art and the hull agree.
        var cowlG = ctx.createLinearGradient(0, CT, 0, -H/2);
        cowlG.addColorStop(0.00, '#ef6a55');
        cowlG.addColorStop(0.55, '#cf3229');
        cowlG.addColorStop(1.00, '#a11f1b');
        ctx.fillStyle = cowlG;
        ctx.beginPath();
        ctx.moveTo( W/8 - 26, -H/2 + 2);
        ctx.lineTo( W/6,      -H/2 + 2);
        ctx.lineTo( W/8,      CT);
        ctx.lineTo( W/8 - 22, CT);
        ctx.closePath();
        ctx.fill();

        // Aero screen on top of the cowl — a sliver of glass, not a windscreen.
        var scrG = ctx.createLinearGradient(0, CT - 11, 0, CT);
        scrG.addColorStop(0.0, 'rgba(206,236,248,0.85)');
        scrG.addColorStop(1.0, 'rgba(90,150,180,0.55)');
        ctx.fillStyle = scrG;
        ctx.beginPath();
        ctx.moveTo( W/8 - 21, CT + 1);
        ctx.lineTo( W/8 - 1,  CT + 1);
        ctx.lineTo( W/8 - 4,  CT - 10);
        ctx.lineTo( W/8 - 18, CT - 10);
        ctx.closePath();
        ctx.fill();

        // Steering wheel, edge-on.
        stroke(32, 34, 42); strokeWeight(2.6); noFill();
        line(W/8 - 20, CT + 5, W/8 - 12, CT + 13);
        noStroke();
        fill(24, 26, 34);
        push(); translate(W/8 - 21, CT + 4); rotate(-0.5);
        ellipse(0, 0, 5, 15);
        pop();

        // Roll hoop behind the seat. Deliberately BEHIND and no higher than the
        // helmet: it has to look like it would help without actually stopping
        // the head from reaching the ground.
        stroke(52, 56, 66); strokeWeight(5);
        noFill();
        ctx.beginPath();
        ctx.moveTo(-W/2 + 12, -H/2 - 2);
        ctx.quadraticCurveTo(-W/2 + 12, -H/2 - 40, -W/2 + 34, -H/2 - 40);
        ctx.stroke();
        strokeWeight(3);
        line(-W/2 + 6, -H/2 - 4, -W/2 + 13, -H/2 - 30);      // rear brace
        noStroke();
        fill(150, 158, 172, 120);
        rect(-W/2 + 11, -H/2 - 36, 2.2, 22, 1);              // hoop highlight

        // ── Side panel line ───────────────────────────────────────
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

        // No additive bloom on the headlight. Under a midday sky there is nothing
        // for it to bloom against, so at any alpha strong enough to see it just
        // reads as a white smudge stuck to the nose of the truck. A lens with a
        // hot spot carries "lit" perfectly well here.
        fill(206, 176, 92);
        ellipse(W/2 + 2, -H/6 + 2, 13, 11);
        fill(255, 240, 178);
        ellipse(W/2 + 2, -H/6 + 2, 11, 9);
        fill(255, 255, 235, 220);
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

    // ── Motocross bike ────────────────────────────────────────────────────────
    // Laid out from the real machine's proportions, in units of the WHEEL RADIUS
    // (r), which is the only dimension the drawing and the physics both agree on.
    // Reference KTM 250 SX-F against a 343mm wheel radius:
    //
    //   wheelbase          4.35 r      ground clearance   1.00 r
    //   seat height        2.79 r      suspension travel  0.89 r
    //   fork rake          ~27 deg from vertical
    //
    // The origin is the chassis centre. With hubDrop 0 the axle line sits on the
    // frame floor at +H/2, so `gy` below is the ground and every vertical figure
    // is measured up from it, exactly as the specs are.
    _drawBike() {
        var H = this.chassisHeight;
        var ctx = drawingContext;
        var r = this.wheelSize;
        noStroke();

        // Live hub positions — the suspension moves, and anything bolted to a
        // wheel has to move with it.
        var rear  = this._hubLocal(0);
        var front = this._hubLocal(1);
        var axleY = H / 2;              // static axle line
        var gy    = axleY + r;          // ground

        // Frame landmarks, all r-relative.
        var headX  = r * 1.30, headY = axleY - r * 1.50;   // steering head
        var pivotX = -r * 0.30, pivotY = axleY - r * 0.50; // swingarm pivot
        var seatY  = gy - r * 2.79;                        // real seat height

        // ── Swingarm ──────────────────────────────────────────────
        // Tapered: drawn as a polygon rather than a stroke so it reads as a
        // casting that gets thinner toward the axle, like the real part.
        var sdx = rear.x - pivotX, sdy = rear.y - pivotY;
        var slen = Math.sqrt(sdx*sdx + sdy*sdy) || 1;
        var snx = -sdy / slen, sny = sdx / slen;
        ctx.fillStyle = '#3a3f4b';
        ctx.beginPath();
        ctx.moveTo(pivotX + snx*r*0.20, pivotY + sny*r*0.20);
        ctx.lineTo(rear.x  + snx*r*0.10, rear.y  + sny*r*0.10);
        ctx.lineTo(rear.x  - snx*r*0.10, rear.y  - sny*r*0.10);
        ctx.lineTo(pivotX - snx*r*0.20, pivotY - sny*r*0.20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(150,158,172,0.45)';
        ctx.beginPath();
        ctx.moveTo(pivotX + snx*r*0.17, pivotY + sny*r*0.17);
        ctx.lineTo(rear.x  + snx*r*0.07, rear.y  + sny*r*0.07);
        ctx.lineTo(rear.x  + snx*r*0.02, rear.y  + sny*r*0.02);
        ctx.lineTo(pivotX + snx*r*0.09, pivotY + sny*r*0.09);
        ctx.closePath();
        ctx.fill();

        // Rear shock + linkage. Compresses visibly, because both ends are real
        // points: the frame above and the swingarm below.
        var linkX = lerp(pivotX, rear.x, 0.30), linkY = lerp(pivotY, rear.y, 0.30);
        stroke(214, 88, 40); strokeWeight(r * 0.16);
        line(-r * 0.10, seatY + r * 0.30, linkX, linkY);
        stroke(240, 140, 90, 150); strokeWeight(r * 0.05);
        line(-r * 0.06, seatY + r * 0.45, lerp(-r*0.10, linkX, 0.55), lerp(seatY + r*0.30, linkY, 0.55));
        noStroke();

        // ── Forks ─────────────────────────────────────────────────
        // Upside-down forks: fat gold outer tube at the top, thin silver slider
        // running down to the axle. The exposed slider length IS the suspension
        // travel, so it shortens as the wheel comes up — the visual cue that was
        // missing when the forks were drawn to a fixed point.
        stroke(198, 202, 212); strokeWeight(r * 0.13);
        line(headX, headY + r * 0.55, front.x, front.y);
        stroke(206, 158, 52); strokeWeight(r * 0.22);
        line(headX - r * 0.05, headY - r * 0.30,
             lerp(headX, front.x, 0.42), lerp(headY + r * 0.55, front.y, 0.42));
        stroke(150, 112, 34); strokeWeight(r * 0.08);
        line(headX - r * 0.12, headY - r * 0.20, headX - r * 0.02, headY + r * 0.30);
        noStroke();

        // Triple clamp
        fill(58, 63, 74);
        push(); translate(headX, headY - r * 0.34); rotate(0.52);
        rect(-r * 0.26, -r * 0.09, r * 0.52, r * 0.18, 2);
        pop();

        // ── Frame ─────────────────────────────────────────────────
        // Perimeter spars: steering head down to the swingarm pivot, and the
        // backbone running back to the seat. Deliberately thin and mid-grey —
        // at 0.13 r in near-white they read as scaffolding poles laid across the
        // bike and pull the eye off the actual silhouette.
        stroke(158, 164, 178); strokeWeight(r * 0.08);
        line(headX - r * 0.10, headY + r * 0.20, pivotX + r * 0.30, pivotY + r * 0.10);
        line(headX - r * 0.16, headY + r * 0.10, -r * 0.20, seatY + r * 0.55);
        line(-r * 0.20, seatY + r * 0.55, pivotX + r * 0.20, pivotY - r * 0.05);
        noStroke();

        // ── Engine ────────────────────────────────────────────────
        // Sits in the cradle between the spars, low and forward.
        fill(64, 69, 82);
        rect(pivotX + r * 0.10, axleY - r * 0.95, r * 1.05, r * 0.85, 3);
        fill(92, 98, 114, 160);
        for (var i = 0; i < 4; i++) rect(pivotX + r * 0.18, axleY - r * 0.88 + i * r * 0.16, r * 0.88, r * 0.06, 1);
        fill(48, 52, 62);
        rect(pivotX + r * 0.30, axleY - r * 0.16, r * 0.70, r * 0.22, 2);   // cases
        // Header pipe curling back from the front of the head. Thin and dark —
        // a fat light pipe here runs straight across the tank and cuts the bike
        // in half visually.
        stroke(146, 152, 166); strokeWeight(r * 0.06); noFill();
        ctx.beginPath();
        ctx.moveTo(pivotX + r * 1.10, axleY - r * 0.86);
        ctx.quadraticCurveTo(headX * 0.62, axleY - r * 1.40, -r * 0.45, seatY + r * 1.00);
        ctx.stroke();
        noStroke();

        // ── Tank + shrouds ────────────────────────────────────────
        var tg = ctx.createLinearGradient(0, seatY - r * 0.1, 0, axleY - r * 0.8);
        tg.addColorStop(0.00, '#f2705a');
        tg.addColorStop(0.45, '#d33a2c');
        tg.addColorStop(1.00, '#8c1a16');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(headX - r * 0.30, headY + r * 0.30);
        ctx.lineTo(headX - r * 0.05, headY + r * 0.75);
        ctx.lineTo(r * 0.30,         axleY - r * 1.05);
        ctx.lineTo(-r * 0.25,        seatY + r * 0.30);
        ctx.lineTo(-r * 0.25,        seatY - r * 0.02);
        ctx.lineTo(headX - r * 0.60, seatY + r * 0.05);
        ctx.closePath();
        ctx.fill();
        fill(255, 152, 132, 150);
        ctx.beginPath();
        ctx.moveTo(headX - r * 0.55, seatY + r * 0.16);
        ctx.lineTo(headX - r * 0.16, headY + r * 0.55);
        ctx.lineTo(headX - r * 0.34, headY + r * 0.80);
        ctx.lineTo(-r * 0.10,        seatY + r * 0.42);
        ctx.closePath();
        ctx.fill();

        // ── Seat ──────────────────────────────────────────────────
        fill(26, 28, 36);
        ctx.beginPath();
        ctx.moveTo(-r * 0.30, seatY + r * 0.02);
        ctx.lineTo(-r * 1.70, seatY + r * 0.22);
        ctx.lineTo(-r * 1.70, seatY + r * 0.50);
        ctx.lineTo(-r * 0.30, seatY + r * 0.36);
        ctx.closePath();
        ctx.fill();
        fill(74, 78, 92, 170);
        rect(-r * 1.66, seatY + r * 0.20, r * 1.30, r * 0.06, 1);

        // ── Rear guard + number plate ─────────────────────────────
        // Pulled in against the end of the seat. Out at 2.3 r it sat over open
        // air behind the rear wheel and read as a detached floating panel.
        fill(236, 240, 248);
        ctx.beginPath();
        ctx.moveTo(-r * 1.50, seatY + r * 0.18);
        ctx.lineTo(-r * 2.02, seatY + r * 0.06);
        ctx.lineTo(-r * 2.04, seatY + r * 0.36);
        ctx.lineTo(-r * 1.50, seatY + r * 0.46);
        ctx.closePath();
        ctx.fill();
        fill(28, 32, 44);
        textAlign(CENTER, CENTER); textSize(r * 0.38); textStyle(BOLD);
        textFont(vfx.fontHUD);
        text('8', -r * 1.76, seatY + r * 0.26);

        // ── Silencer ──────────────────────────────────────────────
        // Tucked up under the seat and slimmer. At its old size it was a grey
        // slab as long as the seat itself and read as a second frame rail.
        fill(122, 128, 142);
        ctx.beginPath();
        ctx.moveTo(-r * 0.70, seatY + r * 0.80);
        ctx.lineTo(-r * 1.85, seatY + r * 0.66);
        ctx.lineTo(-r * 1.87, seatY + r * 0.94);
        ctx.lineTo(-r * 0.72, seatY + r * 1.04);
        ctx.closePath();
        ctx.fill();
        fill(186, 192, 204, 150);
        rect(-r * 1.78, seatY + r * 0.72, r * 0.95, r * 0.07, 1);

        // ── Front mudguard ────────────────────────────────────────
        // Bolted to the fork, so it rides with the wheel.
        ctx.save();
        ctx.translate(front.x, front.y - r * 0.92);
        ctx.fillStyle = '#ee4a3c';
        ctx.beginPath();
        ctx.ellipse(0, r * 0.34, r * 1.02, r * 0.60, 0, Math.PI * 1.06, Math.PI * 1.94);
        ctx.lineTo(r * 0.36, r * 0.20);
        ctx.lineTo(-r * 0.32, r * 0.20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ── Bars + controls ───────────────────────────────────────
        stroke(38, 42, 52); strokeWeight(r * 0.11);
        line(headX - r * 0.05, headY - r * 0.42, headX + r * 0.34, headY - r * 0.86);
        noStroke();
        fill(20, 22, 30);
        push(); translate(headX + r * 0.38, headY - r * 0.90); rotate(-0.85);
        rect(-r * 0.05, -r * 0.16, r * 0.10, r * 0.32, 2);
        pop();
        fill(232, 236, 244);                                  // front number plate
        ctx.beginPath();
        ctx.moveTo(headX + r * 0.06, headY - r * 0.30);
        ctx.lineTo(headX + r * 0.40, headY + r * 0.10);
        ctx.lineTo(headX + r * 0.20, headY + r * 0.38);
        ctx.lineTo(headX - r * 0.02, headY + r * 0.02);
        ctx.closePath();
        ctx.fill();

        // ── Chain ─────────────────────────────────────────────────
        // Countershaft sprocket to rear hub, so it tracks the swingarm.
        stroke(78, 82, 96); strokeWeight(r * 0.07);
        line(pivotX + r * 0.28, pivotY + r * 0.16, rear.x, rear.y - r * 0.06);
        stroke(60, 64, 76); strokeWeight(r * 0.05);
        line(pivotX + r * 0.28, pivotY + r * 0.30, rear.x, rear.y + r * 0.10);
        noStroke();

        // Footpeg
        fill(150, 156, 170);
        rect(pivotX + r * 0.10, axleY - r * 0.10, r * 0.42, r * 0.09, 1);

        textStyle(NORMAL);
    }

    // ── Simulation ────────────────────────────────────────────────────────────
    update(dt) {
        if (reset) return;
        dt = dt || 1/60;
        var S = this.spec;

        // ── Fuel ──────────────────────────────────────────────────────────────
        // Burn is per second of real time (not per drawn frame, so the tank
        // lasts the same on any machine) and it scales with SPEED as well as
        // with throttle. Measured before this change, with a flat per-second
        // rate: one tank carried the truck 2522m when driven hard and 755m when
        // driven carefully — a 3.3x swing, because a flat time-based burn
        // charges you for the clock rather than for the ground you cover. It
        // also made the tank absurdly large next to the ~299m spacing of the
        // gas cans, so the gauge never mattered to anybody who kept moving.
        //
        // fuel per metre = A/speed + B. The A term is the engine idling, the B
        // term is the work of actually moving; B dominating is what keeps range
        // roughly pace-independent.
        //
        // The coefficients are set from MEASURED range on a real run, not from
        // the idealised always-at-full-throttle figure, because those two are
        // nowhere near each other: a driver who lifts over crests and coasts the
        // descents spends a large fraction of the run off the throttle, so the
        // first pass at this curve predicted ~600m per tank and delivered 1199m.
        // Idle burn matters for the same reason — a long descent is most of a
        // kilometre of free travel if coasting costs nothing.
        //
        // Rescaled 3x against Hill Climb Racing's own fuel pacing. The previous
        // coefficients were verified by measurement to give a 907 m range, which
        // against the can spacing meant fuel was decorative — the gauge simply
        // never reached the bottom on any run that was going to end in a crash
        // anyway. Target is ~300 m per tank against cans every 100 m; see
        // Ground.GAS_SPACING_M for why that ratio and where the 90 m reference
        // figure comes from.
        var burn;
        if (this.motorState !== 0) {
            var spd = this.chassisBody.GetLinearVelocity().Length();
            burn = (1.98 + 0.6525 * spd) * (S.fuelBurn || 1.0);
        } else {
            burn = 1.10;
        }
        this.fuel -= burn * dt;
        if (this.fuel <= 0) { this.fuel = 0; this.isFuelOut = true; this.motorOff(); }

        var rearDown  = window.carLeftWheelContact  > 0;
        var frontDown = window.carRightWheelContact > 0;
        var grounded  = rearDown || frontDown;

        var maxTorque = S.maxTorque;
        var topSpeed  = S.topSpeed;

        // Grip: sticky on the ground, nothing in the air so the wheels do not
        // act like gyros and lock the truck's rotation mid-jump.
        var fr = grounded ? 3.6 : 0.0;
        this.wheels[0].body.GetFixtureList().SetFriction(fr);
        this.wheels[1].body.GetFixtureList().SetFriction(fr);

        // ── Braking ───────────────────────────────────────────────────────────
        // The left pedal used to drive the wheels backwards at FULL motor torque
        // whenever it was held. That is not a brake, it is a reverse gear with
        // more authority than the engine — it stopped the vehicle dead from any
        // speed, which removed every consequence of arriving at a feature too
        // fast. It is now a genuine brake: it drags the wheels toward a stop
        // with `brakeTorque` (weak on the truck), and only becomes reverse once
        // the vehicle has very nearly stopped.
        var vx = this.chassisBody.GetLinearVelocity().x;
        var braking = (this.motorState === -1 && grounded && vx > 1.2);
        if (braking) {
            var bT = S.brakeTorque;
            this.currentTorque = 0;
            this.wheels[0].joint.EnableMotor(true);
            this.wheels[1].joint.EnableMotor(true);
            this.wheels[0].joint.SetMotorSpeed(0);
            this.wheels[1].joint.SetMotorSpeed(0);
            // Front brake does most of the work under load, as on a real vehicle
            // — and biasing it forward is also what makes a panic stop pitch the
            // nose down instead of just scrubbing off speed with no drama.
            this.wheels[0].joint.SetMaxMotorTorque(bT * 0.62);
            this.wheels[1].joint.SetMaxMotorTorque(bT);

            // Locked wheels skid. Reuse the drive-slip signal so the tyre spray
            // and the screen read the same either way.
            var lockSlip = constrain(vx / 14, 0, 1);
            this.wheelSlip = lockSlip;
            if (lockSlip > 0.25) {
                var bw = this.wheels[1].body.GetPosition();
                spawnSpray(bw.x*SCALE, bw.y*SCALE + this.wheelSize*0.6, -1, lockSlip*0.5);
            }
            return this._settle(grounded, S);
        }

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
                // A wheelie is not "the chassis is tilted", it is "the nose is
                // ROTATING up". Testing the rate rather than the angle is what
                // makes this safe on a hill: on a steady 30° climb the angular
                // velocity is ~0, so none of this fires and climbing costs you
                // nothing. Testing the angle instead bleeds torque on every
                // climb and stalls the run.
                //
                // Deliberately no contact-state guard. The moment the truck most
                // needs this is the instant it lands, and on landing BOTH wheels
                // register contact — so a `!frontDown && rearDown` condition
                // switches the assist off exactly when it is needed.
                //
                // The cut has to be steep to matter. Fading drive to 45% over an
                // overshoot of 2.4 rad/s sounds like help but is not: a
                // standing-start wheelie sits at an overshoot of ~0.15, which
                // buys an 11 N·m nudge against 265 N·m of drive. Full authority
                // inside 1.2 rad/s is what actually holds the nose down.
                //
                // The bike sets wheelieAssist to 0 and gets none of this.
                var dir = this.motorState === 1 ? 1 : -1;
                var wheelieCut = 1.0;
                if (S.wheelieAssist > 0) {
                    var lift = -this.chassisBody.GetAngularVelocity() * dir;   // >0 while nose rises
                    if (lift > S.wheelieRate) {
                        var over = lift - S.wheelieRate;
                        this.chassisBody.ApplyTorque(dir * S.wheelieAssist * over);
                        wheelieCut = constrain(map(over, 0, 1.2, 1.0, 0.22), 0.22, 1.0);
                    }
                }

                // Reverse is a crawl for backing off a ledge, not a second
                // forward gear — you should never be able to drive the track
                // backwards as fast as you drive it forwards.
                var revCut = this.motorState === 1 ? 1.0 : 0.42;
                var T  = this.currentTorque * curve * wheelieCut * revCut;
                var ts = this.motorState === 1 ? -topSpeed : topSpeed * 0.45;
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
                //
                // DIRECTION — set by conservation of angular momentum, which is
                // also what Hill Climb Racing does. Do not invert this again.
                //
                //   THROTTLE  -> ANTICLOCKWISE (nose UP)
                //   BRAKE     -> CLOCKWISE     (nose DOWN)
                //
                // Spinning the rear wheel forwards has to throw the frame
                // backwards; slowing it throws the frame forwards. The wheels
                // are the only thing to react against once you leave the ground.
                //
                // This is now the SAME sense as the reaction on the ground,
                // where throttle lifts the nose into a wheelie — so the controls
                // no longer swap meaning the instant the tyres lose contact.
                //
                // Canvas y points down, so a NEGATIVE torque is anticlockwise.
                var cs = this.chassisBody.GetAngularVelocity();
                if (this.motorState ===  1 && cs > -3.4) this.chassisBody.ApplyTorque(-S.airControl);
                if (this.motorState === -1 && cs <  3.4) this.chassisBody.ApplyTorque( S.airControl);
            }
        } else {
            this.currentTorque = 0;
            this.wheelSlip = 0;
            this.wheels[0].joint.SetMaxMotorTorque(0);
            this.wheels[1].joint.SetMaxMotorTorque(0);
            this.wheels[0].joint.EnableMotor(false);
            this.wheels[1].joint.EnableMotor(false);
        }

        return this._settle(grounded, S);
    }

    // Holds the rider in a forward riding crouch.
    //
    // Limiting the hip joint stopped him folding over backwards, but a limit only
    // says where he CAN'T go — between the two stops he still hung wherever
    // gravity and the seat spring left him, which was leaning back away from the
    // bars with his arms stretched out to reach them. That posture is what reads
    // as sitting the wrong way round on the bike.
    //
    // This is a servo, not a spring: it measures the actual lean and drives the
    // joint motor toward a target crouch. Sign matters — the joint's speed is
    // (chassis - torso), so leaning the rider FORWARD needs a NEGATIVE motor
    // speed, hence (current - target) rather than (target - current).
    _posture(grounded) {
        if (!this.revJoint || !this.revJoint.SetMotorSpeed) return;
        var lean   = this.person.torso.body.GetAngle() - this.chassisBody.GetAngle();
        var target = (this.type === 'bike') ? 0.26 : 0.16;   // bike rides more forward
        var gain   = 7.0;

        // AIRBORNE: back the servo right off.
        //
        // Holding the rider's posture costs torque, and every newton-metre of it
        // reacts back onto the chassis. On the ground that reaction is absorbed
        // through the tyres and you never see it. In the air there is nothing to
        // absorb it, so a servo running at full authority quietly span the whole
        // vehicle nose-up — measured at 0.28-0.34 rad of drift over half a
        // second with NO pedal pressed, which was several times larger than the
        // air-control input itself. The player's throttle was fighting the
        // rider's own shoulders and losing.
        //
        // Off the ground he just hangs between the hip limits, which is also
        // what a real rider does mid-jump.
        // Zero, not merely reduced: any residual servo torque still shows up as
        // an uncommanded spin. Measured 16 deg of nose-up drift per half second
        // at gain 0.6 with no pedal pressed.
        if (!grounded) gain = 0.0;

        this.revJoint.SetMotorSpeed(constrain((lean - target) * gain, -4, 4));
    }

    // Per-frame housekeeping that runs whatever the pedals are doing.
    _settle(grounded, S) {
        this._posture(grounded);
        // Downforce: the faster you go, the harder the vehicle is pressed into
        // the hill, so crests launch you less absurdly at speed. Cut hard from
        // the old values — at 2.4/40 it was less a handling aid than a magnet,
        // and it was the main reason a fast run over a crest simply stuck to the
        // ground instead of going anywhere near the air.
        if (grounded) {
            var v = this.chassisBody.GetLinearVelocity().Length();
            if (v > 8) {
                var f = min((v - 8) * S.downforce, S.dfCap);
                this.chassisBody.ApplyForce(new Vec2(0, f), this.chassisBody.GetWorldCenter());
            }
        }

        // Out of fuel: coast to a halt rather than ending the run the instant
        // the needle hits zero. Rolling the last few metres to a stop — and
        // watching a gas can go by just out of reach — is the moment; cutting
        // straight to the results card threw it away.
        if (this.isFuelOut && !reset) {
            var spd = this.chassisBody.GetLinearVelocity().Length();
            this.coastTimer = (spd < 1.1) ? (this.coastTimer || 0) + 1 : 0;
            if (this.coastTimer > 45) { this.deathCause = 'fuel'; reset = true; }
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
