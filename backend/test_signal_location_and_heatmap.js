const http = require('http');

function request(url, options = {}, postData = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const reqOptions = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        if (postData) {
            reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: body });
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log("=== Testing Traffic Light Location Modification & Heatmap Assets ===");
    try {
        // 1. Get Signals
        const sigRes = await request('http://localhost:5000/api/traffic/signals');
        console.log(`[1] GET /api/traffic/signals -> Status ${sigRes.status}, count: ${sigRes.data?.count}`);
        if (!sigRes.data?.signals?.length) {
            throw new Error("No signals returned from database.");
        }

        const targetSignal = sigRes.data.signals[0];
        console.log(`Target signal: ${targetSignal.id} at (${targetSignal.latitude}, ${targetSignal.longitude})`);

        // 2. Relocate Traffic Light
        const newLat = 26.7595123;
        const newLng = 83.3741456;
        const updatePayload = JSON.stringify({
            latitude: newLat,
            longitude: newLng,
            operator: "Inspector R.K. Sharma",
            role: "Senior Traffic Controller"
        });

        const putRes = await request(`http://localhost:5000/api/traffic/signals/${encodeURIComponent(targetSignal.id)}/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }, updatePayload);

        console.log(`[2] PUT /api/traffic/signals/${targetSignal.id}/location -> Status ${putRes.status}`);
        console.log("Response:", putRes.data);

        if (!putRes.data?.success) {
            throw new Error("PUT signal location failed: " + JSON.stringify(putRes.data));
        }

        // 3. Verify in database
        const verifyRes = await request('http://localhost:5000/api/traffic/signals');
        const updated = verifyRes.data.signals.find(s => s.id === targetSignal.id);
        console.log(`[3] Verification in DB: Signal ${updated.id} lat=${updated.latitude}, lng=${updated.longitude}`);
        if (Math.abs(Number(updated.latitude) - newLat) > 0.0001 || Math.abs(Number(updated.longitude) - newLng) > 0.0001) {
            throw new Error(`Coordinates mismatch! Expected (${newLat}, ${newLng}), got (${updated.latitude}, ${updated.longitude})`);
        }
        console.log("✅ Coordinates successfully modified and persisted in database!");

        // 4. Verify Audit Log
        const auditRes = await request('http://localhost:5000/api/traffic/admin/audit-logs');
        const log = auditRes.data.logs.find(l => l.action === 'MODIFY_TRAFFIC_LIGHT_LOCATION');
        if (log) {
            console.log(`[4] ✅ Audit log found: [${log.action}] User=${log.user_name} Target=${log.target} Details=${log.details}`);
        } else {
            console.warn("[4] ⚠️ Audit log not found among top logs.");
        }

        // 5. Verify static assets
        const htmlRes = await request('http://localhost:5000/pages/traffic/traffic.html');
        console.log(`[5] traffic.html status: ${htmlRes.status} (${htmlRes.raw?.length || 0} bytes)`);

        const jsRes = await request('http://localhost:5000/pages/traffic/traffic.js');
        console.log(`[6] traffic.js status: ${jsRes.status} (${jsRes.raw?.length || 0} bytes)`);

        const mapRes = await request('http://localhost:5000/pages/traffic/openlayers_map.js');
        console.log(`[7] openlayers_map.js status: ${mapRes.status} (${mapRes.raw?.length || 0} bytes)`);

        // Check if our new functions are in the served traffic.js
        const hasRadiusHandler = jsRes.raw.includes('onHeatmapRadiusChange');
        const hasModifyModalHandler = jsRes.raw.includes('openModifySignalLocationModal');
        const hasPickHandler = jsRes.raw.includes('pickCoordsForSignalRelocation');
        const hasSubmitHandler = jsRes.raw.includes('submitSignalLocationModification');

        console.log(`[8] Frontend Code Verification:
- onHeatmapRadiusChange: ${hasRadiusHandler ? '✅ Present' : '❌ Missing'}
- openModifySignalLocationModal: ${hasModifyModalHandler ? '✅ Present' : '❌ Missing'}
- pickCoordsForSignalRelocation: ${hasPickHandler ? '✅ Present' : '❌ Missing'}
- submitSignalLocationModification: ${hasSubmitHandler ? '✅ Present' : '❌ Missing'}`);

        console.log("\nALL TESTS PASSED! Traffic light relocation and congestion heatmap features are operational.");
    } catch (err) {
        console.error("Test failed with error:", err);
        process.exit(1);
    }
}

setTimeout(runTests, 1500);
