// Live planes in p5.js
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), lat, lon, and x, y (0 to 1, home is in the middle)

// Change this to the server address:
//let server = "http://192.168.50.56:8081/planes.json";
let server = "http://192.168.50.56:8081/closest?zoom=5";  // add ?n=3 for a different number
let planes = [];


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

}

function draw() {
  background(15, 25, 50);

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
