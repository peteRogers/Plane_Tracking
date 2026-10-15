// Live planes in p5.js, with smooth movement, curved trails and a map underneath
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon

// Change this to your teacher's address:
//let server = "http://172.20.10.2:8000/planes.json";
let server = "http://10.100.13.136:8081/closest.json";  // add ?n=3 for a different number
let planes = [];
let home;          // { lat, lon } of the antenna, sent by the server
let tracks = {};   // plane id -> { lat, lon, trail } where we're drawing it
let tiles = {};    // map pictures we've already loaded
let zoomSlider;

let SMOOTH = 0.05;      // how fast a plane glides to its new position (0 to 1)
let TRAIL_EVERY = 10;   // add a point to the trail every 10 frames
let RANGE_KM = 150;     // at zoom 1x, this distance from home reaches the edge of the screen

// dark grey map pictures from Esri (free, no key needed)
let TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

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
  planes = data.aircraft || data.planes; // /closest.json says aircraft, /planes.json says planes
  home = data.home;
}

// ---- turning lat/lon into screen positions (the same way web maps do) ----

// position on a 256 x 256 picture of the whole world
function worldX(lon) {
  return (lon + 180) / 360 * 256;
}

function worldY(lat) {
  let r = radians(lat);
  return (1 - log(tan(r) + 1 / cos(r)) / PI) / 2 * 256;
}

// how many times bigger than the 256 x 256 world the map is drawn
function mapScale() {
  // at 1x, RANGE_KM from home reaches the edge of the screen
  let kmPerWorldPixel = 40075 * cos(radians(home.lat)) / 256;
  return (min(width, height) / 2) / (RANGE_KM / kmPerWorldPixel) * zoomSlider.value();
}

function screenX(lon) {
  return width / 2 + (worldX(lon) - worldX(home.lon)) * mapScale();
}

function screenY(lat) {
  return height / 2 + (worldY(lat) - worldY(home.lat)) * mapScale();
}

// ---- the map ----

function drawMap() {
  let scale = mapScale();
  let z = constrain(round(log(scale) / log(2)), 0, 16); // map zoom level to load
  let count = pow(2, z);                                 // tiles across the world
  let size = 256 * scale / count;                        // size of one tile on screen

  // which tiles cover the screen
  let left = (worldX(home.lon) * scale - width / 2) / size;
  let top = (worldY(home.lat) * scale - height / 2) / size;
  let right = left + width / size;
  let bottom = top + height / size;

  for (let ty = floor(top); ty <= floor(bottom); ty++) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = floor(left); tx <= floor(right); tx++) {
      let url = TILE_URL.replace("{z}", z).replace("{x}", (tx % count + count) % count).replace("{y}", ty);
      if (!tiles[url]) tiles[url] = loadImage(url);
      image(tiles[url], (tx - left) * size, (ty - top) * size, size + 1, size + 1);
    }
  }
}

function draw() {
  background(15, 25, 50);

  if (!home) {
    fill(255);
    text("Waiting for " + server, 20, 30);
    return;
  }

  drawMap();

  // home (the antenna) in the middle
  fill(255, 80, 80);
  noStroke();
  circle(width / 2, height / 2, 10);

  for (let plane of planes) {
    // a new plane starts where it is, with an empty trail
    if (!tracks[plane.id]) {
      tracks[plane.id] = { lat: plane.lat, lon: plane.lon, trail: [] };
    }
    let t = tracks[plane.id];

    // glide a little way towards the latest position each frame
    t.lat = lerp(t.lat, plane.lat, SMOOTH);
    t.lon = lerp(t.lon, plane.lon, SMOOTH);

    if (frameCount % TRAIL_EVERY == 0) {
      t.trail.push({ lat: t.lat, lon: t.lon }); // trails are never cleared, so they stay
    }
  }

  // curved trails for every plane we've seen, even ones that have gone
  for (let id in tracks) {
    let t = tracks[id];
    noFill();
    stroke(0, 200, 255, 150);
    strokeWeight(2);
    beginShape();
    if (t.trail.length > 0) {
      curveVertex(screenX(t.trail[0].lon), screenY(t.trail[0].lat)); // first point twice
    }
    for (let p of t.trail) {
      curveVertex(screenX(p.lon), screenY(p.lat));
    }
    curveVertex(screenX(t.lon), screenY(t.lat));
    curveVertex(screenX(t.lon), screenY(t.lat)); // last point twice so the curve reaches the end
    endShape();
  }

  // planes on top of the trails
  for (let plane of planes) {
    let t = tracks[plane.id];
    let x = screenX(t.lon);
    let y = screenY(t.lat);

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
  noStroke();
  textSize(12);
  text(planes.length + " planes", 20, 30);
  text("zoom " + zoomSlider.value() + "x", width / 2 + 110, height - 26);

  // the map's makers ask to be credited
  fill(255, 150);
  textSize(10);
  textAlign(RIGHT);
  text("Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors", width - 10, height - 10);
  textAlign(LEFT);
}

function placeSlider() {
  zoomSlider.size(200);
  zoomSlider.position(width / 2 - 100, height - 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  placeSlider();
}
