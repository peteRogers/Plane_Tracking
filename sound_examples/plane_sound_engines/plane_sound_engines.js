// Live planes in p5.js - now with sound!
// Each plane has: callsign, altitude (feet), speed (knots),
// heading (degrees), distance (km from home), lat, lon, and x, y (0 to 1, home is in the middle)
//
// Every plane gets its own "voice": a rumble of noise plus an engine hum.
//   distance + altitude -> how loud it is (silent beyond hearingKm, loud only when close)
//   distance + altitude -> how muffled it is (further / higher = more muffled)
//   speed               -> the pitch of the engine hum
//   x position          -> left / right speaker

// Change this to the server address:
//let server = "http://192.168.50.56:8081/planes.json";
//let server = "http://localhost:8000/closest.json";  // planes.py running on this computer
let server = "http://192.168.50.56:8081/closest.json";  // add ?n=3 for a different number
let planes = [];
let zoomSlider;

// sound stuff
let audio;          // the Web Audio "context" - everything sound-related lives in here
let master;         // overall volume for everything
let noiseBuffer;    // 4 seconds of rumbly noise that every plane shares
let voices = {};    // one voice per plane, looked up by plane.id
let muted = false;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // zoom slider at the bottom: min, max, start value, step
  zoomSlider = createSlider(0.25, 20, 1, 0.05);
  placeSlider();

  getPlanes();
  setInterval(getPlanes, 1000); // ask for new data every second
}

function getPlanes() {
  loadJSON(server, gotPlanes, () => console.log("Can't reach " + server));
}

function gotPlanes(data) {
  planes = data.aircraft; // /planes.json calls this list data.planes
  updateSounds();
}

function draw() {
  background(15, 25, 50);

  // home (the antenna) in the middle
  fill(255, 80, 80);
  noStroke();
  circle(width / 2, height / 2, 10);

  let zoom = zoomSlider.value();

  for (let plane of planes) {
    // zoom in/out around the middle of the screen (x, y of 0.5 is home)
    let x = width / 2 + (plane.x - 0.5) * width * zoom;
    let y = height / 2 + (plane.y - 0.5) * height * zoom;

    // higher planes = bigger circles
    let size = map(plane.altitude, 0, 40000, 5, 40);

    // a ring that shows how loud this plane is
    let voice = voices[plane.id];
    if (voice && !muted) {
      noFill();
      stroke(120, 200, 255, 150);
      circle(x, y, size + voice.loudness * 300);
      noStroke();
    }

    fill(255, 255, 255, 180);
    circle(x, y, size);

    fill(255);
    textSize(12);
    text(plane.callsign, x + size / 2 + 4, y);
  }

  fill(255);
  text(planes.length + " planes", 20, 30);
  text("zoom " + zoom + "x", width / 2 + 110, height - 26);

  if (!audio || audio.state != "running") {
    textAlign(CENTER);
    textSize(20);
    text("click anywhere to turn the sound on", width / 2, 60);
    textAlign(LEFT);
  } else {
    text(muted ? "muted (press M)" : "press M to mute", 20, 50);
  }
}

// browsers only let a page make sound after you click on it
function mousePressed() {
  if (!audio) startAudio();
  audio.resume();
}

function keyPressed() {
  if (key == "m" || key == "M") {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, audio.currentTime, 0.1);
  }
}

// ---------------------------------------------------------------
// Sound
// ---------------------------------------------------------------

function startAudio() {
  audio = new AudioContext();

  // a compressor stops lots of planes at once from getting too loud and crackling
  let compressor = audio.createDynamicsCompressor();
  compressor.connect(audio.destination);

  master = audio.createGain();
  master.gain.value = 0.8;
  master.connect(compressor);

  // "brown" noise: like white noise (TV static) but with most of the hiss
  // taken out, so it sounds like a deep rumble / roar
  let length = audio.sampleRate * 4;
  noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
  let data = noiseBuffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    let white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }

  updateSounds();
}

function makeVoice() {
  let now = audio.currentTime;

  // the roar: looping noise -> muffling filter
  let noise = audio.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  let filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  noise.connect(filter);

  // the engine hum: two slightly out-of-tune oscillators make a "wobbly" drone
  let hum1 = audio.createOscillator();
  let hum2 = audio.createOscillator();
  hum1.type = "sawtooth";
  hum2.type = "sawtooth";
  let humFilter = audio.createBiquadFilter();
  humFilter.type = "lowpass";
  let humVolume = audio.createGain();
  humVolume.gain.value = 0.12;   // the hum is quieter than the roar
  hum1.connect(humFilter);
  hum2.connect(humFilter);
  humFilter.connect(humVolume);
  humVolume.connect(filter);

  // volume and left/right
  let volume = audio.createGain();
  volume.gain.value = 0;         // start silent and fade in
  let panner = audio.createStereoPanner();
  filter.connect(volume);
  volume.connect(panner);
  panner.connect(master);

  // start the noise at a random spot so planes don't all sound identical
  noise.start(now, Math.random() * 4);
  hum1.start(now);
  hum2.start(now);

  return { noise, hum1, hum2, filter, humFilter, volume, panner, loudness: 0 };
}

function updateSounds() {
  if (!audio) return;
  let now = audio.currentTime;
  let glide = 0.4;   // how slowly sounds change, in seconds (smooths out the 1-second updates)
  let seen = {};

  for (let plane of planes) {
    seen[plane.id] = true;
    if (!voices[plane.id]) voices[plane.id] = makeVoice();
    let v = voices[plane.id];

    // how far away is it really? use distance along the ground AND height
    let heightKm = plane.altitude * 0.0003048;
    let slantKm = sqrt(sq(plane.distance) + sq(heightKm));

    // closeness: 1 = right overhead, 0 = too far away to hear
    let hearingKm = 5;   // planes further than this are silent - make it smaller to need them even closer
    let closeness = constrain(1 - slantKm / hearingKm, 0, 1);

    // further away = quieter. Cubing it makes the volume drop off fast,
    // so a plane only gets really loud when it's close
    v.loudness = 0.9 * pow(closeness, 3);
    v.volume.gain.setTargetAtTime(v.loudness, now, glide);

    // further away or higher = more muffled (lower filter cutoff)
    let cutoff = map(pow(closeness, 2), 0, 1, 100, 6000);
    cutoff *= map(plane.altitude, 0, 40000, 1, 0.3, true);
    v.filter.frequency.setTargetAtTime(cutoff, now, glide);

    // faster = higher engine hum
    let pitch = map(plane.speed, 0, 600, 50, 160, true);
    v.hum1.frequency.setTargetAtTime(pitch, now, glide);
    v.hum2.frequency.setTargetAtTime(pitch * 1.02, now, glide);
    v.humFilter.frequency.setTargetAtTime(pitch * 4, now, glide);

    // left of home = left speaker, right of home = right speaker
    let pan = constrain((plane.x - 0.5) * 4, -1, 1);
    v.panner.pan.setTargetAtTime(pan, now, glide);
  }

  // planes that have gone: fade out, then throw the voice away
  for (let id in voices) {
    if (!seen[id]) {
      let v = voices[id];
      v.volume.gain.setTargetAtTime(0, now, 0.5);
      v.noise.stop(now + 3);
      v.hum1.stop(now + 3);
      v.hum2.stop(now + 3);
      delete voices[id];
    }
  }
}

function placeSlider() {
  zoomSlider.size(200);
  zoomSlider.position(width / 2 - 100, height - 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  placeSlider();
}
