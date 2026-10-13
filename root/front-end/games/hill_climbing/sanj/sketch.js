var Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2MassData = Box2D.Collision.Shapes.b2MassData;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2EdgeChainDef = Box2D.Collision.Shapes.b2EdgeChainDef;

var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2StaticBody = Box2D.Dynamics.b2Body.b2_staticBody;
var b2DynamicBody = Box2D.Dynamics.b2Body.b2_dynamicBody;
var b2RevoluteJoint = Box2D.Dynamics.Joints.b2RevoluteJoint;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

var b2PrismaticJoint = Box2D.Dynamics.Joints.b2PrismaticJoint;

var b2PrismaticJointDef = Box2D.Dynamics.Joints.b2PrismaticJointDef;

var b2FilterData = Box2D.Dynamics.b2FilterData;

var b2DistanceJoint = Box2D.Dynamics.Joints.b2DistanceJoint;
var b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;

var b2WeldJoint = Box2D.Dynamics.Joints.b2WeldJoint;
var b2WeldJointDef = Box2D.Dynamics.Joints.b2WeldJointDef;
var world;
var SCALE = 30;
var groundBody;

var wheels = [];
var car;
var ground;

var panX = 0;
var panY = 0;

var leftDown = false;
var rightDown = false;
var listener = new Box2D.Dynamics.b2ContactListener;

var carSprite;
var headSprite;
var wheelSprite;



//collisionCatagories i.e what it is


var WHEEL_CATEGORY = 0x0001;
var CHASSIS_CATEGORY = 0X0002;
var GRASS_CATEGORY = 0X0004;
var DIRT_CATEGORY = 0x0008;
var PERSON_CATEGORY = 0x0010;

//collision Masks ie. what it collides with
var WHEEL_MASK = (GRASS_CATEGORY);
var CHASSIS_MASK = (DIRT_CATEGORY);
var GRASS_MASK = (WHEEL_CATEGORY | PERSON_CATEGORY);
var DIRT_MASK = (CHASSIS_CATEGORY);
var PERSON_MASK = (GRASS_CATEGORY);

var resetCounter = 120;
var reset = false;

listener.BeginContact = function(contact) {
    if (contact.GetFixtureA().GetBody() == car.person.head.body) {
        if (contact.GetFixtureB().GetBody().GetType() == b2StaticBody) {
            world.DestroyJoint(car.distJoint);
            world.DestroyJoint(car.person.distJoint);
            world.DestroyJoint(car.revJoint);
            world.DestroyJoint(car.person.headJoint);
            reset = true;
            // world.DestroyJoint(car.person.headJoint);

        }
    }

    if (contact.GetFixtureB().GetBody() == car.person.head.body) {
        if (contact.GetFixtureA().GetBody().GetType() == b2StaticBody) {
            world.DestroyJoint(car.distJoint);
            world.DestroyJoint(car.person.distJoint);
            world.DestroyJoint(car.revJoint);
            world.DestroyJoint(car.person.headJoint);
            reset = true;

            // world.DestroyJoint(car.person.headJoint);
        }
    }

}



function setup() {

    window.canvas = createCanvas(1000, 500);
    canvas.parent("canvas");
    frameRate(30);
    
    headSprite = loadImage("Pics/Sanj.png");



    carSprite = loadImage("Pics/car.png");
    wheelSprite = loadImage("Pics/wheel.png");

    world = new b2World(new Vec2(0, 10), true);
    car = new Car(150, 0);
    ground = new Ground();


    world.SetContactListener(listener);


    // var bodyDef2 = new b2BodyDef();
    // bodyDef2.type = b2StaticBody;
    // bodyDef2.position.x = 0; //canvas.width / 2 / SCALE;
    // bodyDef2.position.y = 0; //(canvas.height - 20) / SCALE;
    //
    // var fixDef2 = new b2FixtureDef();
    // fixDef2.friction = 0.9;
    // fixDef2.restitution = 0.1;
    // fixDef2.shape = new b2PolygonShape();
    // // fixDef2.shape.SetAsBox(canvas.width / 2 / SCALE, 10 / SCALE);
    // var vecs = [];
    // //
    // vecs.push(new Vec2(0, canvas.height - 70));
    // vecs.push(new Vec2(canvas.width / 2, canvas.height - 65));
    //
    // vecs.push(new Vec2(canvas.width, canvas.height - 63));
    //
    // vecs.push(new Vec2(canvas.width, canvas.height));
    //
    // vecs.push(new Vec2(0, canvas.height));
    // vecs.push(new Vec2(0, canvas.height - 70));

    // for (var i = 0; i < canvas.width; i += 100) {
    //   vecs.push(new Vec2(i, canvas.height - random(20, 100)));
    // }
    // vecs.push(new Vec2(0, canvas.height - floor(random(50, 100))));
    // vecs.push(new Vec2(canvas.width / 2, canvas.height - floor(random(50, 100))));
    //
    // vecs.push(new Vec2(canvas.width, canvas.height - floor(random(50, 100))));
    //
    //
    //
    // vecs.push(new Vec2(canvas.width, canvas.height));
    // vecs.push(new Vec2(0, canvas.height));
    // print(vecs);
    //
    // for (var i of vecs) {
    //   i.x /= SCALE;
    //   i.y /= SCALE;
    // }
    //
    // fixDef2.shape.SetAsEdge(vecs[0], vecs[3]);
    //
    // groundBody = world.CreateBody(bodyDef2);
    // groundBody.CreateFixture(fixDef2);



}


function draw() {
    background(100, 200, 250);
    world.Step(1 / 30, 10, 10);

    for (var i of wheels) {
        i.show();
    }

    // push();
    // x = groundBody.GetPosition().x * SCALE;
    // y = groundBody.GetPosition().y * SCALE;
    //
    // translate(x, y);
    // fill(0, 0, 0);
    // noStroke();
    // rectMode(CENTER);
    // rect(0, 0, canvas.width, 20);
    // pop();
    ground.show();

    car.show();
    car.update();

    if (reset) {
        if (resetCounter > 0) {
            resetCounter -= 1;

        } else {
            resetCar();
        }
    }

}

function resetCar() {
    world.DestroyBody(car.chassisBody);
    world.DestroyBody(car.wheels[0].body);
    world.DestroyBody(car.wheels[0].rimBody);
    world.DestroyBody(car.wheels[1].body);
    world.DestroyBody(car.wheels[1].rimBody);
    car = new Car(150, 0);
    reset = false;
    resetCounter = 120;
    panX = 0;
}


function mousePressed() {
     if(mouseX>500){
        rightDown = true;
        car.motorOn(true);
        }else{
        leftDown = true;
        car.motorOn(false);
     }
}

function mouseReleased() {
    if(rightDown == true){
        rightDown = false;
        if (leftDown) {
            car.motorOn(false);
        } else {
            car.motorOff();
        }
    }else if(leftDown == true){
        leftDown = false;
        if (rightDown) {
            car.motorOn(true);
        } else {
            car.motorOff();
        }
    }
}


function keyPressed() {
    switch (keyCode) {
        case RIGHT_ARROW:
            rightDown = true;
            car.motorOn(true);
            break;
        case LEFT_ARROW:
            leftDown = true;
            car.motorOn(false);
            break;
    }
}



function keyReleased() {
    switch (keyCode) {
        case RIGHT_ARROW:
            rightDown = false;
            if (leftDown) {
                car.motorOn(false);
            } else {
                car.motorOff();
            }
            break;
        case LEFT_ARROW:
            leftDown = false;
            if (rightDown) {
                car.motorOn(true);
            } else {
                car.motorOff();
            }
            break;
    }



}
