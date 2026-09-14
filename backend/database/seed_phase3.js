const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'smartcity'
});

const seeds = [
  {
    name: 'parking_lots',
    sql: "INSERT IGNORE INTO parking_lots (parking_code, name, address, area, total_slots, available_slots, occupied_slots, hourly_rate, status, latitude, longitude, vehicle_types, cctv_available, security_available, source_type, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    rows: [
      ['PARK-001','Railway Station Parking','Gorakhpur Junction, Platform 1 Gate','Railway Area',80,34,46,20.00,'OPEN',26.7652,83.3701,'CAR,BIKE',1,1,'DEMO',1],
      ['PARK-002','Golghar Parking Complex','Golghar Chowk, Civil Lines','Civil Lines',60,22,38,15.00,'OPEN',26.7559,83.3705,'CAR,BIKE',1,0,'DEMO',1],
      ['PARK-003','Medical College Parking','BRD Medical College Campus, Medical Road','Medical Area',50,8,42,10.00,'OPEN',26.7884,83.3986,'CAR,BIKE',0,1,'DEMO',1],
      ['PARK-004','Ramgarh Taal Parking','Ramgarh Taal Lake View Road','Ramgarh Taal',40,31,9,10.00,'OPEN',26.7503,83.3881,'CAR,BIKE',0,0,'DEMO',1],
      ['PARK-005','DDU Chowk Parking','DDU Chowk, Gorakhpur City Centre','City Centre',35,0,35,20.00,'FULL',26.7548,83.3732,'CAR,BIKE',1,1,'DEMO',1],
      ['PARK-006','AIIMS Campus Parking','AIIMS Gorakhpur, Kushmi Forest','AIIMS Area',100,55,45,10.00,'OPEN',26.7329,83.4475,'CAR,BIKE',1,1,'DEMO',1]
    ]
  },
  {
    name: 'water_tanks',
    sql: "INSERT IGNORE INTO water_tanks (tank_id, name, zone, capacity_liters, current_level_percent, status, next_supply_time) VALUES (?,?,?,?,?,?,?)",
    rows: [
      ['TANK-001','Tank Alpha - University Zone','Gorakhpur University Area',100000,78,'Operational','06:00 AM - 09:00 AM'],
      ['TANK-002','Tank Beta - Golghar Zone','Civil Lines & Golghar',80000,54,'Operational','06:30 AM - 09:30 AM'],
      ['TANK-003','Tank Gamma - Railway Colony','Railway Colony & Rustampur',120000,31,'Maintenance','04:00 PM - 07:00 PM'],
      ['TANK-004','Tank Delta - Medical Road','Medical Road & Basharatpur',90000,62,'Operational','07:00 AM - 10:00 AM'],
      ['TANK-005','Tank Epsilon - Sahjanwa Zone','Sahjanwa & Pipraich Road',70000,88,'Operational','05:30 AM - 08:30 AM']
    ]
  },
  {
    name: 'police_stations',
    sql: "INSERT IGNORE INTO police_stations (station_id, name, sho_name, phone, jurisdiction, location, latitude, longitude) VALUES (?,?,?,?,?,?,?,?)",
    rows: [
      ['PS-001','Kotwali Police Station','Inspector R.K. Sharma','0551-2201100','Gorakhpur City Centre, Golghar, Civil Lines','Kotwali Road, Gorakhpur',26.7600,83.3710],
      ['PS-002','Civil Lines Police Station','Inspector A.K. Singh','0551-2338400','Civil Lines, Padri Bazar, Kunraghat','Civil Lines, Gorakhpur',26.7620,83.3770],
      ['PS-003','Cantt Police Station','Inspector M.P. Verma','0551-2340200','Cantonment Area, Rapti Nagar, Mohaddipur','Cantonment Road, Gorakhpur',26.7530,83.3650],
      ['PS-004','Sahjanwa Police Station','Inspector S.K. Yadav','0551-2782300','Sahjanwa, Pipraich, Rural East Gorakhpur','Sahjanwa Town, Gorakhpur',26.7252,83.4322],
      ['PS-005','Gorakhpur Junction Police Post','Inspector D. Tripathi','0551-2201999','Railway Station Area, Buxipur, Tikonia','Gorakhpur Junction, Platform Side',26.7652,83.3701],
      ['PS-006','Medical College Outpost','Inspector N. Pandey','0551-2310100','BRD Medical, Rampur Bagh, Shyamnagar','Medical College Road, Gorakhpur',26.7884,83.3986],
      ['PS-007','Gola Bazar Police Station','Inspector V.K. Gupta','0551-2450900','Gola Bazar, Mohaddipur, Rustampur','Gola Bazar, Gorakhpur',26.7710,83.3520],
      ['PS-008','AIIMS Campus Security Post','Inspector P. Srivastava','0551-2207700','AIIMS Campus, Kushmi Forest, NH-29','AIIMS Gorakhpur, Kushmi Forest',26.7329,83.4475]
    ]
  },
  {
    name: 'police_stats',
    sql: "INSERT IGNORE INTO police_stats (month_year, theft, assault, traffic_violations, domestic, cybercrime, other) VALUES (?,?,?,?,?,?,?)",
    rows: [
      ['Apr 2026',28,12,45,8,6,15],
      ['May 2026',31,15,52,10,9,18],
      ['Jun 2026',24,11,61,7,12,14],
      ['Jul 2026',35,18,58,11,14,20],
      ['Aug 2026',29,13,66,9,11,17],
      ['Sep 2026',22,10,49,6,8,13]
    ]
  },
  {
    name: 'water_reports',
    sql: "INSERT IGNORE INTO water_reports (report_id, citizen_name, mobile, issue_type, location, description, status) VALUES (?,?,?,?,?,?,?)",
    rows: [
      ['WR-001','Ramesh Sharma','9876512340','No Supply','Railway Colony, Ward 12','Water supply has been absent for 3 days.','Under Review'],
      ['WR-002','Sunita Devi','9988776655','Low Pressure','Civil Lines, Sector 4','Pressure is very low, not reaching second floor.','Open'],
      ['WR-003','Mohd. Aslam','8765432198','Pipe Leak','Gola Bazar Main Road','Main pipeline leaking near Shiv Temple crossing.','Resolved']
    ]
  }
];

db.connect(err => {
  if (err) { console.log('Connection error:', err.message); process.exit(1); }
  console.log('Connected to MySQL. Seeding Phase 3 data...\n');

  let total = seeds.reduce((s, g) => s + g.rows.length, 0);
  let done = 0;
  let errors = 0;

  seeds.forEach(group => {
    group.rows.forEach(row => {
      db.query(group.sql, row, (e, r) => {
        if (e) {
          console.log('ERROR [' + group.name + ']:', e.message);
          errors++;
        } else {
          if (r.affectedRows > 0) process.stdout.write('.');
          else process.stdout.write('s'); // skipped (already exists)
        }
        done++;
        if (done === total) {
          console.log('\n\nPhase 3 seeding complete! Errors: ' + errors);
          // Verify counts
          const tables = ['parking_lots','water_tanks','police_stations','police_stats','water_reports'];
          let v = 0;
          tables.forEach(t => {
            db.query('SELECT COUNT(*) AS cnt FROM ' + t, (e, r) => {
              console.log(t + ': ' + (e ? 'ERROR' : r[0].cnt + ' rows'));
              v++;
              if (v === tables.length) db.end();
            });
          });
        }
      });
    });
  });
});
