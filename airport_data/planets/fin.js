// Loading a JSON file in p5.js
// planets.json is a list of planets. Each planet has:
//   name     - what it's called
//   distance - how far from the Sun (millions of km)
//   size     - how wide it is (km)
//   color    - what colour to draw it (a hex code like "#3d7be0")
//   moons    - how many moons it has

let planets = [];

async function setup() {
  createCanvas(windowWidth, 400);

  // wait for the file to load before carrying on
  planets = await loadJSON("planets.json");

  // try these in the console:
  console.log(planets);            // the whole list
}

function draw() {
  background(10, 10, 30);

  // the Sun on the left, at the same scale as the planets (1,392,700 km wide!)
  // it's so big that only the edge fits on the screen
  let sunSize = map(1392700, 0, 143000, 4, 80);
  fill(255, 200, 0);
  noStroke();
  circle(70 - sunSize / 2, height / 2, sunSize);

  for (let i = 0; i < planets.length; i++) {
    let planet = planets[i];

    // spread the planets out evenly, in order from the Sun
    let x = spreadX(i, planets.length);
    // bigger planet = bigger circle
    let d = map(planet.size, 0, 143000, 4, 80);

    fill(planet.color);
    circle(x, height / 2, d);

    // draw each moon as a tiny dot, spaced evenly in a ring around the planet
    fill(200);
    noStroke(); // no outline, or the tiny dots just look black
    for (let m = 0; m < planet.moons; m++) {
      let angle = map(m, 0, planet.moons, 0, TWO_PI);
      let ringSize = d / 2 + 8;
      let moonX = x + cos(angle) * ringSize;
      let moonY = height / 2 + sin(angle) * ringSize;
      circle(moonX, moonY, 2);
    }

    fill(255);
    textAlign(CENTER);
    text(planet.name, x, height / 2 + 60);
    text(planet.distance + " million km", x, height / 2 + 80);
    text(planet.moons + " moons", x, height / 2 + 100);
  }
}

// gives the x position for item number "position" out of "total" items
// the screen (minus some padding on each side) is split into one slot per item,
// and each item sits in the middle of its slot
function spreadX(position, total) {
  let padding = 60;
  let slotWidth = (width - padding * 2) / total;
  return padding + slotWidth * position + slotWidth / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, 400);
}
