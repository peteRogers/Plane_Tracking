// Plane-tracking version of the p5TicControl sketch.
// Asks the plane server for the closest plane once a second, works out its
// bearing (compass direction from home: 0 = north, 90 = east...) and hands it
// to the TicController, which turns each energized Tic to match.
// All the motor settings and buttons live in ticController.js.
//
// The Tic counts position from wherever the motor was at power-up, so point
// the shaft at FACING (north by default) and press "Set 0° here" before
// tracking. The motor always takes the shortest way round, so it may end up
// several full turns from where it started (min / max angle are ignored).

// Change this to the server address:
let server = "http://192.168.50.56:8081/closest.json?n=1";  // just the closest plane
//let server = "http://localhost:8000/closest.json?n=1";  // planes.py running on this computer

// which compass direction the motor faces at 0° (0 = north, 90 = east...)
let FACING = 0;

let tic;
let home;                 // where the antenna is: home.lat, home.lon
let plane;                // the closest plane
let targetBearing = 0;    // where the plane is (updated once a second)
let bearing = 0;          // where we're pointing (glides towards the target)
let motorAngle = 0;       // same, but never wraps: 350 -> 370 rather than 350 -> 10
let smoothing = 0.05;     // how much to glide each frame: smaller = smoother but slower

function setup() {
  createCanvas(640, 480);
  angleMode(DEGREES);  // so sin, cos and atan2 all use degrees
  textFont("monospace");

  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second

  tic = new TicController({ product: "T500", mode: "position" });
  tic.createControls();
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  home = data.home;
  plane = data.aircraft[0];
  if (!home || !plane) return;

  targetBearing = getBearing(home.lat, home.lon, plane.lat, plane.lon);
}

// compass direction from one place to another
function getBearing(lat1, lon1, lat2, lon2) {
  let dLon = lon2 - lon1;
  let y = sin(dLon) * cos(lat2);
  let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
  return (atan2(y, x) + 360) % 360;
}

// glide towards the plane a little bit every frame
function glide() {
  // bearing goes round in a circle: from 350 to 10 is +20 (not -340),
  // so work out the shortest way round first
  let diff = (targetBearing - bearing + 540) % 360 - 180;
  bearing = (bearing + diff * smoothing + 360) % 360;
  motorAngle += diff * smoothing;  // the motor takes the same short step
}

function draw() {
  background(15, 25, 50);
  fill(255);
  noStroke();
  textSize(16);

  if (!plane) {
    text("Waiting for " + server, 20, 40);
    return;
  }

  glide();

  // the motor's turn from FACING, counting full turns (so it can go past 360)
  let turn = motorAngle - FACING;
  tic.turnTo(turn);

  // compass, seen from above: the line points towards the plane
  let r = min(width, height) * 0.3;
  let cx = width / 2;
  let cy = height / 2 + 30;
  noFill();
  stroke(255, 100);
  strokeWeight(1);
  circle(cx, cy, r * 2);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  text("N", cx, cy - r - 15);
  text("E", cx + r + 15, cy);
  text("S", cx, cy + r + 15);
  text("W", cx - r - 15, cy);
  stroke(0, 200, 255);
  strokeWeight(3);
  line(cx, cy, cx + r * sin(bearing), cy - r * cos(bearing));

  // numbers
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  text(plane.callsign + "   " + nf(plane.distance, 0, 1) + " km away", 20, 20);
  text("bearing " + round(bearing) + "°   motor turn " + round(turn) + "°", 20, 45);
}
