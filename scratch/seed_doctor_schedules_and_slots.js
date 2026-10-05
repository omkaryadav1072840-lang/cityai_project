const db = require('../backend/config/db');

(async () => {
  const p = db.promise();
  const [doctors] = await p.query("SELECT doctor_id, hospital_id, name FROM doctors WHERE status IN ('Active', 'Available')");
  console.log('Active doctors count:', doctors.length);
  
  let insertedSchedules = 0;
  for (const doc of doctors) {
    if (!doc.hospital_id) continue;
    // Check if doc already has schedules for days 1 to 6
    for (let day = 1; day <= 6; day++) {
      const [existing] = await p.query(
        'SELECT id FROM doctor_schedules WHERE doctor_id = ? AND hospital_id = ? AND day_of_week = ?',
        [doc.doctor_id, doc.hospital_id, day]
      );
      if (!existing.length) {
        await p.query(
          'INSERT INTO doctor_schedules (doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [doc.doctor_id, doc.hospital_id, day, '09:00:00', '14:00:00', 30]
        );
        insertedSchedules++;
      }
    }
  }
  console.log('Inserted schedules:', insertedSchedules);
  
  // Seed doctor_slots for each doctor for today and next 7 days
  const today = new Date();
  let insertedSlots = 0;
  for (let offset = 0; offset <= 7; offset++) {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + offset);
    const dateStr = slotDate.toISOString().split('T')[0];
    const dayOfWeek = slotDate.getDay();
    if (dayOfWeek === 0) continue; // Sunday off
    
    for (const doc of doctors) {
      if (!doc.hospital_id) continue;
      const times = [
        { start: '09:00:00', end: '09:30:00', max: 5 },
        { start: '10:00:00', end: '10:30:00', max: 5 },
        { start: '11:00:00', end: '11:30:00', max: 5 },
        { start: '12:00:00', end: '12:30:00', max: 5 },
        { start: '13:00:00', end: '13:30:00', max: 5 }
      ];
      for (const t of times) {
        const [existing] = await p.query(
          'SELECT id FROM doctor_slots WHERE doctor_id = ? AND slot_date = ? AND start_time = ?',
          [doc.doctor_id, dateStr, t.start]
        );
        if (!existing.length) {
          await p.query(
            "INSERT INTO doctor_slots (doctor_id, hospital_id, slot_date, start_time, end_time, max_patients, booked_patients, status) VALUES (?, ?, ?, ?, ?, ?, 0, 'Available')",
            [doc.doctor_id, doc.hospital_id, dateStr, t.start, t.end, t.max]
          );
          insertedSlots++;
        }
      }
    }
  }
  console.log('Inserted doctor_slots:', insertedSlots);
  process.exit(0);
})();
