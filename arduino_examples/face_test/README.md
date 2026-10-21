# Face test

Point the plane gimbal with your face. The webcam finds your nose, and the gimbal follows it: move your head left and right to pan, up and down to tilt. No plane server is needed, so it's a quick way to check the gimbal works.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page you open. Loads p5.js, ml5.js (face tracking), `../arduinoSerial.js` and the sketch. |
| `face_test.js` | The p5.js sketch. Finds your nose in the webcam, turns its position into pan and tilt angles, and sends them to the Arduino. |
| `../arduinoSerial.js` | Shared helper that talks to the Arduino over USB (Web Serial) and adds the **Connect to Arduino** button. |
| `../gimbal_arduino/gimbal_arduino.ino` | The Arduino code. It's the same one the plane tracker uses, so you don't need to change it. |

## Running it

1. Upload `gimbal_arduino.ino` to the Arduino and plug it in with USB.
2. Open `index.html` from `http://localhost`, for example with **Go Live** in VS Code. Double-clicking the file won't work.
3. Use **Chrome** or **Edge**, because other browsers don't support Web Serial.
4. Allow the camera when the browser asks.
5. Click **Connect to Arduino** and pick the Arduino's port.

The text at the top of the screen shows the pan and tilt being sent, whether the Arduino is connected, and whether a face has been found.

## How it works

1. ml5.js `faceMesh` finds the points on your face in each webcam frame. The sketch uses keypoint 1, the tip of the nose.
2. The nose position is moved only part of the way each frame (`lerp`) so the gimbal moves smoothly instead of jittering. If your face is lost, the gimbal stays where it is.
3. The position on screen becomes the angles:
   - left to right → pan **45 to 140**
   - bottom to top → tilt **0 to 50**
4. About 30 times a second it sends a line like `90,25` to the Arduino, which moves the servos to those angles.

## Adjusting it for your gimbal

The angle ranges are in these two lines of `face_test.js`:

```js
let pan = round(constrain(map(faceX, 0, width, 45, 140), 45, 140));
let tilt = round(constrain(map(faceY, height, 0, 0, 50), 0, 50));
```

- To move less, bring the two numbers closer together. To move more, spread them apart.
- If it points too high or too low, raise or lower both tilt numbers by the same amount. Servos only go from 0 to 180.
- If it's still too high at tilt 0, refit the servo horn lower.
- If a servo turns the wrong way, use `180 - pan` or `180 - tilt` in the `.ino` file.
