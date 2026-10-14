// Live planes in p5.js
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)

// Change this to your teacher's address:
//let server = "http://172.20.10.2:8000/planes.json";
let server = "http://192.168.1.217:8000/closest.json";  // add ?n=3 for a different number
let planes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
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

  for (let plane of planes) {
    let x = plane.x * width;
    let y = plane.y * height;

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
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
