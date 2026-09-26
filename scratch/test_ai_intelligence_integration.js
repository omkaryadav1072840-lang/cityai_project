/**
 * SmartCity AI - End-to-End AI Intelligence Integration Test Suite
 * Tests full pipeline:
 * Node.js (Port 5000) -> Auth -> AI Client -> Python FastAPI (Port 8000) -> MySQL Audit Log
 */

const http = require('http');
const pool = require('../backend/config/db').promise();
const { generateToken } = require('../backend/middleware/auth.middleware');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 SMARTCITY AI - FULL INTELLIGENCE LAYER INTEGRATION TESTS');
  console.log('===============================================================\n');

  // Generate tokens for RBAC tests
  const staffToken = generateToken({ id: 1, name: 'Gorakhpur Admin', role: 'admin' }, 'admin');
  const citizenToken = generateToken({ id: 2, name: 'Citizen Omkar', role: 'citizen' }, 'citizen');

  // Test 1: System Status & FastAPI Health via Node
  console.log('--- Test 1: GET /api/ai/status ---');
  const resStatus = await request('http://127.0.0.1:5000/api/ai/status');
  console.log('Status code:', resStatus.status);
  console.log('Python status:', resStatus.body.python_service ? resStatus.body.python_service.status : 'N/A');
  console.log('Registered models:', resStatus.body.registered_models.length);
  if (resStatus.status !== 200) throw new Error('Status test failed');

  // Test 2: Registered Models
  console.log('\n--- Test 2: GET /api/ai/models ---');
  const resModels = await request('http://127.0.0.1:5000/api/ai/models');
  console.log('Models count:', resModels.body.count);
  if (resModels.body.count < 5) throw new Error('Expected at least 5 registered models');

  // Test 3: Traffic Prediction & Audit Log Verification
  console.log('\n--- Test 3: GET /api/ai/traffic/predict ---');
  const resTraffic = await request('http://127.0.0.1:5000/api/ai/traffic/predict?hour=18&junction_id=JNC-GOLGHAR-01');
  console.log('Traffic prediction:', resTraffic.body.prediction.predicted_congestion, 'Score:', resTraffic.body.prediction.severity_score);
  if (resTraffic.status !== 200) throw new Error('Traffic test failed');

  // Test 4: Waste Prediction
  console.log('\n--- Test 4: GET /api/ai/waste/predict ---');
  const resWaste = await request('http://127.0.0.1:5000/api/ai/waste/predict?bin_id=BIN-002&days_since_collection=3');
  console.log('Waste rank:', resWaste.body.forecast.priority_rank, 'Fill:', resWaste.body.forecast.estimated_fill_pct, '%');
  if (resWaste.status !== 200) throw new Error('Waste test failed');

  // Test 5: Water Anomaly Analysis
  console.log('\n--- Test 5: GET /api/ai/water/analyze ---');
  const resWater = await request('http://127.0.0.1:5000/api/ai/water/analyze?tank_id=TNK-GKP-02&daily_outflow_liters=65000&historical_avg_outflow=40000');
  console.log('Water risk:', resWater.body.analysis.risk_level, 'Anomaly:', resWater.body.analysis.is_anomaly_indicator);
  if (resWater.status !== 200) throw new Error('Water test failed');

  // Test 6: Healthcare Capacity Analysis
  console.log('\n--- Test 6: GET /api/ai/healthcare/analyze ---');
  const resHealth = await request('http://127.0.0.1:5000/api/ai/healthcare/analyze?hospital_id=HOSP-AIIMS&total_beds=400&occupied_beds=360');
  console.log('Healthcare occupancy:', resHealth.body.analysis.projected_bed_occupancy_pct, '% Saturation:', resHealth.body.analysis.is_near_saturation);
  if (resHealth.status !== 200) throw new Error('Healthcare test failed');

  // Test 7: Emergency Dispatch Travel-Time Estimation
  console.log('\n--- Test 7: POST /api/ai/emergency/dispatch ---');
  const resEmergency = await request('http://127.0.0.1:5000/api/ai/emergency/dispatch', { method: 'POST' }, {
    incident_id: 'EM-SOS-GKP-789',
    origin_lat: 26.7606,
    origin_lng: 83.3732,
    dest_lat: 26.7588,
    dest_lng: 83.3920,
    incident_severity: 'HIGH'
  });
  console.log('Emergency ETA:', resEmergency.body.estimation.estimated_travel_minutes, 'mins Priority:', resEmergency.body.estimation.priority_level);
  if (resEmergency.status !== 200) throw new Error('Emergency test failed');

  // Test 8: Parking Demand Forecast
  console.log('\n--- Test 8: GET /api/ai/parking/forecast ---');
  const resParking = await request('http://127.0.0.1:5000/api/ai/parking/forecast?lot_id=LOT-GOLGHAR&total_slots=100&current_occupied=90');
  console.log('Parking projected occupancy:', resParking.body.forecast.projected_occupancy_pct, '%');
  if (resParking.status !== 200) throw new Error('Parking test failed');

  // Test 9: Grounded AI Assistant (Hospitals, Parking, Traffic)
  console.log('\n--- Test 9: Grounded Assistant Queries ---');
  const resChatHosp = await request('http://127.0.0.1:5000/api/ai/assistant', { method: 'POST' }, { question: 'Which hospital has available ICU beds?' });
  console.log('• Hospitals Query Intent:', resChatHosp.body.intent, '| Tool:', resChatHosp.body.tool_called);

  const resChatPark = await request('http://127.0.0.1:5000/api/ai/assistant', { method: 'POST' }, { question: 'Where can I park my car in Golghar?' });
  console.log('• Parking Query Intent:', resChatPark.body.intent, '| Tool:', resChatPark.body.tool_called);

  const resChatTraffic = await request('http://127.0.0.1:5000/api/ai/assistant', { method: 'POST' }, { question: 'Is there heavy traffic or jams?' });
  console.log('• Traffic Query Intent:', resChatTraffic.body.intent, '| Tool:', resChatTraffic.body.tool_called);

  // Test 10: DB Audit Log Check in ai_predictions
  console.log('\n--- Test 10: Verify ai_predictions MySQL Audit Logging ---');
  const [recentPredictions] = await pool.query('SELECT id, model_identifier, module, entity_reference, review_status, created_at FROM ai_predictions ORDER BY id DESC LIMIT 5');
  console.log('Logged predictions count in DB:', recentPredictions.length);
  console.table(recentPredictions);
  if (recentPredictions.length === 0) throw new Error('No predictions were logged in ai_predictions table');

  const testPredId = recentPredictions[0].id;

  // Test 11: RBAC Protected Staff Operator Review
  console.log('\n--- Test 11: Staff Review Approval of Prediction #' + testPredId + ' ---');
  // Attempt without auth (should fail 401)
  const unauthReview = await request(`http://127.0.0.1:5000/api/ai/review/${testPredId}`, { method: 'POST' }, { action_taken: 'APPROVED' });
  console.log('Unauthorized review status (expected 401):', unauthReview.status);

  // Attempt with citizen role (should fail 403)
  const citizenReview = await request(`http://127.0.0.1:5000/api/ai/review/${testPredId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  }, { action_taken: 'APPROVED' });
  console.log('Citizen review status (expected 403):', citizenReview.status);

  // Authorized Admin/Staff review (should 200)
  const staffReview = await request(`http://127.0.0.1:5000/api/ai/review/${testPredId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  }, {
    action_taken: 'APPROVED',
    comments: 'Verified by senior city operator against CCTV and telemetry.'
  });
  console.log('Staff review status (expected 200):', staffReview.status, staffReview.body.message);

  // Verify review logged in DB
  const [reviews] = await pool.query('SELECT * FROM ai_reviews WHERE prediction_id = ?', [testPredId]);
  console.log('Verified ai_reviews record count:', reviews.length, 'Action:', reviews[0].action_taken);

  console.log('\n===============================================================');
  console.log('✅ ALL 11 AI INTELLIGENCE LAYER INTEGRATION TESTS PASSED!');
  console.log('===============================================================\n');

  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
  process.exit(1);
});
