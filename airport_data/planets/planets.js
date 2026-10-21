// Loading a JSON file in p5.js
// planets.json is a list of planets. Each planet has:
//   name     - what it's called
//   distance - how far from the Sun (millions of km)
//   size     - how wide it is (km)

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
  // let sunSize = map(1392700, 0, 143000, 4, 80);
  // fill(255, 200, 0);
  // noStroke();
  // circle(70 - sunSize / 2, height / 2, sunSize);

  for (let i = 0; i < planets.length; i++) {
    let planet = planets[i];

    // spread the planets out evenly, in order from the Sun
    let x = map(i, 0, planets.length - 1, 140, width - 80);
    // bigger planet = bigger circle
    let d = map(planet.size, 0, 143000, 4, 80);

    fill(150, 200, 255);
    circle(x, height / 2, d);

    fill(255);
    textAlign(CENTER);
    text(planet.name, x, height / 2 + 60);
    text(planet.distance + " million km", x, height / 2 + 80);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, 400);
}
