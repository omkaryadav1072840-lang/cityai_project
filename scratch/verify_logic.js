const db = require('../backend/config/db');

async function verifyLogic() {
    const p = db.promise();

    const [hospitals] = await p.query(`
        SELECT
            id,
            hospital_id,
            hospital_name,
            address,
            total_beds,
            icu_beds,
            emergency_beds,
            status,
            updated_at
        FROM hospitals
        WHERE (status IN ('Active', 'Operational') OR status IS NULL)
          AND (
              address LIKE '%Gorakhpur%' 
              OR hospital_name LIKE '%Gorakhpur%' 
              OR hospital_id LIKE '%GKP%'
              OR hospital_id IN ('HOSP-001', 'HOSP-002', 'HOSP-003', 'HOSP-004')
          )
        ORDER BY hospital_name ASC
    `);

    const [hospitalBeds] = await p.query(`
        SELECT
            b.id,
            b.hospital_name,
            b.general_beds,
            b.icu_beds,
            b.emergency_beds,
            b.private_beds,
            b.updated_at
        FROM hospital_beds b
        INNER JOIN hospitals h ON LOWER(TRIM(b.hospital_name)) = LOWER(TRIM(h.hospital_name))
        WHERE (h.status IN ('Active', 'Operational') OR h.status IS NULL)
    `);

    const [bedCategories] = await p.query(`
        SELECT
            c.id,
            c.hospital_id,
            c.category,
            c.total_beds,
            c.occupied_beds,
            c.updated_at
        FROM hospital_bed_categories c
        INNER JOIN hospitals h ON c.hospital_id = h.hospital_id
        ORDER BY c.updated_at DESC, c.id DESC
    `);

    const [wards] = await p.query(`
        SELECT
            w.id,
            w.hospital_id,
            w.ward_type,
            w.total_beds,
            w.occupied_beds,
            w.status
        FROM hospital_wards w
        INNER JOIN hospitals h ON w.hospital_id = h.hospital_id
        WHERE w.status = 'Active' OR w.status IS NULL
    `);

    const safeNum = (v, min = 0, max = Infinity) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return min;
        return Math.min(max, Math.max(min, Math.round(n)));
    };

    const safePct = (avail, total) => {
        if (!total || total <= 0) return 0;
        const pct = (avail / total) * 100;
        if (!Number.isFinite(pct) || pct < 0) return 0;
        if (pct > 100) return 100;
        return Math.round(pct * 10) / 10;
    };

    const categories = {
        general: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0, availablePercentage: 0 },
        icu: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0, availablePercentage: 0 },
        emergency: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0, availablePercentage: 0 },
        private: { totalBeds: 0, availableBeds: 0, occupiedBeds: 0, availablePercentage: 0 }
    };

    const hospitalList = [];
    const legacyBeds = [];

    for (const h of hospitals) {
        const b = hospitalBeds.find(x => x.hospital_name && x.hospital_name.trim().toLowerCase() === h.hospital_name.trim().toLowerCase());
        const hCats = bedCategories.filter(c => c.hospital_id === h.hospital_id);
        const hWards = wards.filter(w => w.hospital_id === h.hospital_id);

        const totalBeds = safeNum(h.total_beds || (b ? (b.general_beds + b.icu_beds + b.emergency_beds + b.private_beds) : 0));
        const icuTotal = safeNum(b ? b.icu_beds : h.icu_beds, 0, totalBeds);
        const emgTotal = safeNum(b ? b.emergency_beds : h.emergency_beds, 0, totalBeds);
        const privTotal = safeNum(b ? b.private_beds : 0, 0, totalBeds);
        const genTotal = safeNum(b ? b.general_beds : (totalBeds - icuTotal - emgTotal - privTotal), 0, totalBeds);

        // Occupancy calculation
        // ICU
        const icuCat = hCats.find(c => c.category === 'ICU');
        const icuOcc = icuCat ? safeNum(icuCat.occupied_beds, 0, icuTotal) : safeNum(Math.round(icuTotal * 0.85), 0, icuTotal);
        const icuAvail = safeNum(icuTotal - icuOcc, 0, icuTotal);

        // Emergency
        const emgCat = hCats.find(c => c.category === 'Emergency Trauma' || c.category === 'Emergency');
        const emgOcc = emgCat ? safeNum(emgCat.occupied_beds, 0, emgTotal) : safeNum(Math.round(emgTotal * 0.78), 0, emgTotal);
        const emgAvail = safeNum(emgTotal - emgOcc, 0, emgTotal);

        // General
        const genCat = hCats.find(c => c.category === 'General Ward' || c.category === 'General');
        let genOcc = 0;
        if (genCat && genCat.total_beds > 0) {
            const ratio = genCat.occupied_beds / genCat.total_beds;
            genOcc = safeNum(Math.round(genTotal * ratio), 0, genTotal);
        } else {
            genOcc = safeNum(Math.round(genTotal * 0.72), 0, genTotal);
        }
        const genAvail = safeNum(genTotal - genOcc, 0, genTotal);

        // Private
        const privCat = hCats.find(c => c.category === 'Private' || c.category === 'Private Suite' || c.category === 'Semi-Private');
        const privWard = hWards.find(w => w.ward_type === 'Private');
        let privOcc = 0;
        if (privCat && privCat.total_beds > 0) {
            const ratio = privCat.occupied_beds / privCat.total_beds;
            privOcc = safeNum(Math.round(privTotal * ratio), 0, privTotal);
        } else if (privWard && privWard.total_beds > 0) {
            const ratio = privWard.occupied_beds / privWard.total_beds;
            privOcc = safeNum(Math.round(privTotal * ratio), 0, privTotal);
        } else {
            privOcc = safeNum(Math.round(privTotal * 0.58), 0, privTotal);
        }
        const privAvail = safeNum(privTotal - privOcc, 0, privTotal);

        const hospOcc = genOcc + icuOcc + emgOcc + privOcc;
        const hospAvail = genAvail + icuAvail + emgAvail + privAvail;

        hospitalList.push({
            hospitalId: h.hospital_id,
            hospitalName: h.hospital_name,
            address: h.address,
            totalBeds,
            occupiedBeds: hospOcc,
            availableBeds: hospAvail,
            availablePercentage: safePct(hospAvail, totalBeds),
            categories: {
                general: { totalBeds: genTotal, occupiedBeds: genOcc, availableBeds: genAvail, availablePercentage: safePct(genAvail, genTotal) },
                icu: { totalBeds: icuTotal, occupiedBeds: icuOcc, availableBeds: icuAvail, availablePercentage: safePct(icuAvail, icuTotal) },
                emergency: { totalBeds: emgTotal, occupiedBeds: emgOcc, availableBeds: emgAvail, availablePercentage: safePct(emgAvail, emgTotal) },
                private: { totalBeds: privTotal, occupiedBeds: privOcc, availableBeds: privAvail, availablePercentage: safePct(privAvail, privTotal) }
            },
            updatedAt: h.updated_at
        });

        legacyBeds.push({
            id: b ? b.id : h.id,
            hospital_name: h.hospital_name,
            general_beds: genAvail,
            icu_beds: icuAvail,
            emergency_beds: emgAvail,
            private_beds: privAvail,
            total_beds: totalBeds,
            available_beds: hospAvail,
            occupied_beds: hospOcc,
            updated_at: h.updated_at
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

    categories.general.availablePercentage = safePct(categories.general.availableBeds, categories.general.totalBeds);
    categories.icu.availablePercentage = safePct(categories.icu.availableBeds, categories.icu.totalBeds);
    categories.emergency.availablePercentage = safePct(categories.emergency.availableBeds, categories.emergency.totalBeds);
    categories.private.availablePercentage = safePct(categories.private.availableBeds, categories.private.totalBeds);

    const summary = {
        totalBeds: categories.general.totalBeds + categories.icu.totalBeds + categories.emergency.totalBeds + categories.private.totalBeds,
        availableBeds: categories.general.availableBeds + categories.icu.availableBeds + categories.emergency.availableBeds + categories.private.availableBeds,
        occupiedBeds: categories.general.occupiedBeds + categories.icu.occupiedBeds + categories.emergency.occupiedBeds + categories.private.occupiedBeds,
        availablePercentage: safePct(
            categories.general.availableBeds + categories.icu.availableBeds + categories.emergency.availableBeds + categories.private.availableBeds,
            categories.general.totalBeds + categories.icu.totalBeds + categories.emergency.totalBeds + categories.private.totalBeds
        ),
        hospitalsCount: hospitalList.length
    };

    const payload = {
        success: true,
        message: "Bed availability fetched successfully.",
        location: "Gorakhpur",
        summary,
        categories,
        hospitals: hospitalList,
        beds: legacyBeds
    };

    console.log('API PAYLOAD VALIDATION:');
    console.log(JSON.stringify({ location: payload.location, summary: payload.summary, categories: payload.categories }, null, 2));

    process.exit(0);
}

verifyLogic().catch(err => {
    console.error(err);
    process.exit(1);
});
