#!/bin/bash

# RFID Attendance System - Local Scan Test Script
# This script simulates an ESP32 sending RFID scans to the backend server.

PORT=5001
SERVER_URL="http://localhost:$PORT/api/scan"

echo "--------------------------------------------------------"
echo "🏫 RFID Attendance System - Scan Simulation Utility 📡"
echo "--------------------------------------------------------"

# Check if port is open
if ! lsof -i :$PORT > /dev/null; then
  echo "⚠️  Warning: Backend server does not seem to be running on port $PORT."
  echo "👉  Please start the backend first using: npm run dev"
  echo "--------------------------------------------------------"
fi

show_menu() {
  echo ""
  echo "Select a scan action to simulate:"
  echo "1) Scan Adam Smith's registered card  (UID: A3 B2 C5 D9)"
  echo "2) Scan Sarah Jenkins' registered card (UID: E1 F2 G3 H4)"
  echo "3) Scan an UNREGISTERED card           (UID: X9 Y8 Z7 W6)"
  echo "4) Scan a custom RFID card UID"
  echo "5) Exit simulation"
  echo ""
  read -p "Enter choice [1-5]: " choice
  echo ""
}

send_scan() {
  local uid="$1"
  echo "📟 Simulating scan of card UID: $uid"
  echo "--------------------------------------------------------"
  
  # Send curl POST request
  curl -X POST "$SERVER_URL" \
       -H "Content-Type: application/json" \
       -d "{\"rfidUid\":\"$uid\"}" \
       -w "\n\nHTTP Response Code: %{http_code}\n"
       
  echo "--------------------------------------------------------"
}

while true; do
  show_menu
  case $choice in
    1)
      send_scan "A3 B2 C5 D9"
      ;;
    2)
      send_scan "E1 F2 G3 H4"
      ;;
    3)
      send_scan "X9 Y8 Z7 W6"
      ;;
    4)
      read -p "Enter custom RFID Card UID: " custom_uid
      if [ -n "$custom_uid" ]; then
        send_scan "$custom_uid"
      else
        echo "❌ UID cannot be empty."
      fi
      ;;
    5)
      echo "👋 Exiting simulation. Happy testing!"
      exit 0
      ;;
    *)
      echo "❌ Invalid choice. Please select between 1 and 5."
      ;;
  esac
  sleep 1
done
