# Live planes for p5.js — Mac setup

Pick up real aircraft with a FlightAware Pro Stick Plus, then share their positions over the local network as JSON that p5.js sketches can load.

```
Antenna → Pro Stick Plus → dump1090 (decodes planes) → planes.py (shares JSON) → students' p5 sketches
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

### 6. Get planes.py
Put this folder (containing `planes.py` and the sketch folders such as `plane_starter`) somewhere easy, e.g. `~/Plane_Tracking`.

### 7. Set your home location
Open `planes.py` in a text editor. Near the top, under `# ---- change these ----`, set the latitude and longitude of your antenna:
```python
HOME_LAT = 51.473017   # your antenna's latitude
HOME_LON = -0.037393   # your antenna's longitude
RANGE_KM = 150         # distance from home to the edge of the canvas (for x, y)
```
To find your location, right-click your spot in Google Maps; the first item in the menu is the latitude and longitude (click it to copy).

Home is the middle of the canvas (`x` and `y` of 0.5), and every plane's `distance` is measured from it, so change it whenever you move the antenna to a new place.
If you set both to `None`, `planes.py` tries to read the location from dump1090 instead.
If you change `RANGE_KM`, change it to match in any sketch that has its own `RANGE_KM` (e.g. `plane_contrails.js`).

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
cd ~/Plane_Tracking
python3 planes.py
```
It prints the addresses to give students, for example:
```
All planes:      http://192.168.1.50:8081/planes
Closest 5:       http://192.168.1.50:8081/closest
Students use:    http://192.168.1.50:8000/planes.json
Starter sketch:  http://192.168.1.50:8000/plane_starter/
```
Every address works on both ports, 8081 and 8000.
If macOS asks whether Python may accept incoming connections, click **Allow**.

### To stop
Press **Ctrl + C** in each window.

---

## No antenna? Demo mode

To test or plan lessons without the stick, skip Window 1 and run:
```
cd ~/Plane_Tracking
python3 planes.py --demo
```
Fake planes fly around and are shared in exactly the same format.

---

## For students

1. Be on the **same Wi-Fi / network** as the Mac.
2. Open the sketch's `.js` file (e.g. `plane_starter/plane_starter.js`) and change the `server` line to the address `planes.py` printed:
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
| `planes.py` says it can't read plane data | Make sure Window 1 is running with `--net`. |
| `No home location` error | Set `HOME_LAT` and `HOME_LON` in `planes.py` (step 7). |
| Planes are in the wrong place on the canvas | Check `HOME_LAT` and `HOME_LON` are your antenna's location, not the example one. |
| Students can't connect | Same network? Correct IP? Did you click **Allow** on the firewall pop-up? |
| Many planes have no lat/lon | Normal: some aircraft don't broadcast position, and weak signals take longer to decode. `planes.py` only sends planes with a position. Move the antenna higher or closer to a window. |
| Very few planes | Antenna placement matters most: high up, clear view of the sky. A short USB extension cable also reduces interference from the Mac. |
