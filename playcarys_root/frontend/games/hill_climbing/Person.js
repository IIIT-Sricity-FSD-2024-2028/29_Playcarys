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

        var hd = new b2BodyDef(); hd.type = b2DynamicBody;
        hd.position.x = x/SCALE; hd.position.y = (y - ph - 10)/SCALE;
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
        var w=this.width, h=this.height; noStroke();
        // Suit
        fill(215,18,18); rectMode(CENTER); rect(0,0,w,h,4);
        // Shoulder patches
        fill(245,246,250);
        rect(-w*0.44,-h*0.28,w*0.16,h*0.20,2);
        rect( w*0.44,-h*0.28,w*0.16,h*0.20,2);
        // HANS collar
        fill(228,230,235); rect(0,-h*0.42,w*0.68,h*0.14,3);
        // Harness
        stroke(70,35,5); strokeWeight(2); noFill();
        line(-w*0.28,-h*0.10,0,h*0.28); line(w*0.28,-h*0.10,0,h*0.28);
        line(-w*0.50,h*0.18,0,h*0.28);  line(w*0.50,h*0.18,0,h*0.28);
        noStroke();
        // Gloves
        fill(16,16,22); rect(-w*0.50,h*0.24,w*0.20,h*0.26,3);
        fill(215,18,18); rect(-w*0.50,h*0.12,w*0.20,h*0.08,1);

        // Head/helmet
        var hx=(this.head.body.GetPosition().x-this.torso.body.GetPosition().x)*SCALE;
        var hy=(this.head.body.GetPosition().y-this.torso.body.GetPosition().y)*SCALE;
        var hr=this.head.body.GetAngle()-this.torso.body.GetAngle();
        push(); translate(hx,hy); rotate(hr);
        // White helmet
        fill(238,240,245); ellipse(0,0,22,24); arc(0,-3,21,17,PI,TWO_PI);
        // Red stripe
        fill(215,18,18); arc(0,0,22,16,PI+0.4,TWO_PI-0.4);
        // Visor
        fill(20,20,28); arc(3,-1,18,13,-HALF_PI+0.3,HALF_PI-0.3);
        fill(55,36,0,215); arc(3,-1,16,11,-HALF_PI+0.35,HALF_PI-0.35);
        noFill(); stroke(175,162,115); strokeWeight(1.5);
        arc(3,-1,17,12,-HALF_PI+0.3,HALF_PI-0.3); noStroke();
        fill(255,220,100,42); arc(0,-3,11,6,-HALF_PI+0.4,0.1);
        // Fin
        fill(195,14,14); triangle(0,-11,-2,-7,2,-7);
        // HANS
        fill(42,42,52); rectMode(CENTER);
        rect(0,10,15,5,2); rect(-7,13,3,7,1); rect(7,13,3,7,1);
        pop();
    }
}
