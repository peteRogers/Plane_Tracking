// Test the gimbal with the mouse - no plane server needed
// Move the mouse left/right to pan, up/down to tilt
// Sends "pan,tilt" (both 0 to 180) to the Arduino, the same as plane_gimbal.js,
// so it works with plane_gimbal_arduino.ino as it is
//
// Web Serial only works in Chrome / Edge, and the page must be opened from
// http://localhost (e.g. Go Live in VS Code), not by double-clicking the file

let pan = 90;
let tilt = 0;
let lastSend = 0;  // when we last sent to the Arduino (in milliseconds)

const arduino = new ArduinoSerial({ baudRate: 115200 });
arduino.onLine = (line) => console.log("from Arduino:", line);

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(15, 25, 50);

  // left of the screen = 0, right = 180
  // bottom of the screen = 0 (horizon), top = 180
  pan = constrain(map(mouseX, 0, width, 0, 180), 0, 180);
  tilt = constrain(map(mouseY, height, 0, 0, 180), 0, 180);

  // send "pan,tilt" and a new line, e.g. "123,45\n", about 30 times a second
  if (millis() - lastSend > 33) {
    arduino.send(round(pan) + "," + round(tilt) + "\n");
    lastSend = millis();
  }

  // crosshair where the mouse is
  stroke(0, 200, 255);
  strokeWeight(1);
  line(mouseX, 0, mouseX, height);
  line(0, mouseY, width, mouseY);

  noStroke();
  fill(255);
  textSize(16);
  text("sending pan " + round(pan) + ", tilt " + round(tilt) + "   (" + arduino.status + ")", 20, 60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
