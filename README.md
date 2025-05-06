# IoT Sensor Dashboard

A modern, scientific-themed dashboard for visualizing environmental sensor data from IoT devices connected to ThingSpeak.

## Overview

This application is a client-side, single-page web application that visualizes environmental sensor data fetched from the ThingSpeak REST API. It features a sleek, scientific interface with real-time updates, historical data charts, and data export capabilities.

The dashboard is designed to work with ESP8266 devices that read from DHT11 (temperature and humidity) and MQ gas sensors, with data pushed to ThingSpeak.

## Features

- **Real-time Sensor Monitoring**: Visualize current temperature, humidity, and gas sensor readings with animated gauges
- **Historical Data Charts**: View data trends over the last 24 hours, 7 days, or 30 days with interactive charts
- **Data Export**: Export historical sensor data to CSV format for offline analysis
- **Configurable Settings**: Enter your ThingSpeak channel ID and API key with settings stored in browser localStorage
- **Responsive Design**: Full usability on mobile, tablet, and desktop devices
- **Dark Scientific Theme**: Modern dark mode with futuristic UI elements inspired by scientific instruments
- **Zero Backend Dependencies**: Operates entirely in the browser with no server-side requirements

## Technologies Used

- **HTML5, CSS3, JavaScript**: Core web technologies
- **Tailwind CSS**: For styling and responsive design
- **Chart.js**: For creating interactive time-series charts
- **FileSaver.js**: For CSV data export functionality
- **ThingSpeak API**: For retrieving sensor data

## Setup

1. Clone or download this repository
2. Open `index.html` in a web browser
3. Enter your ThingSpeak Channel ID and Read API Key in the configuration panel
4. Click "Save Configuration" to start fetching data

You can also pass parameters via URL: `index.html?channelId=2922458&apiKey=9SQ7ZVI6LIN2HU8F`

## ThingSpeak Configuration

To use this dashboard, you need a ThingSpeak account with a channel set up to receive data from your ESP8266 or other IoT device. The dashboard expects:

- **Field 1**: Temperature (°C)
- **Field 2**: Humidity (%)
- **Field 3**: Gas Level (ppm)

### Sample API Endpoints

```
# Write a Channel Feed (from ESP8266)
GET https://api.thingspeak.com/update?api_key=C6WT32GJ9UEOVST8&field1=0

# Read a Channel Feed (for dashboard)
GET https://api.thingspeak.com/channels/2922458/feeds.json?api_key=9SQ7ZVI6LIN2HU8F&results=2

# Read a Channel Field
GET https://api.thingspeak.com/channels/2922458/fields/1.json?api_key=9SQ7ZVI6LIN2HU8F&results=2

# Read Channel Status Updates
GET https://api.thingspeak.com/channels/2922458/status.json?api_key=9SQ7ZVI6LIN2HU8F
```

## ESP8266 Integration

This dashboard works with an ESP8266 device programmed with the following sample code:

```cpp
#include <ESP8266WiFi.h>
#include <DHT.h>

#define DHTPIN D4         // DHT11 data pin
#define DHTTYPE DHT11     // DHT11 sensor
DHT dht(DHTPIN, DHTTYPE);

// WiFi credentials
const char* ssid = "YourWiFiSSID";
const char* password = "YourWiFiPassword";

// ThingSpeak settings
const char* host = "api.thingspeak.com";
String apiKey = "YOUR_WRITE_API_KEY";  // ThingSpeak Write API Key

void setup() {
  Serial.begin(9600);
  delay(10);
  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int gasValue = analogRead(A0); // MQ-2 analog reading

  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" °C, Humidity: ");
  Serial.print(humidity);
  Serial.print(" %, Gas Value: ");
  Serial.println(gasValue);

  // Send data to ThingSpeak
  WiFiClient client;
  const int httpPort = 80;
  if (!client.connect(host, httpPort)) {
    Serial.println("Connection to ThingSpeak failed");
    return;
  }

  String url = "/update?api_key=" + String(apiKey) + 
               "&field1=" + String(temperature) + 
               "&field2=" + String(humidity) + 
               "&field3=" + String(gasValue);  // Add gas sensor value

  client.print(String("GET ") + url + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" + 
               "Connection: close\r\n\r\n");

  delay(20000); // 20-second delay to avoid ThingSpeak rate limit
}
```

**Note**: Replace `YourWiFiSSID`, `YourWiFiPassword`, and `YOUR_WRITE_API_KEY` with your actual WiFi credentials and ThingSpeak Write API Key.

## Deployment

This application is designed to be deployed on any static web hosting service such as:

- GitHub Pages
- Vercel
- Netlify
- Amazon S3
- Or simply run locally from your file system

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Acknowledgements

- ThingSpeak for providing the IoT data API
- Chart.js for the visualization library
- Tailwind CSS for the styling framework 