const fs = require("fs");
const html = fs.readFileSync("./frontend/pages/parking/parking.html", "utf8");
const expectedIds = [
  "staffQrScannerModal", "staffQrReader", "staffScannerVideo", "scannerCameraStatus",
  "manualQrTokenInput", "scannerResultCard", "actHistoryFilters",
  "pillHistAll", "pillHistCompleted", "pillHistCancelled", "pillHistExpired",
  "userActivityModal", "userActivityList", "actTabActive", "actTabHistory",
  "citizenQrPassModal", "printableParkingPass", "passSlotNumber", "passVehicleNumber",
  "passLotName", "passCustomerName", "passBookingTime", "passAmount",
  "passBookingId", "passSecurityToken", "passQrCanvas", "slotBookingModal",
  "bookingDate", "bookingStartTime", "bookingDurationHours", "navUserName", "navUserStatus",
  "userAvatarCircle", "userProfileMenuContainer", "userDropdownMenu"
];

let missing = [];
for (const id of expectedIds) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missing.push(id);
  }
}
if (missing.length === 0) {
  console.log("SUCCESS: All " + expectedIds.length + " UI elements verified present in parking.html!");
} else {
  console.error("Missing elements:", missing);
  process.exit(1);
}
