// Every public airport on a 2:1 world map, plus live planes
// with a line from their departure airport to their arrival airport

// planes.py running on this computer. Works with Go Live too.
// Or use your teacher's address, e.g. "http://192.168.1.217:8000/planes.json"
let server = "http://localhost:8000/planes.json";
let airports = [];
let byCode = {};   // "LHR" -> the Heathrow airport object
let planes = [];

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
  loadJSON(server, (data) => planes = data.planes, () => console.log("Can't reach " + server));
}

function lonToX(lon) {
  return map(lon, -180, 180, 0, width);
}

function latToY(lat) {
  return map(lat, 90, -90, 0, height);
}

function draw() {
  background(15, 25, 50);

  // airports
  noStroke();
  fill(255, 255, 255, 100);
  for (let airport of airports) {
    ellipse(lonToX(airport.lon), latToY(airport.lat), 3, 3);
  }

  for (let plane of planes) {
    let dep = byCode[plane.from];
    let arr = byCode[plane.to];
    let x = lonToX(plane.lon);
    let y = latToY(plane.lat);

    // route: departure -> plane -> arrival
    if (dep && arr) {
      stroke(255, 200, 0, 150);
      line(lonToX(dep.lon), latToY(dep.lat), x, y);
      stroke(0, 200, 255, 150);
      line(x, y, lonToX(arr.lon), latToY(arr.lat));
    }

    // the plane itself
    noStroke();
    fill(255, 80, 80);
    ellipse(x, y, 6, 6);
  }

  fill(255);
  noStroke();
  text(airports.length + " airports, " + planes.length + " planes", 20, 30);
}
