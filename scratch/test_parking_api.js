const http = require("http");

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data, status: res.statusCode });
                }
            });
        }).on("error", reject);
    });
}

async function run() {
    console.log("1. GET http://localhost:5000/api/parking");
    const p1 = await fetchJson("http://localhost:5000/api/parking");
    console.log("Lots count:", (p1.parkingLots || []).length);
    console.log("Lots:", (p1.parkingLots || []).map(l => ({
        id: l.id,
        code: l.parking_code,
        name: l.name,
        avail: l.available_slots,
        total: l.total_slots,
        occ: l.occupied_slots,
        status: l.status
    })));

    console.log("\n2. GET http://localhost:5000/api/traffic/parking-lots");
    const p2 = await fetchJson("http://localhost:5000/api/traffic/parking-lots");
    console.log("Traffic Lots count:", (p2.lots || []).length);
    console.log("Traffic Lots:", (p2.lots || []).map(l => ({
        id: l.id,
        code: l.parking_code,
        name: l.name,
        availSpots: l.availableSpots,
        totalSpots: l.totalSpots,
        occSpots: l.occupiedSpots,
        status: l.status
    })));
}

run().catch(console.error);

