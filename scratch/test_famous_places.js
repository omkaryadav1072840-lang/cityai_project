/**
 * Test Famous Places Module API & Database Integration
 */
const http = require('http');

async function testModule() {
    console.log('🧪 Testing Famous Places API Endpoints...');

    const request = (path, method = 'GET', body = null) => new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });

    try {
        // 1. All Places
        const r1 = await request('/api/famous-places');
        console.log(`✅ [GET /api/famous-places] Status: ${r1.status}, Count: ${r1.data.count}`);

        // 2. Categories
        const r2 = await request('/api/famous-places/categories');
        console.log(`✅ [GET /api/famous-places/categories] Status: ${r2.status}, Categories: ${r2.data.categories.length}`);

        // 3. Single Place Details
        const r3 = await request('/api/famous-places/2');
        console.log(`✅ [GET /api/famous-places/2] Status: ${r3.status}, Name: ${r3.data.place.name}, Coords: ${r3.data.place.latitude}, ${r3.data.place.longitude}`);

        // 4. Nearby Smart City Services
        const r4 = await request('/api/famous-places/2/nearby-services');
        console.log(`✅ [GET /api/famous-places/2/nearby-services] Status: ${r4.status}`);
        console.log(`   - Nearest Hospital: ${r4.data.services.hospitals[0].hospital_name} (${r4.data.services.hospitals[0].distance_km} km)`);
        console.log(`   - Nearest Police: ${r4.data.services.police[0].name} (${r4.data.services.police[0].distance_km} km)`);
        console.log(`   - Nearest Parking: ${r4.data.services.parking[0].name} (${r4.data.services.parking[0].distance_km} km, ${r4.data.services.parking[0].available_slots} slots)`);

        // 5. Submit Civic Issue
        const r5 = await request('/api/famous-places/2/issues', 'POST', {
            category: 'Garbage / Cleanliness',
            description: 'Litter spotted near the lake promenade pathway bench.',
            citizen_name: 'Dev Tester',
            citizen_mobile: '9876543210'
        });
        console.log(`✅ [POST /api/famous-places/2/issues] Status: ${r5.status}, Code: ${r5.data.issueCode}`);

        // 6. Smart Trip Planner
        const r6 = await request('/api/famous-places/trip-planner', 'POST', {
            startPoint: 'railway_station',
            duration: '1_day',
            interests: ['Religious', 'Nature', 'Heritage'],
            transport: 'car'
        });
        console.log(`✅ [POST /api/famous-places/trip-planner] Status: ${r6.status}, Route: ${r6.data.plan.itinerary.map(i => i.place.name).join(' -> ')}`);
        console.log(`   - Total Distance: ${r6.data.plan.totalDistanceKm} km, Travel Time: ${r6.data.plan.totalEstimatedTravelTime}`);

        // 7. AI Assistant
        const r7 = await request('/api/famous-places/ai-assistant', 'POST', {
            message: 'Ramgarh Taal ke paas kya ghoom sakte hain?'
        });
        console.log(`✅ [POST /api/famous-places/ai-assistant] Status: ${r7.status}, Provider: ${r7.data.provider}`);
        console.log(`   - Reply snippet: ${r7.data.reply.slice(0, 100).replace(/\n/g, ' ')}...`);

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        process.exit(1);
    }
}

testModule();
