// Live planes in p5.js, with trails
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)

// Change this to the server address:
//let server = "http://192.168.50.56:8081/planes.json";
let server = "http://192.168.50.56:8081/closest.json";  // add ?n=3 for a different number
let planes = [];
let trails = {};   // plane id -> a list of places it has been

function setup() {
  createCanvas(windowWidth, windowHeight);
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.aircraft; // /planes.json calls this list data.planes

  // remember where every plane is now
  for (let plane of planes) {
    if (!trails[plane.id]) trails[plane.id] = [];
    trails[plane.id].push({ x: plane.x, y: plane.y });
  }
}

function draw() {
  background(15, 25, 50);

  // home (the antenna) in the middle
  fill(255, 80, 80);
  noStroke();
  circle(width / 2, height / 2, 10);

  // join up the dots for every plane we've seen
  noFill();
  stroke(0, 200, 255, 150);
  strokeWeight(2);
  for (let id in trails) {
    beginShape();
    for (let p of trails[id]) {
      vertex(p.x * width, p.y * height);
    }
    endShape();
  }

  // planes on top of the trails
  noStroke();
  for (let plane of planes) {
    let x = plane.x * width;
    let y = plane.y * height;
    fill(255, 255, 255, 180);
    circle(x, y, 10);

    fill(255);
    textSize(12);
    text(plane.callsign, x + 6, y);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
