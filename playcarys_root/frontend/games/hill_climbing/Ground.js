class Ground {
    constructor() {
        this.vectors    = [];
        this.pickups    = [];
        this.distance   = 20 * canvas.width;
        this.smoothness = 8;
        this.grassThick = 7;
        this._generate();
        this._buildPhysics();
        this._spawnPickups();
    }

    _generate() {
        // Back wall
        this.vectors.push(new Vec2(-60, -3000));
        this.vectors.push(new Vec2(-60,  canvas.height + 300));

        var startFlat = 300;  // Short flat — hills start at 300px
        var blendEnd  = 600;
        var baseH     = canvas.height - 110;

        for (var i = 0; i < this.distance; i += this.smoothness) {
            var raw = sin(i*0.003)*90 + sin(i*0.012+1.8)*30 + noise(i*0.02)*20 + sin(i*0.006+0.9)*50;
            var finalH = baseH - raw;

            if      (i < startFlat) finalH = baseH;
            else if (i < blendEnd)  finalH = lerp(baseH, finalH, (i-startFlat)/(blendEnd-startFlat));
            finalH = constrain(finalH, canvas.height*0.15, canvas.height - 60);
            this.vectors.push(new Vec2(i, finalH));
        }

        this.vectors.push(new Vec2(this.distance, canvas.height + 400));
        this.vectors.push(new Vec2(-60, canvas.height + 400));

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
                nextGas = i + 220 + floor(random(-20,20));
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

    show() {
        push(); translate(-panX, -panY);

        // Dirt
        fill(88,52,18); noStroke();
        beginShape();
        for (var i=2; i<this.vectors.length-2; i++) vertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE);
        vertex(this.distance, canvas.height+500);
        vertex(this.vectors[2].x*SCALE, canvas.height+500);
        endShape(CLOSE);

        // Sub-layer
        fill(65,36,10);
        beginShape();
        for (var i=2; i<this.vectors.length-2; i++) vertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE+20);
        vertex(this.distance, canvas.height+500);
        vertex(this.vectors[2].x*SCALE, canvas.height+500);
        endShape(CLOSE);

        // Dirt bumps
        randomSeed(1337); noStroke();
        var vL=panX/SCALE-1, vR=(panX+canvas.width)/SCALE+2;
        for (var i=2; i<this.vectors.length-3; i+=2) {
            var v=this.vectors[i];
            if (v.x<vL||v.x>vR) { random();random();random(); continue; }
            if (floor(random(3))===0) { fill(72,40,12,180); ellipse(v.x*SCALE+random(-5,5), v.y*SCALE+random(8,26), random(18,40), random(5,13)); }
        }
        randomSeed(0);

        // Grass
        var gt = this.grassThick;
        stroke(45,120,35); strokeWeight(gt*2.8); noFill();
        beginShape();
        for (var i=2; i<this.vectors.length-2; i++) curveVertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE);
        endShape();
        stroke(80,185,55); strokeWeight(gt*1.1);
        beginShape();
        for (var i=2; i<this.vectors.length-2; i++) curveVertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE - gt*0.9);
        endShape();
        stroke(110,210,75,160); strokeWeight(1.5);
        beginShape();
        for (var i=2; i<this.vectors.length-2; i++) curveVertex(this.vectors[i].x*SCALE, this.vectors[i].y*SCALE - gt*1.6);
        endShape();

        pop();

        for (var p of this.pickups) if (!p.collected) p.show();
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
