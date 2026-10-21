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
  fill(255)
  // try these in the console:
  console.log(planets);            // the whole list
}

function draw() {
  background(0);


  for (let i = 0; i < planets.length; i++) {
    let planet = planets[i];

    // spread the planets out evenly
    let x = spreadX(i, planets.length);
  
    text(planet.name, 20, (i+1) * 20)
    noStroke(); // no outline, or the tiny dots just look black



  }
}




///Helper Functions below

// gives the x position for item number "position" out of "total" items
// the screen (minus some padding on each side) is split into one slot per item,
// and each item sits in the middle of its slot
function spreadX(position, total) {
  let padding = width * 0.05; // 5% of the screen width on each side
  let slotWidth = (width - padding * 2) / total;
  return padding + slotWidth * position + slotWidth / 2;
}

function windowResized() {
  resizeCanvas(windowWidth, 400);
}
