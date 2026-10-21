// Two-servo gimbal that points at a plane
// p5.js sends a line of text like "123,45" (pan,tilt), both 0 to 180,
// about 30 times a second. p5.js does the smoothing, so we just move there
//
// Uses a PCA9685 servo board (e.g. the Adafruit 16-channel PWM/Servo driver)
// Install "Adafruit PWM Servo Driver Library" from the Library Manager
//
// Wiring:
//   board SDA -> Arduino SDA, SCL -> SCL, VCC -> 5V, GND -> GND
//   pan servo (turns left/right)  -> channel 0
//   tilt servo (looks up/down)    -> channel 1
//   servo power: a separate 5V supply into the board's V+ screw terminal

#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver servoBoard = Adafruit_PWMServoDriver();  // default address 0x40

const int PAN_CHANNEL = 0;
const int TILT_CHANNEL = 1;

// pulse lengths in microseconds for 0 and 180 degrees
// if your servos don't reach the ends, or buzz at the ends, adjust these
const int SERVO_MIN_US = 500;
const int SERVO_MAX_US = 2500;

void setup() {
  Serial.begin(115200);  // must match baudRate in the p5.js sketch
  Serial.setTimeout(50); // don't wait long for numbers that never arrive
  servoBoard.begin();
  servoBoard.setOscillatorFrequency(27000000);
  servoBoard.setPWMFreq(50);  // servos expect 50 pulses a second
  delay(10);
  moveServo(PAN_CHANNEL, 90);
  moveServo(TILT_CHANNEL, 0);
  
}

void loop() {
  // read "pan,tilt" whenever a new line arrives

  if (Serial.available() > 0) {
    int pan = Serial.parseInt();   // reads the number before the comma
    int tilt = Serial.parseInt();  // reads the number after the comma
    if (Serial.read() == '\n') {   // only use it if the whole line arrived
      // if your pan servo turns the wrong way, use: moveServo(PAN_CHANNEL, 180 - pan);
      moveServo(PAN_CHANNEL, pan);
      moveServo(TILT_CHANNEL, tilt);
    }
  }
}

// like servo.write(angle), but for a channel on the servo board
void moveServo(int channel, int angle) {
  angle = constrain(angle, 0, 180);
  int pulse = map(angle, 0, 180, SERVO_MIN_US, SERVO_MAX_US);
  servoBoard.writeMicroseconds(channel, pulse);
}
