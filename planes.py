#!/usr/bin/env python3
"""
Plane data server — one script for the Arduino, p5 sketches and classes.

Run on the Mac (no extra installs needed):
    python3 planes.py          # real planes from the FlightAware stick
    python3 planes.py --demo   # fake planes, for testing without the antenna

  http://<mac-ip>:8081/planes          every plane, nearest first
  http://<mac-ip>:8081/closest         the 5 closest planes
  http://<mac-ip>:8081/closest?n=3     any number you like
  http://<mac-ip>:8081/closest?zoom=20 zoomed in: x, y cover 1/20th of the area
                                       (add &zoom= to any of these, e.g. ?n=3&zoom=5)
  http://<mac-ip>:8000/planes.json     beginner-friendly format for p5.js classes
                                       (includes x, y between 0 and 1 for drawing)
  http://<mac-ip>:8000/plane_starter/  any file in this folder is served too

Every endpoint works on both ports (8081 and 8000).
"""

import json
import math
import random
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# ---- change these ----
SOURCE = "http://localhost:8080/data.json"             # antirez dump1090
RECEIVER = "http://localhost:8080/data/receiver.json"  # not used once HOME_LAT/LON are set
HOME_LAT = 51.473017   # your antenna's latitude
HOME_LON = -0.037393   # your antenna's longitude
PORTS = (8081, 8000)   # 8081 for /planes and /closest, 8000 for the classes' /planes.json
DEFAULT_COUNT = 5
MAX_POSITION_AGE = 60  # seconds; ignore planes whose position is older than this
RANGE_KM = 150         # distance from home to the edge of the canvas (for x, y)
DEMO_HOME = (51.50, -0.12)  # used in --demo when no home location is set (London)
ROUTE_API = "https://api.adsbdb.com/v0/callsign/"  # free callsign -> route lookup
# ----------------------

DEMO = "--demo" in sys.argv

# Filled in by the poll() thread once a second
latest = {"home": None, "planes": [], "time": 0, "error": "starting up"}
_home = None


def fetch_json(url):
    with urllib.request.urlopen(url, timeout=3) as r:
        return json.load(r)


def home_location():
    global _home
    if HOME_LAT is not None and HOME_LON is not None:
        return HOME_LAT, HOME_LON
    if _home:
        return _home
    if DEMO:
        return DEMO_HOME
    try:
        rx = fetch_json(RECEIVER)
        if "lat" in rx and "lon" in rx:
            _home = (rx["lat"], rx["lon"])
            return _home
    except Exception:
        pass
    raise RuntimeError("No home location: set HOME_LAT and HOME_LON in planes.py")


def distance_km(lat1, lon1, lat2, lon2):
    # Haversine formula
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def to_xy(lat, lon, home_lat, home_lon, zoom=1):
    """Turn lat/lon into x, y between 0 and 1 (home is 0.5, 0.5).
    zoom 2 = the canvas edge is half as far away, so planes spread out twice as much.
    Planes outside the zoomed area get x or y below 0 or above 1 (off the canvas)."""
    range_km = RANGE_KM / zoom
    dy_km = (lat - home_lat) * 111.0
    dx_km = (lon - home_lon) * 111.0 * math.cos(math.radians(home_lat))
    x = 0.5 + dx_km / (2 * range_km)
    y = 0.5 - dy_km / (2 * range_km)
    return round(x, 4), round(y, 4)


# ---- Fake planes for --demo -------------------------------------------------
fake = []


def make_fake(home_lat, home_lon):
    return [{
        "hex": f"demo{i:02d}",
        "flight": random.choice(["BAW", "EZY", "RYR", "VIR", "DLH"]) + str(random.randint(100, 999)),
        "lat": home_lat + random.uniform(-1, 1),
        "lon": home_lon + random.uniform(-1.5, 1.5),
        "alt_baro": random.randint(3000, 38000),
        "gs": random.randint(180, 480),
        "track": random.randint(0, 359),
    } for i in range(12)]


def move_fake(home_lat, home_lon):
    if not fake:
        fake.extend(make_fake(home_lat, home_lon))
    for p in fake:
        km = p["gs"] * 1.852 / 3600          # km moved in one second
        p["lat"] += km * math.cos(math.radians(p["track"])) / 111.0
        p["lon"] += km * math.sin(math.radians(p["track"])) / (111.0 * math.cos(math.radians(home_lat)))
        if abs(p["lat"] - home_lat) > 1.5 or abs(p["lon"] - home_lon) > 2.5:
            p["lat"], p["lon"] = home_lat, home_lon   # fly off the edge -> restart
            p["track"] = random.randint(0, 359)
    return fake
# -----------------------------------------------------------------------------


def read_planes(home_lat, home_lon):
    """Every plane with a recent position, tidied up and sorted nearest first."""
    if DEMO:
        raw = move_fake(home_lat, home_lon)
    else:
        data = fetch_json(SOURCE)
        # Newer feeds (aircraft.json) wrap the list; older dump1090 data.json is a bare list
        raw = data.get("aircraft", []) if isinstance(data, dict) else data

    planes = []
    for a in raw:
        if "lat" not in a or "lon" not in a:
            continue
        if a["lat"] == 0 and a["lon"] == 0:
            continue  # no position yet (older dump1090)
        if a.get("seen_pos", 0) > MAX_POSITION_AGE:
            continue

        alt = a.get("alt_baro", a.get("alt_geom", a.get("altitude")))
        if alt == "ground":
            alt = 0
        gs = a.get("gs", a.get("speed"))
        track = a.get("track")

        planes.append({
            "hex": a.get("hex", ""),
            "flight": (a.get("flight") or "").strip(),
            "alt": alt if isinstance(alt, (int, float)) else None,
            "gs": round(gs) if isinstance(gs, (int, float)) else None,
            "track": round(track) if isinstance(track, (int, float)) else None,
            "lat": round(a["lat"], 4),
            "lon": round(a["lon"], 4),
            "dist_km": round(distance_km(home_lat, home_lon, a["lat"], a["lon"]), 1),
        })

    planes.sort(key=lambda p: p["dist_km"])
    return planes


# ---- Departure / arrival airports ------------------------------------------
# ADS-B doesn't say where a plane is going, so look the callsign up online.
# Each callsign is only looked up once and remembered here.
routes = {}   # "BAW117" -> {"from": "LHR", "to": "JFK"}, or None if unknown


def lookup_route(callsign):
    try:
        data = fetch_json(ROUTE_API + callsign)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            routes[callsign] = None  # not in the database, don't ask again
        return
    except Exception:
        return  # network problem, try again later
    r = data["response"]["flightroute"]
    routes[callsign] = {"from": r["origin"]["iata_code"], "to": r["destination"]["iata_code"]}


def poll_routes():
    while True:
        for p in latest["planes"]:
            if p["flight"] and p["flight"] not in routes:
                lookup_route(p["flight"])
                time.sleep(0.5)  # be polite to the free API
        time.sleep(1)
# -----------------------------------------------------------------------------


def poll():
    global latest
    warned = False
    while True:
        try:
            home_lat, home_lon = home_location()
            planes = read_planes(home_lat, home_lon)
            latest = {"home": {"lat": home_lat, "lon": home_lon}, "planes": planes,
                      "time": int(time.time()), "error": None}
            warned = False
        except Exception as e:
            # keep the last good planes, but remember what went wrong
            latest = dict(latest, error=str(e))
            if not warned:
                print(f"Can't read plane data ({e}). Is the FlightAware stick running? "
                      f"Or try: python3 planes.py --demo")
                warned = True
        time.sleep(1)


def plane_format(p, home, zoom=1):
    """One plane, in the same beginner-friendly shape for every endpoint."""
    x, y = to_xy(p["lat"], p["lon"], home["lat"], home["lon"], zoom) if home else (0.5, 0.5)
    route = routes.get(p["flight"]) or {}
    return {
        "id": p["hex"],
        "callsign": p["flight"] or p["hex"] or "?",
        "from": route.get("from"),     # departure airport IATA code, e.g. "LHR" (null if unknown)
        "to": route.get("to"),         # arrival airport IATA code, e.g. "JFK"
        "lat": p["lat"],
        "lon": p["lon"],
        "altitude": p["alt"] or 0,     # feet
        "speed": p["gs"] or 0,         # knots
        "heading": p["track"] or 0,    # degrees, 0 = north
        "distance": p["dist_km"],      # km from home
        "x": x,
        "y": y,
    }


def class_format(data, zoom=1):
    """The /planes.json format used in the p5.js classes."""
    planes = [plane_format(p, data["home"], zoom) for p in data["planes"]]
    return {"home": data["home"], "planes": planes, "count": len(planes), "time": data["time"], "demo": DEMO}


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Let sketches on other computers read the data (CORS)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        data = latest
        query = parse_qs(url.query)
        try:
            zoom = float(query.get("zoom", [1])[0])
        except ValueError:
            zoom = 1
        if zoom <= 0:
            zoom = 1
        if url.path == "/planes.json":
            self.reply(200, class_format(data, zoom))
        elif url.path in ("/planes", "/closest", "/closest.json"):
            if data["error"]:
                self.reply(502, {"error": data["error"]})
                return
            result = {"home": data["home"],
                      "aircraft": [plane_format(p, data["home"], zoom) for p in data["planes"]]}
            if url.path != "/planes":
                try:
                    n = int(query.get("n", [DEFAULT_COUNT])[0])
                except ValueError:
                    n = DEFAULT_COUNT
                result["aircraft"] = result["aircraft"][:max(1, n)]
            self.reply(200, result)
        else:
            super().do_GET()  # also serves files in this folder, e.g. plane_starter/

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # keep the terminal quiet


def my_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "localhost"
    finally:
        s.close()


if __name__ == "__main__":
    threading.Thread(target=poll, daemon=True).start()
    threading.Thread(target=poll_routes, daemon=True).start()
    servers = [ThreadingHTTPServer(("0.0.0.0", port), Handler) for port in PORTS]
    for server in servers[1:]:
        threading.Thread(target=server.serve_forever, daemon=True).start()

    ip = my_ip()
    a, b = PORTS[0], PORTS[-1]
    print("DEMO MODE - fake planes" if DEMO else f"Reading {SOURCE}")
    print(f"All planes:      http://{ip}:{a}/planes")
    print(f"Closest {DEFAULT_COUNT}:       http://{ip}:{a}/closest")
    print(f"Students use:    http://{ip}:{b}/planes.json")
    print(f"Starter sketch:  http://{ip}:{b}/plane_starter/")
    print("Press Ctrl+C to stop.")
    servers[0].serve_forever()
