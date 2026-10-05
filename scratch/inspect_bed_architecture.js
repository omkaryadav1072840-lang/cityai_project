const db = require('../backend/config/db');

async function inspect() {
    const p = db.promise();
    const tables = ['hospital_beds', 'hospital_bed_categories', 'hospital_wards', 'hospital_ward_beds', 'hospital_icu_categories', 'hospitals'];
    for (const t of tables) {
        console.log(`\n=================== ${t} ===================`);
        const [c] = await p.query(`DESCRIBE \`${t}\``);
        console.log(c.map(x => `${x.Field} (${x.Type}, Null: ${x.Null}, Def: ${x.Default})`).join('\n'));
        const [rows] = await p.query(`SELECT * FROM \`${t}\` LIMIT 3`);
        console.log('Sample rows count:', rows.length);
        if (rows.length > 0) {
            console.log(JSON.stringify(rows[0], null, 2));
        }
    }
    process.exit(0);
}

inspect().catch(e => { console.error(e); process.exit(1); });
