// Print the closest planes from the plane server - no computer needed
// The Arduino UNO R4 WiFi joins the WiFi and asks the plane server
// for the closest planes once a second
//
// Needs the UNO R4 WiFi (the R4 Minima has no WiFi)
// Install "ArduinoJson" by Benoit Blanchon from the Library Manager
// Open the Serial Monitor at 115200 to see the planes

#include <WiFiS3.h>
#include <ArduinoJson.h>

// ---- change these ----
const char* WIFI_NAME = "your-wifi-name";
const char* WIFI_PASSWORD = "your-wifi-password";  // don't commit your real password!
const char* SERVER = "192.168.1.217";  // your teacher's address (the computer running planes.py)
const int PORT = 8000;
// ----------------------

WiFiClient client;

void setup() {
  Serial.begin(115200);
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  getPlanes();
  delay(1000);  // ask for new data every second
}

void connectWiFi() {
  Serial.print("Joining ");
  Serial.println(WIFI_NAME);
  while (WiFi.begin(WIFI_NAME, WIFI_PASSWORD) != WL_CONNECTED) {
    Serial.println("  can't join yet, trying again...");
    delay(2000);
  }
  // the R4 can say it's connected before it has an address, so wait for one
  while (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    delay(100);
  }
  Serial.print("Connected, my address is ");
  Serial.println(WiFi.localIP());
}

// ask the server for the closest planes, the same as loadJSON in p5.js
void getPlanes() {
  if (!client.connect(SERVER, PORT)) {
    Serial.println("Can't reach the server - is planes.py running?");
    return;
  }
  client.println("GET /closest.json HTTP/1.0");  // add ?n=3 for a different number
  client.print("Host: ");
  client.println(SERVER);
  client.println("Connection: close");
  client.println();

  client.setTimeout(2000);
  // the first line says if it worked, e.g. "HTTP/1.0 200 OK"
  String status = client.readStringUntil('\n');
  if (status.indexOf("200") < 0) {
    Serial.print("Server said: ");
    Serial.println(status);
    client.stop();
    return;
  }
  client.find("\r\n\r\n");  // skip the headers, the JSON comes after a blank line

  JsonDocument data;
  DeserializationError error = deserializeJson(data, client);
  client.stop();
  if (error) {
    Serial.print("Couldn't read the JSON: ");
    Serial.println(error.c_str());
    return;
  }

  JsonArray planes = data["aircraft"];
  Serial.print(planes.size());
  Serial.println(" planes:");

  for (JsonObject plane : planes) {
    Serial.print("  ");
    Serial.print(plane["callsign"].as<const char*>());
    Serial.print("  ");
    Serial.print(plane["distance"].as<float>());
    Serial.print(" km away, ");
    Serial.print(plane["altitude"].as<int>());
    Serial.print(" ft up, ");
    Serial.print(plane["speed"].as<int>());
    Serial.print(" knots, heading ");
    Serial.print(plane["heading"].as<int>());
    Serial.print(", lat ");
    Serial.print(plane["lat"].as<float>(), 4);
    Serial.print(", lon ");
    Serial.println(plane["lon"].as<float>(), 4);
  }
}
