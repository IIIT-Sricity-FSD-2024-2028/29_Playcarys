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
var TRACK_LEN   = 100000;   // total track length, in world px (10 world px = 1 m)
var VIEW_REF_H  = 520;      // viewport height the art is authored for

// ── Levels ────────────────────────────────────────────────────────────────────
// The track is one continuous 10 km run divided into 20 named stages. There is
// no loading break between them: crossing a boundary just means the generator
// has been asked for harder terrain from that point on, so the difficulty curve
// is something you drive into rather than something you select from a menu.
var LEVEL_LEN_M  = 500;     // metres per level
var LEVEL_COUNT  = 20;      // 20 x 500m = 10 000 m
function levelAt(metres){ return min(LEVEL_COUNT, floor(metres / LEVEL_LEN_M) + 1); }

var WHEEL_CATEGORY=0x0001, CHASSIS_CATEGORY=0x0002, GRASS_CATEGORY=0x0004;
var DIRT_CATEGORY=0x0008,  PERSON_CATEGORY=0x0010,  PICKUP_CATEGORY=0x0100;
var WHEEL_MASK=GRASS_CATEGORY|PICKUP_CATEGORY, CHASSIS_MASK=DIRT_CATEGORY|PICKUP_CATEGORY;
var GRASS_MASK=WHEEL_CATEGORY|PERSON_CATEGORY, DIRT_MASK=CHASSIS_CATEGORY, PERSON_MASK=GRASS_CATEGORY;

var world, car, ground;
var CURRENT_VEHICLE = 'truck';
window.paused = true;            // held until a vehicle is picked
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
window.curLevel=0; window.levelBannerTimer=0; window.levelBannerNum=1;
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
    // Head strike ends the run outright — the genre's signature fail state.
    // This was always wired up; it simply never fired, because the vehicle could
    // not be made to tip far enough to put the rider's head on the ground.
    if(car&&car.person){
        var hb=car.person.head.body;
        if(bA===hb||bB===hb){
            var other=(bA===hb)?bB:bA;
            if(other.GetType()===b2StaticBody){
                car.headCrashed=true; car.deathCause='neck'; reset=true;
            }
        }
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
    // ── Render resolution ─────────────────────────────────────────
    // p5 defaults the canvas backing store to the display's device pixel ratio.
    // On a 2x laptop panel at 1920x1080 CSS that is an 8.3-megapixel canvas
    // repainted from scratch every frame — sky blit, four parallax layers with
    // clipped gradient fills, the soil pattern, the turf — and it is the single
    // largest reason this ran below 60. Nothing here is text-critical enough to
    // justify quadrupling the fill cost, so the ratio is capped by window area:
    // small windows keep some crispness, big ones get the frames instead.
    window.canvas=createCanvas(windowWidth,windowHeight);
    canvas.parent('canvas');
    // After createCanvas, never before: p5's pixelDensity() resizes the current
    // canvas as a side effect, and before one exists that resize targets a 0x0
    // surface.
    applyPixelDensity();
    frameRate(60);
    computeScale();

    var g=GRAVITY;
    try{var s=(typeof Auth!=='undefined')?Auth.getSession():null;if(s&&s.activeSessionId&&typeof DB!=='undefined'){var sess=DB.sessions.find(function(sx){return String(sx.id)===String(s.activeSessionId);});if(sess&&sess.forkGravity!==undefined)g=sess.forkGravity;}}catch(e){}

    // Pull the player's wallet from the platform, once, at boot.
    //
    // Async on purpose: it must not hold up setup(). Wallet.load() serves this
    // browser's mirror until the answer lands, so a run that starts in the first
    // few hundred milliseconds still sees a sensible balance — and the moment it
    // lands, coins earned on another laptop are there.
    try {
        var _s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
        if (_s && _s.userId != null && typeof Wallet !== 'undefined' && Wallet.hydrate) {
            Wallet.hydrate(_s.userId);
        }
    } catch (e) { /* signed out: play anyway, nothing to sync */ }

    world=new b2World(new Vec2(0,g),true);
    world.SetContactListener(listener);
    ground=new Ground();
    try{ CURRENT_VEHICLE = localStorage.getItem('hc_vehicle') || 'truck'; }catch(e){}
    if(!VEHICLES[CURRENT_VEHICLE]) CURRENT_VEHICLE='truck';
    car=new Car(200,spawnY(CURRENT_VEHICLE),CURRENT_VEHICLE);
    initCam();

    vfxBuild();
    // Fewer, more spread out and less opaque than a naive fill: a dense band of
    // bright white across the top reads as one solid mass, not as weather.
    for(var i=0;i<11;i++) clouds.push({x:random(0,14000),y:random(40,420),w:random(170,430),speed:random(0.08,0.34),alpha:random(105,190),v:floor(random(5))});
    for(var b=0;b<6;b++)  birds.push({x:random(0,3000),y:random(70,210),sp:random(0.4,1.0),ph:random(TWO_PI)});
    setupTouch();
}

function applyPixelDensity(){
    var area = windowWidth * windowHeight;
    var dpr  = (typeof displayDensity === 'function') ? displayDensity() : 1;
    pixelDensity(area > 1400000 ? 1 : min(dpr, 1.5));
}

// Keeps the car the same apparent size whether the window is 700px or 1440p tall.
function computeScale(){
    worldScale = constrain(height / VIEW_REF_H, 0.62, 1.9);
}
function windowResized(){
    applyPixelDensity();
    resizeCanvas(windowWidth,windowHeight);
    computeScale();
}

// Drop the vehicle onto the start line from 12px up, not from 85-110px up.
// The old fixed height was measured to the chassis centre, so how far each
// vehicle actually fell depended on its own dimensions — and the landing
// impulse from that drop, arriving at the same moment as full throttle, was on
// its own enough to loop the truck over backwards before it had moved a metre.
function spawnY(type){
    var S = VEHICLES[type] || VEHICLES.truck;
    return GROUND_BASE - 12 - (S.H/2 + S.wheel*0.62 + S.wheel);
}
function initCam(){ camX=200; camY=spawnY(CURRENT_VEHICLE); }

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

// Called by the garage overlay in index.html.
function selectVehicle(type){
    if(!VEHICLES[type]) type='truck';
    CURRENT_VEHICLE = type;
    try{ localStorage.setItem('hc_vehicle', type); }catch(e){}
    resetCar();
    window.paused = false;
    var g=document.getElementById('garage');
    if(g){ g.classList.add('gone'); setTimeout(function(){ g.style.display='none'; }, 320); }
    var b=document.getElementById('btn-garage');
    if(b) b.textContent = '🏍 ' + VEHICLES[type].label;
}

// Back to the garage without reloading the page.
function openGarage(){
    window.paused = true;
    var g=document.getElementById('garage');
    if(g){ g.classList.remove('gone'); g.style.display='flex'; }
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

    // While the garage overlay is up the world still draws — the player is
    // looking at the start line — but nothing moves and no fuel burns.
    if(window.paused){
        viewScale = worldScale * window.zoomFactor;
        viewW = width/viewScale; viewH = height/viewScale;
        panX = camX - viewW/2;   panY = camY - viewH/2;
        drawSky(); drawParallax();
        push(); scale(viewScale); ground.show(); car.show(); pop();
        return;
    }

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

    // Rollover backstop, for the case where the vehicle comes to rest inverted
    // without the helmet ever touching down.
    //
    // A single angle threshold is not enough on its own, whatever you set it to.
    // At 0.72π (130°) the truck would loop over, come to rest on its back at
    // about 112°, and just sit there with the engine running and the rear wheel
    // spinning until the tank ran dry 80 seconds later — a run that was over
    // long before the game admitted it. So there are two rules now: past ~100°
    // you are given half a second to come back down, and past 145° you are gone
    // immediately, because nothing recovers from there.
    // FLIPS ARE ALLOWED. The rule is the genre's rule: you die when the rider's
    // HEAD hits the ground (handled by the contact listener above). Rotation on
    // its own is a trick, not a crash.
    //
    // The previous version killed you outright past 145° of tilt, which made a
    // flip impossible by definition — every flip passes through 145° on its way
    // round. It also compared raw GetAngle(), which ACCUMULATES: after one
    // complete rotation the value is past 2*PI and the vehicle counted as
    // permanently inverted forever after.
    //
    // What remains is a stuck-detector, deliberately narrow: inverted AND not
    // turning AND not moving, for a full second.
    //
    // "Not turning" is measured from the OBSERVED CHANGE IN ANGLE, not from
    // GetAngularVelocity(). That distinction is the whole fix. A body jammed
    // against the terrain by its wheel motor and suspension carries a permanent
    // nonzero angular velocity which the contact constraint cancels
    // positionally — measured on a bike wedged inverted at ~3100m, the solver
    // reported a steady 1.21 rad/s (peaking at 1.41) while the angle sat frozen
    // at -134.9 degrees for 1900 consecutive frames. Reading the velocity
    // therefore called it "spinning" forever, reset the timer every frame, and
    // the run hung until the tank ran dry 43 seconds later. The angle delta says
    // what the velocity cannot: nothing is actually rotating.
    var angRaw = car.chassisBody.GetAngle();
    var ang = angRaw % TWO_PI;
    if (ang >  PI) ang -= TWO_PI;
    if (ang < -PI) ang += TWO_PI;
    if(!reset){
        if(car.prevAng === undefined) car.prevAng = ang;
        var dA = ang - car.prevAng;              // wrapped, so a flip's seam is not a spike
        if (dA >  PI) dA -= TWO_PI;
        if (dA < -PI) dA += TWO_PI;
        car.prevAng = ang;

        var turning = abs(dA) / max(dt, 1e-4) > 0.6;
        var moving  = car.chassisBody.GetLinearVelocity().Length() > 1.2;
        var inverted = (ang > PI*0.62 || ang < -PI*0.62);

        // Decay rather than zero, so a wreck that rocks or jitters still
        // accumulates. A flip leaves the inverted band in a fraction of a
        // second, so it can never bank enough to matter — every measured flip
        // changed angle at 2.8-8.5 rad/s, far above the gate.
        if(inverted && !turning && !moving) car.rollTimer += dt;
        else car.rollTimer = max(0, car.rollTimer - dt*2);

        if(car.rollTimer>1.0){
            car.headCrashed=true; car.deathCause='rollover'; reset=true;
        }
    }

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

    // Level crossing. car.distance only ever increases, so this fires once.
    var lv=levelAt(car.distance);
    if(lv!==window.curLevel){
        if(window.curLevel){ window.levelBannerNum=lv; window.levelBannerTimer=130; }
        window.curLevel=lv;
    }

    drawHUD();
    if(window.levelBannerTimer>0){drawLevelBanner();window.levelBannerTimer--;}
    if(window.airBonusTimer>0){drawAirBonus();window.airBonusTimer--;}
    // The end-of-run path must never be able to kill the render loop.
    //
    // p5 calls draw() and only THEN requests the next animation frame, so a
    // single uncaught error in here stops the game permanently — the last
    // frame stays on screen and no game-over card is ever drawn. That is
    // exactly what a missing Wallet module used to cause: the run ended, the
    // helmet hit the ground, and the game froze mid-scene.
    //
    // The flag is also set BEFORE the call rather than after it, so a failure
    // cannot retry the same save on every subsequent frame.
    if(reset){
        if(!window.sessionFinalized){
            window.sessionFinalized=true;
            try{ finalizeSession(); }
            catch(e){ window.runSaved=false; console.error('[HillClimb] Run could not be saved:',e); }
        }
        try{ drawGameOver(); }
        catch(e){
            if(!window.gameOverDrawFailed){
                window.gameOverDrawFailed=true;
                console.error('[HillClimb] Game-over screen failed to draw:',e);
            }
        }
    }
}

function stepPhysics(dt){
    // Bring the terrain around the vehicle to life before stepping, never
    // during. camX/viewW are a frame stale here, which the margin absorbs.
    var margin = 1100;
    ground.syncPhysics(camX - viewW/2 - margin, camX + viewW/2 + margin);

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
    var _rw       = runReward();
    var score     = _rw.score;
    var pcpEarned = _rw.pcp;
    // How you died beats what your tank was doing. Crashing on the last drop of
    // fuel is a crash, and used to be reported as OUT OF FUEL.
    var cause     = car.deathCause || (car.isFuelOut ? 'fuel' : 'rollover');
    var headline  = cause==='neck' ? 'NECK BROKEN'
                  : cause==='fuel' ? 'OUT OF FUEL'
                  :                  'WIPED OUT';
    var accent    = cause==='fuel' ? [250,190,32] : [239,68,68];

    push();
    // Dim + desaturate the frozen scene behind the card.
    noStroke(); rectMode(CORNER);
    fill(4,7,14,222); rect(0,0,width,height);

    rectMode(CENTER);
    textAlign(CENTER,CENTER);
    var bX=width/2, bY=height/2, bW=520*u, bH=384*u;

    // Card
    drawingContext.save();
    drawingContext.shadowBlur=70;
    drawingContext.shadowColor='rgba('+accent[0]+','+accent[1]+','+accent[2]+',0.32)';
    fill(14,19,31); stroke(255,255,255,20); strokeWeight(1); rect(bX,bY,bW,bH,26*u);
    drawingContext.restore();
    noStroke();

    // Accent bar across the top of the card
    drawingContext.save();
    drawingContext.shadowBlur=22*u;
    drawingContext.shadowColor='rgba('+accent[0]+','+accent[1]+','+accent[2]+',0.9)';
    fill(accent[0],accent[1],accent[2]); rect(bX, bY-bH/2+3*u, bW*0.30, 4*u, 2*u);
    drawingContext.restore();

    // Title
    textFont(vfx.fontTitle); textSize(44*u);
    drawingContext.save();
    drawingContext.shadowBlur=24*u;
    drawingContext.shadowColor='rgba('+accent[0]+','+accent[1]+','+accent[2]+',0.55)';
    fill(accent[0],accent[1],accent[2]);
    text(headline,bX,bY-124*u);
    drawingContext.restore();

    // Stat rows
    textFont(vfx.fontHUD);
    var rows=[['DISTANCE DRIVEN', car.distance+'m',   [248,250,252], vfxIconFlag],
              ['COINS COLLECTED', ''+car.coins,       [252,202, 60], vfxIconCoin],
              ['DIAMONDS FOUND',  ''+car.diamonds,    [126,196,255], vfxIconDiamond]];
    for(var i=0;i<rows.length;i++){
        var ry=bY-56*u+i*40*u;
        fill(255,255,255,10); rect(bX, ry, bW-70*u, 32*u, 8*u);
        rows[i][3](bX-bW/2+52*u, ry, 20*u);
        textStyle(NORMAL); textSize(14*u); fill(140,156,178); textAlign(LEFT,CENTER);
        text(rows[i][0], bX-bW/2+72*u, ry+1);
        textStyle(BOLD); textSize(19*u); textAlign(RIGHT,CENTER);
        fill(rows[i][2][0],rows[i][2][1],rows[i][2][2]);
        text(rows[i][1], bX+bW/2-52*u, ry+1);
    }

    textAlign(CENTER,CENTER);
    stroke(255,255,255,16); strokeWeight(1);
    line(bX-bW/2+40*u,bY+86*u,bX+bW/2-40*u,bY+86*u); noStroke();

    textFont(vfx.fontTitle); textSize(24*u); fill(248,250,252);
    text('SCORE  '+score,bX,bY+112*u);

    // Report what ACTUALLY happened. Announcing "+N PCP EARNED" after a run that
    // was never written to the database is how a save bug stays invisible.
    drawingContext.save();
    if(window.runSaved){
        drawingContext.shadowBlur=16*u; drawingContext.shadowColor='rgba(74,222,128,0.7)';
        textFont(vfx.fontHUD); textStyle(BOLD); textSize(20*u); fill(74,222,128);
        text('+'+pcpEarned+' PCP EARNED',bX,bY+144*u);
    } else {
        drawingContext.shadowBlur=16*u; drawingContext.shadowColor='rgba(250,190,32,0.6)';
        textFont(vfx.fontHUD); textStyle(BOLD); textSize(17*u); fill(250,190,32);
        text('NOT SAVED — SIGN IN TO RECORD RUNS',bX,bY+144*u);
    }
    drawingContext.restore();

    if(frameCount%60<34){
        textStyle(NORMAL); textSize(13*u); fill(150,166,186);
        text('PRESS  [ SPACE ]  OR  TAP  TO RESTART',bX,bY+178*u);
    }
    pop();
}

// ── Run reward ───────────────────────────────────────────────────────────────
// ONE definition, used by both the results card and the save path. It was
// previously written out twice, which is how a scoring rule quietly drifts
// between what the player is shown and what the database records.
//
// The old rule was `min(30, floor(score / 50))`. That cap binds at a score of
// 1500 — which is a thoroughly ordinary run — so a 1936m monster and a 300m
// fumble both paid exactly 30 PCP, and the number on the results card was
// effectively a constant. Distance stopped mattering the moment you got good.
//
// The curve below is score^0.75, so reward always rises with performance but
// with diminishing returns, and a great run cannot pay 50x a mediocre one:
//
//     score   150   600   1500   4000   7950   20000
//     PCP       4     9     17     40     70     140
//
// The cap is a sanity bound against absurd outliers, not a balance lever — at
// 400 PCP it sits far beyond any realistic run.
function runReward(){
    var score = floor(car.distance * 2 + car.coins * 10 + car.diamonds * 100);
    var pcp   = min(400, floor(pow(score, 0.75) / 12));
    var xp    = floor(car.distance / 10) + car.coins + car.diamonds * 5;
    return { score: score, pcp: pcp, xp: xp };
}

function finalizeSession(){
    var score = runReward().score;

    // NOT LOGGED IN = NOTHING IS RECORDED.
    //
    // This used to be a silent `return`, and it is the whole reason finished
    // runs never turned up in Match History: the game page has no auth gate, so
    // it is perfectly possible to play a full run signed out, and when you did,
    // the results card still announced "+30 PCP EARNED" while the run was
    // thrown away. The scoreboard said saved, the database disagreed, and there
    // was no way to tell from inside the game.
    //
    // The flag is read by drawGameOver(), which now tells the truth.
    window.runSaved = false;
    if(typeof Auth==='undefined'){ console.warn('[HillClimb] Auth unavailable — run not saved.'); return; }
    var auth=Auth.getSession();
    if(!auth||!auth.userId){ console.warn('[HillClimb] Not signed in — run not saved.'); return; }
    var uid=auth.userId,now=new Date().toISOString();

    var sid=null;
    try{var params=new URLSearchParams(window.location.search);sid=params.get('sid');}catch(e){}

    // A run of Hill Climbing is a MATCH, not a session. One player, no lobby,
    // nobody else involved — there was never anything for a room to do here,
    // and the platform announcing "session completed" afterwards described
    // machinery that had nothing to do with the run.
    //
    // Two cases: launched from the catalogue (sid already exists, finish it) or
    // opened directly (no sid, so the run creates its own match record).
    var runSecs = Math.round(frameCount/60/60)||1;
    if(!sid){
        sid = DB.startMatch(8, { created_by: uid });
    }
    DB.endMatch(sid, { end_time: now, duration: runSecs });

    var _rw       = runReward();
    var pcpEarned = _rw.pcp;
    var xpEarned  = _rw.xp;

    // Coins and diamonds are THIS GAME'S currency and stay in this game's wallet.
    // Only the match result and the platform reward go to the website.
    Wallet.deposit(uid, car.coins, car.diamonds, car.distance, score);

    if (DB.recordMatchResult) {
        DB.recordMatchResult(sid, uid, 8, 'win', score, {
            distance: car.distance,
            game_score: score,
            carys_earned: pcpEarned,
            xp_gained: xpEarned
        });
        window.runSaved = true;
        if(typeof Toast!=='undefined')Toast.success('Saved! +'+pcpEarned+' PCP');
    } else {
        console.warn('[HillClimb] DB.recordMatchResult missing — run not saved.');
    }

    // ── Achievements ──────────────────────────────────────────
    // Report the CODES this game declared. Two were seeded against game 8 and
    // until now could never fire: a builtin never loads the SDK, so nothing in
    // this file had any way to tell the platform an achievement had happened.
    //
    // Codes only — the reward, the once-per-player rule and the approval check
    // are all the platform's business.
    if (DB.unlockAchievement) {
        DB.unlockAchievement(8, 'hill_first_run', sid);
        if (car.distance >= 1000) DB.unlockAchievement(8, 'hill_1000m', sid);
    }
    // ...and anything platform-wide this run may have earned ("first match").
    if (DB.evaluatePlatformAchievements) DB.evaluatePlatformAchievements();

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
                // `score` is the IN-GAME score everywhere else in the schema
                // (see DB.recordMatchResult), and Carys live in carys_earned.
                // This row used to write score:pcpEarned — the opposite meaning
                // — so the same column held a game score on normal rows and a
                // Carys amount on tournament rows, and anything reading it got
                // one or the other depending on who wrote the row.
                DB.match_results.unshift({session_id:sid,player_id:uid,game_id:8,score:score,game_score:score,carys_earned:pcpEarned,xp_gained:runReward().xp,player_rank:1,joined_at:now,result:'win',distance:car.distance,coins:car.coins,diamonds:car.diamonds,tournament_id:parseInt(tournId,10)});
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
    // Put the coins, diamonds and fuel cans back. Without this the track keeps
    // whatever you stripped off it on the previous attempt, so run 2 onwards had
    // no fuel anywhere and ended almost immediately — measured before the fix:
    // a restart passed 4 gas cans and collected 0, because all four had been
    // consumed by the first run and their sensor bodies destroyed.
    if (ground) ground.resetPickups();
    particles=[];car=new Car(200,spawnY(CURRENT_VEHICLE),CURRENT_VEHICLE);reset=false;
    window.sessionFinalized=false;window.highlightSaved=false;
    window.screenShake=0;window.zoomFactor=1.0;window.airTimer=0;
    window.curLevel=0;window.levelBannerTimer=0;
    window.carLeftWheelContact=0;window.carRightWheelContact=0;window.wasAirborne=false;
    physAcc=0;
    initCam();
}

function keyPressed(){
    if(reset&&keyCode===32){resetCar();return;}
    // Match on keyCode, not on key.
    //
    // The bundled p5 build derives `key` as String.fromCharCode(e.which), so
    // pressing Escape sets key to "" — the literal escape character — and
    // never to the string "Escape". `key === 'Escape'` was therefore dead code and
    // Escape did nothing in-game. 27 is ESCAPE; the string check is kept so this
    // still works if the library is ever upgraded to a modern p5.
    if(keyCode===27||key==='Escape'){
        var g=document.getElementById('garage');
        if(g&&g.style.display==='flex'&&!g.classList.contains('gone')){
            history.back();
        } else {
            openGarage();
        }
        return;
    }
    if(keyCode===RIGHT_ARROW||key==='d'||key==='D'){rightDown=true;car.motorOn(true);}
    if(keyCode===LEFT_ARROW ||key==='a'||key==='A'){leftDown=true; car.motorOn(false);}
    if(key==='f'||key==='F') toggleFullscreen();
}
function keyReleased(){
    if(keyCode===RIGHT_ARROW||key==='d'||key==='D'){rightDown=false;leftDown?car.motorOn(false):car.motorOff();}
    if(keyCode===LEFT_ARROW ||key==='a'||key==='A'){leftDown=false;rightDown?car.motorOn(true):car.motorOff();}
}
// SPACE is not reachable on a phone, and the results card was the only screen
// with no way out of it there.
function mousePressed(){ if(reset){ resetCar(); return false; } }
function touchStarted(){ if(reset){ resetCar(); return false; } }
