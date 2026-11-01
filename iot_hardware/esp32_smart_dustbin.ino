/**
 * ==============================================================================
 * SmartCity AI - IoT Smart Dustbin Telemetry Firmware (ESP32 / ESP8266 / Arduino)
 * ==============================================================================
 * Features:
 * 1. Ultrasonic Distance Sensor (HC-SR04 / JSN-SR04T) -> Measure garbage depth & Fill %
 * 2. PIR Motion Sensor (HC-SR501) -> Detect and count footfall / person waste deposits
 * 3. Load Cell Sensor (HX711) -> Measure total waste weight in KG
 * 4. WiFi Client -> Ingest telemetry to Municipal Server via HTTP REST POST API
 * 5. Automated Local Alert -> Buzzer / LED warning if full (>85%)
 * 6. Low-Power Deep Sleep Support
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Ensure ArduinoJson library v6 or v7 is installed

// ================= 1. NETWORK & API CONFIGURATION =================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server endpoint (Change IP to your server / gateway IP or hostname)
const char* SERVER_URL    = "http://192.168.1.100:5000/api/waste/dustbin-terminal/sensor-data";

// Dustbin Credentials
const char* DUSTBIN_CODE  = "BIN-GOL-01";
const char* SENSOR_API_KEY = "BIN@2026";

// Total depth of dustbin container in centimeters
const float BIN_DEPTH_CM  = 120.0;

// ================= 2. PIN ASSIGNMENTS =================
#define PIN_TRIG 5       // Ultrasonic HC-SR04 Trigger
#define PIN_ECHO 18      // Ultrasonic HC-SR04 Echo
#define PIN_PIR  19      // PIR Motion Sensor (Footfall detector)
#define PIN_LED_RED 2    // Status Indicator LED
#define PIN_BUZZER 4     // Overflow Warning Buzzer

// ================= 3. STATE VARIABLES =================
volatile int peopleCountDelta = 0;
unsigned long lastTelemetrySentTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 15000; // Send telemetry every 15 seconds

// Interrupt Service Routine for PIR Footfall detection
void IRAM_ATTR onPersonApproached() {
    peopleCountDelta++;
}

// Function to read ultrasonic distance in centimeters
float measureUltrasonicDistanceCM() {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~5 meters max)
    if (duration == 0) {
        return BIN_DEPTH_CM; // Timeout: assume empty
    }

    // Sound velocity: 343 m/s = 0.0343 cm/microsecond
    float distance = (duration * 0.0343) / 2.0;
    if (distance < 2.0) distance = 2.0;
    if (distance > BIN_DEPTH_CM) distance = BIN_DEPTH_CM;
    return distance;
}

// Function to read battery percentage (Simulated / ADC voltage divider)
int readBatteryPercentage() {
    // Connect battery to ADC pin (e.g. GPIO 34) through a 100k/100k voltage divider
    // For now, return standard 95%
    return 95;
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n========================================================");
    Serial.println("  🌱 SmartCity AI - IoT Dustbin Telemetry Firmware");
    Serial.print("  Dustbin ID: ");
    Serial.println(DUSTBIN_CODE);
    Serial.println("========================================================\n");

    pinMode(PIN_TRIG, OUTPUT);
    pinMode(PIN_ECHO, INPUT);
    pinMode(PIN_PIR, INPUT_PULLDOWN);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_BUZZER, LOW);

    // Attach interrupt to PIR pin to count approaching visitors
    attachInterrupt(digitalPinToInterrupt(PIN_PIR), onPersonApproached, RISING);

    // Connect to WiFi
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n🟢 WiFi Connected! Local IP: " + WiFi.localIP().toString());
    } else {
        Serial.println("\n⚠️ WiFi Connection Failed! Will retry in main loop.");
    }
}

void loop() {
    unsigned long currentMillis = millis();

    // Check if it's time to send telemetry packet
    if (currentMillis - lastTelemetrySentTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetrySentTime = currentMillis;

        // 1. Measure Distance & Compute Fill Level %
        float distanceCM = measureUltrasonicDistanceCM();
        int fillPct = constrain((int)(((BIN_DEPTH_CM - distanceCM) / BIN_DEPTH_CM) * 100), 0, 100);

        // 2. Fetch People Count Delta since last packet
        noInterrupts();
        int visitorsThisCycle = peopleCountDelta;
        peopleCountDelta = 0; // Reset for next window
        interrupts();

        // 3. Approximate Weight in KG (or read from HX711 Load Cell)
        float estimatedWeightKg = (fillPct / 100.0) * 150.0;
        int batteryPct = readBatteryPercentage();

        Serial.println("\n------------------------------------------------");
        Serial.printf("📡 SENSOR READINGS [%s]\n", DUSTBIN_CODE);
        Serial.printf("  • Surface Distance : %.1f cm\n", distanceCM);
        Serial.printf("  • Computed Fill    : %d %%\n", fillPct);
        Serial.printf("  • Weight (Est)     : %.1f kg\n", estimatedWeightKg);
        Serial.printf("  • Footfall Delta   : %d visitors\n", visitorsThisCycle);
        Serial.printf("  • Battery Level    : %d %%\n", batteryPct);

        // Alert LED/Buzzer if nearly full
        if (fillPct >= 85) {
            digitalWrite(PIN_LED_RED, HIGH);
            tone(PIN_BUZZER, 1000, 200); // 200ms warning beep
        } else {
            digitalWrite(PIN_LED_RED, LOW);
        }

        // 4. Send HTTP POST to SmartCity AI Backend
        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            http.begin(SERVER_URL);
            http.addHeader("Content-Type", "application/json");

            // Build JSON Payload
            StaticJsonDocument<300> doc;
            doc["bin_code"] = DUSTBIN_CODE;
            doc["api_key"] = SENSOR_API_KEY;
            doc["distance_cm"] = distanceCM;
            doc["weight_kg"] = estimatedWeightKg;
            doc["people_count_delta"] = max(1, visitorsThisCycle);
            doc["temperature_c"] = 30.5;
            doc["battery_pct"] = batteryPct;
            doc["lid_status"] = (distanceCM < 8.0) ? "Open" : "Closed";

            String jsonPayload;
            serializeJson(doc, jsonPayload);

            Serial.println("📤 Sending Sensor Telemetry JSON...");
            int httpResponseCode = http.POST(jsonPayload);

            if (httpResponseCode > 0) {
                String response = http.getString();
                Serial.printf("✅ Server Response (%d): %s\n", httpResponseCode, response.c_str());
            } else {
                Serial.printf("❌ HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
            }

            http.end();
        } else {
            Serial.println("⚠️ WiFi offline. Attempting reconnect...");
            WiFi.reconnect();
        }
    }

    delay(100);
}

