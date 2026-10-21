// Plane beeps for every plane in p5.js
// Each plane chirps on its own: the closer it is, the closer together its chirps

// Change this to the server address:
let server = "http://192.168.50.56:8081/planes";  // every plane, nearest first
//let server = "http://localhost:8000/planes";  // planes.py running on this computer
let planes = [];      // all the planes we can see
let audio;            // makes the sound
let lastBeep = {};    // when each plane last chirped, by plane id (in milliseconds)

function setup() {
  createCanvas(windowWidth, windowHeight);
  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.aircraft;
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

  for (let i = 0; i < planes.length; i++) {
    let plane = planes[i];

    // a new plane starts at a random point in its rhythm,
    // so they don't all chirp at the same moment
    if (lastBeep[plane.id] === undefined) {
      lastBeep[plane.id] = millis() - random(5000);
    }

    // closer plane = shorter wait between chirps
    // 0 km away -> every 0.5 seconds, 50 km away -> every 5 seconds
    let wait = map(plane.distance, 0, 50, 500, 5000, true);

    if (millis() - lastBeep[plane.id] > wait) {
      // further plane = deeper, quieter chirp
      // 0 km -> 400 Hz, 50 km -> 100 Hz
      let pitch = map(plane.distance, 0, 50, 400, 100, true);
      let loudness = map(plane.distance, 0, 50, 0.2, 0.12, true);
      beep(pitch, loudness);
      lastBeep[plane.id] = millis();
    }

    // list the planes down the screen, nearest at the top
    text(plane.callsign + "  " + nf(plane.distance, 0, 1) + " km away", width / 2, 60 + i * 30);
  }
}

// browsers only let a page make sound after you click on it
function mousePressed() {
  if (!audio) audio = new AudioContext();
}

// one short chirp
function beep(pitch, loudness) {
  let now = audio.currentTime;

  let tone = audio.createOscillator();
  tone.type = "sine";          // sine = the smoothest, gentlest sound
  tone.frequency.value = pitch;

  // quick fade in and out, so it's a short "chirp" not a sharp click
  let volume = audio.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(loudness, now + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  tone.connect(volume);
  volume.connect(audio.destination);
  tone.start(now);
  tone.stop(now + 0.15);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
