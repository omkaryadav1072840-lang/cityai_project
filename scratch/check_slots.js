const http = require("http");

http.get("http://localhost:5000/api/parking/PARK-001/slots", (res) => {
    let data = "";
    res.on("data", c => data += c);
    res.on("end", () => {
        const json = JSON.parse(data);
        console.log("PARK-001 slots count:", (json.slots || []).length);
        console.log("Slot statuses:", (json.slots || []).map(s => `${s.slot_number}: ${s.status}`));
    });
});

