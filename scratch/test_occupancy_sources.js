const db = require('../backend/config/db');

async function testOccupancy() {
    const p = db.promise();
    const [hosp] = await p.query(`
        SELECT hospital_id, hospital_name, total_beds, icu_beds, emergency_beds 
        FROM hospitals 
        WHERE (status IN ('Active', 'Operational') OR status IS NULL) 
          AND (address LIKE '%Gorakhpur%' OR hospital_name LIKE '%Gorakhpur%' OR hospital_id LIKE '%GKP%')
        ORDER BY id
    `);

    const [beds] = await p.query('SELECT * FROM hospital_beds');
    const [allCats] = await p.query('SELECT * FROM hospital_bed_categories ORDER BY updated_at DESC, id DESC');
    const [wards] = await p.query('SELECT * FROM hospital_wards');

    console.log('Hospital-wise breakdown:');
    for (const h of hosp) {
        const b = beds.find(x => x.hospital_name.toLowerCase() === h.hospital_name.toLowerCase());
        const cats = allCats.filter(c => c.hospital_id === h.hospital_id);
        const w = wards.filter(wd => wd.hospital_id === h.hospital_id);

        console.log(`\n==============================================`);
        console.log(`${h.hospital_name} (${h.hospital_id})`);
        console.log(`Capacity: Total=${h.total_beds}, General=${b.general_beds}, ICU=${b.icu_beds}, Emergency=${b.emergency_beds}, Private=${b.private_beds}`);
        
        console.log('Categories:');
        cats.forEach(c => {
            console.log(`  [cat #${c.id}] ${c.category}: total=${c.total_beds}, occ=${c.occupied_beds}, avail=${c.total_beds - c.occupied_beds}`);
        });

        if (w.length) {
            console.log('Wards:');
            w.forEach(wd => {
                console.log(`  [ward #${wd.id}] ${wd.ward_type} (${wd.ward_name}): total=${wd.total_beds}, occ=${wd.occupied_beds}, avail=${wd.total_beds - wd.occupied_beds}`);
            });
        }
    }
    process.exit(0);
}

testOccupancy().catch(err => {
    console.error(err);
    process.exit(1);
});
