const fs = require('fs');
const path = require('path');

// Read waste.html to extract the DOM elements
const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');

// Let's check what renderActiveDustbinDashboard does with the bin from the auth endpoint
const router = require(path.join(__dirname, '..', 'backend', 'routes', 'waste.routes'));

// We know the auth endpoint returns:
const fallbackBin = {
  bin_code: "BIN-GOL-01",
  name: "Golghar Market Smart Bin",
  location: "Golghar Market Square, Ward 14",
  coordinates: { lat: 26.7606, lng: 83.3732 },
  capacity_liters: 500,
  current_fill_percentage: 78,
  current_weight_kg: 114.2,
  sensor_distance_cm: 26.4,
  battery_pct: 94,
  temperature_c: 29.8,
  lid_status: "Closed",
  status: "Nearly Full",
  footfall_analysis: {
    total_visitors_today: 142,
    visitors_last_hour: 24,
    avg_interval_minutes: 2.8,
    frequency_text: "Avg 1 person deposits waste every 2.8 minutes (24 visitors/hr)",
    density_status: "High Density (Peak Market Rush Window)",
    hourly_trend: [
      { hour: "08:00", visitors: 14, fill: 35 },
      { hour: "10:00", visitors: 18, fill: 48 },
      { hour: "12:00", visitors: 8, fill: 55 },
      { hour: "14:00", visitors: 6, fill: 62 },
      { hour: "16:00", visitors: 11, fill: 70 },
      { hour: "18:00", visitors: 24, fill: 78 }
    ]
  },
  ai_time_to_full_prediction: {
    current_fill_pct: 78,
    fill_accumulation_rate_pct_per_hour: 14.2,
    remaining_capacity_pct: 22,
    formatted_time_until_full: "1 Hour 35 Minutes",
    estimated_overflow_time: "Today at ~01:45 PM",
    urgency_tier: "HIGH_PRIORITY_COLLECTION"
  },
  automated_communication_alert: {
    triggered: true,
    reason: "HIGH URGENCY DISPATCH: Bin BIN-GOL-01 is at 78% capacity and predicted to overflow in 1 Hour 35 Minutes."
  }
};

// Let's inspect renderDustbinMiniMap in waste.js!
const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');
const miniMapIdx = js.indexOf('function renderDustbinMiniMap');
console.log(js.substring(miniMapIdx, miniMapIdx + 1200));

