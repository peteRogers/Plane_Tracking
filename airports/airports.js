// Every public airport as an ellipse on a 2:1 world map
// Each airport has: iata, icao, name, city, country, lat, lon, size

let airports = [];

function preload() {
  // p5 turns a top-level JSON array into an object, so grab its values
  loadJSON("../all_public_airports.json", (d) => airports = Object.values(d));
}

function setup() {
  // canvas is twice as wide as it is tall (360° of lon by 180° of lat)
  let h = min(windowHeight, windowWidth / 2);
  createCanvas(h * 2, h);
  noLoop();
}

function draw() {
  background(15, 25, 50);
  noStroke();
  fill(255, 255, 255, 150);

  for (let airport of airports) {
    let x = map(airport.lon, -180, 180, 0, width);
    let y = map(airport.lat, 90, -90, 0, height);
    ellipse(x, y, 3, 3);
  }

  fill(255);
  text(airports.length + " airports", 20, 30);
}
