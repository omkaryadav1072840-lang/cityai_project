const db = require('../backend/config/db');

async function testCompleteCalculation() {
    const p = db.promise();

    // 1. Fetch valid Gorakhpur hospitals
    const [hospitals] = await p.query(`
        SELECT id, hospital_id, hospital_name, address, total_beds, icu_beds, emergency_beds, status
        FROM hospitals
        WHERE (status IN ('Active', 'Operational') OR status IS NULL)
          AND (address LIKE '%Gorakhpur%' OR hospital_name LIKE '%Gorakhpur%' OR hospital_id LIKE '%GKP%')
        ORDER BY hospital_name ASC
    `);

    // 2. Fetch hospital_beds records
    const [beds] = await p.query('SELECT * FROM hospital_beds');

    // 3. Fetch category records
    const [cats] = await p.query('SELECT * FROM hospital_bed_categories ORDER BY updated_at DESC, id DESC');

    // 4. Fetch ward records
    const [wards] = await p.query('SELECT * FROM hospital_wards');

    console.log(`Total valid Gorakhpur hospitals: ${hospitals.length}`);

    // Category accumulators
    const categories = {
        general: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0 },
        icu: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0 },
        emergency: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0 },
        private: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0 }
    };

    const hospitalList = [];

    for (const h of hospitals) {
        const b = beds.find(x => x.hospital_name && x.hospital_name.toLowerCase() === h.hospital_name.toLowerCase());
        const hCats = cats.filter(c => c.hospital_id === h.hospital_id);
        const hWards = wards.filter(w => w.hospital_id === h.hospital_id);

        // Hospital capacity
        const totalBeds = h.total_beds || (b ? (b.general_beds + b.icu_beds + b.emergency_beds + b.private_beds) : 0);

        // General
        const genTotal = b ? b.general_beds : Math.max(0, totalBeds - (h.icu_beds || 0) - (h.emergency_beds || 0));
        // ICU
        const icuTotal = b ? b.icu_beds : (h.icu_beds || 0);
        // Emergency
        const emgTotal = b ? b.emergency_beds : (h.emergency_beds || 0);
        // Private
        const privTotal = b ? b.private_beds : Math.max(0, totalBeds - genTotal - icuTotal - emgTotal);

        // Occupancy calculation from categories or wards
        // ICU
        const icuCat = hCats.find(c => c.category === 'ICU');
        const icuOcc = icuCat ? Math.min(icuTotal, Math.max(0, icuCat.occupied_beds)) : Math.round(icuTotal * 0.85);
        const icuAvail = Math.max(0, icuTotal - icuOcc);

        // Emergency
        const emgCat = hCats.find(c => c.category === 'Emergency Trauma' || c.category === 'Emergency');
        const emgOcc = emgCat ? Math.min(emgTotal, Math.max(0, emgCat.occupied_beds)) : Math.round(emgTotal * 0.78);
        const emgAvail = Math.max(0, emgTotal - emgOcc);

        // General
        const genCat = hCats.find(c => c.category === 'General Ward' || c.category === 'General');
        // If genCat exists, use its occupancy ratio or occupied count
        let genOcc = 0;
        if (genCat && genCat.total_beds > 0) {
            const ratio = genCat.occupied_beds / genCat.total_beds;
            genOcc = Math.min(genTotal, Math.round(genTotal * ratio));
        } else {
            genOcc = Math.round(genTotal * 0.72);
        }
        const genAvail = Math.max(0, genTotal - genOcc);

        // Private
        const privCat = hCats.find(c => c.category === 'Private' || c.category === 'Private Suite' || c.category === 'Semi-Private');
        const privWard = hWards.find(w => w.ward_type === 'Private');
        let privOcc = 0;
        if (privCat && privCat.total_beds > 0) {
            const ratio = privCat.occupied_beds / privCat.total_beds;
            privOcc = Math.min(privTotal, Math.round(privTotal * ratio));
        } else if (privWard && privWard.total_beds > 0) {
            const ratio = privWard.occupied_beds / privWard.total_beds;
            privOcc = Math.min(privTotal, Math.round(privTotal * ratio));
        } else {
            privOcc = Math.round(privTotal * 0.60);
        }
        const privAvail = Math.max(0, privTotal - privOcc);

        const hospOcc = genOcc + icuOcc + emgOcc + privOcc;
        const hospAvail = genAvail + icuAvail + emgAvail + privAvail;

        hospitalList.push({
            hospitalId: h.hospital_id,
            hospitalName: h.hospital_name,
            totalBeds,
            occupiedBeds: hospOcc,
            availableBeds: hospAvail,
            categories: {
                general: { total: genTotal, occupied: genOcc, available: genAvail },
                icu: { total: icuTotal, occupied: icuOcc, available: icuAvail },
                emergency: { total: emgTotal, occupied: emgOcc, available: emgAvail },
                private: { total: privTotal, occupied: privOcc, available: privAvail }
            }
        });

        categories.general.totalBeds += genTotal;
        categories.general.occupiedBeds += genOcc;
        categories.general.availableBeds += genAvail;

        categories.icu.totalBeds += icuTotal;
        categories.icu.occupiedBeds += icuOcc;
        categories.icu.availableBeds += icuAvail;

        categories.emergency.totalBeds += emgTotal;
        categories.emergency.occupiedBeds += emgOcc;
        categories.emergency.availableBeds += emgAvail;

        categories.private.totalBeds += privTotal;
        categories.private.occupiedBeds += privOcc;
        categories.private.availableBeds += privAvail;
    }

    const summary = {
        totalBeds: categories.general.totalBeds + categories.icu.totalBeds + categories.emergency.totalBeds + categories.private.totalBeds,
        occupiedBeds: categories.general.occupiedBeds + categories.icu.occupiedBeds + categories.emergency.occupiedBeds + categories.private.occupiedBeds,
        availableBeds: categories.general.availableBeds + categories.icu.availableBeds + categories.emergency.availableBeds + categories.private.availableBeds
    };

    console.log('\n--- GORAKHPUR SUMMARY ---');
    console.log(summary);

    console.log('\n--- CATEGORIES ---');
    console.table(categories);

    console.log('\n--- HOSPITAL-WISE VERIFICATION ---');
    console.table(hospitalList.map(h => ({
        'Hospital Name': h.hospitalName,
        'Total Beds': h.totalBeds,
        'Available': h.availableBeds,
        'Occupied': h.occupiedBeds,
        'Gen(Tot/Avail)': `${h.categories.general.total}/${h.categories.general.available}`,
        'ICU(Tot/Avail)': `${h.categories.icu.total}/${h.categories.icu.available}`,
        'Emg(Tot/Avail)': `${h.categories.emergency.total}/${h.categories.emergency.available}`,
        'Pvt(Tot/Avail)': `${h.categories.private.total}/${h.categories.private.available}`
    })));

    process.exit(0);
}

testCompleteCalculation().catch(err => {
    console.error(err);
    process.exit(1);
});
