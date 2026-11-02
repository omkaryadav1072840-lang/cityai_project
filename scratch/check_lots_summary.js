const http = require("http");

async function checkLots() {
    const res = await new Promise((resolve, reject) => {
        http.get("http://localhost:5000/api/traffic/parking-lots", r => {
            let d = "";
            r.on("data", c => d += c);
            r.on("end", () => resolve(JSON.parse(d)));
        }).on("error", reject);
    });

    console.log("Summary:", res.summary);
    console.log("Lots:", res.lots.map(l => ({
        id: l.id,
        code: l.parking_code,
        name: l.name,
        total: l.totalSpots,
        avail: l.availableSpots,
        occ: l.occupiedSpots
    })));
}

checkLots().catch(console.error);

