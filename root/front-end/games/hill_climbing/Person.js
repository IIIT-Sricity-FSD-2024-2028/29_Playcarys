// Person.js — the driver.
// Two bodies (torso + head) linked by a limited revolute "neck". The head is
// what ends the run: if it touches the terrain, that's a crash.
class Person {
    constructor(x, y, pw, ph) {
        this.width = pw; this.height = ph;

        var td = new b2BodyDef(); td.type = b2DynamicBody;
        td.position.x = x/SCALE; td.position.y = (y - ph*0.45)/SCALE;
        this.torso = { body: world.CreateBody(td) };
        var tf = new b2FixtureDef(); tf.density=1.5; tf.friction=0.3; tf.restitution=0.0;
        tf.shape = new b2PolygonShape();
        tf.shape.SetAsBox(pw*0.5/SCALE, ph*0.5/SCALE);
        this.torso.body.CreateFixture(tf);
        this.torso.body.SetAngularDamping(0.5);
        this.torso.body.SetLinearDamping(0.1);

        // Head sits just above the shoulders. It used to be offset a further
        // 10px up, which pushed it clean through the cab roof once the body was
        // given its proper height.
        var hd = new b2BodyDef(); hd.type = b2DynamicBody;
        hd.position.x = x/SCALE; hd.position.y = (y - ph*0.92)/SCALE;
        this.head = { body: world.CreateBody(hd) };
        var hf = new b2FixtureDef(); hf.density=1.0; hf.friction=0.2; hf.restitution=0.0;
        // Head size is tied to the body rather than fixed at 11px. Hill Climb
        // Racing draws Bill with a deliberately oversized cartoon head — close to
        // half his torso height — and a fixed radius meant that as soon as the
        // rider was scaled up to match the bike he ended up pinheaded.
        this.headR = ph * 0.48;
        hf.shape = new b2CircleShape(this.headR/SCALE);
        this.head.body.CreateFixture(hf);
        this.head.body.SetAngularDamping(1.5);

        var nj = new b2RevoluteJointDef();
        nj.Initialize(this.torso.body, this.head.body, this.head.body.GetPosition());
        nj.enableLimit=true; nj.lowerAngle=-0.22; nj.upperAngle=0.22;
        nj.enableMotor=true; nj.motorSpeed=0; nj.maxMotorTorque=5;
        this.headJoint = world.CreateJoint(nj);

        var filt = new b2FilterData();
        filt.categoryBits=PERSON_CATEGORY; filt.maskBits=PERSON_MASK;
        this.torso.body.GetFixtureList().SetFilterData(filt);
        this.head.body.GetFixtureList().SetFilterData(filt);
    }

    _place() {
        var tx=this.torso.body.GetPosition().x*SCALE;
        var ty=this.torso.body.GetPosition().y*SCALE;
        var ta=this.torso.body.GetAngle();
        translate(tx-panX, ty-panY); rotate(ta);
    }

    // Legs only, drawn BEFORE the bodywork. The truck's driver sits down in a
    // tub, so his legs are inside it — painted over the body panels instead
    // they hang down the outside of the truck like a mannequin strapped to the
    // door. The bike's rider straddles the frame, so his near leg belongs in
    // FRONT and is drawn in the normal pass.
    showLegs() {
        push(); this._place();
        noStroke(); rectMode(CENTER);
        this._drawLegs(false);
        rectMode(CORNER); pop();
    }

    show() {
        push(); this._place();
        this._draw(car && car.type === 'bike');
        pop();
    }

    // World pixels -> torso-local pixels, which is the space _draw() works in.
    _toLocal(p) {
        var t = this.torso.body.GetPosition();
        var ta = this.torso.body.GetAngle();
        var dx = p.x - t.x*SCALE, dy = p.y - t.y*SCALE;
        var c = Math.cos(-ta), s = Math.sin(-ta);
        return { x: dx*c - dy*s, y: dx*s + dy*c };
    }

    // Two-bone IK in 2D. Given a shoulder/hip at (sx,sy) and a target, returns
    // the elbow/knee and the hand/foot. `flip` picks which way the joint bends.
    //
    // Bone lengths grow to meet a target that is out of reach, so a limb is
    // never left dangling short of the bar it is supposed to be holding — the
    // rider is stylised, not anatomically scaled to the machine, and a visibly
    // detached hand reads far worse than a slightly long arm.
    _ik(sx, sy, tx, ty, l1, l2, flip) {
        var dx = tx - sx, dy = ty - sy;
        var d = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        if (d > l1 + l2) { var g = (d * 1.005) / (l1 + l2); l1 *= g; l2 *= g; }
        var dmin = Math.abs(l1 - l2) + 0.001;
        var dc = Math.max(d, dmin);
        var a = (l1*l1 - l2*l2 + dc*dc) / (2*dc);
        var hgt = Math.sqrt(Math.max(0, l1*l1 - a*a));
        var ux = dx/d, uy = dy/d;
        return {
            ex: sx + ux*a - uy*hgt*flip,
            ey: sy + uy*a + ux*hgt*flip,
            hx: tx, hy: ty
        };
    }

    // Draws one limb as two tapered segments plus a joint cap.
    _limb(s, j, e, w1, w2, cNear, cFar, endCol, endW) {
        var ctx = drawingContext;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = cFar;  ctx.lineWidth = w1;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(j.x, j.y); ctx.stroke();
        ctx.strokeStyle = cNear; ctx.lineWidth = w2;
        ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        if (endCol) {
            ctx.fillStyle = endCol;
            ctx.beginPath(); ctx.arc(e.x, e.y, endW, 0, 6.2832); ctx.fill();
        }
    }

    _drawLegs(bike) {
        var w=this.width, h=this.height;
        var att = (car && car.attachPoints) ? car.attachPoints() : null;

        if (!att) {                                   // no vehicle yet — sit still
            fill(30, 38, 58); rect(w*0.10, h*0.62, w*0.34, h*0.52, 3);
            return;
        }

        // Hip is at the base of the torso; the foot goes on the peg/pedal.
        var peg = this._toLocal(att.peg);
        var hipN = { x: w*0.10, y: h*0.44 };
        var hipF = { x: -w*0.06, y: h*0.44 };
        var thigh = h*0.62, shin = h*0.58;

        // Dark blue jeans, per Bill's standard outfit. Far leg first and darker,
        // so the near one has something to sit on.
        var f = this._ik(hipF.x, hipF.y, peg.x - w*0.18, peg.y, thigh, shin, 1);
        this._limb(hipF, {x:f.ex,y:f.ey}, {x:f.hx,y:f.hy},
                   w*0.30, w*0.24, 'rgb(28,40,72)', 'rgb(22,32,58)', 'rgb(196,200,206)', w*0.20);

        var n = this._ik(hipN.x, hipN.y, peg.x, peg.y, thigh, shin, 1);
        this._limb(hipN, {x:n.ex,y:n.ey}, {x:n.hx,y:n.hy},
                   w*0.34, w*0.28, 'rgb(44,62,104)', 'rgb(36,50,88)', null, 0);

        // Sneaker — dirty white with a yellow-blue flash, laid along the peg
        // rather than drawn as a floating block.
        var footAng = Math.atan2(n.hy - n.ey, n.hx - n.ex);
        push();
        translate(n.hx, n.hy); rotate(footAng + (bike ? -1.35 : -1.15));
        noStroke();
        fill(226, 226, 220); rect(w*0.10, -w*0.02, w*0.48, w*0.22, 3);   // upper
        fill(250, 202, 60);  rect(w*0.06, w*0.03, w*0.16, w*0.10, 2);    // yellow flash
        fill(58, 110, 190);  rect(w*0.22, w*0.02, w*0.14, w*0.08, 2);    // blue flash
        fill(178, 178, 172); rect(w*0.10, w*0.09, w*0.50, w*0.08, 2);    // sole
        pop();
    }

    _draw(withLegs) {
        var w=this.width, h=this.height;
        var ctx=drawingContext;
        var bike = (car && car.type === 'bike');
        noStroke();
        rectMode(CENTER);

        // Everything is lit from the upper LEFT, matching the sun in the sky
        // buffer and the highlight side the vehicles are painted with. A figure
        // built from flat fills reads as a sticker on the seat; the ramps below
        // are what give it a front and a back.
        if (withLegs) this._drawLegs(true);

        // Far arm, reaching the same grip from the shoulder behind the near one.
        var att = (car && car.attachPoints) ? car.attachPoints() : null;
        if (att) {
            var grip = this._toLocal(att.grip);
            var shF = { x: w*0.06, y: -h*0.24 };
            var af = this._ik(shF.x, shF.y, grip.x - w*0.10, grip.y + h*0.05,
                              h*0.52, h*0.48, -1);
            this._limb(shF, {x:af.ex,y:af.ey}, {x:af.hx,y:af.hy},
                       w*0.26, w*0.22, 'rgb(150,44,38)', 'rgb(124,34,29)', 'rgb(20,22,28)', w*0.20);
        } else {
            fill(24, 60, 118);
            rect(w*0.34, h*0.06, w*0.24, h*0.20, 3);
        }

        // ── Torso: red plaid flannel ──────────────────────────────
        // Bill wears a red checked flannel shirt. The plaid is drawn as two sets
        // of translucent bands clipped to the torso, which at this size reads as
        // check without turning into noise.
        // Plain red long-sleeve, ink-outlined to match the reference art. The
        // plaid check I had before is from Bill's HCR2 artwork; the sprite in
        // the game this is modelled on is a flat red shirt, and at this size a
        // check pattern just reads as noise anyway.
        var tg = ctx.createLinearGradient(-w*0.55, -h*0.3, w*0.55, h*0.3);
        tg.addColorStop(0.00, '#ef6a52');
        tg.addColorStop(0.40, '#d8392c');
        tg.addColorStop(1.00, '#96201b');
        ctx.fillStyle = tg;
        ctx.strokeStyle = 'rgb(26,20,18)';
        ctx.lineWidth = 1.6;
        vfxRoundRectPath(ctx, -w*0.5, -h*0.5, w, h, 4);
        ctx.fill();
        ctx.stroke();

        // Shoulder catch-light along the top edge
        noStroke();
        fill(255, 180, 160, 110);
        rect(-w*0.06, -h*0.44, w*0.62, h*0.10, 2);
        // Contact shadow where the shirt meets the seat
        fill(40, 10, 8, 90);
        rect(0, h*0.42, w*0.94, h*0.16, 3);

        // ── Near arm, on the grip ─────────────────────────────────
        // Solved to the same point the bars/wheel are actually drawn at, so as
        // the torso pitches around on its joints the elbow works and the hand
        // stays put. This was a fixed rectangle sticking out of his side.
        if (att) {
            var grip2 = this._toLocal(att.grip);
            var shN = { x: w*0.20, y: -h*0.20 };
            var an = this._ik(shN.x, shN.y, grip2.x, grip2.y, h*0.52, h*0.48, -1);
            this._limb(shN, {x:an.ex,y:an.ey}, {x:an.hx,y:an.hy},
                       w*0.30, w*0.26, 'rgb(198,58,48)', 'rgb(166,44,36)', 'rgb(24,26,32)', w*0.24);
            // Highlight down the upper arm
            var ctx2 = drawingContext;
            ctx2.strokeStyle = 'rgba(255,170,150,0.42)'; ctx2.lineWidth = w*0.09;
            ctx2.beginPath();
            ctx2.moveTo(shN.x + w*0.02, shN.y - w*0.06);
            ctx2.lineTo(an.ex + w*0.02, an.ey - w*0.06);
            ctx2.stroke();
            noStroke();
        } else {
            fill(44, 104, 184);
            rect(w*0.42, h*0.02, w*0.28, h*0.24, 3);
            fill(28, 30, 38);
            rect(w*0.62, h*0.06, w*0.22, h*0.20, 3);
        }

        // Harness — a four-point in the buggy, a plain belt on the bike.
        stroke(178, 92, 24); strokeWeight(2.2); noFill();
        line(-w*0.30, -h*0.16, w*0.16, h*0.30);
        if (!bike) line(w*0.30, -h*0.20, -w*0.10, h*0.30);
        noStroke();

        // ── Head + helmet ─────────────────────────────────────────
        var hx=(this.head.body.GetPosition().x-this.torso.body.GetPosition().x)*SCALE;
        var hy=(this.head.body.GetPosition().y-this.torso.body.GetPosition().y)*SCALE;
        var hr=this.head.body.GetAngle()-this.torso.body.GetAngle();
        push(); translate(hx,hy); rotate(hr);
        // The head art below is authored against an 11.5px radius; scaling here
        // keeps every proportion inside it intact as the rider grows.
        var hs = this.headR / 11.5;
        scale(hs);

        // Neck
        fill(196, 148, 108); rect(-1, 9, 8, 8, 2);
        fill(168, 122, 88, 140); rect(-1, 7, 8, 3, 1);

        // ── Head, drawn to the reference art ──────────────────────
        // Bill's face in profile is: a big curly light-brown mop under a red
        // cap, a large hooked nose, a heavy chin, and a thick black outline
        // around everything. The outline is the single biggest thing — the
        // reference art is ink-lined cartoon, not soft-shaded vector, and
        // without it the head reads as a different game entirely.
        var INK = 'rgb(26,20,18)';
        var LINE = 1.5;

        // Curly hair mass BEHIND the head. Drawn first so the face and cap sit
        // on top of it, with lobes poking out around the edge.
        ctx.fillStyle = '#8a5a32';
        ctx.strokeStyle = INK; ctx.lineWidth = LINE;
        var curls = [[-8.5,-2.5,5.6],[-9.5,3.2,4.8],[-6.5,7.0,4.2],[-7.8,-7.5,4.6],[-2.5,9.0,3.6]];
        for (var ci = 0; ci < curls.length; ci++) {
            ctx.beginPath();
            ctx.arc(curls[ci][0], curls[ci][1], curls[ci][2], 0, 6.2832);
            ctx.fill(); ctx.stroke();
        }

        // Face. A ROUND skull with the nose and chin built out of it, rather than
        // the straight-edged polygon this used to be — the reference art is all
        // soft curves and the flat-sided version read as a wooden block. The
        // skull is an arc; only the nose and jaw are drawn as features on it.
        ctx.fillStyle = '#e8b489';
        ctx.strokeStyle = INK; ctx.lineWidth = LINE;
        ctx.beginPath();
        // Round the back and top of the head
        ctx.arc(0, 0, 8.6, Math.PI * 0.78, Math.PI * 1.62);
        // Brow -> bridge -> nose tip, curving out
        ctx.quadraticCurveTo(7.2, -6.0, 8.2, -2.4);
        ctx.quadraticCurveTo(11.6, 0.2, 10.4, 2.0);
        // Under the nose, tucking back to the lip
        ctx.quadraticCurveTo(8.6, 3.0, 7.8, 4.0);
        // Lip -> chin, rounded
        ctx.quadraticCurveTo(8.6, 6.2, 6.0, 8.0);
        // Jaw sweeping back under the ear
        ctx.quadraticCurveTo(2.0, 10.2, -2.6, 8.6);
        ctx.quadraticCurveTo(-6.4, 7.0, -7.4, 3.4);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Cheek shading
        noStroke();
        fill(206, 152, 112, 130); ellipse(0.5, 4.6, 9, 5);

        // Eye + heavy brow — the grumpy set of the brow is his expression.
        fill(28, 22, 20); ellipse(4.4, -1.6, 2.6, 3.2);
        push(); translate(4.6, -4.6); rotate(0.24);
        fill(60, 40, 28); rect(0, 0, 5.2, 1.8, 0.8);
        pop();
        // Mouth
        noFill(); stroke(120, 78, 58); strokeWeight(1.2);
        arc(4.0, 6.4, 5.6, 2.6, PI+0.30, TWO_PI-0.30);
        noStroke();

        // ── Red cap ───────────────────────────────────────────────
        // Worn forward in the reference, peak over the brow, with the curls
        // bursting out underneath and behind it.
        ctx.fillStyle = '#d8392c';
        ctx.strokeStyle = INK; ctx.lineWidth = LINE;
        ctx.beginPath();
        ctx.arc(-0.5, -5.0, 8.6, Math.PI + 0.16, Math.PI * 2 + 0.10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Peak, forward over the eyes
        ctx.fillStyle = '#b8261f';
        ctx.beginPath();
        ctx.moveTo( 1.0, -5.4);
        ctx.lineTo(10.8, -6.4);
        ctx.lineTo(11.0, -4.0);
        ctx.lineTo( 1.2, -2.6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Button on the crown
        noStroke();
        fill(150, 24, 20); ellipse(-0.5, -12.4, 2.4, 2.4);
        // Sun catch along the crown
        fill(255, 168, 150, 110);
        push(); translate(-3.4, -9.8); rotate(-0.40);
        ellipse(0, 0, 8, 2.6);
        pop();

        pop();
        rectMode(CORNER);
    }
}
