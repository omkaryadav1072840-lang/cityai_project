const db = require('../backend/config/db');

async function migrate() {
  const p = db.promise();
  
  // 1. Check and add columns on staff
  const [staffCols] = await p.query('DESCRIBE staff');
  const staffFields = staffCols.map(c => c.Field);
  
  if (!staffFields.includes('status')) {
    console.log('Adding status column to staff table...');
    await p.query("ALTER TABLE staff ADD COLUMN status VARCHAR(20) DEFAULT 'Active'");
  }
  if (!staffFields.includes('permissions')) {
    console.log('Adding permissions column to staff table...');
    await p.query('ALTER TABLE staff ADD COLUMN permissions JSON NULL');
  }
  if (!staffFields.includes('assigned_modules')) {
    console.log('Adding assigned_modules column to staff table...');
    await p.query('ALTER TABLE staff ADD COLUMN assigned_modules JSON NULL');
  }

  // 2. Check and add columns on hospital_staff
  const [hStaffCols] = await p.query('DESCRIBE hospital_staff');
  const hStaffFields = hStaffCols.map(c => c.Field);

  if (!hStaffFields.includes('permissions')) {
    console.log('Adding permissions column to hospital_staff table...');
    await p.query('ALTER TABLE hospital_staff ADD COLUMN permissions JSON NULL');
  }
  if (!hStaffFields.includes('assigned_modules')) {
    console.log('Adding assigned_modules column to hospital_staff table...');
    await p.query('ALTER TABLE hospital_staff ADD COLUMN assigned_modules JSON NULL');
  }

  // 3. Ensure all existing staff have status = 'Active'
  await p.query("UPDATE staff SET status = 'Active' WHERE status IS NULL OR status = ''");
  await p.query("UPDATE hospital_staff SET status = 'Active' WHERE status IS NULL OR status = ''");

  // 4. Populate default permissions and assigned_modules based on role for existing staff
  const defaultModules = {
    receptionist: ['patients', 'appointments', 'queue'],
    doctor: ['appointments', 'patients', 'records', 'prescriptions', 'slots'],
    nurse: ['patients', 'beds', 'care', 'admissions'],
    lab_technician: ['tests', 'samples', 'reports'],
    radiologist: ['tests', 'scans', 'reports'],
    pharmacy: ['prescriptions', 'medicines', 'inventory'],
    billing: ['bills', 'payments', 'receipts', 'reports'],
    ambulance: ['ambulance', 'dispatch', 'emergency', 'status'],
    hospital_admin: ['hospital_overview', 'departments', 'doctors', 'doctor_slots', 'staff_management', 'bed_inventory', 'services', 'hospital_status', 'analytics']
  };

  const defaultPerms = {
    receptionist: ['view', 'create', 'update'],
    doctor: ['view', 'create', 'update'],
    nurse: ['view', 'update'],
    lab_technician: ['view', 'create', 'update'],
    radiologist: ['view', 'create', 'update'],
    pharmacy: ['view', 'create', 'update'],
    billing: ['view', 'create', 'update'],
    ambulance: ['view', 'update'],
    hospital_admin: ['view', 'create', 'update', 'delete', 'manage_staff', 'manage_doctors', 'manage_beds']
  };

  const [staffRows] = await p.query('SELECT id, staff_id, role, hospital_role FROM staff');
  for (const row of staffRows) {
    const roleKey = (row.hospital_role || (row.role === 'admin' ? 'hospital_admin' : 'receptionist')).toLowerCase();
    const modules = defaultModules[roleKey] || ['overview'];
    const perms = defaultPerms[roleKey] || ['view'];

    await p.query(
      'UPDATE staff SET permissions = ?, assigned_modules = ? WHERE id = ?',
      [JSON.stringify(perms), JSON.stringify(modules), row.id]
    );

    await p.query(
      'UPDATE hospital_staff SET permissions = ?, assigned_modules = ? WHERE staff_id = ?',
      [JSON.stringify(perms), JSON.stringify(modules), row.staff_id]
    );
  }

  console.log('Migration & default permission seeding completed successfully.');
  setTimeout(() => process.exit(0), 100);
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
