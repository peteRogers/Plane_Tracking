// Live planes in p5.js
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)

// Change this to your teacher's address:
//let server = "http://172.20.10.2:8000/planes.json";
let server = "http://192.168.1.217:8000/closest.json";  // add ?n=3 for a different number
let planes = [];
let zoomSlider;

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

function draw() {
  background(15, 25, 50);

  // home (the antenna) in the middle
  fill(255, 80, 80);
  noStroke();
  circle(width / 2, height / 2, 10);

  let zoom = zoomSlider.value();

  for (let plane of planes) {
    // zoom in/out around the middle of the screen (x, y of 0.5 is home)
    let x = width / 2 + (plane.x - 0.5) * width * zoom;
    let y = height / 2 + (plane.y - 0.5) * height * zoom;

    // higher planes = bigger circles
    let size = map(plane.altitude, 0, 40000, 5, 40);

    fill(255, 255, 255, 180);
    circle(x, y, size);

    fill(255);
    textSize(12);
    text(plane.callsign, x + size / 2 + 4, y);
  }

  fill(255);
  text(planes.length + " planes", 20, 30);
  text("zoom " + zoom + "x", width / 2 + 110, height - 26);
}

function placeSlider() {
  zoomSlider.size(200);
  zoomSlider.position(width / 2 - 100, height - 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  placeSlider();
}
