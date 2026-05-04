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

    // Define sensor body
    var bodyDef = new b2BodyDef();
    bodyDef.type = b2StaticBody;
    bodyDef.position.x = x / SCALE;
    bodyDef.position.y = y / SCALE;

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

    // Visual settings
    this.color = type === 'coin' ? '#fbbf24' : (type === 'diamond' ? '#60a5fa' : '#ef4444');
    this.value = type === 'coin' ? 5 : (type === 'diamond' ? 50 : 0);
  }

  show() {
    if (this.collected) return;

    let x = this.body.GetPosition().x * SCALE;
    let y = this.body.GetPosition().y * SCALE;
    
    push();
    // Smooth floating animation
    let floatY = sin(frameCount * 0.08 + this.x) * 10;
    translate(x - panX, y - panY + floatY);
    
    this.drawProIcon();
    pop();
  }

  drawProIcon() {
    noStroke();
    if (this.type === 'gas') {
      // Rugged Gas Can (Vector)
      fill(220, 38, 38); // Red
      rectMode(CENTER);
      rect(0, 0, 24, 30, 4);
      // Handle
      fill(50);
      rect(0, -18, 12, 6, 2);
      // Label
      fill(255);
      textSize(8);
      textAlign(CENTER, CENTER);
      text('GAS', 0, 0);
    } else if (this.type === 'diamond') {
      // Shiny blue diamond
      fill(96, 165, 250);
      beginShape();
      vertex(0, -15);
      vertex(15, 0);
      vertex(0, 15);
      vertex(-15, 0);
      endShape(CLOSE);
      // Shine
      fill(255, 150);
      triangle(0, -15, 5, 0, -5, 0);
    } else {
      // Glossy Gold Coin
      fill(251, 191, 36);
      ellipse(0, 0, 24, 24);
      // Inner Circle
      stroke(180, 130, 20);
      strokeWeight(1);
      noFill();
      ellipse(0, 0, 18, 18);
      // $ symbol
      noStroke();
      fill(180, 130, 20);
      textAlign(CENTER, CENTER);
      textSize(14);
      text('$', 0, 0);
    }
  }

  collect() {
    this.collected = true;
    world.DestroyBody(this.body);
  }
}
