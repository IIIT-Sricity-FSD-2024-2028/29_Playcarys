var Vec2               = Box2D.Common.Math.b2Vec2;
var b2BodyDef          = Box2D.Dynamics.b2BodyDef;
var b2FixtureDef       = Box2D.Dynamics.b2FixtureDef;
var b2World            = Box2D.Dynamics.b2World;
var b2PolygonShape     = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape      = Box2D.Collision.Shapes.b2CircleShape;
var b2StaticBody       = Box2D.Dynamics.b2Body.b2_staticBody;
var b2DynamicBody      = Box2D.Dynamics.b2Body.b2_dynamicBody;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;
var b2PrismaticJointDef= Box2D.Dynamics.Joints.b2PrismaticJointDef;
var b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
var b2FilterData       = Box2D.Dynamics.b2FilterData;

var SCALE   = 30;
var GRAVITY = 22;

// ── World constants ───────────────────────────────────────────────────────────
//  The track used to be generated from canvas.width/height, so the level itself
//  changed shape with the window size and could not survive a resize. It is now
//  defined in fixed world pixels, which is what makes fullscreen possible: the
//  window only decides how much of the world you can see.
var GROUND_BASE = 470;      // resting height of the terrain, in world px
var TRACK_LEN   = 40000;    // total track length, in world px (~4000m)
var VIEW_REF_H  = 520;      // viewport height the art is authored for

var WHEEL_CATEGORY=0x0001, CHASSIS_CATEGORY=0x0002, GRASS_CATEGORY=0x0004;
var DIRT_CATEGORY=0x0008,  PERSON_CATEGORY=0x0010,  PICKUP_CATEGORY=0x0100;
var WHEEL_MASK=GRASS_CATEGORY|PICKUP_CATEGORY, CHASSIS_MASK=DIRT_CATEGORY|PICKUP_CATEGORY;
var GRASS_MASK=WHEEL_CATEGORY|PERSON_CATEGORY, DIRT_MASK=CHASSIS_CATEGORY, PERSON_MASK=GRASS_CATEGORY;

var world, car, ground;
var camX=0, camY=0;              // world point the camera is centred on
var panX=0, panY=0;              // world coords of the viewport's top-left
var viewW=1000, viewH=500;       // visible world size (px) after zoom
var worldScale=1, viewScale=1;   // window fit  /  final draw scale
var leftDown=false, rightDown=false, reset=false;
var particles=[], clouds=[], birds=[];

// ── Fixed-timestep physics ────────────────────────────────────────────────────
//  Stepping the world once per drawn frame ties the simulation to the monitor:
//  a 144 Hz screen ran the car 2.4x too fast, and any frame drop ran it slow.
//  The accumulator below always advances physics by the same slice of real time.
var PHYS_DT = 1/120, physAcc = 0;

window.carLeftWheelContact=0; window.carRightWheelContact=0;
window.wasAirborne=false; window.screenShake=0; window.zoomFactor=1.0;
window.airTimer=0; window.airBonus=0; window.airBonusTimer=0;
window.flipCount=0; window.lastFlipAngle=0;

var listener = new Box2D.Dynamics.b2ContactListener;
listener.BeginContact = function(contact) {
    var fA=contact.GetFixtureA(), fB=contact.GetFixtureB();
    var bA=fA.GetBody(), bB=fB.GetBody();
    var dA=bA.userData, dB=bB.userData;
    if((dA&&dA.isPickup)||(dB&&dB.isPickup)){
        var p=(dA&&dA.isPickup)?dA.pickupRef:dB.pickupRef;
        if(p&&!p.collected)handlePickup(p);
    }
    if(car&&car.wheels&&car.wheels.length>=2){
        if(bA===car.wheels[0].body||bB===car.wheels[0].body)
            if(!(dA&&dA.isPickup)&&!(dB&&dB.isPickup)){window.carLeftWheelContact++;onLand(bA===car.wheels[0].body?bA:bB);}
        if(bA===car.wheels[1].body||bB===car.wheels[1].body)
            if(!(dA&&dA.isPickup)&&!(dB&&dB.isPickup)){window.carRightWheelContact++;onLand(bA===car.wheels[1].body?bA:bB);}
    }
    if(car&&car.person){
        var hb=car.person.head.body;
        if(bA===hb||bB===hb){var other=(bA===hb)?bB:bA; if(other.GetType()===b2StaticBody){car.headCrashed=true;reset=true;}}
    }
};
listener.EndContact = function(contact) {
    var fA=contact.GetFixtureA(), fB=contact.GetFixtureB();
    var bA=fA.GetBody(), bB=fB.GetBody(), dA=bA.userData, dB=bB.userData;
    if(car&&car.wheels&&car.wheels.length>=2){
        if(bA===car.wheels[0].body||bB===car.wheels[0].body)
            if(!(dA&&dA.isPickup)&&!(dB&&dB.isPickup)) window.carLeftWheelContact=max(0,window.carLeftWheelContact-1);
        if(bA===car.wheels[1].body||bB===car.wheels[1].body)
            if(!(dA&&dA.isPickup)&&!(dB&&dB.isPickup)) window.carRightWheelContact=max(0,window.carRightWheelContact-1);
    }
};

function onLand(wb){
    if(window.wasAirborne){
        var vy=wb.GetLinearVelocity().y;
        if(vy>4){
            window.screenShake=min(vy*0.8,18);
            if(window.airTimer>0.30){
                window.airBonus=floor(window.airTimer*10)*25;
                window.airBonusTimer=90;
                if(car)car.coins+=floor(window.airBonus/25);
            }
            spawnDust(wb.GetPosition().x*SCALE,wb.GetPosition().y*SCALE,vy);
        }
        window.airTimer=0;
    }
}
function handlePickup(p){
    if(p.type==='gas')car.fuel=min(100,car.fuel+50);
    else if(p.type==='diamond')car.diamonds++;
    else car.coins++;
    spawnBurst(p.body.GetPosition().x*SCALE,p.body.GetPosition().y*SCALE,p.type);
    p.collect();
}

// Particles, sky, parallax and the HUD all live in Visuals.js.

// ── Setup ─────────────────────────────────────────────────────────────────────
function setup(){
    window.canvas=createCanvas(windowWidth,windowHeight);
    canvas.parent('canvas');
    frameRate(60);
    computeScale();

    var g=GRAVITY;
    try{var s=(typeof Auth!=='undefined')?Auth.getSession():null;if(s&&s.activeSessionId&&typeof DB!=='undefined'){var sess=DB.sessions.find(function(sx){return String(sx.id)===String(s.activeSessionId);});if(sess&&sess.forkGravity!==undefined)g=sess.forkGravity;}}catch(e){}

    world=new b2World(new Vec2(0,g),true);
    world.SetContactListener(listener);
    ground=new Ground();
    car=new Car(200,spawnY());
    initCam();

    vfxBuild();
    for(var i=0;i<18;i++) clouds.push({x:random(0,12000),y:random(30,290),w:random(150,420),speed:random(0.10,0.42),alpha:random(170,240),v:floor(random(5))});
    for(var b=0;b<6;b++)  birds.push({x:random(0,3000),y:random(70,210),sp:random(0.4,1.0),ph:random(TWO_PI)});
    setupTouch();
}

// Keeps the car the same apparent size whether the window is 700px or 1440p tall.
function computeScale(){
    worldScale = constrain(height / VIEW_REF_H, 0.62, 1.9);
}
function windowResized(){
    resizeCanvas(windowWidth,windowHeight);
    computeScale();
}

function spawnY(){ return GROUND_BASE - 150; }
function initCam(){ camX=200; camY=spawnY(); }

// ── Input ─────────────────────────────────────────────────────────────────────
function setupTouch(){
    var L=document.getElementById('pedal-brake'), R=document.getElementById('pedal-gas');
    if(!L||!R)return;
    function bind(el,isGas){
        var press=function(e){
            e.preventDefault(); el.classList.add('on');
            if(isGas){ rightDown=true;  car&&car.motorOn(true); }
            else     { leftDown=true;   car&&car.motorOn(false); }
        };
        var release=function(e){
            e.preventDefault(); el.classList.remove('on');
            if(isGas){ rightDown=false; leftDown ? car&&car.motorOn(false) : car&&car.motorOff(); }
            else     { leftDown=false;  rightDown? car&&car.motorOn(true)  : car&&car.motorOff(); }
        };
        el.addEventListener('touchstart',press,{passive:false});
        el.addEventListener('touchend',release,{passive:false});
        el.addEventListener('touchcancel',release,{passive:false});
        el.addEventListener('mousedown',press);
        el.addEventListener('mouseup',release);
        el.addEventListener('mouseleave',function(e){ if(el.classList.contains('on')) release(e); });
    }
    bind(L,false); bind(R,true);
}

function toggleFullscreen(){
    var fs = !fullscreen();
    fullscreen(fs);
    var b=document.getElementById('btn-fs');
    if(b) b.textContent = fs ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function draw(){
    // resizeCanvas() forces a redraw, which can land before p5 has set
    // deltaTime for the first time — hence the fallback. Clamped so that a
    // stall (alt-tab, breakpoint) cannot explode the simulation on resume.
    var dt = min((typeof deltaTime === 'number' && deltaTime > 0 ? deltaTime : 16.7)/1000, 0.05);
    stepPhysics(dt);

    var carPos=car.chassisBody.GetPosition();
    var isGrounded=(window.carLeftWheelContact>0||window.carRightWheelContact>0);
    if(!isGrounded)window.airTimer+=dt; else window.airTimer=0;
    window.wasAirborne=!isGrounded;

    // Camera: lead the car slightly, and rise faster than it falls so big
    // launches stay in frame.
    var targetX = carPos.x*SCALE + 90;
    var targetY = carPos.y*SCALE - 40;
    camX += (targetX-camX) * min(1, 6.0*dt);
    camY += (targetY-camY) * min(1, (targetY<camY?4.5:3.0)*dt);

    var spd=car.chassisBody.GetLinearVelocity().Length();
    var tz=constrain(map(spd,0,26,1.0,0.82),0.82,1.0);
    window.zoomFactor+=(tz-window.zoomFactor)*min(1,3.0*dt);

    var ang=car.chassisBody.GetAngle();
    if((ang>PI*0.86||ang<-PI*0.86)&&!reset){car.headCrashed=true;reset=true;}

    if(car.headCrashed&&!car.broken){
        car.broken=true;
        if(car.person&&car.person.headJoint){world.DestroyJoint(car.person.headJoint);car.person.headJoint=null;}
        if(car.distJoint){world.DestroyJoint(car.distJoint);car.distJoint=null;}
        if(car.revJoint){world.DestroyJoint(car.revJoint);car.revJoint=null;}
        if(typeof DB!=='undefined'&&DB.pushTelemetry)DB.pushTelemetry(8,'death_crash',{x:Math.floor(carPos.x*SCALE)});
    }

    if(typeof DB!=='undefined'&&frameCount%60===0&&DB.consumeLiveEvent){
        if(DB.consumeLiveEvent(8,'low_gravity')){world.SetGravity(new Vec2(0,5));setTimeout(function(){world.SetGravity(new Vec2(0,GRAVITY));},8000);if(typeof Toast!=='undefined')Toast.info('✨ Low Gravity!');}
        if(DB.consumeLiveEvent(8,'heavy_gravity')){world.SetGravity(new Vec2(0,50));setTimeout(function(){world.SetGravity(new Vec2(0,GRAVITY));},8000);if(typeof Toast!=='undefined')Toast.warning('🧱 Heavy Gravity!');}
    }

    // ── View transform ───────────────────────────────────────────
    viewScale = worldScale * window.zoomFactor;
    viewW = width  / viewScale;
    viewH = height / viewScale;
    panX  = camX - viewW/2;
    panY  = camY - viewH/2;

    drawSky();
    drawParallax();

    push();
    if(window.screenShake>0){
        translate(random(-window.screenShake,window.screenShake),random(-window.screenShake*0.4,window.screenShake*0.4));
        window.screenShake*=0.88;
        if(window.screenShake<0.3)window.screenShake=0;
    }
    scale(viewScale);
    ground.show();
    tickParticles();
    car.show();
    pop();

    car.update(dt);

    drawHUD();
    if(window.airBonusTimer>0){drawAirBonus();window.airBonusTimer--;}
    if(reset){if(!window.sessionFinalized){finalizeSession();window.sessionFinalized=true;}drawGameOver();}
}

function stepPhysics(dt){
    physAcc += dt;
    var guard = 0;
    while(physAcc >= PHYS_DT && guard < 8){
        world.Step(PHYS_DT, 8, 6);
        world.ClearForces();
        physAcc -= PHYS_DT;
        guard++;
    }
    if(guard >= 8) physAcc = 0;   // we fell too far behind — drop the backlog
}

// ── Background ────────────────────────────────────────────────────────────────
// The sky never changes, but painting 40 full-width bands plus the sun halo
// every frame is pure fill-rate — at 1440p it was the single most expensive
// thing on screen. Render it once into a buffer and blit that instead.
var skyBuf = null;
function buildSky(){
    skyBuf = createGraphics(width, height);
    skyBuf.noStroke();
    var bands = 60, bh = height/bands;
    for(var i=0;i<bands;i++){
        var t=i/bands;
        skyBuf.fill(lerp(72,186,t), lerp(150,224,t), lerp(226,238,t));
        skyBuf.rect(0, i*bh, width, bh+1);
    }
    var sx=width*0.18, sy=height*0.14;
    for(var g=6;g>0;g--){ skyBuf.fill(255,246,190, 9*g*0.9); skyBuf.ellipse(sx,sy, 90+g*46, 90+g*46); }
    skyBuf.fill(255,250,214); skyBuf.ellipse(sx,sy,84,84);
}
function drawSky(){
    if(!skyBuf || skyBuf.width!==width || skyBuf.height!==height) buildSky();
    image(skyBuf, 0, 0);
    drawBirds();
}

function drawBirds(){
    stroke(60,72,90,150); strokeWeight(2); noFill();
    for(var i=0;i<birds.length;i++){
        var b=birds[i];
        b.x += b.sp;
        var bx = (b.x - camX*0.03) % (width+180); if(bx < -90) bx += width+180;
        var flap = sin(frameCount*0.14 + b.ph)*4;
        arc(bx-7, b.y, 15, 10+flap, PI, TWO_PI);
        arc(bx+7, b.y, 15, 10+flap, PI, TWO_PI);
    }
    noStroke();
}

function drawParallax(){
    // Background layers are painted in screen space, but they must still be
    // anchored to the WORLD or they slide around as the camera climbs and end
    // up cutting through the hills. Each layer gets a share of the camera's
    // vertical offset from the terrain baseline — the further away the layer,
    // the less it moves.
    var horizon = height*0.72 - (camY - GROUND_BASE) * 0.35;

    drawRidge(camX*0.05, horizon - height*0.10, color(126,158,190,150), 0.0055, 150, false, 0.20);
    drawRidge(camX*0.11, horizon - height*0.03, color( 88,124,156,200), 0.0085, 110, true,  0.28);
    drawRidge(camX*0.20, horizon + height*0.04, color( 52, 92,104,235), 0.0130,  72, false, 0.34);
    drawTrees(camX*0.34, horizon + height*0.075);
    drawClouds();
}

function drawRidge(offset, baseY, col, freq, amp, snow, lightMix){
    noStroke();
    var pts=[];
    fill(col);
    beginShape();
    vertex(-10, height);
    for(var x=-10;x<=width+20;x+=10){
        var h = noise((x+offset)*freq)*amp + noise((x+offset)*freq*3.1)*amp*0.35;
        var y = baseY - h;
        pts.push([x,y]);
        vertex(x,y);
    }
    vertex(width+20, height);
    endShape(CLOSE);

    // Sunlit face along the top edge gives the ridge some form instead of
    // reading as one flat silhouette.
    stroke(255,255,255, 40 + lightMix*70); strokeWeight(2.5); noFill();
    beginShape();
    for(var i=0;i<pts.length;i++) vertex(pts[i][0], pts[i][1]);
    endShape();
    noStroke();

    if(snow){
        fill(246,250,255,225);
        for(var i=2;i<pts.length-2;i++){
            var p=pts[i];
            // Only cap genuine local peaks that are high on the ridge.
            if(p[1] < baseY-amp*0.72 && p[1] <= pts[i-1][1] && p[1] <= pts[i+1][1]
               && p[1] < pts[i-2][1] && p[1] < pts[i+2][1]){
                beginShape();
                vertex(p[0]-16, p[1]+19);
                vertex(p[0]-5,  p[1]+5);
                vertex(p[0],    p[1]-1);
                vertex(p[0]+6,  p[1]+7);
                vertex(p[0]+16, p[1]+19);
                endShape(CLOSE);
            }
        }
    }
}

function drawTrees(offset, baseY){
    noStroke();
    for(var x=-30;x<width+50;x+=15){
        var nx=(x+offset*0.55)%12000;
        var th=26+noise(nx*0.013)*40;
        var tw=th*0.50;
        var shade = 24 + noise(nx*0.05)*20;
        // Trunk
        fill(52,38,26,210);
        rect(x-1.5, baseY+th*0.30, 3, th*0.18);
        // Two-tier canopy
        fill(18,shade+38,28,225);
        triangle(x,baseY-th*0.16, x-tw*0.52,baseY+th*0.34, x+tw*0.52,baseY+th*0.34);
        fill(26,shade+54,36,225);
        triangle(x,baseY-th*0.48, x-tw*0.40,baseY+th*0.02, x+tw*0.40,baseY+th*0.02);
        // Sun side
        fill(52,shade+82,54,150);
        triangle(x,baseY-th*0.48, x-tw*0.16,baseY+th*0.02, x,baseY+th*0.02);
    }
}

function drawClouds(){
    noStroke();
    for(var i=0;i<clouds.length;i++){
        var c=clouds[i];
        var cx=((c.x-camX*0.06)%(width+c.w+60));
        if(cx<-c.w-30)cx+=width+c.w*2+60;
        fill(255,c.alpha*0.55); ellipse(cx,c.y+7,c.w*1.02,c.w*0.40);
        fill(255,c.alpha);
        ellipse(cx,c.y,c.w,c.w*0.46);
        ellipse(cx-c.w*0.28,c.y+5,c.w*0.60,c.w*0.36);
        ellipse(cx+c.w*0.28,c.y+5,c.w*0.64,c.w*0.34);
        c.x+=c.speed;
    }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD(){
    push();
    var u  = constrain(height/720, 0.85, 1.5);   // HUD scales with the window
    var pad= 22*u;
    var top= 46*u;

    // White HUD text over a white cloud is unreadable — give everything a soft
    // dark drop shadow so it stays legible against any part of the sky.
    drawingContext.shadowBlur = 6;
    drawingContext.shadowColor = 'rgba(0,0,0,0.75)';
    drawingContext.shadowOffsetY = 1;

    // Fuel
    var bX=pad+40*u, bY=top, bW=210*u, bH=19*u;
    fill(220,38,38); noStroke();
    rect(pad, top-10*u, 23*u, 29*u, 3*u);
    fill(40); rect(pad+2*u, top-16*u, 15*u, 8*u, 2*u);
    fill(255,90); textAlign(CENTER,CENTER); textSize(7*u); text('GAS', pad+11*u, top+4*u);

    fill(16,20,30,205); stroke(255,30); strokeWeight(1); rect(bX,bY,bW,bH,5*u); noStroke();
    var fr=car.fuel/100;
    fill(car.fuel<25?color(239,68,68):car.fuel<50?color(250,180,0):color(60,215,90));
    rect(bX,bY,bW*fr,bH,5*u);
    fill(255,40); rect(bX,bY,bW*fr,bH*0.44,5*u,5*u,0,0);
    if(car.fuel<25){ fill(255,90,90, 120+sin(frameCount*0.25)*100); textAlign(LEFT,CENTER); textSize(11*u); textStyle(BOLD); text('LOW FUEL', bX+bW+10*u, bY+bH/2); }

    textStyle(BOLD); textAlign(LEFT,TOP);
    fill(251,191,36); textSize(17*u); text('🪙 '+car.coins,  pad, top+34*u);
    fill(96,165,250);              text('💎 '+car.diamonds, pad, top+62*u);
    fill(255);                     text('🛣 '+car.distance+'m', pad, top+90*u);

    // Speed + air time
    // No emoji in this one: p5 mis-measures its advance width, so a
    // right-aligned string containing one overhangs the edge of the canvas.
    var sp=floor(car.chassisBody.GetLinearVelocity().Length()*4.2);
    textAlign(RIGHT,TOP); textStyle(NORMAL); fill(255,225); textSize(14*u);
    text(sp+' km/h', width-pad, top+34*u);
    if(window.airTimer>0.35){
        fill(255,220,80); textStyle(BOLD); textSize(15*u);
        text('AIR '+nf(window.airTimer,1,1)+'s', width-pad, top+58*u);
    }
    drawingContext.shadowBlur = 0;
    drawingContext.shadowOffsetY = 0;
    pop();
}

function drawAirBonus(){
    push();
    var u=constrain(height/720,0.85,1.5);
    var a=window.airBonusTimer>20?255:map(window.airBonusTimer,0,20,0,255);
    fill(255,220,50,a); textAlign(CENTER,CENTER); textStyle(BOLD);
    textSize(34*u); text('AIR TIME', width/2, height*0.32);
    textSize(42*u); text('+'+window.airBonus, width/2, height*0.32+46*u);
    pop();
}

function drawGameOver(){
    if(!window.highlightSaved){
        window.highlightSaved=true;
        try{
            if(typeof DB!=='undefined'&&window.canvas){
                var uid=Auth.getSession()&&Auth.getSession().userId;
                if(uid){
                    var prof=DB.player_profiles.find(function(p){return String(p.user_id)===String(uid);});
                    if(prof){
                        var best=prof.best_hill_distance||0;
                        if(car.distance>best){
                            prof.best_hill_distance=car.distance;
                            var fd2=window.canvas.elt.toDataURL('image/webp',0.5);
                            if(!DB.highlights)DB.highlights=[];
                            DB.highlights=DB.highlights.filter(function(h){return!(String(h.userId)===String(uid)&&String(h.gameId)==='8');});
                            DB.highlights.unshift({userId:uid,gameId:8,time:new Date().toISOString(),img:fd2,distance:car.distance});
                            if(DB.highlights.length>20)DB.highlights.pop();
                            DB.save();
                            if(typeof Toast!=='undefined')Toast.success('🚀 NEW RECORD! '+car.distance+'m');
                        } else {
                            if(typeof Toast!=='undefined')Toast.info('Good run. PB remains '+best+'m.');
                        }
                    }
                }
            }
        } catch(e){ console.warn('Highlight save failed',e); }
    }

    var u=constrain(height/720,0.85,1.5);
    push();
    fill(4,6,10,215); noStroke(); rectMode(CORNER); rect(0,0,width,height);
    rectMode(CENTER);
    var bX=width/2, bY=height/2, bW=490*u, bH=350*u;
    drawingContext.shadowBlur=60; drawingContext.shadowColor=car.isFuelOut?'rgba(239,68,68,0.4)':'rgba(234,179,8,0.4)';
    fill(13,17,28,255); stroke(255,255,255,18); strokeWeight(1); rect(bX,bY,bW,bH,24*u);
    drawingContext.shadowBlur=0; noStroke();
    textAlign(CENTER,CENTER); textStyle(BOLD); textSize(48*u);
    fill(car.isFuelOut?color(239,68,68):color(234,179,8));
    text(car.isFuelOut?'OUT OF FUEL':'CRASHED',bX,bY-112*u);

    var score = floor(car.distance * 2 + car.coins * 10 + car.diamonds * 100);
    var pcpEarned = min(30, floor(score / 50));
    textStyle(NORMAL); textSize(15*u); fill(148,163,184); textAlign(RIGHT,CENTER);
    text('DISTANCE DRIVEN',bX-20*u,bY-24*u); text('COINS COLLECTED',bX-20*u,bY+16*u); text('DIAMONDS FOUND',bX-20*u,bY+56*u);
    textAlign(LEFT,CENTER); textSize(17*u); textStyle(BOLD);
    fill(248,250,252); text(car.distance+'m',bX+20*u,bY-24*u);
    fill(250,204,21);  text(''+car.coins,bX+20*u,bY+16*u);
    fill(56,189,248);  text(''+car.diamonds,bX+20*u,bY+56*u);
    stroke(255,255,255,18); strokeWeight(1); line(bX-172*u,bY+96*u,bX+172*u,bY+96*u); noStroke();
    fill(248,250,252); textSize(18*u); textAlign(CENTER,CENTER); textStyle(BOLD); text('SCORE: '+score,bX,bY+110*u);
    fill(74,222,128); textSize(22*u); text('+'+pcpEarned+' PCP EARNED',bX,bY+138*u);
    if(frameCount%60<30){fill(148,163,184);textSize(13*u);textStyle(NORMAL);text('PRESS  [SPACE]  TO RESTART',bX,bY+174*u);}
    pop();
}

function finalizeSession(){
    var score = floor(car.distance * 2 + car.coins * 10 + car.diamonds * 100);
    if(typeof Auth==='undefined')return;var auth=Auth.getSession();if(!auth||!auth.userId)return;
    var uid=auth.userId,now=new Date().toISOString();

    var sid=null;
    try{var params=new URLSearchParams(window.location.search);sid=params.get('sid');}catch(e){}

    if(!sid){
        sid=String(Date.now()%9999999);
        DB.sessions.push({session_id:sid,game_id:8,created_by:uid,name:'Hill Climb — '+car.distance+'m',game:'Hill Climbing',host:auth.username||'Player',hostId:uid,maxPlayers:1,status:'completed',mode:'casual',start_time:now,end_time:now,duration:Math.round(frameCount/60/60)||1,createdAt:now});
    } else {
        var sess=DB.sessions.find(function(s){return String(s.session_id)===String(sid);});
        if(sess){sess.status='completed';sess.end_time=now;sess.duration=Math.round(frameCount/60/60)||1;}
    }

    var pcpEarned = min(30, floor(score / 50));
    var xpEarned  = floor(car.distance / 10);

    if (DB.recordMatchResult) {
        DB.recordMatchResult(sid, uid, 8, 'win', score, {
            distance: car.distance,
            coins: car.coins,
            diamonds: car.diamonds,
            game_score: score,
            carys_earned: pcpEarned,
            xp_gained: xpEarned,
            elo_delta: 0
        });
        if(typeof Toast!=='undefined')Toast.success('Saved! +'+pcpEarned+' PCP');
    }

    DB.save();

    try {
        var tParams=new URLSearchParams(window.location.search);
        var tournId=tParams.get('tournamentId');
        if(tournId){
            var existing=(DB.match_results||[]).find(function(r){
                return String(r.game_id)==='8'&&String(r.player_id)===String(uid)&&String(r.tournament_id)===String(tournId);
            });
            if(!existing||car.distance>(existing.distance||0)){
                DB.match_results=DB.match_results.filter(function(r){
                    return!(String(r.game_id)==='8'&&String(r.player_id)===String(uid)&&String(r.tournament_id)===String(tournId));
                });
                DB.match_results.unshift({session_id:sid,player_id:uid,game_id:8,score:pcpEarned,game_score:score,player_rank:1,joined_at:now,result:'win',distance:car.distance,coins:car.coins,diamonds:car.diamonds,tournament_id:parseInt(tournId,10)});
                DB.save();
                if(typeof Toast!=='undefined')Toast.success('🏔️ Tournament best: '+car.distance+'m saved!');
            } else {
                if(typeof Toast!=='undefined')Toast.info('Your tournament best is still '+existing.distance+'m. Keep going!');
            }
        }
    } catch(e){ console.warn('Tournament distance save failed',e); }
}

function resetCar(){
    world.DestroyBody(car.chassisBody);
    world.DestroyBody(car.wheels[0].body);world.DestroyBody(car.wheels[0].rimBody);
    world.DestroyBody(car.wheels[1].body);world.DestroyBody(car.wheels[1].rimBody);
    if(car.person){world.DestroyBody(car.person.torso.body);world.DestroyBody(car.person.head.body);}
    particles=[];car=new Car(200,spawnY());reset=false;
    window.sessionFinalized=false;window.highlightSaved=false;
    window.screenShake=0;window.zoomFactor=1.0;window.airTimer=0;
    window.carLeftWheelContact=0;window.carRightWheelContact=0;window.wasAirborne=false;
    physAcc=0;
    initCam();
}

function keyPressed(){
    if(reset&&keyCode===32){resetCar();return;}
    if(keyCode===RIGHT_ARROW||key==='d'||key==='D'){rightDown=true;car.motorOn(true);}
    if(keyCode===LEFT_ARROW ||key==='a'||key==='A'){leftDown=true; car.motorOn(false);}
    if(key==='f'||key==='F') toggleFullscreen();
}
function keyReleased(){
    if(keyCode===RIGHT_ARROW||key==='d'||key==='D'){rightDown=false;leftDown?car.motorOn(false):car.motorOff();}
    if(keyCode===LEFT_ARROW ||key==='a'||key==='A'){leftDown=false;rightDown?car.motorOn(true):car.motorOff();}
}
function mousePressed(){}
