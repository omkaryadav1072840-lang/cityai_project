const db = require('../backend/config/db');

async function testCategoryAggregation() {
    const p = db.promise();
    
    // 1. Get all valid Gorakhpur hospitals
    const [hospitals] = await p.query(`
        SELECT id, hospital_id, hospital_name, address, total_beds, icu_beds, emergency_beds, status
        FROM hospitals
        WHERE (status IN ('Active', 'Operational') OR status IS NULL)
          AND (address LIKE '%Gorakhpur%' OR hospital_name LIKE '%Gorakhpur%' OR hospital_id LIKE '%GKP%')
        ORDER BY id
    `);

    console.log(`Found ${hospitals.length} valid Gorakhpur hospitals.`);
    
    // 2. For each hospital, get its hospital_beds record
    const [hospitalBeds] = await p.query(`
        SELECT * FROM hospital_beds
    `);
    
    // 3. For each hospital, get its hospital_bed_categories records
    const [bedCategories] = await p.query(`
        SELECT * FROM hospital_bed_categories
        ORDER BY updated_at DESC, id DESC
    `);

    // 4. For each hospital, check hospital_wards
    const [wards] = await p.query(`
        SELECT * FROM hospital_wards
    `);

    console.log('\n--- Hospital by Hospital Bed Analysis ---');
    let totalCap = 0;
    
    for (const h of hospitals) {
        totalCap += h.total_beds;
        const b = hospitalBeds.find(hb => hb.hospital_name.toLowerCase() === h.hospital_name.toLowerCase());
        const cats = bedCategories.filter(c => c.hospital_id === h.hospital_id);
        const w = wards.filter(wd => wd.hospital_id === h.hospital_id);
        
        console.log(`\n🏥 ${h.hospital_name} (${h.hospital_id})`);
        console.log(`   Registry total_beds: ${h.total_beds}, icu: ${h.icu_beds}, emg: ${h.emergency_beds}`);
        if (b) {
            console.log(`   hospital_beds: gen=${b.general_beds}, icu=${b.icu_beds}, emg=${b.emergency_beds}, pvt=${b.private_beds} (sum=${b.general_beds+b.icu_beds+b.emergency_beds+b.private_beds})`);
        } else {
            console.log(`   hospital_beds: NOT FOUND`);
        }
        console.log(`   Categories count: ${cats.length}`);
        cats.forEach(c => {
            console.log(`     - [${c.category}] total: ${c.total_beds}, occ: ${c.occupied_beds}, avail: ${c.total_beds - c.occupied_beds}`);
        });
        if (w.length) {
            console.log(`   Wards count: ${w.length}`);
            w.forEach(wd => {
                console.log(`     * [${wd.ward_type} | ${wd.ward_name}] total: ${wd.total_beds}, occ: ${wd.occupied_beds}`);
            });
        }
    }
    
    console.log(`\n========================================`);
    console.log(`TOTAL GORAKHPUR HOSPITAL CAPACITY = ${totalCap}`);
    console.log(`========================================`);

    process.exit(0);
}

testCategoryAggregation().catch(err => {
    console.error(err);
    process.exit(1);
});
