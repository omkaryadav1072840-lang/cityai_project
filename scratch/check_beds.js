const db = require('../backend/config/db');

async function detail() {
    const p = db.promise();
    const [hosp] = await p.query('SELECT hospital_id, hospital_name, total_beds FROM hospitals ORDER BY id');
    
    for (const h of hosp) {
        const [cats] = await p.query(
            'SELECT id, category, total_beds, occupied_beds, (total_beds - occupied_beds) as avail FROM hospital_bed_categories WHERE hospital_id = ? ORDER BY id',
            [h.hospital_id]
        );
        const [b] = await p.query('SELECT * FROM hospital_beds WHERE hospital_name = ?', [h.hospital_name]);
        
        console.log(`=== ${h.hospital_name} (${h.hospital_id}) total=${h.total_beds} ===`);
        if (b[0]) {
            console.log(`  hospital_beds: gen=${b[0].general_beds}, icu=${b[0].icu_beds}, emg=${b[0].emergency_beds}, pvt=${b[0].private_beds}`);
        } else {
            console.log(`  hospital_beds: NONE`);
        }
        console.log('  categories:');
        cats.forEach(c => {
            console.log(`    [#${c.id}] ${c.category}: total=${c.total_beds}, occ=${c.occupied_beds}, avail=${c.avail}`);
        });
    }
    process.exit(0);
}

detail().catch(err => {
    console.error(err);
    process.exit(1);
});
