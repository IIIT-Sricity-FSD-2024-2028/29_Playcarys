class Pickup {
  /**
   * @param {number} x - Pixel X position
   * @param {number} y - Pixel Y position
   * @param {string} type - 'coin', 'diamond', or 'gas'
   */
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.collected = false;

    this._makeBody();

    // Visual settings
    this.color = type === 'coin' ? '#fbbf24' : (type === 'diamond' ? '#60a5fa' : '#ef4444');
    this.value = type === 'coin' ? 5 : (type === 'diamond' ? 50 : 0);
  }

  // Body creation lives here so respawn() can rebuild it. collect() destroys the
  // Box2D body outright, so a pickup that has been taken has nothing left to
  // collide with until this runs again.
  _makeBody() {
    var bodyDef = new b2BodyDef();
    bodyDef.type = b2StaticBody;
    bodyDef.position.x = this.x / SCALE;
    bodyDef.position.y = this.y / SCALE;

    var fixDef = new b2FixtureDef();
    fixDef.isSensor = true; // No physical impact
    fixDef.shape = new b2CircleShape(15 / SCALE);

    // Collision setup: collide with chassis and wheels
    var filtData = new b2FilterData();
    filtData.categoryBits = 0x0100; // PICKUP_CATEGORY
    filtData.maskBits = WHEEL_CATEGORY | CHASSIS_CATEGORY;

    this.body = world.CreateBody(bodyDef);
    this.body.CreateFixture(fixDef).SetFilterData(filtData);

    // Tag the body for easy identification in the contact listener
    this.body.userData = { isPickup: true, pickupRef: this };
  }

  // Put a collected pickup back. Restarting a run rebuilds the vehicle but keeps
  // the same track, and without this every coin, diamond and — fatally — every
  // fuel can you picked up on your first attempt stayed gone for the rest of the
  // session. Your second run drove a course with no fuel on it at all.
  respawn() {
    if (!this.collected) return;
    this.collected = false;
    this._makeBody();
  }

  show() {
    if (this.collected) return;

    let x = this.body.GetPosition().x * SCALE;
    let y = this.body.GetPosition().y * SCALE;

    // Phase is seeded from world position so neighbouring pickups bob out of
    // step with each other instead of pulsing in one block.
    let t = frameCount * 0.055 + this.x * 0.021;
    let floatY = sin(t) * 8;

    push();
    translate(x - panX, y - panY + floatY);

    // Additive halo — the cheapest way to make a pickup read as "collect me".
    let glow = this.type === 'gas'     ? [255, 90, 70]
             : this.type === 'diamond' ? [120, 190, 255]
             :                           [255, 196, 60];
    let ctx = drawingContext;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    let pulse = 0.24 + Math.sin(t * 1.6) * 0.07;
    gr.addColorStop(0, 'rgba(' + glow[0] + ',' + glow[1] + ',' + glow[2] + ',' + pulse + ')');
    gr.addColorStop(1, 'rgba(' + glow[0] + ',' + glow[1] + ',' + glow[2] + ',0)');
    ctx.fillStyle = gr;
    ctx.fillRect(-30, -30, 60, 60);
    ctx.restore();

    this.drawProIcon(t);
    pop();
  }

  drawProIcon(t) {
    noStroke();
    rectMode(CENTER);

    if (this.type === 'gas') {
      // ── Jerry can ──────────────────────────────────────────────
      let ctx = drawingContext;
      let g = ctx.createLinearGradient(-12, 0, 12, 0);
      g.addColorStop(0.00, '#8e1414');
      g.addColorStop(0.30, '#d92b2b');
      g.addColorStop(0.62, '#f04a44');
      g.addColorStop(1.00, '#9c1a18');
      ctx.fillStyle = g;
      vfxRoundRectPath(ctx, -12, -14, 24, 29, 4);
      ctx.fill();

      // Recessed side ribs
      fill(140, 22, 20, 190);
      rect(-4.5, 1, 13, 3.5, 1.5);
      rect(-4.5, 6, 13, 3.5, 1.5);

      // Handle + spout
      fill(46, 48, 56);
      rect(0, -16.5, 15, 4.5, 2);
      rect(8, -18.5, 5, 5, 1.5);
      fill(70, 74, 84);
      rect(0, -17.6, 15, 1.6, 1);

      // Label
      fill(252, 248, 238);
      rect(-1, -5, 15, 7, 1.5);
      fill(150, 26, 24);
      textAlign(CENTER, CENTER); textSize(6); textStyle(BOLD);
      textFont(vfx.fontHUD);
      text('FUEL', -1, -4.6);

      // Specular
      fill(255, 255, 255, 62);
      rect(-7.5, -2, 3.5, 22, 1.5);

    } else if (this.type === 'diamond') {
      // ── Faceted gem ────────────────────────────────────────────
      let R = 14;
      // Table + crown facets, each a slightly different blue so the stone
      // catches light rather than reading as a flat rhombus.
      fill(30, 96, 178);
      beginShape(); vertex(0, -R); vertex(R, -R * 0.18); vertex(0, R * 1.12); vertex(-R, -R * 0.18); endShape(CLOSE);
      fill(74, 156, 240);
      beginShape(); vertex(0, -R); vertex(R * 0.42, -R * 0.18); vertex(0, R * 1.12); vertex(-R * 0.48, -R * 0.18); endShape(CLOSE);
      fill(140, 206, 255);
      triangle(0, -R, R * 0.42, -R * 0.18, -R * 0.10, -R * 0.18);
      fill(206, 238, 255);
      triangle(0, -R, R * 0.16, -R * 0.30, -R * 0.16, -R * 0.30);
      fill(18, 66, 132, 170);
      triangle(R * 0.42, -R * 0.18, R, -R * 0.18, 0, R * 1.12);

      // Girdle
      stroke(198, 232, 255, 150); strokeWeight(1.1); noFill();
      line(-R, -R * 0.18, R, -R * 0.18);
      noStroke();

      // Twinkle
      let tw = (Math.sin(t * 2.2) + 1) * 0.5;
      if (tw > 0.45) {
        let s = (tw - 0.45) * 16;
        push(); translate(R * 0.34, -R * 0.56);
        drawingContext.save();
        drawingContext.globalCompositeOperation = 'lighter';
        fill(255, 255, 255, 235);
        beginShape();
        vertex(0, -s); vertex(s * 0.22, -s * 0.22); vertex(s, 0);
        vertex(s * 0.22, s * 0.22); vertex(0, s); vertex(-s * 0.22, s * 0.22);
        vertex(-s, 0); vertex(-s * 0.22, -s * 0.22);
        endShape(CLOSE);
        drawingContext.restore();
        pop();
      }

    } else {
      // ── Spinning coin ──────────────────────────────────────────
      // Squashing X by a cosine is enough to sell a rotating disc, and it costs
      // one multiply instead of a sprite sheet.
      let spin = Math.cos(t * 1.5);
      let w = Math.abs(spin);
      let edgeOn = w < 0.22;

      push();
      scale(max(w, 0.10), 1);

      let ctx = drawingContext;
      let g = ctx.createLinearGradient(0, -13, 0, 13);
      g.addColorStop(0.00, '#fff0b8');
      g.addColorStop(0.35, '#fbc43c');
      g.addColorStop(0.70, '#e09a16');
      g.addColorStop(1.00, '#a9700d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.2832); ctx.fill();

      if (!edgeOn) {
        fill(176, 122, 18, 200); ellipse(0, 0, 19, 19);
        fill(250, 206, 76);      ellipse(0, 0, 16, 16);
        // Star motif
        fill(186, 132, 22);
        push(); rotate(t * 0.5);
        beginShape();
        for (let i = 0; i < 10; i++) {
          let a = -HALF_PI + i * PI / 5;
          let rr = (i % 2 === 0) ? 6.2 : 2.7;
          vertex(cos(a) * rr, sin(a) * rr);
        }
        endShape(CLOSE);
        pop();
        // Specular sweep
        fill(255, 255, 255, 92);
        ellipse(-4, -4.5, 9, 6.5);
      }
      pop();

      // The coin's rim stays lit even when it is edge-on.
      noFill(); stroke(255, 232, 150, edgeOn ? 220 : 90); strokeWeight(edgeOn ? 2.4 : 1);
      ellipse(0, 0, max(w, 0.10) * 26, 26);
      noStroke();
    }
    rectMode(CORNER);
    textStyle(NORMAL);
  }

  collect() {
    this.collected = true;
    world.DestroyBody(this.body);
  }
}
