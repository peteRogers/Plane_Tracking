// Every public airport on a 2:1 world map, plus live planes
// with an arc from their departure airport to their arrival airport

// The server running planes.py. Works with Go Live too.
// Or use "http://localhost:8000/planes.json" if planes.py runs on this computer
let server = "http://192.168.50.56:8081/planes.json";
let airports = [];
let byCode = {};   // "LHR" -> the Heathrow airport object
let planes = [];
let routes = {};   // "LHR-JFK" -> {from: "LHR", to: "JFK"}, every route ever seen

async function setup() {
  // wait for the airports to load before carrying on
  airports = await loadJSON("../all_public_airports.json");

  // canvas is twice as wide as it is tall (360° of lon by 180° of lat)
  let h = min(windowHeight, windowWidth / 2);
  createCanvas(h * 2, h);

  for (let airport of airports) {
    byCode[airport.iata] = airport;
  }

  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.planes;

  // remember each plane's route so it stays drawn after the plane has gone
  for (let plane of planes) {
    if (byCode[plane.from] && byCode[plane.to]) {
      routes[plane.from + "-" + plane.to] = { from: plane.from, to: plane.to };
    }
  }
}

function lonToX(lon) {
  return map(lon, -180, 180, 0, width);
}

function latToY(lat) {
  return map(lat, 90, -90, 0, height);
}

// a curved line from (x1, y1) to (x2, y2)
// the longer the line, the bigger the bend
function arcLine(x1, y1, x2, y2) {
  let d = dist(x1, y1, x2, y2);
  if (d == 0) return; // same start and end point, nothing to draw
  let bend = d * 0.2; // try 0.1 for flatter arcs, 0.4 for loopier ones

  // the middle of the line
  let mx = (x1 + x2) / 2;
  let my = (y1 + y2) / 2;

  // a direction at right angles to the line, pointing up (north)
  let px = -(y2 - y1) / d;
  let py = (x2 - x1) / d;
  if (py > 0) {
    px = -px;
    py = -py;
  }

  // the point the curve gets pulled towards
  let cx = mx + px * bend * 2;
  let cy = my + py * bend * 2;

  // bezier() needs two pull points, both are 2/3 of the way to (cx, cy)
  bezier(x1, y1,
         x1 + (cx - x1) * 2 / 3, y1 + (cy - y1) * 2 / 3,
         x2 + (cx - x2) * 2 / 3, y2 + (cy - y2) * 2 / 3,
         x2, y2);
}

function draw() {
  background(15, 25, 50);

  // airports
  noStroke();
  fill(255, 255, 255, 100);
  for (let airport of airports) {
    ellipse(lonToX(airport.lon), latToY(airport.lat), 3, 3);
  }

  // every route seen so far: departure -> arrival
  noFill();
  stroke(255, 200, 0, 150);
  for (let key in routes) {
    let dep = byCode[routes[key].from];
    let arr = byCode[routes[key].to];
    arcLine(lonToX(dep.lon), latToY(dep.lat), lonToX(arr.lon), latToY(arr.lat));
  }

  // the planes detected right now
  noStroke();
  fill(255, 80, 80);
  for (let plane of planes) {
    ellipse(lonToX(plane.lon), latToY(plane.lat), 6, 6);
  }

  fill(255);
  noStroke();
  let routeCount = Object.keys(routes).length;
  text(airports.length + " airports, " + planes.length + " planes, " + routeCount + " routes", 20, 30);
}
