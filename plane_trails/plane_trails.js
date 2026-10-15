// Live planes in p5.js, with smooth movement and curved trails
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)

// Change this to your teacher's address:
//let server = "http://172.20.10.2:8000/planes.json";
let server = "http://192.168.1.217:8000/closest.json";  // add ?n=3 for a different number
let planes = [];
let tracks = {};   // plane id -> { x, y, trail } where we're drawing it
let zoomSlider;

let SMOOTH = 0.05;      // how fast a plane glides to its new position (0 to 1)
let TRAIL_EVERY = 10;   // add a point to the trail every 10 frames

function setup() {
  createCanvas(windowWidth, windowHeight);

  // zoom slider at the bottom: min, max, start value, step
  zoomSlider = createSlider(0.25, 5, 1, 0.05);
  placeSlider();

  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.aircraft; // /planes.json calls this list data.planes
}

// turn a 0-to-1 position into a screen position, zoomed around the middle
function screenX(x) {
  return width / 2 + (x - 0.5) * width * zoomSlider.value();
}

function screenY(y) {
  return height / 2 + (y - 0.5) * height * zoomSlider.value();
}

function draw() {
  background(15, 25, 50);

  // home (the antenna) in the middle
  fill(255, 80, 80);
  noStroke();
  circle(width / 2, height / 2, 10);

  for (let plane of planes) {
    // a new plane starts where it is, with an empty trail
    if (!tracks[plane.id]) {
      tracks[plane.id] = { x: plane.x, y: plane.y, trail: [] };
    }
    let t = tracks[plane.id];

    // glide a little way towards the latest position each frame
    t.x = lerp(t.x, plane.x, SMOOTH);
    t.y = lerp(t.y, plane.y, SMOOTH);

    if (frameCount % TRAIL_EVERY == 0) {
      t.trail.push({ x: t.x, y: t.y }); // trails are never cleared, so they stay
    }
  }

  // curved trails for every plane we've seen, even ones that have gone
  for (let id in tracks) {
    let t = tracks[id];
    noFill();
    stroke(0, 200, 255, 150);
    strokeWeight(2);
    beginShape();
    for (let p of t.trail) {
      splineVertex(screenX(p.x), screenY(p.y));
    }
    splineVertex(screenX(t.x), screenY(t.y)); // the curve goes all the way to the plane
    endShape();
  }

  // planes on top of the trails
  for (let plane of planes) {
    let t = tracks[plane.id];
    let x = screenX(t.x);
    let y = screenY(t.y);

    // higher planes = bigger circles
    let size = map(plane.altitude, 0, 40000, 5, 40);

    noStroke();
    fill(255, 255, 255, 180);
    circle(x, y, size);

    fill(255);
    textSize(12);
    text(plane.callsign, x + size / 2 + 4, y);
  }

  fill(255);
  text(planes.length + " planes", 20, 30);
  text("zoom " + zoomSlider.value() + "x", width / 2 + 110, height - 26);
}

function placeSlider() {
  zoomSlider.size(200);
  zoomSlider.position(width / 2 - 100, height - 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  placeSlider();
}
