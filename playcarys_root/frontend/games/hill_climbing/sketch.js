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
var GRAVITY = 20;

var WHEEL_CATEGORY=0x0001, CHASSIS_CATEGORY=0x0002, GRASS_CATEGORY=0x0004;
var DIRT_CATEGORY=0x0008,  PERSON_CATEGORY=0x0010,  PICKUP_CATEGORY=0x0100;
var WHEEL_MASK=GRASS_CATEGORY|PICKUP_CATEGORY, CHASSIS_MASK=DIRT_CATEGORY|PICKUP_CATEGORY;
var GRASS_MASK=WHEEL_CATEGORY|PERSON_CATEGORY, DIRT_MASK=CHASSIS_CATEGORY, PERSON_MASK=GRASS_CATEGORY;

var world, car, ground;
var panX=0, panY=0;
var leftDown=false, rightDown=false, reset=false;
var particles=[], clouds=[];
var coinSprite, gasSprite, diamondSprite;

window.carLeftWheelContact=0; window.carRightWheelContact=0;
window.wasAirborne=false; window.screenShake=0; window.zoomFactor=1.0;
window.airTimer=0; window.airBonus=0; window.airBonusTimer=0;

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
            if(window.airTimer>18){window.airBonus=floor(window.airTimer/6)*25;window.airBonusTimer=90;if(car)car.coins+=floor(window.airBonus/5);}
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

function spawnDust(x,y,v){for(var i=0;i<floor(map(v,4,20,4,14));i++)particles.push({x,y,vx:random(-2.5,2.5),vy:random(-3,-0.3),life:1,decay:random(0.025,0.055),r:random(5,13),type:'dust'});}
function spawnBurst(x,y,type){var c=type==='gas'?[239,68,68]:type==='diamond'?[96,165,250]:[251,191,36];for(var i=0;i<10;i++){var a=random(TWO_PI),s=random(2,6);particles.push({x,y,vx:cos(a)*s,vy:sin(a)*s,life:1,decay:random(0.05,0.1),r:random(3,8),col:c,type:'burst'});}}
function spawnExhaust(x,y){if(random()>0.25)return;particles.push({x:x+random(-2,2),y:y+random(-2,2),vx:random(-1.5,-0.2),vy:random(-0.4,0.4),life:1,decay:random(0.018,0.035),r:random(5,14),type:'smoke'});}
function tickParticles(){
    for(var i=particles.length-1;i>=0;i--){
        var p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life-=p.decay;
        if(p.life<=0){particles.splice(i,1);continue;}
        var a=p.life*200;push();translate(p.x-panX,p.y-panY);noStroke();
        if(p.type==='dust')fill(175,138,95,a);
        else if(p.type==='smoke')fill(70,70,70,a*0.45);
        else fill(p.col[0],p.col[1],p.col[2],a);
        ellipse(0,0,p.r*2*p.life,p.r*2*p.life);pop();
    }
}

function setup(){
    window.canvas=createCanvas(1000,500);canvas.parent('canvas');frameRate(60);
    try{coinSprite=loadImage('Pics/coin_pro.png');}catch(e){}
    try{gasSprite=loadImage('Pics/gas_pro.png');}catch(e){}

    var g=GRAVITY;
    try{var s=(typeof Auth!=='undefined')?Auth.getSession():null;if(s&&s.activeSessionId&&typeof DB!=='undefined'){var sess=DB.sessions.find(function(sx){return String(sx.id)===String(s.activeSessionId);});if(sess&&sess.forkGravity!==undefined)g=sess.forkGravity;}}catch(e){}

    world=new b2World(new Vec2(0,g),true);
    world.SetContactListener(listener);
    ground=new Ground();
    car=new Car(160,spawnY());
    initCam();

    for(var i=0;i<14;i++) clouds.push({x:random(0,9000),y:random(25,180),w:random(90,230),speed:random(0.25,0.7),alpha:random(200,245)});
    setupTouch();
}

function spawnY(){
    // Ground base = canvas.height-110. wheelR=17, chassisH/2=18 → y = base - 17 - 18 - 10
    return canvas.height - 155;
}
function initCam(){panX=0;panY=spawnY()-height*0.58;}

function setupTouch(){
    var L=document.getElementById('btn-left'),R=document.getElementById('btn-right');
    if(!L||!R)return;
    L.addEventListener('touchstart',function(e){e.preventDefault();leftDown=true;car&&car.motorOn(false);},{passive:false});
    L.addEventListener('touchend',function(e){e.preventDefault();leftDown=false;rightDown?car&&car.motorOn(true):car&&car.motorOff();},{passive:false});
    R.addEventListener('touchstart',function(e){e.preventDefault();rightDown=true;car&&car.motorOn(true);},{passive:false});
    R.addEventListener('touchend',function(e){e.preventDefault();rightDown=false;leftDown?car&&car.motorOn(false):car&&car.motorOff();},{passive:false});
}

function draw(){
    world.Step(1/60,10,8);world.ClearForces();
    var carPos=car.chassisBody.GetPosition();
    var isGrounded=(window.carLeftWheelContact>0||window.carRightWheelContact>0);
    if(!isGrounded)window.airTimer++;else window.airTimer=0;
    window.wasAirborne=!isGrounded;

    panX+=(carPos.x*SCALE-width*0.28-panX)*0.12;
    panY+=(carPos.y*SCALE-height*0.58-panY)*0.08;

    var spd=car.chassisBody.GetLinearVelocity().Length();
    var tz=constrain(map(spd,0,22,1.0,0.80),0.80,1.0);
    window.zoomFactor+=(tz-window.zoomFactor)*0.05;

    var ang=car.chassisBody.GetAngle();
    if((ang>PI*0.83||ang<-PI*0.83)&&carPos.y*SCALE>0&&!reset){car.headCrashed=true;reset=true;}

    if(car.headCrashed&&!car.broken){
        car.broken=true;
        if(car.distJoint){world.DestroyJoint(car.distJoint);car.distJoint=null;}
        if(car.revJoint){world.DestroyJoint(car.revJoint);car.revJoint=null;}
        if(car.person&&car.person.headJoint){world.DestroyJoint(car.person.headJoint);car.person.headJoint=null;}
        if(typeof DB!=='undefined'&&DB.pushTelemetry)DB.pushTelemetry(8,'death_crash',{x:Math.floor(carPos.x*SCALE)});
    }

    if(typeof DB!=='undefined'&&frameCount%60===0&&DB.consumeLiveEvent){
        if(DB.consumeLiveEvent(8,'low_gravity')){world.SetGravity(new Vec2(0,5));setTimeout(function(){world.SetGravity(new Vec2(0,GRAVITY));},8000);if(typeof Toast!=='undefined')Toast.info('✨ Low Gravity!');}
        if(DB.consumeLiveEvent(8,'heavy_gravity')){world.SetGravity(new Vec2(0,50));setTimeout(function(){world.SetGravity(new Vec2(0,GRAVITY));},8000);if(typeof Toast!=='undefined')Toast.warning('🧱 Heavy Gravity!');}
    }

    // Wheel friction: high on ground, zero in air
    if(car&&car.wheels&&car.wheels.length>=2){
        var fr=isGrounded?3.5:0.0;
        car.wheels[0].body.GetFixtureList().SetFriction(fr);
        car.wheels[1].body.GetFixtureList().SetFriction(fr);
    }

    drawSky();drawParallax();
    push();
    if(window.screenShake>0){translate(random(-window.screenShake,window.screenShake),random(-window.screenShake*0.4,window.screenShake*0.4));window.screenShake*=0.72;if(window.screenShake<0.3)window.screenShake=0;}
    translate(width*0.5,height*0.5);scale(window.zoomFactor);translate(-width*0.5,-height*0.5);
    ground.show();tickParticles();car.show();car.update();
    pop();

    drawHUD();
    if(window.airBonusTimer>0){drawAirBonus();window.airBonusTimer--;}
    if(reset){if(!window.sessionFinalized){finalizeSession();window.sessionFinalized=true;}drawGameOver();}
}

function drawSky(){for(var y=0;y<height;y+=6){var t=y/height;fill(lerp(88,160,t),lerp(185,215,t),lerp(240,240,t));noStroke();rect(0,y,width,6);}}
function drawParallax(){
    drawMtn(panX*0.04,height*0.62,color(130,160,185,100),6,90);
    drawMtn(panX*0.10,height*0.70,color(100,135,160,140),9,55);
    drawTrees(panX*0.18);drawClouds();
}
function drawMtn(offset,baseY,col,freq,amp){fill(col);noStroke();beginShape();vertex(0,height);for(var x=0;x<=width+20;x+=8){vertex(x,baseY-noise((x+offset*0.3)*0.003*freq)*amp);}vertex(width,height);endShape(CLOSE);}
function drawTrees(offset){fill(28,70,38,190);noStroke();var bY=height*0.77;for(var x=-20;x<width+40;x+=18){var nx=(x+offset*0.4)%9000;var th=18+noise(nx*0.014)*30;var tw=th*0.55;triangle(x,bY,x-tw/2,bY+th,x+tw/2,bY+th);triangle(x,bY-th*0.3,x-tw*0.38,bY+th*0.4,x+tw*0.38,bY+th*0.4);}}
function drawClouds(){for(var i=0;i<clouds.length;i++){var c=clouds[i];var cx=((c.x-panX*0.07)%(width+c.w+40));if(cx<-c.w-20)cx+=width+c.w*2;noStroke();fill(255,c.alpha);ellipse(cx,c.y,c.w,c.w*0.48);ellipse(cx-c.w*0.27,c.y+5,c.w*0.58,c.w*0.38);ellipse(cx+c.w*0.27,c.y+5,c.w*0.62,c.w*0.36);c.x+=c.speed;}}

function drawHUD(){
    push();
    var bX=55,bY=52,bW=195,bH=18;
    fill(220,38,38);noStroke();rect(18,40,22,28,3);fill(40);rect(20,34,14,8,2);
    fill(255,80);textAlign(CENTER,CENTER);textSize(7);text('GAS',29,54);
    fill(25,25,30,200);stroke(255,25);strokeWeight(1);rect(bX,bY,bW,bH,5);noStroke();
    var fr=car.fuel/100;
    fill(car.fuel<25?color(239,68,68):car.fuel<50?color(250,180,0):color(50,210,80));rect(bX,bY,bW*fr,bH,5);
    fill(255,35);rect(bX,bY,bW*fr,bH*0.45,5,5,0,0);
    textStyle(BOLD);fill(251,191,36);textSize(16);textAlign(LEFT,TOP);
    text('🪙 '+car.coins,18,84);fill(96,165,250);text('💎 '+car.diamonds,18,112);
    fill(255);text('🛣 '+car.distance+'m',18,140);
    var sp=floor(car.chassisBody.GetLinearVelocity().Length()*4.2);
    fill(255,220);textSize(13);textAlign(RIGHT,TOP);textStyle(NORMAL);text('⚡ '+sp+' km/h',width-18,52);
    pop();
}
function drawAirBonus(){push();var a=window.airBonusTimer>20?255:map(window.airBonusTimer,0,20,0,255);fill(255,220,50,a);textAlign(CENTER,CENTER);textStyle(BOLD);textSize(32);text('AIR TIME',width/2,height/2-20);textSize(40);text('+'+window.airBonus,width/2,height/2+25);pop();}

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
    push();fill(4,6,10,215);noStroke();rectMode(CORNER);rect(0,0,width,height);
    rectMode(CENTER);var bX=width/2,bY=height/2,bW=480,bH=340;
    drawingContext.shadowBlur=60;drawingContext.shadowColor=car.isFuelOut?'rgba(239,68,68,0.4)':'rgba(234,179,8,0.4)';
    fill(13,17,28,255);stroke(255,255,255,18);strokeWeight(1);rect(bX,bY,bW,bH,24);
    drawingContext.shadowBlur=0;noStroke();
    textAlign(CENTER,CENTER);textStyle(BOLD);textSize(50);
    fill(car.isFuelOut?color(239,68,68):color(234,179,8));text(car.isFuelOut?'OUT OF FUEL':'CRASHED',bX,bY-110);
    var pts=car.coins*5+car.diamonds*50+floor(car.distance/10);
    textStyle(NORMAL);textSize(15);fill(148,163,184);textAlign(RIGHT,CENTER);
    text('DISTANCE DRIVEN',bX-20,bY-22);text('COINS COLLECTED',bX-20,bY+16);text('DIAMONDS FOUND',bX-20,bY+54);
    textAlign(LEFT,CENTER);textSize(17);textStyle(BOLD);
    fill(248,250,252);text(car.distance+'m',bX+20,bY-22);fill(250,204,21);text(''+car.coins,bX+20,bY+16);fill(56,189,248);text(''+car.diamonds,bX+20,bY+54);
    stroke(255,255,255,18);strokeWeight(1);line(bX-170,bY+95,bX+170,bY+95);noStroke();
    fill(74,222,128);textSize(22);textAlign(CENTER,CENTER);textStyle(BOLD);text('+'+pts+' PCP EARNED',bX,bY+130);
    if(frameCount%60<30){fill(148,163,184);textSize(13);textStyle(NORMAL);text('PRESS  [SPACE]  TO RESTART',bX,bY+172);}
    pop();
}

function finalizeSession(){
    var pts=car.coins*5+car.diamonds*50+floor(car.distance/10);
    if(typeof Auth==='undefined')return;var auth=Auth.getSession();if(!auth||!auth.userId)return;
    var uid=parseInt(auth.userId,10),now=new Date().toISOString();
    if(pts>0){DB.awardPoints(auth.userId,pts);if(typeof Toast!=='undefined')Toast.success('Saved! +'+pts+' PCP');}
    var sid=null;
    try{var params=new URLSearchParams(window.location.search);sid=params.get('sid')?parseInt(params.get('sid'),10):null;}catch(e){}
    if(!sid){sid=Date.now()%9999999;DB.sessions.push({session_id:sid,game_id:8,created_by:uid,name:'Hill Climb — '+car.distance+'m',game:'Hill Climbing',host:auth.username||'Player',hostId:uid,maxPlayers:1,status:'completed',mode:'casual',start_time:now,end_time:now,duration:Math.round(frameCount/60/60)||1,createdAt:now});}
    else{var sess=DB.sessions.find(function(s){return String(s.session_id)===String(sid);});if(sess){sess.status='completed';sess.end_time=now;sess.duration=Math.round(frameCount/60/60)||1;}}
    DB.match_results=DB.match_results.filter(function(r){return!(String(r.session_id)===String(sid)&&r.player_id===uid);});
    DB.match_results.unshift({session_id:sid,player_id:uid,game_id:8,score:pts,player_rank:1,joined_at:now,result:'win',distance:car.distance,coins:car.coins,diamonds:car.diamonds});
    DB.save();

    // ── Tournament-specific best distance tracking ──────────────────────────
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
                DB.match_results.unshift({session_id:sid,player_id:uid,game_id:8,score:pts,player_rank:1,joined_at:now,result:'win',distance:car.distance,coins:car.coins,diamonds:car.diamonds,tournament_id:parseInt(tournId,10)});
                DB.save();
                if(typeof Toast!=='undefined')Toast.success('\ud83c\udfd4\ufe0f Tournament best: '+car.distance+'m saved!');
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
    particles=[];car=new Car(160,spawnY());reset=false;
    window.sessionFinalized=false;window.highlightSaved=false;
    window.screenShake=0;window.zoomFactor=1.0;window.airTimer=0;
    window.carLeftWheelContact=0;window.carRightWheelContact=0;window.wasAirborne=false;
    initCam();
}

function keyPressed(){if(reset&&keyCode===32){resetCar();return;}if(keyCode===RIGHT_ARROW){rightDown=true;car.motorOn(true);}if(keyCode===LEFT_ARROW){leftDown=true;car.motorOn(false);}}
function keyReleased(){if(keyCode===RIGHT_ARROW){rightDown=false;leftDown?car.motorOn(false):car.motorOff();}if(keyCode===LEFT_ARROW){leftDown=false;rightDown?car.motorOn(true):car.motorOff();}}
function mousePressed(){}
