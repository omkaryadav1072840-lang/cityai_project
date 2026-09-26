/**
 * Test Suite: CCTV Optical AI Vision & Camera Telemetry Integration
 */

const http = require('http');
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

async function runCCTVTests() {
  console.log("===============================================================");
  console.log("📹 TESTING CCTV OPTICAL AI VISION & CAMERA TELEMETRY");
  console.log("===============================================================\n");

  const staffToken = generateToken({ id: 1, name: 'Traffic Inspector Sharma', role: 'staff', department: 'traffic' }, 'staff');

  // 1. Fetch Cameras List
  console.log("--- Test 1: GET /api/traffic/cameras ---");
  const resCams = await request("http://127.0.0.1:5000/api/traffic/cameras");
  console.log("Status:", resCams.status);
  console.log("Total CCTV Cameras reporting:", resCams.body.cameras ? resCams.body.cameras.length : 0);
  if (resCams.status !== 200 || !resCams.body.cameras || resCams.body.cameras.length === 0) {
    throw new Error("Failed to fetch cameras from database");
  }

  // 2. Optical AI Vision on CAM-01-N
  console.log("\n--- Test 2: GET /api/traffic/cameras/CAM-01-N/ai-vision ---");
  const resVision = await request("http://127.0.0.1:5000/api/traffic/cameras/CAM-01-N/ai-vision");
  console.log("Status:", resVision.status);
  console.log("Camera Name:", resVision.body.camera ? resVision.body.camera.camera_name : "N/A");
  console.log("Vehicles Count:", resVision.body.vision ? resVision.body.vision.vehicle_count : "N/A");
  console.log("Vehicle Breakdown:", resVision.body.vision ? resVision.body.vision.vehicle_breakdown : "N/A");
  console.log("Congestion Estimate:", resVision.body.vision ? resVision.body.vision.congestion_estimate : "N/A");
  console.log("Recommended Green Phase:", resVision.body.vision ? resVision.body.vision.recommended_signal_green_secs : "N/A", "seconds");
  if (resVision.status !== 200 || !resVision.body.vision) {
    throw new Error("Failed to run optical AI vision on CAM-01-N");
  }

  // 3. AI Camera Analyze Route
  console.log("\n--- Test 3: POST /api/ai/camera/analyze ---");
  const resAI = await request("http://127.0.0.1:5000/api/ai/camera/analyze", { method: "POST" }, {
    camera_id: "CAM-02-E",
    camera_name: "Mohaddipur East - Deoria Highway Cam",
    direction: "East"
  });
  console.log("Status:", resAI.status);
  console.log("AI Queue Length:", resAI.body.analysis ? resAI.body.analysis.queue_length_meters : "N/A", "meters");
  console.log("Avg Speed:", resAI.body.analysis ? resAI.body.analysis.avg_speed_kmh : "N/A", "km/h");
  if (resAI.status !== 200 || !resAI.body.analysis) {
    throw new Error("Failed POST /api/ai/camera/analyze");
  }

  // 4. Synchronize AI Optical Flow to Live Junction Control (Staff Role)
  console.log("\n--- Test 4: POST /api/traffic/cameras/CAM-01-N/sync-ai-flow ---");
  const resSync = await request(
    "http://127.0.0.1:5000/api/traffic/cameras/CAM-01-N/sync-ai-flow",
    { method: "POST", headers: { "Authorization": `Bearer ${staffToken}` } },
    {}
  );
  console.log("Status:", resSync.status);
  console.log("Sync Message:", resSync.body.message);
  console.log("Updated Junction Congestion:", resSync.body.junctionUpdate ? resSync.body.junctionUpdate.congestion_level : "N/A", "%");
  if (resSync.status !== 200 || !resSync.body.success) {
    throw new Error("Failed to synchronize optical flow to signal engine");
  }

  // 5. Junction Camera Traffic Summary
  console.log("\n--- Test 5: GET /api/traffic/junctions/JNC-01/camera-traffic-summary ---");
  const resSum = await request("http://127.0.0.1:5000/api/traffic/junctions/JNC-01/camera-traffic-summary");
  console.log("Status:", resSum.status);
  console.log("Junction 01 Cameras reporting:", resSum.body.cameras ? resSum.body.cameras.length : 0);
  if (resSum.status !== 200) {
    throw new Error("Failed to fetch camera summary for junction");
  }

  console.log("\n===============================================================");
  console.log("✅ ALL 5 CCTV OPTICAL AI VISION TESTS PASSED PERFECTLY!");
  console.log("===============================================================\n");
  process.exit(0);
}

runCCTVTests().catch(err => {
  console.error("❌ CCTV Test failed:", err.message);
  process.exit(1);
});
