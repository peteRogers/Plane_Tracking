// Point the gimbal with your face using the webcam - no plane server needed
// Move your head left/right to pan, up/down to tilt
// Sends "pan,tilt" to the Arduino, so it works with gimbal_arduino.ino as it is
// See README.md for how to run it

let video;
let faces = [];    // the faces ml5 found in the latest video frame
let faceX, faceY;  // where the face is on the screen
let lastSend = 0;  // when we last sent to the Arduino (in milliseconds)

const arduino = new ArduinoSerial({ baudRate: 115200 });

function setup() {
  createCanvas(windowWidth, windowHeight);
  faceX = width / 2;
  faceY = height / 2;

  video = createCapture(VIDEO);
  video.hide();

  // flipped mirrors the face points, so moving left moves the crosshair left
  let faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true }, () => {
    faceMesh.detectStart(video, (results) => faces = results);
  });
}

function draw() {
  background(15, 25, 50);

  // draw the webcam mirrored to match the face points
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 120);
  image(video, 0, 0, width, height);
  pop();

  // follow the tip of the nose (keypoint 1), or stay put if there's no face
  // lerp moves part of the way each frame so the gimbal doesn't jitter
  if (faces.length > 0) {
    let nose = faces[0].keypoints[1];
    faceX = lerp(faceX, map(nose.x, 0, video.width, 0, width), 0.3);
    faceY = lerp(faceY, map(nose.y, 0, video.height, 0, height), 0.3);
  }

  // left to right = pan 45 to 140, bottom to top = tilt 0 to 50
  // change these numbers to suit your gimbal
  let pan = round(constrain(map(faceX, 0, width, 45, 140), 45, 140));
  let tilt = round(constrain(map(faceY, height, 0, 0, 50), 0, 50));

  // send e.g. "90,25\n" about 30 times a second
  if (millis() - lastSend > 33) {
    arduino.send(pan + "," + tilt + "\n");
    lastSend = millis();
  }

  // crosshair where the face is
  stroke(0, 200, 255);
  line(faceX, 0, faceX, height);
  line(0, faceY, width, faceY);

  noStroke();
  fill(255);
  textSize(16);
  text("pan " + pan + ", tilt " + tilt + "   (" + arduino.status + ", " + faces.length + " face)", 20, 60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
