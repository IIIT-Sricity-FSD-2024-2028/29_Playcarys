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
        hf.shape = new b2CircleShape(11/SCALE);
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

    show() {
        var tx=this.torso.body.GetPosition().x*SCALE;
        var ty=this.torso.body.GetPosition().y*SCALE;
        var ta=this.torso.body.GetAngle();
        push(); translate(tx-panX, ty-panY); rotate(ta);
        this._draw(); pop();
    }

    _draw() {
        var w=this.width, h=this.height;
        noStroke();
        rectMode(CENTER);

        // ── Torso: blue jacket ────────────────────────────────────
        fill(38, 92, 168);  rect(0, 0, w, h, 4);
        fill(58, 122, 205); rect(-w*0.16, 0, w*0.34, h, 3);   // lit side

        // Collar
        fill(232, 236, 244); rect(0, -h*0.42, w*0.72, h*0.15, 3);

        // Arm reaching for the wheel
        fill(38, 92, 168);
        rect(w*0.42, h*0.02, w*0.28, h*0.24, 3);
        fill(28, 30, 38);
        rect(w*0.62, h*0.06, w*0.22, h*0.20, 3);              // glove

        // Seat belt
        stroke(64, 40, 12); strokeWeight(2.2); noFill();
        line(-w*0.30, -h*0.16, w*0.16, h*0.30);
        noStroke();

        // ── Head + helmet ─────────────────────────────────────────
        var hx=(this.head.body.GetPosition().x-this.torso.body.GetPosition().x)*SCALE;
        var hy=(this.head.body.GetPosition().y-this.torso.body.GetPosition().y)*SCALE;
        var hr=this.head.body.GetAngle()-this.torso.body.GetAngle();
        push(); translate(hx,hy); rotate(hr);

        // Face
        fill(232, 184, 142); ellipse(1, 2, 16, 17);
        // Beard/jaw shading
        fill(206, 158, 120); arc(1, 4, 15, 14, 0.15, PI-0.15);
        // Eye
        fill(30, 28, 32); ellipse(5, 0, 2.6, 3);
        // Smile
        noFill(); stroke(178, 126, 92); strokeWeight(1.2);
        arc(3, 5, 8, 5, 0.2, PI-0.5);
        noStroke();

        // Red helmet shell
        fill(198, 34, 30);
        arc(0, 0, 23, 23, PI+0.15, TWO_PI+0.25);
        // Helmet highlight
        fill(240, 92, 80);
        arc(0, 0, 23, 23, PI+0.30, PI+0.95);
        // Peak / visor brim
        fill(158, 22, 20);
        rect(7, -2.5, 12, 4, 1.5);
        // Goggles strap
        fill(40, 42, 52); rect(0, -3.5, 22, 3.5, 1);
        fill(120, 190, 225); ellipse(6, -3.5, 7, 5.5);

        pop();
        rectMode(CORNER);
    }
}
