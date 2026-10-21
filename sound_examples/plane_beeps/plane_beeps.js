// Plane beeps in p5.js
// Beeps for the closest plane: the closer it is, the closer together the beeps

// Change this to the server address:
let server = "http://192.168.50.56:8081/closest.json?n=1";  // just the closest plane
//let server = "http://localhost:8000/closest.json?n=1";  // planes.py running on this computer
let plane;          // the closest plane
let audio;          // makes the sound
let lastBeep = 0;   // when we last beeped (in milliseconds)

function setup() {
  createCanvas(windowWidth, windowHeight);
  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  plane = data.aircraft[0];
}

function draw() {
  background(15, 25, 50);
  fill(255);
  textAlign(CENTER);
  textSize(20);

  if (!audio) {
    text("click to start", width / 2, height / 2);
    return;
  }
  if (!plane) return;

  // closer plane = shorter wait between beeps
  // 0 km away -> every 0.5 seconds, 50 km away -> every 5 seconds
  let wait = map(plane.distance, 0, 50, 500, 5000, true);

  if (millis() - lastBeep > wait) {
    // further plane = deeper, quieter beep
    // 0 km -> 500 Hz, 50 km -> 250 Hz
    let pitch = map(plane.distance, 0, 50, 500, 250, true);
    let loudness = map(plane.distance, 0, 50, 0.2, 0.12, true);
    beep(pitch, loudness);
    lastBeep = millis();
  }

  text(plane.callsign + "  " + nf(plane.distance, 0, 1) + " km away", width / 2, height / 2);
}

// browsers only let a page make sound after you click on it
function mousePressed() {
  if (!audio) audio = new AudioContext();
}

// one soft beep
function beep(pitch, loudness) {
  let now = audio.currentTime;

  let tone = audio.createOscillator();
  tone.type = "sine";          // sine = the smoothest, gentlest sound
  tone.frequency.value = pitch;

  // fade in and out gently, so it's a soft "boop" not a sharp click
  let volume = audio.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(loudness, now + 0.05);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  tone.connect(volume);
  volume.connect(audio.destination);
  tone.start(now);
  tone.stop(now + 0.8);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
