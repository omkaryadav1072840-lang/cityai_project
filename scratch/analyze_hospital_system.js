const fs = require('fs');
const path = require('path');
const db = require('../backend/config/db');

async function analyze() {
  console.log('=== 1. PANELS IN HOSPITAL_DASHBOARD.HTML ===');
  const dashHtml = fs.readFileSync(path.join(__dirname, '../frontend/pages/hospital/hospital_dashboard.html'), 'utf8');
  const panelMatches = dashHtml.match(/id="panel-[^"]+"/g) || [];
  panelMatches.forEach(p => console.log(' ', p));

  console.log('\n=== 2. PANELS IN SUPERADMIN_HOSPITAL.HTML ===');
  if (fs.existsSync(path.join(__dirname, '../frontend/pages/hospital/superadmin_hospital.html'))) {
    const saHtml = fs.readFileSync(path.join(__dirname, '../frontend/pages/hospital/superadmin_hospital.html'), 'utf8');
    const saMatches = saHtml.match(/id="[^"]*panel[^"]*"/gi) || [];
    saMatches.forEach(p => console.log(' ', p));
  }

  console.log('\n=== 3. PANELS IN DOCTOR_DASHBOARD.HTML ===');
  if (fs.existsSync(path.join(__dirname, '../frontend/pages/hospital/doctor_dashboard.html'))) {
    const docHtml = fs.readFileSync(path.join(__dirname, '../frontend/pages/hospital/doctor_dashboard.html'), 'utf8');
    const docMatches = docHtml.match(/id="[^"]*panel[^"]*"/gi) || [];
    docMatches.forEach(p => console.log(' ', p));
  }

  console.log('\n=== 4. DATABASE TABLE SCHEMAS & RELATIONSHIPS ===');
  const tables = [
    'hospitals',
    'hospital_departments',
    'hospital_wards',
    'hospital_ward_beds',
    'hospital_bed_categories',
    'hospital_beds',
    'doctors',
    'doctor_slots',
    'doctor_schedules',
    'appointments',
    'patient_records',
    'patient_reports',
    'prescriptions',
    'diagnostic_categories',
    'diagnostic_tests',
    'diagnostic_reports',
    'hospital_staff',
    'audit_logs'
  ];

  for (const t of tables) {
    try {
      const [cols] = await db.promise().query(`DESCRIBE \`${t}\``);
      console.log(`\nTable: ${t}`);
      console.log('Columns: ' + cols.map(c => `${c.Field} (${c.Type}${c.Null === 'NO' ? ' NOT NULL' : ''})`).join(', '));
      const [sample] = await db.promise().query(`SELECT * FROM \`${t}\` LIMIT 1`);
      if (sample.length > 0) {
        console.log('Sample Keys:', Object.keys(sample[0]));
      }
    } catch (e) {
      console.log(`Table ${t} error: ${e.message}`);
    }
  }

  process.exit(0);
}

analyze().catch(e => {
  console.error(e);
  process.exit(1);
});
