/**
 * 🏫 RFID Student Attendance System - ESP32 Firmware
 * 
 * Upgraded to support three-way selectable display controllers:
 *   1. SH1106 I2C OLED Display (128x64 pixels - Graphical)
 *   2. SSD1306 I2C OLED Display (128x64 pixels - Graphical)
 *   3. 1602 character LCD Display with I2C Backpack (16x2 - Character) <-- NEW!
 * 
 * NOTE: If your screen shows random scrambled static "snow" or noise (common for 1.3" I2C screens),
 * it uses the SH1106 controller instead of the SSD1306.
 * If you want to use the 16x2 blue LCD shown in your photo, uncomment '#define USE_LCD_1602_I2C' below!
 * 
 * Connections (All I2C displays share the same 4 pins!):
 *   Display Pin  ESP32 Pins
 *   -----------------------
 *   GND          GND
 *   VCC          5V / 3.3V (5V is recommended for 1602 LCD backlight brightness!)
 *   SDA          GPIO 21   <-- Default Hardware I2C SDA
 *   SCL          GPIO 22   <-- Default Hardware I2C SCL
 * 
 *   MFRC522      ESP32 Pins
 *   -----------------------
 *   SDA (SS)     GPIO 5
 *   SCK          GPIO 18
 *   MOSI         GPIO 23
 *   MISO         GPIO 19
 *   IRQ          (Not Connected)
 *   GND          GND
 *   RST          GPIO 14        <-- Relocated to free standard I2C SCL on GPIO 22
 *   3.3V         3.3V
 * 
 *   Active Buzzer Pin: GPIO 4 (VCC to GPIO 4, GND to GND)
 *   Built-in Blue LED: GPIO 2
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>

// --- DISPLAY CONTROLLER SELECT ---
// UNCOMMENT EXACTLY ONE of the three lines below to choose your display type:
// #define USE_SH1106           // For 1.3" OLEDs that show static noise on standard SSD1306 code
// #define USE_SSD1306        // For standard 0.96" I2C OLEDs
// #define USE_LCD_1602_I2C   // For the 1602 LCD with I2C Backpack (RG1602A)

#if defined(USE_SH1106)
  #include <Adafruit_SH110X.h>
  #define OLED_WHITE SH110X_WHITE
  #define OLED_BLACK SH110X_BLACK
  #define SCREEN_WIDTH 128
  #define SCREEN_HEIGHT 64
  Adafruit_SH1106G display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#elif defined(USE_SSD1306)
  #include <Adafruit_SSD1306.h>
  #define OLED_WHITE SSD1306_WHITE
  #define OLED_BLACK SSD1306_BLACK
  #define SCREEN_WIDTH 128
  #define SCREEN_HEIGHT 64
  Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#elif defined(USE_LCD_1602_I2C)
  #include <LiquidCrystal_I2C.h>
  // standard I2C address for PCF8574 backpack is 0x27 (or sometimes 0x3F)
  LiquidCrystal_I2C lcd(0x27, 16, 2); 
#endif

// --- CONFIGURATION ---
const char* ssid = "Hipower:Broadband";             // Replace with your Wi-Fi SSID
const char* password = "abcd1234";                 // Replace with your Wi-Fi Password
const char* serverUrl = "http://192.168.30.6:5001/api/scan"; // Replace with your Node.js server IP

// --- HARDWARE PIN OUTS ---
#define RST_PIN     14  // Relocated to GPIO 14 to allow free I2C SCL pin on GPIO 22
#define SS_PIN      5
#define BUZZER_PIN  4
#define LED_PIN     2   // Built-in Blue LED on standard ESP32 development boards
#define GREEN_LED_PIN 27  // Pin for Green LED (Success)
#define RED_LED_PIN   26  // Pin for Red LED (Error / Unregistered)

// Instantiate RFID reader
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Helper function to trigger buzzer beeps (uses digital write for active buzzers)
void triggerBuzzer(int beepCount, int durationMs, int gapMs) {
  for (int i = 0; i < beepCount; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < beepCount - 1) {
      delay(gapMs);
    }
  }
}

// Helper function to draw an elegant text screen regardless of display size/type
void drawDisplayMessage(const String& title, const String& line1, const String& line2, const String& line3, int delayMs = 0) {
  
#if defined(USE_SH1106) || defined(USE_SSD1306)
  // --- GRAPHICAL OLED RENDERING ROUTINE ---
  display.clearDisplay();
  
  // Draw elegant outer border frame for commercial B2B standard
  display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, OLED_WHITE);
  
  // Title Bar Header
  display.fillRect(1, 1, SCREEN_WIDTH - 2, 12, OLED_WHITE);
  display.setTextColor(OLED_BLACK);
  display.setTextSize(1);
  
  // Center Title
  int titleLen = title.length();
  int titleX = (SCREEN_WIDTH - (titleLen * 6)) / 2;
  display.setCursor(titleX > 2 ? titleX : 4, 3);
  display.print(title);
  
  // Content Rows
  display.setTextColor(OLED_WHITE);
  
  // Row 1 (Main status or greeting)
  display.setTextSize(1);
  int l1Len = line1.length();
  int l1X = (SCREEN_WIDTH - (l1Len * 6)) / 2;
  display.setCursor(l1X > 2 ? l1X : 4, 20);
  display.print(line1);
  
  // Row 2 (Student Name / Card UID)
  int l2Len = line2.length();
  int l2X = (SCREEN_WIDTH - (l2Len * 6)) / 2;
  display.setCursor(l2X > 2 ? l2X : 4, 35);
  display.print(line2);
  
  // Row 3 (Status Details / Verification Check)
  int l3Len = line3.length();
  int l3X = (SCREEN_WIDTH - (l3Len * 6)) / 2;
  display.setCursor(l3X > 2 ? l3X : 4, 50);
  display.print(line3);
  
  display.display();

#elif defined(USE_LCD_1602_I2C)
  // --- CHARACTER LCD RENDERING ROUTINE ---
  lcd.clear();
  
  // Map graphical 4-lines structure cleanly to a 16x2 centered alphanumeric layout
  String row1 = title;
  if (row1 == "") row1 = line1;
  
  String row2 = line2;
  if (row2 == "") row2 = line3;
  
  // Clean, center and print Row 1
  row1 = row1.substring(0, 16);
  int pad1 = (16 - row1.length()) / 2;
  lcd.setCursor(pad1 > 0 ? pad1 : 0, 0);
  lcd.print(row1);
  
  // Clean, center and print Row 2
  row2 = row2.substring(0, 16);
  int pad2 = (16 - row2.length()) / 2;
  lcd.setCursor(pad2 > 0 ? pad2 : 0, 1);
  lcd.print(row2);
#endif

  if (delayMs > 0) {
    delay(delayMs);
  }
}

// Display the idle standby screen
void showStandbyScreen() {
  drawDisplayMessage("BRAHMAGUPTA ACAD.", "SYSTEM ACTIVE", "Present RFID Card", "Ready for scans");
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
}

// Pulse the built-in LED OFF and back ON to confirm a scan event while keeping it solid ON overall
void blinkLedConfirm(int blinks, int durationMs) {
  for(int i = 0; i < blinks; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(durationMs);
    digitalWrite(LED_PIN, HIGH);
    delay(durationMs);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED off

  pinMode(GREEN_LED_PIN, OUTPUT);
  digitalWrite(GREEN_LED_PIN, LOW);
  pinMode(RED_LED_PIN, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);

  // Initialize display conditionally
#if defined(USE_SH1106)
  if(!display.begin(0x3C, true)) { 
    Serial.println("❌ SH1106 OLED allocation failed. Continuing in Serial-only mode.");
  } else {
    display.clearDisplay();
    display.display();
  }
#elif defined(USE_SSD1306)
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println("❌ SSD1306 OLED allocation failed. Continuing in Serial-only mode.");
  } else {
    display.clearDisplay();
    display.display();
  }
#elif defined(USE_LCD_1602_I2C)
  lcd.init();
  lcd.backlight();
  lcd.clear();
#endif

  Serial.println("\n--- RFID Attendance System Initializing ---");
  Serial.print("🔗 Configured Server URL: ");
  Serial.println(serverUrl);
  drawDisplayMessage("BRAHMAGUPTA ACAD.", "SYSTEM BOOTING", "Initializing...", "V1.2.0-IoT", 1500);

  // 1. Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  
  // Beep twice slowly to show we are searching for Wi-Fi
  // triggerBuzzer(2, 100, 200);

  int wifiRetries = 0;
  while (WiFi.status() != WL_CONNECTED && wifiRetries < 20) {
    // Toggle the built-in LED to blink slowly during connection phase
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));

    String progress = "";
    for (int i = 0; i <= wifiRetries % 4; i++) {
      progress += ".";
    }
    drawDisplayMessage("WIFI CONFIG", "Connecting to WiFi", ssid, progress, 500);
    Serial.print(".");
    wifiRetries++;
  }

  // Turn off connection blink
  digitalWrite(LED_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Turn green LED on, red LED off
    digitalWrite(GREEN_LED_PIN, HIGH);
    digitalWrite(RED_LED_PIN, LOW);

    // Draw Wi-Fi success diagnostics
    drawDisplayMessage("WIFI CONNECTED", "IP Address:", WiFi.localIP().toString(), "Ready for Scans!", 2000);
    
    // Blink exactly 2 times on successful Wi-Fi connection
    for (int i = 0; i < 2; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
    
    // Stays permanently turned ON (Solid Blue) to indicate online status
    digitalWrite(LED_PIN, HIGH);

    // Long double beep on successful Wi-Fi connection
    // triggerBuzzer(2, 250, 100);
  } else {
    Serial.println("\n❌ Wi-Fi Connection failed. Running in offline/retry mode.");
    
    // Turn red LED on, green LED off
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(GREEN_LED_PIN, LOW);

    drawDisplayMessage("WIFI ERROR", "Connection Failed", "Offline Mode Active", "Scanner Local Ready", 2500);
    // Keep LED off for error state
    digitalWrite(LED_PIN, LOW);
    // 3 long slow beeps for error
    // triggerBuzzer(3, 400, 200);
  }

  // 2. Initialize SPI & MFRC522 RFID
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("📡 MFRC522 RFID Reader Ready. Waiting for card scan...");
  
  // 1 short happy beep to show whole system is fully booted and ready
  // triggerBuzzer(1, 150, 0);
  
  // Display the standby screen
  showStandbyScreen();
}

void loop() {
  // Check if a new RFID card is present
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Read the card serial number
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Turn Green LED ON (solid) during scanning/processing, Red LED OFF
  digitalWrite(GREEN_LED_PIN, HIGH);
  digitalWrite(RED_LED_PIN, LOW);

  // Convert the UID bytes to a formatted string
  String cardUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    cardUid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    cardUid += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) {
      cardUid += " ";
    }
  }
  cardUid.toUpperCase();

  Serial.print("\n🏷️  Card Detected! UID: ");
  Serial.println(cardUid);

  // Instant visual feedback for scan detection
  drawDisplayMessage("SCAN DETECTED", "Card UID:", cardUid, "Processing...");

  // Stop card readings to avoid rapid multi-scans
  mfrc522.PICC_HaltA();

  // If Wi-Fi is disconnected, attempt to reconnect
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  Wi-Fi disconnected. Attempting fast reconnect...");
    drawDisplayMessage("WIFI DROPPED", "Reconnecting...", "Please wait...", "");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    int checkCount = 0;
    while (WiFi.status() != WL_CONNECTED && checkCount < 8) {
      delay(250);
      checkCount++;
    }
  }

  // Check if we are connected before sending
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", "brahmagupta_security_key_2026");

    // Prepare JSON payload
    String requestPayload = "{\"rfidUid\":\"" + cardUid + "\"}";
    Serial.print("📩 Sending POST request to backend (");
    Serial.print(serverUrl);
    Serial.println("): " + requestPayload);

    int httpResponseCode = http.POST(requestPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("📬 Server Response Code: ");
      Serial.println(httpResponseCode);
      Serial.println("Response: " + response);

      if (httpResponseCode == 200) {
        // Success: 1 short responsive beep
        Serial.println("✅ Attendance logged successfully.");
        
        // Parse name and grade dynamically from Response JSON
        String studentName = "";
        String studentGrade = "";
        
        int nameIndex = response.indexOf("\"studentName\":\"");
        if (nameIndex != -1) {
          int startIdx = nameIndex + 15;
          int endIdx = response.indexOf("\"", startIdx);
          if (endIdx != -1) {
            studentName = response.substring(startIdx, endIdx);
          }
        }
        
        int gradeIndex = response.indexOf("\"grade\":\"");
        if (gradeIndex != -1) {
          int startIdx = gradeIndex + 9;
          int endIdx = response.indexOf("\"", startIdx);
          if (endIdx != -1) {
            studentGrade = response.substring(startIdx, endIdx);
          }
        }
        
        if (studentName == "") studentName = "Student";
        if (studentGrade == "") studentGrade = "N/A";
        
        // Render beautiful success greeting
        drawDisplayMessage("WELCOME!", studentName, "Grade: " + studentGrade, "Attendance Ok!");
        
        // Blink Green LED twice to confirm success
        for (int i = 0; i < 2; i++) {
          digitalWrite(GREEN_LED_PIN, LOW);
          delay(150);
          digitalWrite(GREEN_LED_PIN, HIGH);
          delay(150);
        }

        // Blink 2 times to confirm successful scan, then automatically returns to solid HIGH
        blinkLedConfirm(2, 100);
        
        triggerBuzzer(1, 150, 0); // 1 beep for success
      } else {
        // Dynamically parse the "message" field from the JSON response using string matching
        String errorMessage = "";
        int msgIndex = response.indexOf("\"message\":\"");
        if (msgIndex != -1) {
          int startIdx = msgIndex + 11; // Length of '"message":"'
          int endIdx = response.indexOf("\"", startIdx);
          if (endIdx != -1) {
            errorMessage = response.substring(startIdx, endIdx);
          }
        }
        
        if (errorMessage == "") {
          errorMessage = (httpResponseCode == 404) ? "Student not registered." : "Server error.";
        }
        
        Serial.print("⚠️ ");
        Serial.println(errorMessage);

        if (httpResponseCode == 404) {
          // Render warning details along with raw card UID for administrative check
          drawDisplayMessage("UNKNOWN CARD!", "UID:", cardUid, "Not Registered");
          
          // Turn red LED on, green LED off
          digitalWrite(RED_LED_PIN, HIGH);
          digitalWrite(GREEN_LED_PIN, LOW);

          // Blink 4 times rapidly to indicate error/warning, then returns to solid HIGH
          blinkLedConfirm(4, 60);
          
          triggerBuzzer(2, 80, 80); // 2 beeps for unregistered card
        } else {
          drawDisplayMessage("SERVER ERROR", "Code: " + String(httpResponseCode), errorMessage, "Please try again");
          
          // Turn red LED on, green LED off
          digitalWrite(RED_LED_PIN, HIGH);
          digitalWrite(GREEN_LED_PIN, LOW);

          // Blink 4 times rapidly
          blinkLedConfirm(4, 60);
          
          triggerBuzzer(2, 80, 80); // 2 beeps for other server errors
        }
      }
    } else {
      Serial.print("❌ HTTP Request failed. Error code: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
      
      // Render offline diagnostics
      drawDisplayMessage("GATEWAY OFFLINE", "Server unreachable", "Check network", "Error: " + String(httpResponseCode));
      
      // Turn red LED on, green LED off
      digitalWrite(RED_LED_PIN, HIGH);
      digitalWrite(GREEN_LED_PIN, LOW);

      // Blink 4 times rapidly
      blinkLedConfirm(4, 60);
      
      triggerBuzzer(2, 80, 80); // 2 beeps for gateway offline
    }
    
    http.end();
  } else {
    Serial.println("❌ No Wi-Fi. Scan ignored by database.");
    drawDisplayMessage("OFFLINE ERROR", "No Wi-Fi Connection", "Scan Ignored", "Check Router!");
    
    // Turn red LED on, green LED off
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(GREEN_LED_PIN, LOW);

    // Blink 4 times rapidly
    blinkLedConfirm(4, 60);
    
    triggerBuzzer(2, 80, 80); // 2 beeps for no Wi-Fi connection
  }

  delay(800); // Cooldown delay of 800ms before accepting another scan for high-throughput gate scanning
  showStandbyScreen(); // Reset back to clean idle standby screen
}
