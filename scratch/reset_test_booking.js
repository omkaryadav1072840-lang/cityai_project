const pool = require("../backend/config/db");
pool.query("UPDATE parking_slots SET status = 'Available', current_booking_id = NULL WHERE lot_id = 'PARK-001' AND slot_number = 'A-04'", (err, r) => {
    if (err) console.error(err);
    pool.query("UPDATE parking_lots SET available_slots = available_slots + 1, occupied_slots = occupied_slots - 1 WHERE parking_code = 'PARK-001'", (err2, r2) => {
        if (err2) console.error(err2);
        console.log("Slot A-04 successfully reset to Available.");
        process.exit(0);
    });
});
