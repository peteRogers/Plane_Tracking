// Every public airport as an ellipse on a 2:1 world map
// Each airport has: iata, icao, name, city, country, lat, lon, size

let airports = [];

async function setup() {
  // wait for the airports to load before carrying on
  airports = await loadJSON("../all_public_airports.json");

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
    if(airport.size == "large"){
      fill(255); 
      text(airport.icao, x, y)
    }
     if(airport.size == "medium"){
      fill(255, 0, 0)
      circle(x, y, 2)
    }
    
    
    //ellipse(x, y, 3, 3);
  }

  fill(255);
  text(airports.length + " airports", 20, 30);
}
