// Live planes in p5.js, on top of a map
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)

// Change this to the server address:
//let server = "http://192.168.50.56:8081/planes.json";
let zoom = 5;  // same zoom for the planes and the map
let server = "http://192.168.50.56:8081/closest?zoom=" + zoom;  // add &n=3 for a different number
let planes = [];

// dark grey map pictures from Esri (free, no key needed), same as plane_map
let TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
let RANGE_KM = 150;  // must match RANGE_KM in planes.py
let home = null;     // the antenna's lat/lon, sent by the server
let tiles = [];      // loaded once, when we first hear where home is


function setup() {
  createCanvas(windowWidth, windowHeight);
  setInterval(getPlanes, 1000); // ask for new data every second
  background(0);
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.aircraft; // /planes.json calls this list data.planes
  console.log(planes)
  if (home == null && data.home) {
    home = data.home;
    loadMap();
  }
}

// Load every map tile that covers the canvas
function loadMap() {
  let rangeKm = RANGE_KM / zoom;
  // pick a tile zoom level so each tile is roughly 256 pixels on screen
  let worldKm = 40075 * cos(radians(home.lat));
  let z = round(log(worldKm / (2 * rangeKm) * width / 256) / log(2));
  z = constrain(z, 0, 16); // the Esri dark grey map stops at 16

  // corners of the canvas in lat/lon
  let dLat = rangeKm / 111;
  let dLon = rangeKm / (111 * cos(radians(home.lat)));
  let left = floor(lonToTile(home.lon - dLon, z));
  let right = floor(lonToTile(home.lon + dLon, z));
  let top = floor(latToTile(home.lat + dLat, z));
  let bottom = floor(latToTile(home.lat - dLat, z));

  for (let tx = left; tx <= right; tx++) {
    for (let ty = top; ty <= bottom; ty++) {
      let tile = {
        img: null,
        lon1: tileToLon(tx, z), lat1: tileToLat(ty, z),         // top left corner
        lon2: tileToLon(tx + 1, z), lat2: tileToLat(ty + 1, z), // bottom right corner
      };
      let url = TILE_URL.replace("{z}", z).replace("{x}", tx).replace("{y}", ty);
      loadImage(url, (img) => tile.img = img);
      tiles.push(tile);
    }
  }
}

// Same sum as to_xy() in planes.py: lat/lon -> 0 to 1, home in the middle
function toXY(lat, lon) {
  let rangeKm = RANGE_KM / zoom;
  let dy = (lat - home.lat) * 111;
  let dx = (lon - home.lon) * 111 * cos(radians(home.lat));
  return { x: 0.5 + dx / (2 * rangeKm), y: 0.5 - dy / (2 * rangeKm) };
}

// Web map tile numbers (https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)
function lonToTile(lon, z) {
  return (lon + 180) / 360 * pow(2, z);
}
function latToTile(lat, z) {
  let r = radians(lat);
  return (1 - log(tan(r) + 1 / cos(r)) / PI) / 2 * pow(2, z);
}
function tileToLon(tx, z) {
  return tx / pow(2, z) * 360 - 180;
}
function tileToLat(ty, z) {
  let n = PI - 2 * PI * ty / pow(2, z);
  return degrees(atan(0.5 * (exp(n) - exp(-n))));
}

function drawMap() {
  for (let tile of tiles) {
    if (tile.img == null) continue; // not loaded yet
    let a = toXY(tile.lat1, tile.lon1);
    let b = toXY(tile.lat2, tile.lon2);
    image(tile.img, a.x * width, a.y * height, (b.x - a.x) * width, (b.y - a.y) * height);
  }
  // the map's licence asks for this credit
  noStroke();
  fill(255, 120);
  textSize(10);
  textAlign(RIGHT, BOTTOM);
  text("Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors", width - 4, height - 4);
  textAlign(LEFT, BASELINE);
}

function draw() {
  background(15, 25, 50);
  drawMap();

  // home (the antenna) in the middle
  fill(255, 80, 80);
  noStroke();
  circle(width / 2, height / 2, 10);
  for (let plane of planes) {
    let x = plane.x * width
    let y = plane.y * height
    fill(255, 255, 255, 180);
    //circle(x, y, 10);
    stroke(255)
    line(width/2, height/2, x, y)
    fill(255);
    textSize(12);
    //text(plane.callsign, x + 6, y);
  }
}



function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

}
