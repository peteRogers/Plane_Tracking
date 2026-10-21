# Live planes for p5.js — Mac setup

Pick up real aircraft with a FlightAware Pro Stick Plus, then share their positions over the local network as JSON that p5.js sketches can load.

```
Antenna → Pro Stick Plus → dump1090 (decodes planes) → bridge.py (shares JSON) → students' p5 sketches
```

---

## Part 1: Install (once only)

Open **Terminal** and run each step in order.

### 1. Apple developer tools
Gives you `git`, `make` and Python.
```
xcode-select --install
```
Click **Install** in the pop-up. If it says they're already installed, move on.

### 2. Homebrew
Go to **https://brew.sh**, copy the install command and paste it into Terminal.
When it finishes, it shows **"Next steps"** with two commands. Run those too, or `brew` won't be found.

### 3. Radio library for the stick
```
brew install librtlsdr pkg-config
```

### 4. Check the stick works
Plug in the Pro Stick Plus (antenna attached), then:
```
rtl_test
```
You should see `Found 1 device(s)`. Press **Ctrl + C** to stop. No drivers are needed.

### 5. Download and build dump1090
```
cd ~
git clone https://github.com/antirez/dump1090.git
cd dump1090
make
```

### 6. Put the class files somewhere easy
Put the `plane-class` folder (containing `bridge.py` and the `sketch` folder) in your home folder, e.g. `~/plane-class`.

Open `bridge.py` in a text editor and set your antenna's location near the top:
```python
HOME_LAT, HOME_LON = 51.50, -0.12   # change to your location
RANGE_KM = 150                      # distance from centre to edge of the canvas
```

---

## Part 2: Run it (every time)

You need **two Terminal windows**. Leave both open while the class is running.

### Window 1 — decode the planes
```
cd ~/dump1090
./dump1090 --net --interactive
```
A table of planes appears and updates itself. Live map: **http://localhost:8080**

### Window 2 — share the data
Open a new window with **Cmd + N**, then:
```
cd ~/plane-class
python3 bridge.py
```
It prints the addresses to give students, for example:
```
Students use:  http://192.168.1.50:8000/planes.json
Starter sketch: http://192.168.1.50:8000/sketch/
```
If macOS asks whether Python may accept incoming connections, click **Allow**.

### To stop
Press **Ctrl + C** in each window.

---

## No antenna? Demo mode

To test or plan lessons without the stick, skip Window 1 and run:
```
cd ~/plane-class
python3 bridge.py --demo
```
Fake planes fly around and are shared in exactly the same format.

---

## For students

1. Be on the **same Wi-Fi / network** as the Mac.
2. Open `sketch.js` and change the `server` line to the address the bridge printed:
   ```js
   let server = "http://192.168.1.50:8000/planes.json";
   ```
3. Run the sketch **locally** (e.g. VS Code with the Live Server extension).
   The p5 Web Editor (editor.p5js.org) **can't** load data from a local network address.

Each plane in `data.planes` has:

| Field      | Meaning                                   |
|------------|-------------------------------------------|
| `callsign` | Flight name, e.g. `BAW123`                |
| `altitude` | Height in feet                            |
| `speed`    | Speed in knots                            |
| `heading`  | Direction in degrees (0 = north)          |
| `lat`, `lon` | Real position                           |
| `x`, `y`   | Screen position from 0 to 1 (antenna is 0.5, 0.5) — use `plane.x * width` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `permission denied: ./dump1090` | You're in the wrong folder. Run `cd ~/dump1090` first. |
| `Unknown option '--quiet'` | This version has no `--quiet`. Use `--interactive` instead. |
| `command not found: brew` | Run the two "Next steps" commands Homebrew showed at the end of its install, or reopen Terminal. |
| `rtl_test` finds no device | Unplug and replug the stick; try another USB port or adapter. |
| Bridge says it can't read dump1090 | Make sure Window 1 is running with `--net`. |
| Students can't connect | Same network? Correct IP? Did you click **Allow** on the firewall pop-up? |
| Many planes have no lat/lon | Normal: some aircraft don't broadcast position, and weak signals take longer to decode. The bridge only sends planes with a position. Move the antenna higher or closer to a window. |
| Very few planes | Antenna placement matters most: high up, clear view of the sky. A short USB extension cable also reduces interference from the Mac. |
