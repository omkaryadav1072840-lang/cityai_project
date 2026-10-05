const db = require('../backend/config/db');

async function main() {
    const p = db.promise();
    const [wards] = await p.query('SELECT * FROM hospital_wards WHERE hospital_id = ?', ['HOSP-001']);
    console.log('HOSP-001 Wards count:', wards.length);
    console.log(wards.map(w => ({
        id: w.id,
        ward_id: w.ward_id,
        ward_name: w.ward_name,
        building_wing: w.building_wing,
        floor: w.floor,
        ward_type: w.ward_type,
        total_beds: w.total_beds,
        occupied_beds: w.occupied_beds
    })));

    const [beds] = await p.query('SELECT * FROM hospital_ward_beds WHERE hospital_id = ?', ['HOSP-001']);
    console.log('HOSP-001 Beds count:', beds.length);
    console.log(beds.slice(0, 10).map(b => ({
        bed_id: b.bed_id,
        ward_id: b.ward_id,
        room_number: b.room_number,
        floor: b.floor,
        bed_number: b.bed_number,
        status: b.status,
        patient_name: b.patient_name
    })));

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
