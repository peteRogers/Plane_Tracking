// Point a two-servo gimbal at the closest plane
// Works out two angles from home to the plane:
//   bearing   - compass direction (0 = north, 90 = east, 180 = south, 270 = west)
//   elevation - how far up to look (0 = the horizon, 90 = straight up)
// then turns them into two servo angles (0 to 180) and sends them to the Arduino
// as a line of text like "123,45" (pan,tilt)
// The plane data only arrives once a second, so we lerp (glide) towards it
// every frame and send to the Arduino about 30 times a second
//
// Web Serial only works in Chrome / Edge, and the page must be opened from
// http://localhost (e.g. Go Live in VS Code), not by double-clicking the file

// Change this to the server address:
let server = "http://192.168.50.56:8081/closest.json?n=1";  // just the closest plane
//let server = "http://localhost:8000/closest.json?n=1";  // planes.py running on this computer

// which compass direction the gimbal faces when the pan servo is at 90
// (0 = north, 90 = east...) - point your gimbal north, or change this to match
let FACING = 0;

let home;          // where the antenna (and gimbal) is: home.lat, home.lon
let plane;         // the closest plane
let targetBearing = 0;    // where the plane is (updated once a second)
let targetElevation = 0;
let bearing = 0;          // where we're pointing (glides towards the target)
let elevation = 0;
let pan = 90;             // servo angles we send
let tilt = 0;
let smoothing = 0.05;     // how much to glide each frame: smaller = smoother but slower
let lastSend = 0;         // when we last sent to the Arduino (in milliseconds)

const arduino = new ArduinoSerial({ baudRate: 115200 });
arduino.onLine = (line) => console.log("from Arduino:", line);

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);  // so sin, cos and atan2 all use degrees

  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  home = data.home;
  plane = data.aircraft[0];
  if (!home || !plane) return;

  targetBearing = getBearing(home.lat, home.lon, plane.lat, plane.lon);
  targetElevation = getElevation(plane.distance, plane.altitude);
}

// glide towards the plane a little bit every frame
function glide() {
  // bearing goes round in a circle: from 350 to 10 is +20 (not -340),
  // so work out the shortest way round first
  let diff = (targetBearing - bearing + 540) % 360 - 180;
  bearing = (bearing + diff * smoothing + 360) % 360;

  elevation = lerp(elevation, targetElevation, smoothing);
}

// compass direction from one place to another
function getBearing(lat1, lon1, lat2, lon2) {
  let dLon = lon2 - lon1;
  let y = sin(dLon) * cos(lat2);
  let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
  return (atan2(y, x) + 360) % 360;
}

// how far up to look: a right-angled triangle with
// the distance along the ground and the plane's height
function getElevation(distanceKm, altitudeFeet) {
  let heightKm = altitudeFeet * 0.0003048;
  return atan2(heightKm, distanceKm);
}

// servos only turn 180 degrees, but the plane could be in any direction.
// trick: if the plane is behind the gimbal, turn the pan servo the other way
// and tilt "over the top" past straight up to look backwards
function servoAngles() {
  // direction of the plane compared to where the gimbal faces (-180 to 180)
  let turn = (bearing - FACING + 540) % 360 - 180;

  if (turn > 90) {
    pan = 90 + turn - 180;
    tilt = 180 - elevation;
  } else if (turn < -90) {
    pan = 90 + turn + 180;
    tilt = 180 - elevation;
  } else {
    pan = 90 + turn;
    tilt = elevation;
  }
}

function draw() {
  background(15, 25, 50);
  fill(255);
  noStroke();
  textSize(16);

  if (!plane) {
    text("Waiting for " + server, 20, 60);
    return;
  }

  glide();
  servoAngles();

  // send "pan,tilt" and a new line, e.g. "123,45\n", about 30 times a second
  if (millis() - lastSend > 33) {
    arduino.send(round(pan) + "," + round(tilt) + "\n");
    lastSend = millis();
  }

  let r = min(width, height) * 0.3;

  // compass, seen from above: the line points towards the plane
  let cx = width * 0.3;
  let cy = height / 2;
  noFill();
  stroke(255, 100);
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

  // elevation, seen from the side: 0 = horizon, 90 = straight up
  let ex = width * 0.65;
  let ey = height / 2 + r / 2;
  stroke(255, 100);
  strokeWeight(1);
  line(ex, ey, ex + r, ey);   // the ground
  stroke(0, 200, 255);
  strokeWeight(3);
  line(ex, ey, ex + r * cos(elevation), ey - r * sin(elevation));

  // numbers
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  text(plane.callsign + "   " + nf(plane.distance, 0, 1) + " km away, " + plane.altitude + " ft up", 20, 50);
  text("bearing " + round(bearing) + "°   elevation " + round(elevation) + "°", 20, 75);
  text("sending pan " + round(pan) + ", tilt " + round(tilt) + "   (" + arduino.status + ")", 20, 100);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
