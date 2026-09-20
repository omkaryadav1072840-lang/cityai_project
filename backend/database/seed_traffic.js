/**
 * SmartCity AI Traffic Platform - Database Seeder
 * Seeds Gorakhpur Junctions, Signals, CCTV Cameras, Rules, Corridors, and Incidents.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedTraffic() {
    console.log('🚦 Initializing SmartCity Traffic Database for Gorakhpur...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity',
        multipleStatements: true
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        // 1. Run traffic_schema.sql
        const schemaPath = path.join(__dirname, 'traffic_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
        console.log('✅ Traffic schema applied successfully.');

        // 2. Seed Junctions
        const junctions = [
            {
                id: 'JNC-01',
                name: 'Golghar Central Crossing',
                zone: 'Central Urban Core',
                landmark: 'Near City Mall & Sadar Hospital',
                latitude: 26.7588,
                longitude: 83.3731,
                status: 'Operational',
                mode: 'AI Adaptive',
                cycle_time: 120,
                active_phase: 'North-South Green',
                congestion_level: 68,
                avg_speed_kmh: 18.5,
                assigned_officer_id: 'STF-TR-01',
                assigned_officer_name: 'Insp. R.K. Verma'
            },
            {
                id: 'JNC-02',
                name: 'Mohaddipur Junction',
                zone: 'East Transit Hub',
                landmark: 'Connecting Deoria Highway & University Road',
                latitude: 26.7535,
                longitude: 83.3980,
                status: 'Heavy Congestion',
                mode: 'AI Adaptive',
                cycle_time: 140,
                active_phase: 'East-West Green',
                congestion_level: 82,
                avg_speed_kmh: 14.0,
                assigned_officer_id: 'STF-TR-02',
                assigned_officer_name: 'Sub-Insp. Amit Pandey'
            },
            {
                id: 'JNC-03',
                name: 'Asuran Chowk',
                zone: 'North Urban Zone',
                landmark: 'Medical Road & Asuran Market',
                latitude: 26.7725,
                longitude: 83.3772,
                status: 'Operational',
                mode: 'AI Adaptive',
                cycle_time: 110,
                active_phase: 'North-South Green',
                congestion_level: 45,
                avg_speed_kmh: 24.2,
                assigned_officer_id: 'STF-TR-03',
                assigned_officer_name: 'Head Constable Sunil Yadav'
            },
            {
                id: 'JNC-04',
                name: 'Nausarh RTO Crossing',
                zone: 'South Bypass Corridor',
                landmark: 'Varanasi-Lucknow Highway Intersection',
                latitude: 26.7180,
                longitude: 83.3425,
                status: 'Operational',
                mode: 'Fixed Timer',
                cycle_time: 130,
                active_phase: 'East-West Green',
                congestion_level: 52,
                avg_speed_kmh: 32.0,
                assigned_officer_id: 'STF-TR-04',
                assigned_officer_name: 'Insp. M.K. Mishra'
            },
            {
                id: 'JNC-05',
                name: 'Medical College T-Point',
                zone: 'North Healthcare Corridor',
                landmark: 'BRD Medical College Main Gate',
                latitude: 26.7884,
                longitude: 83.3986,
                status: 'Operational',
                mode: 'AI Adaptive',
                cycle_time: 100,
                active_phase: 'North-South Green',
                congestion_level: 58,
                avg_speed_kmh: 21.5,
                assigned_officer_id: 'STF-TR-01',
                assigned_officer_name: 'Insp. R.K. Verma'
            },
            {
                id: 'JNC-06',
                name: 'Gorakhnath Mandir T-Point',
                zone: 'Pilgrimage & North Sector',
                landmark: 'Gorakhnath Temple Main Approach',
                latitude: 26.7865,
                longitude: 83.3512,
                status: 'Operational',
                mode: 'AI Adaptive',
                cycle_time: 105,
                active_phase: 'North-South Green',
                congestion_level: 38,
                avg_speed_kmh: 26.0,
                assigned_officer_id: 'STF-TR-05',
                assigned_officer_name: 'Officer Deepak Singh'
            },
            {
                id: 'JNC-07',
                name: 'Shastri Chowk',
                zone: 'Judicial & Administrative Core',
                landmark: 'Civil Court & Commissioner Office',
                latitude: 26.7570,
                longitude: 83.3820,
                status: 'Operational',
                mode: 'AI Adaptive',
                cycle_time: 115,
                active_phase: 'East-West Green',
                congestion_level: 40,
                avg_speed_kmh: 25.8,
                assigned_officer_id: 'STF-TR-02',
                assigned_officer_name: 'Sub-Insp. Amit Pandey'
            },
            {
                id: 'JNC-08',
                name: 'Dharamshala Bazar Crossing',
                zone: 'Commercial Heritage Zone',
                landmark: 'Railway Station South Entry & Old Market',
                latitude: 26.7645,
                longitude: 83.3670,
                status: 'Heavy Congestion',
                mode: 'Manual Override',
                cycle_time: 125,
                active_phase: 'North-South Green',
                congestion_level: 79,
                avg_speed_kmh: 12.5,
                assigned_officer_id: 'STF-TR-03',
                assigned_officer_name: 'Head Constable Sunil Yadav'
            }
        ];

        for (const j of junctions) {
            await connection.query(
                `INSERT INTO traffic_junctions 
                (id, name, zone, landmark, latitude, longitude, status, mode, cycle_time, active_phase, congestion_level, avg_speed_kmh, assigned_officer_id, assigned_officer_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                name=VALUES(name), status=VALUES(status), mode=VALUES(mode), congestion_level=VALUES(congestion_level)`,
                [j.id, j.name, j.zone, j.landmark, j.latitude, j.longitude, j.status, j.mode, j.cycle_time, j.active_phase, j.congestion_level, j.avg_speed_kmh, j.assigned_officer_id, j.assigned_officer_name]
            );
        }
        console.log(`✅ Seeded ${junctions.length} Gorakhpur traffic junctions.`);

        // 3. Seed Signals for each Junction (North, South, East, West)
        const approaches = [
            { dir: 'North', green: 45, yellow: 4, red: 71, color: 'Green', cd: 28 },
            { dir: 'South', green: 45, yellow: 4, red: 71, color: 'Green', cd: 28 },
            { dir: 'East',  green: 40, yellow: 4, red: 76, color: 'Red',   cd: 45 },
            { dir: 'West',  green: 40, yellow: 4, red: 76, color: 'Red',   cd: 45 }
        ];

        for (const j of junctions) {
            for (const app of approaches) {
                const signalId = `SIG-${j.id}-${app.dir.toUpperCase()}`;
                const streetName = `${j.name} (${app.dir} Approach)`;
                await connection.query(
                    `INSERT INTO traffic_signals
                    (id, junction_id, approach, street_name, green_time, yellow_time, red_time, current_color, countdown, pedestrian_walk)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                    ON DUPLICATE KEY UPDATE green_time=VALUES(green_time), red_time=VALUES(red_time)`,
                    [signalId, j.id, app.dir, streetName, app.green, app.yellow, app.red, app.color, app.cd]
                );
            }
        }
        console.log('✅ Seeded 32 directional traffic signal heads.');

        // 4. Seed CCTV Cameras (2-3 per junction)
        const cameras = [
            // Golghar
            { id: 'CAM-01-N', junction_id: 'JNC-01', name: 'Golghar North - Sadar Road Cam', dir: 'North', stream: 'demo_golghar_n.mp4', res: '4K UltraHD', fps: 30, veh: 54, spd: 19.2 },
            { id: 'CAM-01-S', junction_id: 'JNC-01', name: 'Golghar South - Cinema Road Cam', dir: 'South', stream: 'demo_golghar_s.mp4', res: '1080p FHD', fps: 30, veh: 48, spd: 21.0 },
            { id: 'CAM-01-E', junction_id: 'JNC-01', name: 'Golghar East - Park Road Cam', dir: 'East', stream: 'demo_golghar_e.mp4', res: '1080p FHD', fps: 30, veh: 36, spd: 24.5 },
            // Mohaddipur
            { id: 'CAM-02-E', junction_id: 'JNC-02', name: 'Mohaddipur East - Deoria Highway Cam', dir: 'East', stream: 'demo_mohaddipur_e.mp4', res: '4K UltraHD', fps: 30, veh: 78, spd: 12.8 },
            { id: 'CAM-02-W', junction_id: 'JNC-02', name: 'Mohaddipur West - University Road Cam', dir: 'West', stream: 'demo_mohaddipur_w.mp4', res: '1080p FHD', fps: 30, veh: 65, spd: 16.4 },
            { id: 'CAM-02-N', junction_id: 'JNC-02', name: 'Mohaddipur North - Cantt Approach Cam', dir: 'North', stream: 'demo_mohaddipur_n.mp4', res: '1080p FHD', fps: 30, veh: 42, spd: 22.0 },
            // Asuran Chowk
            { id: 'CAM-03-N', junction_id: 'JNC-03', name: 'Asuran North - Medical Road Cam', dir: 'North', stream: 'demo_asuran_n.mp4', res: '1080p FHD', fps: 30, veh: 38, spd: 25.5 },
            { id: 'CAM-03-S', junction_id: 'JNC-03', name: 'Asuran South - Railway Approach Cam', dir: 'South', stream: 'demo_asuran_s.mp4', res: '1080p FHD', fps: 30, veh: 41, spd: 23.0 },
            // Nausarh RTO
            { id: 'CAM-04-S', junction_id: 'JNC-04', name: 'Nausarh South - Varanasi Highway Cam', dir: 'South', stream: 'demo_nausarh_s.mp4', res: '4K UltraHD', fps: 30, veh: 52, spd: 34.0 },
            { id: 'CAM-04-W', junction_id: 'JNC-04', name: 'Nausarh West - Lucknow Highway Cam', dir: 'West', stream: 'demo_nausarh_w.mp4', res: '1080p FHD', fps: 30, veh: 49, spd: 31.5 },
            // Medical College T-Point
            { id: 'CAM-05-N', junction_id: 'JNC-05', name: 'BRD Medical North - Trauma Ingate Cam', dir: 'North', stream: 'demo_brd_n.mp4', res: '4K UltraHD', fps: 30, veh: 50, spd: 20.0 },
            { id: 'CAM-05-E', junction_id: 'JNC-05', name: 'BRD Medical East - Padri Bazar Approach', dir: 'East', stream: 'demo_brd_e.mp4', res: '1080p FHD', fps: 30, veh: 34, spd: 26.0 },
            // Gorakhnath Mandir
            { id: 'CAM-06-N', junction_id: 'JNC-06', name: 'Gorakhnath North - Mandir Gate Cam', dir: 'North', stream: 'demo_gorakhnath_n.mp4', res: '4K UltraHD', fps: 30, veh: 30, spd: 27.0 },
            // Shastri Chowk
            { id: 'CAM-07-C', junction_id: 'JNC-07', name: 'Shastri Chowk Court Perimeter Cam', dir: 'East', stream: 'demo_shastri_e.mp4', res: '1080p FHD', fps: 30, veh: 35, spd: 26.5 },
            // Dharamshala Bazar
            { id: 'CAM-08-W', junction_id: 'JNC-08', name: 'Dharamshala Bazar West - Overbridge Cam', dir: 'West', stream: 'demo_dharamshala_w.mp4', res: '1080p FHD', fps: 30, veh: 72, spd: 11.8 }
        ];

        for (const cam of cameras) {
            await connection.query(
                `INSERT INTO traffic_cameras
                (id, junction_id, camera_name, direction, stream_url, resolution, fps, status, is_simulated, sensor_type, vehicles_per_min, avg_speed)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Online', 1, 'AI Optical Vision + Radar Speed', ?, ?)
                ON DUPLICATE KEY UPDATE camera_name=VALUES(camera_name), stream_url=VALUES(stream_url), vehicles_per_min=VALUES(vehicles_per_min)`,
                [cam.id, cam.junction_id, cam.name, cam.dir, cam.stream, cam.res, cam.fps, cam.veh, cam.spd]
            );
        }
        console.log(`✅ Seeded ${cameras.length} AI Optical CCTV Camera units.`);

        // 5. Seed Movement Rules
        const rules = [
            {
                id: 'RULE-01',
                junction_id: 'JNC-01',
                type: 'One-Way Restriction',
                title: 'Golghar Market Inward One-Way',
                desc: 'Strict one-way traffic from Sadar Hospital to Baldev Plaza between 10:00 AM and 09:00 PM to prevent shopping gridlock.',
                start: '10:00', end: '21:00', active: 1, penalty: 1500.00
            },
            {
                id: 'RULE-02',
                junction_id: 'JNC-02',
                type: 'Heavy Vehicle Curfew',
                title: 'Deoria Highway Heavy Vehicle Ban',
                desc: 'Multi-axle trucks prohibited through Mohaddipur urban stretch during peak school & office hours.',
                start: '08:00', end: '20:30', active: 1, penalty: 5000.00
            },
            {
                id: 'RULE-03',
                junction_id: 'JNC-03',
                type: 'Free Left Turn',
                title: 'Asuran Chowk Free Left Towards Medical College',
                desc: 'Unobstructed continuous left slip turn for vehicles heading north towards BRD Medical College.',
                start: '00:00', end: '23:59', active: 1, penalty: 1000.00
            },
            {
                id: 'RULE-04',
                junction_id: 'JNC-08',
                type: 'Reversible Center Lane',
                title: 'Railway Station Flyover Peak Reversible Lane',
                desc: 'Center lane dedicated to incoming morning traffic towards Gorakhpur Junction, reversed in evening.',
                start: '07:30', end: '11:30', active: 1, penalty: 2000.00
            }
        ];

        for (const r of rules) {
            await connection.query(
                `INSERT INTO traffic_movement_rules
                (id, junction_id, rule_type, title, description, start_time, end_time, is_active, penalty_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), is_active=VALUES(is_active)`,
                [r.id, r.junction_id, r.type, r.title, r.desc, r.start, r.end, r.active, r.penalty]
            );
        }
        console.log(`✅ Seeded ${rules.length} Gorakhpur traffic movement rules.`);

        // 6. Seed Emergency Corridors
        const corridors = [
            {
                id: 'CORR-01',
                name: 'AIIMS to District Sadar Hospital Life Line',
                origin: 'AIIMS Gorakhpur (Kushmi)',
                destination: 'District Hospital (Golghar)',
                type: 'Ambulance',
                status: 'Standby',
                junctions: JSON.stringify(['JNC-02', 'JNC-07', 'JNC-01']),
                eta: 9
            },
            {
                id: 'CORR-02',
                name: 'BRD Medical to Cantt Trauma Bypass',
                origin: 'BRD Medical College',
                destination: 'Cantt Railway Hospital',
                type: 'Ambulance',
                status: 'Standby',
                junctions: JSON.stringify(['JNC-05', 'JNC-03', 'JNC-07']),
                eta: 11
            },
            {
                id: 'CORR-03',
                name: 'Gorakhnath Pilgrimage Fire & Safety Rapid Corridor',
                origin: 'Golghar Fire Headquarters',
                destination: 'Gorakhnath Temple North Gate',
                type: 'Fire Engine',
                status: 'Standby',
                junctions: JSON.stringify(['JNC-01', 'JNC-08', 'JNC-06']),
                eta: 7
            }
        ];

        for (const c of corridors) {
            await connection.query(
                `INSERT INTO traffic_corridors
                (id, name, origin, destination, emergency_type, status, junction_sequence, estimated_travel_min, triggered_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Command Center')
                ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)`,
                [c.id, c.name, c.origin, c.destination, c.type, c.status, c.junctions, c.eta]
            );
        }
        console.log(`✅ Seeded ${corridors.length} emergency green corridors.`);

        // 7. Seed Sample Citizen Incidents
        const incidents = [
            {
                id: 'INC-2026-001',
                name: 'Rajesh Kumar',
                phone: '9876543210',
                jnc: 'JNC-02',
                type: 'Accident',
                loc: 'Mohaddipur Junction Flyover Descent',
                lat: 26.7540, lng: 83.3985,
                desc: 'Two-wheeler and auto collision blocking inner lane. Police & 108 ambulance needed.',
                severity: 'High',
                status: 'Officer Dispatched',
                officer: 'Sub-Insp. Amit Pandey'
            },
            {
                id: 'INC-2026-002',
                name: 'Pooja Verma',
                phone: '9876543211',
                jnc: 'JNC-03',
                type: 'Road Damage / Pothole',
                loc: 'Near Asuran Chowk Petrol Pump',
                lat: 26.7730, lng: 83.3768,
                desc: 'Deep cavity post water pipeline excavation causing 2-wheeler skidding risk.',
                severity: 'Moderate',
                status: 'Verified',
                officer: 'Municipal PWD Wing'
            },
            {
                id: 'INC-2026-003',
                name: 'Vikram Srivastava',
                phone: '9876543212',
                jnc: 'JNC-08',
                type: 'Severe Congestion',
                loc: 'Dharamshala Overbridge Ramp',
                lat: 26.7650, lng: 83.3665,
                desc: 'Stalled cargo truck causing 1.2km tailback towards railway terminal.',
                severity: 'Critical',
                status: 'Officer Dispatched',
                officer: 'Head Constable Sunil Yadav'
            }
        ];

        for (const inc of incidents) {
            await connection.query(
                `INSERT INTO traffic_incidents
                (id, reporter_name, reporter_phone, junction_id, incident_type, location_name, latitude, longitude, description, severity, status, assigned_officer)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status=VALUES(status), severity=VALUES(severity)`,
                [inc.id, inc.name, inc.phone, inc.jnc, inc.type, inc.loc, inc.lat, inc.lng, inc.desc, inc.severity, inc.status, inc.officer]
            );
        }
        console.log(`✅ Seeded ${incidents.length} sample traffic incidents.`);

        // 8. Seed AI Platform Settings
        const aiSettings = [
            { key: 'AI_DETECTION_MODEL', val: 'YOLOv8-Traffic-Urban-GKP-v2.1', cat: 'AI_VISION', desc: 'Computer vision backbone model for multi-class vehicle detection & tracking' },
            { key: 'DETECTION_CONFIDENCE_THRESHOLD', val: '0.72', cat: 'AI_VISION', desc: 'Minimum confidence score (0.0 to 1.0) required to count detected vehicle' },
            { key: 'ADAPTIVE_CYCLE_MIN_SEC', val: '60', cat: 'SIGNAL_TIMING', desc: 'Minimum allowable signal cycle length under dynamic AI flow control' },
            { key: 'ADAPTIVE_CYCLE_MAX_SEC', val: '180', cat: 'SIGNAL_TIMING', desc: 'Maximum allowable signal cycle length during severe peak congestion' },
            { key: 'QUEUE_SPILLBACK_THRESHOLD_METERS', val: '150', cat: 'CONGESTION', desc: 'Queue length trigger that initiates automatic upstream signal throttling' },
            { key: 'EMERGENCY_PREEMPTION_AUTO_RESTORE_SEC', val: '300', cat: 'EMERGENCY', desc: 'Time limit to automatically revert green corridor to standard adaptive cycle' },
            { key: 'SIMULATION_MODE', val: 'ENABLED', cat: 'SYSTEM', desc: 'Platform data stream mode (ENABLED = Synthetic Emulation, DISABLED = Physical Edge Gateway)' }
        ];

        for (const s of aiSettings) {
            await connection.query(
                `INSERT INTO traffic_ai_settings (setting_key, setting_value, category, description)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), description=VALUES(description)`,
                [s.key, s.val, s.cat, s.desc]
            );
        }
        console.log(`✅ Seeded ${aiSettings.length} AI settings.`);

        // 9. Ensure Traffic Staff users exist in staff table
        const trafficStaff = [
            { name: 'Insp. R.K. Verma', staff_id: 'TR-VERMA', pass: 'verma123', dept: 'traffic' },
            { name: 'Sub-Insp. Amit Pandey', staff_id: 'TR-PANDEY', pass: 'pandey123', dept: 'traffic' },
            { name: 'ICCC Traffic Admin', staff_id: 'TR-ADMIN', pass: 'admin123', dept: 'admin' }
        ];

        for (const s of trafficStaff) {
            await connection.query(
                `INSERT IGNORE INTO staff (name, staff_id, password, department)
                VALUES (?, ?, ?, ?)`,
                [s.name, s.staff_id, s.pass, s.dept]
            );
        }
        console.log('✅ Seeded traffic staff accounts (TR-VERMA, TR-PANDEY, TR-ADMIN).');

        // 10. Initial Audit Log Entry
        await connection.query(
            `INSERT INTO traffic_audit_logs (user_id, user_name, role, action, target, details)
            VALUES ('SYSTEM', 'SmartCity System', 'System Admin', 'System Initialization', 'Gorakhpur Traffic Network', 'Platform initialized with 8 junctions, 32 signal heads, 15 CCTV feeds, and AI vision telemetry.')`
        );

        console.log('\n🎉 SmartCity Traffic database initialization completed successfully!\n');
    } catch (err) {
        console.error('❌ Error during traffic database seeding:', err);
    } finally {
        await connection.end();
    }
}

seedTraffic();
