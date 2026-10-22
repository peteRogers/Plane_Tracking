# Plane contrails

Live planes drift across a blue sky, leaving white contrails behind them like real planes do. Most planes leave two thin trails, one from each engine, and they slowly spread out and fade away. A shader makes the trails soft and wispy so they look like cloud.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page you open. Loads p5.js and the sketch. |
| `plane_contrails.js` | The p5.js sketch. Gets the planes from the server, moves them smoothly, draws their contrails and makes them cloudy. |

## Running it

1. Start the plane server (`planes.py`) first. See the main [README](../../README.md).
2. Change `server` at the top of `plane_contrails.js` to your server's address.
3. Open `index.html` from `http://localhost`, for example with **Go Live** in VS Code.

Use the slider at the bottom to zoom in and out.

## How it works

1. Every second the sketch asks the server for the planes.
2. Each frame it moves every plane forward at its own speed and heading, and pulls it gently towards where the server says it really is.
3. Every 250 milliseconds it drops a "puff" behind each plane. Each contrail is a line of these puffs.
4. Each puff starts small and grows wider and fainter as it gets older, until it disappears after 3 minutes.
5. The `clouds()` shader then blurs the puffs a little and wobbles their edges with noise, so they look like soft cloud instead of dots.

## Changing the size of the contrails

The settings are near the top of `plane_contrails.js`:

```js
let ENGINE_GAP = 4;       // how far apart the two contrails start, in pixels
let START_SIZE = 3;       // how wide each contrail is when it's new, in pixels
let END_SIZE = 10;        // how wide it has spread by the time it fades away
```

- **`START_SIZE`** is how thick the trail is just behind the plane.
- **`END_SIZE`** is how wide it has spread just before it fades away. The sketch blends from one to the other over the trail's life.
- To make the trails bigger, raise both numbers. To make them thinner, lower both. They look most natural when `END_SIZE` is about 3 to 4 times `START_SIZE`.
- **`ENGINE_GAP`** is the space between the two engine trails. If wider trails merge into one line, raise it (try `6`).

Two more things change how big the trails look:

- **`let r = 1.5;`** in `clouds()` is how much the trails are blurred. A bigger number makes them softer and fluffier, so they look wider.
- **`TRAIL_LIFE`** is how long a trail lasts, in milliseconds. A bigger number makes the trails longer, and they spread more slowly.

## Other things to try

| Setting | What it changes |
| --- | --- |
| `SKY` | The sky colour, as red, green, blue. |
| `TRAIL_EVERY` | How often a puff is added. Smaller makes smoother trails but is slower to draw. |
| `CORRECT` | How strongly each plane is pulled to its real position. Bigger is more accurate but jumpier. |
| `* 4` in the `nudgeX` and `nudgeY` lines | How much the edges of the cloud wobble. |
