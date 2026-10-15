// Two-servo gimbal that points at a plane
// p5.js sends a line of text like "123,45" (pan,tilt), both 0 to 180,
// about 30 times a second. p5.js does the smoothing, so we just move there
//
// Wiring:
//   pan servo (turns left/right)  signal -> pin 9
//   tilt servo (looks up/down)    signal -> pin 10
//   both servos: red -> 5V (better: a separate 5V supply), brown/black -> GND
//   if you use a separate supply, connect its GND to the Arduino GND too

#include <Servo.h>

Servo panServo;
Servo tiltServo;

void setup() {
  Serial.begin(115200);  // must match baudRate in the p5.js sketch
  Serial.setTimeout(50); // don't wait long for numbers that never arrive
  panServo.attach(9);
  tiltServo.attach(10);
  panServo.write(90);
  tiltServo.write(0);
}

void loop() {
  // read "pan,tilt" whenever a new line arrives
  if (Serial.available() > 0) {
    int pan = Serial.parseInt();   // reads the number before the comma
    int tilt = Serial.parseInt();  // reads the number after the comma
    if (Serial.read() == '\n') {   // only use it if the whole line arrived
      // if your pan servo turns the wrong way, use: panServo.write(180 - pan);
      panServo.write(constrain(pan, 0, 180));
      tiltServo.write(constrain(tilt, 0, 180));
    }
  }
}
