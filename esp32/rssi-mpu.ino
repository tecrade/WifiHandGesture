#include <Wire.h>
#include <WiFi.h>
#include <MPU6050.h>
#include <WiFiUdp.h>

MPU6050 mpu;

// WiFi credentials
const char* ssid     = "your system's ssid";
const char* password = "your system's password";

// UDP config — set this to your PC's IP address
const char* udpServerIP   = "192.168.137.1";  // ← CHANGE to your PC's local IP
const uint16_t udpPort    = 5005;             // must match Python backend

WiFiUDP udp;

int16_t ax, ay, az;
int16_t gx, gy, gz;

void setup() {
  Serial.begin(115200);

  // =========================
  // WIFI
  // =========================
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // Start UDP socket
  udp.begin(udpPort);
  Serial.println("UDP started");

  // =========================
  // MPU6050
  // =========================
  Wire.begin();
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("MPU6050 Connected");
  } else {
    Serial.println("MPU6050 Connection Failed");
    while (1);
  }
}

void loop() {
  // Read MPU6050
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  // Read WiFi RSSI (used as EMG proxy — same as before)
  int rssi = WiFi.RSSI();

  // =========================
  // LINE 1 -> MPU DATA
  // Build the same string format the Python backend expects
  // =========================
  char mpuLine[100];
  snprintf(mpuLine, sizeof(mpuLine),
           "AX:%d AY:%d AZ:%d GX:%d GY:%d GZ:%d",
           ax, ay, az, gx, gy, gz);

  // =========================
  // LINE 2 -> RSSI DATA
  // =========================
  char rssiLine[30];
  snprintf(rssiLine, sizeof(rssiLine), "RSSI,%d", rssi);

  // --- Send both lines over UDP ---
  udp.beginPacket(udpServerIP, udpPort);
  udp.print(mpuLine);
  udp.print("\n");
  udp.print(rssiLine);
  udp.print("\n");
  udp.endPacket();

  // --- Also keep Serial output (unchanged behaviour) ---
  Serial.println(mpuLine);
  Serial.println(rssiLine);

  delay(50);
}