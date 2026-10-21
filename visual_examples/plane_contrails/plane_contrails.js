// Live planes in p5.js, leaving contrails (the white cloud lines planes make)
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)
//
// Most planes leave two thin contrails, one from each engine.
// We draw them as lines of small white puffs that very slowly widen and fade.
// A p5.strands shader then makes them a little soft and wispy like real clouds.
// p5.strands lets us write a shader (a tiny program that runs on the
// graphics card, once for every pixel) in JavaScript

// Change this to the server address:
//let server = "http://192.168.50.56:8081/planes.json";
let server = "http://192.168.50.56:8081/planes.json";  // add ?n=3 for a different number
let planes = [];
let tracks = {};   // plane id -> { x, y, trail } where we're drawing it
let zoomSlider;
let cloudShader;

let RANGE_KM = 150;       // must match RANGE_KM in planes.py (home to the edge of the canvas)
let CORRECT = 0.02;       // how strongly a plane is pulled towards its real position each frame (0 to 1)
let TRAIL_EVERY = 250;    // add a puff to the trail every 250 milliseconds
let TRAIL_LIFE = 180000;  // how long a puff lasts, in milliseconds (3 minutes)
let ENGINE_GAP = 4;       // how far apart the two contrails start, in pixels
let START_SIZE = 2;       // how wide each contrail is when it's new, in pixels
let END_SIZE = 7;         // how wide it has spread by the time it fades away
let SKY = [135, 206, 235]; // sky blue

function setup() {
  createCanvas(windowWidth, windowHeight);

  // zoom slider at the bottom: min, max, start value, step
  zoomSlider = createSlider(0.25, 20, 1, 0.05);
  placeSlider();

  cloudShader = buildFilterShader(clouds);

  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.aircraft || data.planes; // /closest.json calls the list "aircraft", /planes.json calls it "planes"
}

// turn a 0-to-1 position into a screen position, zoomed around the middle
function screenX(x) {
  return width / 2 + (x - 0.5) * width * zoomSlider.value();
}

function screenY(y) {
  return height / 2 + (y - 0.5) * height * zoomSlider.value();
}

// the strands shader: this runs for every pixel on the screen
function clouds() {
  let sky = uniformVector4(() => [SKY[0] / 255, SKY[1] / 255, SKY[2] / 255, 1]);
  let pixel = uniformVector2(() => [1 / width, 1 / height]); // the size of one pixel
  let time = millis();

  filterColor.begin();
  let x = filterColor.texCoord.x;
  let y = filterColor.texCoord.y;

  // noise nudges each pixel a little, so the edges of the cloud wobble and drift
  // (a bigger number than 4 makes them wobble more, a bigger time number makes it slower)
  let px = x / pixel.x;  // this pixel's position on the screen
  let py = y / pixel.y;
  let nudgeX = (noise(px / 80, py / 80, time / 20000) - 0.5) * 4;
  let nudgeY = (noise(px / 80 + 100, py / 80, time / 20000) - 0.5) * 4;
  x = x + nudgeX * pixel.x;
  y = y + nudgeY * pixel.y;

  // average this pixel with some nearby ones to make it soft (a quick blur)
  let r = 1.5;
  let c = getTexture(filterColor.canvasContent, [x, y]);
  let left = getTexture(filterColor.canvasContent, [x - r * pixel.x, y]);
  let right = getTexture(filterColor.canvasContent, [x + r * pixel.x, y]);
  let up = getTexture(filterColor.canvasContent, [x, y - r * pixel.y]);
  let down = getTexture(filterColor.canvasContent, [x, y + r * pixel.y]);
  let cloud = (c + left + right + up + down) / 5;

  // lumpy, fluffy texture: the cloud is thicker in some places than others
  let thickness = noise(px / 25, py / 25, time / 30000) + 0.4;
  filterColor.set(mix(sky, cloud, min(thickness, 1)));
  filterColor.end();
}

function draw() {
  background(SKY);

  for (let plane of planes) {
    // a new plane starts where it is, with an empty trail
    if (!tracks[plane.id]) {
      tracks[plane.id] = { x: plane.x, y: plane.y, trail: [], lastPuff: 0 };
    }
    let t = tracks[plane.id];

    // fly the plane forward at its own speed, in the direction it's heading.
    // knots -> km per millisecond -> 0-to-1 units (the canvas is 2 * RANGE_KM across)
    let step = (plane.speed || 0) * 1.852 / 3600000 / (2 * RANGE_KM) * deltaTime;
    t.x += sin(radians(plane.heading || 0)) * step;  // heading 0 = north = up the screen
    t.y -= cos(radians(plane.heading || 0)) * step;

    // and pull it gently towards where the server says it really is,
    // so small mistakes don't build up
    t.x = lerp(t.x, plane.x, CORRECT);
    t.y = lerp(t.y, plane.y, CORRECT);

    if (millis() - t.lastPuff > TRAIL_EVERY) {
      // remember which way the plane was flying, so we know where its engines are
      t.trail.push({ x: t.x, y: t.y, heading: plane.heading || 0, born: millis() });
      t.lastPuff = millis();
    }
  }

  // contrails for every plane we've seen, even ones that have gone
  noStroke();
  for (let id in tracks) {
    let t = tracks[id];

    // throw away puffs that have faded away completely
    t.trail = t.trail.filter((p) => millis() - p.born < TRAIL_LIFE);

    for (let p of t.trail) {
      let age = (millis() - p.born) / TRAIL_LIFE; // 0 = brand new, 1 = gone
      let size = lerp(START_SIZE, END_SIZE, age);  // very slowly gets wider
      let gap = ENGINE_GAP + size / 2;             // and the two trails drift apart a little

      // the engines are either side of the plane, at right angles to the way it's flying
      // (heading 0 = north = up the screen, so "sideways" is cos and sin of the heading)
      let sideX = cos(radians(p.heading)) * gap / 2;
      let sideY = sin(radians(p.heading)) * gap / 2;

      let fade = 1 - age;
      fill(255, 255, 255, 230 * fade * fade);  // fades slowly at the end
      let x = screenX(p.x);
      let y = screenY(p.y);
      circle(x - sideX, y - sideY, size);  // left engine
      circle(x + sideX, y + sideY, size);  // right engine
    }
  }

  // make the puffs soft and cloudy (this only changes what's drawn so far)
  filter(cloudShader);

  // home (the antenna) in the middle
  fill(255, 80, 80);
 // circle(width / 2, height / 2, 10);

  // planes on top of the contrails
  for (let plane of planes) {
    let t = tracks[plane.id];
    let x = screenX(t.x);
    let y = screenY(t.y);

    // higher planes = bigger circles
    let size = map(plane.altitude, 0, 40000, 20, 10);


    fill(255, 100)
    circle(x, y, 5);

    // fill(20, 30, 60);
    // textSize(12);
    // text(plane.callsign, x + size / 2 + 4, y);
  }

  fill(20, 30, 60);
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
