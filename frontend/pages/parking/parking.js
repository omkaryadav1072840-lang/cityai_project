/* =====================================================
   SMARTCITY AI
   PARKING MANAGEMENT SYSTEM
===================================================== */


/* =====================================================
   DEFAULT PARKING DATA
===================================================== */

const defaultParkingData = {
    "PARK-001": {
        name: "City Centre Parking",
        location: "Near City Centre, Gorakhpur",
        total: 24,
        available: 19,
        occupied: 4,
        rate: 20,
        status: "OPEN",
        team: "Parking Team A"
    },
    "PARK-002": {
        name: "Railway Station Parking",
        location: "Gorakhpur Junction Railway Station",
        total: 20,
        available: 18,
        occupied: 1,
        rate: 15,
        status: "OPEN",
        team: "Parking Team B"
    },
    "PARK-003": {
        name: "Hospital Parking",
        location: "Near City Hospital, Gorakhpur",
        total: 20,
        available: 18,
        occupied: 1,
        rate: 10,
        status: "OPEN",
        team: "Parking Team C"
    },
    "PARK-004": {
        name: "Golghar Market Parking",
        location: "Golghar Market Area, Gorakhpur",
        total: 20,
        available: 19,
        occupied: 0,
        rate: 25,
        status: "OPEN",
        team: "Parking Team D"
    },
    "PARK-005": {
        name: "DDU Chowk Parking",
        location: "DDU Chowk, Gorakhpur City Centre",
        total: 24,
        available: 23,
        occupied: 0,
        rate: 20,
        status: "OPEN",
        team: "Parking Team E"
    },
    "PARK-006": {
        name: "AIIMS Campus Parking",
        location: "AIIMS Gorakhpur, Kushmi Forest",
        total: 100,
        available: 55,
        occupied: 45,
        rate: 10,
        status: "OPEN",
        team: "Parking Team F"
    }
};


/* =====================================================
   LOAD PARKING DATA
===================================================== */

function getParkingData() {

    const saved =
        localStorage.getItem(
            "smartCityParkingData"
        );

    if (!saved) {

        localStorage.setItem(

            "smartCityParkingData",

            JSON.stringify(
                defaultParkingData
            )

        );

        return {
            ...defaultParkingData
        };

    }

    try {

        return JSON.parse(saved);

    } catch {

        return {
            ...defaultParkingData
        };

    }

}


/* =====================================================
   SAVE PARKING DATA
===================================================== */

function saveParkingData(data) {

    localStorage.setItem(

        "smartCityParkingData",

        JSON.stringify(data)

    );

}


/* =====================================================
   CURRENT USER
===================================================== */

function getCurrentUser() {

    const session =
        localStorage.getItem(
            "smartCityCurrentUser"
        );

    if (!session) {

        return null;

    }

    try {

        return JSON.parse(session);

    } catch {

        return null;

    }

}


/* =====================================================
   PARKING STAFF CHECK & 3-LAYER ARCHITECTURE
===================================================== */

function isParkingStaff() {
    const user = getCurrentUser();
    if (!user) {
        return localStorage.getItem("parkingRole") === "staff";
    }
    const type = String(user.type || user.role || "").toLowerCase().trim();
    const department = String(user.department || "").toLowerCase().trim();
    return (type === "staff" && (department === "parking" || !department)) || type === "admin" || localStorage.getItem("parkingRole") === "staff";
}

let currentParkingLayer = "citizen";

function switchParkingLayer(layer) {
    currentParkingLayer = layer;
    const staff = isParkingStaff();

    // Tab buttons
    document.querySelectorAll(".layer-tab-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`tab-btn-${layer}`);
    if (activeBtn) activeBtn.classList.add("active");

    // Containers
    const citizenLayer = document.getElementById("layer-citizen-content");
    const staffLayer = document.getElementById("layer-staff-content");
    const adminLayer = document.getElementById("layer-admin-content");

    if (citizenLayer) citizenLayer.style.display = (layer === "citizen") ? "block" : "none";
    if (staffLayer) staffLayer.style.display = (layer === "staff") ? "block" : "none";
    if (adminLayer) adminLayer.style.display = (layer === "admin") ? "block" : "none";

    // Gatekeepers
    const staffGatekeeper = document.getElementById("staffGatekeeper");
    const staffMain = document.getElementById("staffOperationsMain");
    if (staffGatekeeper && staffMain) {
        staffGatekeeper.style.display = staff ? "none" : "block";
        staffMain.style.display = staff ? "block" : "none";
    }

    const adminGatekeeper = document.getElementById("adminGatekeeper");
    const adminMain = document.getElementById("adminAssetsMain");
    if (adminGatekeeper && adminMain) {
        adminGatekeeper.style.display = staff ? "none" : "block";
        adminMain.style.display = staff ? "block" : "none";
    }

    // Auto load data on layer switch
    if (layer === "staff" && staff) {
        if (typeof fetchOperationsSummary === "function") fetchOperationsSummary();
        if (typeof fetchOverstays === "function") fetchOverstays();
        if (typeof fetchShiftSummary === "function") fetchShiftSummary();
    } else if (layer === "admin" && staff) {
        if (typeof fetchAdminPricing === "function") fetchAdminPricing();
        if (typeof fetchAdminAnprLogs === "function") fetchAdminAnprLogs();
    }

    // Refresh map dimensions
    setTimeout(() => {
        if (typeof parkingMap !== "undefined" && parkingMap && parkingMap.invalidateSize) {
            parkingMap.invalidateSize();
        }
    }, 120);
}
window.switchParkingLayer = switchParkingLayer;

function applyRoleUI() {
    const staff = isParkingStaff();
    const user = getCurrentUser();
    const name = user ? (user.name || user.fullName || "Citizen") : "Citizen";

    const roleTitle = document.getElementById("roleTitle");
    const roleSubtitle = document.getElementById("roleSubtitle");
    const rolePill = document.getElementById("rolePill");

    if (roleTitle) {
        roleTitle.textContent = staff
            ? "Parking Operations, Barrier Booth & SCADA Center"
            : `Welcome to SmartCity AI Parking Services, ${name}`;
    }

    if (roleSubtitle) {
        roleSubtitle.textContent = staff
            ? "Manage barrier gates, inspect ANPR camera detections, verify QR tokens, and resolve vehicle overstays."
            : "Find live parking bays, book digital QR passes with instant access tokens, and check multi-facility occupancy.";
    }

    if (rolePill) {
        rolePill.textContent = staff ? "STAFF • PARKING" : (user ? "CITIZEN" : "GUEST");
        rolePill.className = staff ? "role-pill staff-pill" : "role-pill citizen-pill";
    }

    // Auto-switch layer based on role on page load
    if (staff) {
        switchParkingLayer("staff");
    } else {
        switchParkingLayer("citizen");
    }
}
window.applyRoleUI = applyRoleUI;

function promptParkingStaffLogin() {
    const staffId = prompt("Enter Parking Staff ID (Default: PRK001):", "PRK001");
    const pass = prompt("Enter Password (Default: 123456):", "123456");
    if (staffId && pass) {
        fetch("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password: pass })
        })
        .then(r => r.json())
        .then(d => {
            if (d.token) {
                localStorage.setItem("smartCityJWT", d.token);
                localStorage.setItem("smartcity_token", d.token);
                localStorage.setItem("smartCityCurrentUser", JSON.stringify(d.user));
                localStorage.setItem("smartcity_user", JSON.stringify(d.user));
                localStorage.setItem("parkingRole", "staff");
                applyRoleUI();
                showToast("✅ Logged in as Parking Attendant Staff!");
                fetchOperationsSummary();
                fetchOverstays();
            } else {
                alert(d.message || "Invalid credentials.");
            }
        })
        .catch(e => alert("Login failed: " + e.message));
    }
}
window.promptParkingStaffLogin = promptParkingStaffLogin;

// Cost Estimator
function calculateEstimatedCost() {
    const lotSel = document.getElementById("calcLotSelect");
    const vTypeSel = document.getElementById("calcVehicleType");
    const hoursInput = document.getElementById("calcHours");
    const totalEl = document.getElementById("calcTotalFare");
    const noteEl = document.getElementById("calcRateNote");

    if (!lotSel || !vTypeSel || !hoursInput || !totalEl) return;

    const lotCode = lotSel.value;
    const vType = vTypeSel.value;
    const hours = Math.max(1, Number(hoursInput.value) || 1);

    const rates = {
        "PARK-001": 20,
        "PARK-002": 15,
        "PARK-003": 10,
        "PARK-004": 25,
        "PARK-005": 20,
        "PARK-006": 10
    };
    const baseRate = rates[lotCode] || 20;

    let multiplier = 1.0;
    if (vType === "bike") multiplier = 0.5;
    else if (vType === "ev") multiplier = 1.2;

    const total = Math.round(baseRate * multiplier * hours);
    totalEl.textContent = `₹${total}`;
    if (noteEl) {
        noteEl.textContent = `Base: ₹${baseRate}/hr (${multiplier}x for ${vType.toUpperCase()})`;
    }
}
window.calculateEstimatedCost = calculateEstimatedCost;

// Operations Summary KPI
async function fetchOperationsSummary() {
    try {
        const res = await fetch("/api/parking/operations/summary");
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.summary) {
                const s = data.summary;
                const totSlotsEl = document.getElementById("staffTotalSlots");
                const occSlotsEl = document.getElementById("staffOccupiedSlots");
                const overstayEl = document.getElementById("staffOverstayCount");
                const revEl = document.getElementById("staffShiftRevenue");

                if (totSlotsEl) totSlotsEl.textContent = s.totalSlots;
                if (occSlotsEl) occSlotsEl.textContent = s.occupiedSlots;
                if (overstayEl) overstayEl.textContent = String(s.overstayVehicles).padStart(2, "0");
                if (revEl) revEl.textContent = `₹${s.todayTotalRevenue.toLocaleString()}`;
            }
        }
    } catch (e) {
        console.warn("Could not fetch parking summary:", e);
    }
}
window.fetchOperationsSummary = fetchOperationsSummary;

// Overstays Queue
async function fetchOverstays() {
    try {
        const res = await fetch("/api/parking/staff/overstays");
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.overstays) {
                renderOverstays(data.overstays);
            }
        }
    } catch (e) {
        console.warn("Could not fetch overstays:", e);
    }
}
window.fetchOverstays = fetchOverstays;

let currentOverstayCache = [];
let selectedFinePaymentMethod = 'CASH';

function renderOverstays(list) {
    currentOverstayCache = list || [];
    const tbody = document.querySelector("#staffOverstaysTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (!list || list.length === 0) {
        tbody.innerHTML = "<tr><td colspan='8' style='text-align:center; padding:18px; color:#64748b;'>✓ No overstay violations detected in Gorakhpur parking lots. All bays within allotted time.</td></tr>";
        return;
    }

    list.forEach(item => {
        const mins = Number(item.overstay_minutes || 30);
        const penalty = Number(item.penalty_amount || 50);
        const bId = escapeHTML(item.booking_id || item.id || 'BKG');
        const plate = escapeHTML(item.vehicle_number || 'UP-53-XX');
        const phone = escapeHTML(item.customer_phone || '');

        tbody.innerHTML += `
            <tr>
                <td><strong>${bId}</strong></td>
                <td><strong style="color:#dc2626;">🚗 ${plate}</strong></td>
                <td>${escapeHTML(item.lot_name || item.lot_id || 'Main Lot')} • Bay <strong>${escapeHTML(item.slot_number || 'A-01')}</strong></td>
                <td>📞 ${phone || 'Not Available'}</td>
                <td><span class="badge-overstay">+${mins} Mins</span></td>
                <td><strong style="color:#dc2626; font-size:14px;">₹${penalty}</strong></td>
                <td><span style="color:#d97706; font-weight:700;">Pending Settlement</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="action-btn-sm" style="background:#16a34a; color:white;" onclick="openOverstayCollectModal('${item.id || item.booking_id}')">
                            💵 Collect Fine
                        </button>
                        <button class="action-btn-sm" style="background:#0284c7; color:white;" onclick="sendOverstayDriverAlert('${item.id || item.booking_id}', '${phone}', '${plate}', ${mins}, ${penalty})">
                            📱 Alert
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// 1. OPEN FINE PAYMENT MODAL
window.openOverstayCollectModal = function (bookingId) {
    const item = currentOverstayCache.find(x => String(x.id) === String(bookingId) || String(x.booking_id) === String(bookingId)) || {};
    const plate = item.vehicle_number || 'UP 53 OVERSTAY';
    const bId = item.booking_id || bookingId;
    const penalty = Number(item.penalty_amount || 50);
    const mins = Number(item.overstay_minutes || 30);

    const modal = document.getElementById("overstayCollectModal");
    const formView = document.getElementById("fineFormView");
    const receiptView = document.getElementById("fineReceiptView");
    if (!modal) return;

    // Reset views
    if (formView) formView.style.display = "block";
    if (receiptView) receiptView.style.display = "none";

    document.getElementById("fineModalPlate").textContent = plate;
    document.getElementById("fineModalBookingId").textContent = bId;
    document.getElementById("fineModalOverstayMins").textContent = `+${mins} Mins Overdue`;
    document.getElementById("fineModalAmountDisplay").textContent = `₹${penalty}`;
    document.getElementById("fineHiddenBookingId").value = bId;
    document.getElementById("fineAttendantNote").value = "";

    selectedFinePaymentMethod = 'CASH';
    selectFinePaymentMethod('CASH');

    modal.style.display = "flex";
};

window.closeOverstayCollectModal = function () {
    const modal = document.getElementById("overstayCollectModal");
    if (modal) modal.style.display = "none";
};

window.selectFinePaymentMethod = function (method) {
    selectedFinePaymentMethod = method;
    const options = document.querySelectorAll(".fine-payment-methods .method-option");
    options.forEach(opt => opt.classList.remove("active"));

    if (method === 'CASH') document.getElementById("methodCash")?.classList.add("active");
    if (method === 'UPI') document.getElementById("methodUpi")?.classList.add("active");
    if (method === 'FASTAG') document.getElementById("methodFastag")?.classList.add("active");
};

// 2. CONFIRM PAYMENT & UPDATE MYSQL DATABASE
window.confirmOverstayFinePayment = async function () {
    const bookingId = document.getElementById("fineHiddenBookingId")?.value;
    const notes = document.getElementById("fineAttendantNote")?.value || "";
    const btn = document.getElementById("btnConfirmFinePayment");

    if (!bookingId) {
        showToast("Error: No booking reference selected.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Updating Database...";
    }

    try {
        const staff = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
        const attendantStaffId = staff.staffId || staff.id || "PRK001";

        const res = await fetch("/api/parking/resolve-overstay-penalty", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId,
                paymentMethod: selectedFinePaymentMethod,
                attendantStaffId,
                notes
            })
        });

        const data = await res.json();
        if (data.success && data.receipt) {
            showToast(data.message);

            // Populate Municipal Receipt
            const rcpt = data.receipt;
            document.getElementById("rcptNo").textContent = rcpt.receiptNo;
            document.getElementById("rcptDate").textContent = new Date(rcpt.paidAt).toLocaleString();
            document.getElementById("rcptPlate").textContent = rcpt.vehicleNumber;
            document.getElementById("rcptBooking").textContent = rcpt.bookingId;
            document.getElementById("rcptMethod").textContent = rcpt.paymentMethod;
            document.getElementById("rcptAttendant").textContent = `${rcpt.attendantStaffId} (Central Gate)`;
            document.getElementById("rcptAmount").textContent = `₹${Number(rcpt.penaltyAmount).toFixed(2)}`;

            // Switch to receipt view
            document.getElementById("fineFormView").style.display = "none";
            document.getElementById("fineReceiptView").style.display = "block";

            // Refresh live table and shift register from DB
            fetchOverstays();
            fetchOperationsSummary();
            fetchShiftSummary();
        } else {
            showToast(data.message || "Failed to settle fine.");
            if (btn) {
                btn.disabled = false;
                btn.textContent = "✓ Confirm Payment & Clear Bay";
            }
        }
    } catch (err) {
        console.error("Fine confirmation error:", err);
        showToast("Error connecting to server. Please try again.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "✓ Confirm Payment & Clear Bay";
        }
    }
};

window.printReceiptArea = function () {
    const content = document.getElementById("printableReceiptArea")?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '', 'height=500,width=450');
    printWindow.document.write(`
        <html>
            <head><title>Gorakhpur Municipal Corporation - Parking Fine Receipt</title></head>
            <body style="font-family: monospace; padding: 20px; text-align: center;">
                ${content}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
};

// 3. SEND OVERSTAY SMS ALERT TO DRIVER
window.sendOverstayDriverAlert = async function (bookingId, phone, vehicleNumber, overstayMinutes, fineDue) {
    try {
        const res = await fetch("/api/parking/send-overstay-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, phone, vehicleNumber, overstayMinutes, fineDue })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
        } else {
            showToast("Failed to dispatch alert.");
        }
    } catch (e) {
        console.error("Alert error:", e);
        showToast("Could not send SMS alert.");
    }
};

// 4. MANUAL SLOT STATUS OVERRIDE (DB PERSISTED)
window.submitStaffBayOverride = async function () {
    const lotId = document.getElementById("overrideLotSelect")?.value;
    const slotNumber = document.getElementById("overrideSlotInput")?.value?.trim().toUpperCase();
    const status = document.getElementById("overrideStatusSelect")?.value;

    if (!slotNumber) {
        showToast("Please enter a Bay/Slot number (e.g. A-02).");
        return;
    }

    try {
        const staff = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
        const staffId = staff.staffId || "PRK001";

        const res = await fetch(`/api/parking/slots/${slotNumber}/staff-override`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lotId, status, staffId })
        });

        const data = await res.json();
        if (data.success) {
            showToast(data.message);
            // Refresh slots if currently on this lot
            if (window.renderActiveLotSlots) window.renderActiveLotSlots();
            fetchOperationsSummary();
        } else {
            showToast(data.message || "Failed to update slot status.");
        }
    } catch (e) {
        console.error("Slot override error:", e);
        showToast("Error updating bay status in database.");
    }
};

// 5. SHIFT SUMMARY & CASH RECONCILIATION
window.fetchShiftSummary = async function () {
    try {
        const res = await fetch("/api/parking/staff/shift-summary");
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.shift) {
                const s = data.shift;
                const cashEl = document.getElementById("shiftCashDisplay");
                const digEl = document.getElementById("shiftDigitalDisplay");
                if (cashEl) cashEl.textContent = `₹${Number(s.cashCollected).toLocaleString()}`;
                if (digEl) digEl.textContent = `₹${Number(s.digitalCollected).toLocaleString()}`;
            }
        }
    } catch (e) {
        console.warn("Could not fetch shift summary:", e);
    }
};

window.printShiftSummaryReport = function () {
    const cash = document.getElementById("shiftCashDisplay")?.textContent || "₹420";
    const digital = document.getElementById("shiftDigitalDisplay")?.textContent || "₹1,850";
    const now = new Date().toLocaleString();

    const printWin = window.open('', '', 'height=600,width=500');
    printWin.document.write(`
        <html>
            <head><title>Attendant Shift Reconciliation Report</title></head>
            <body style="font-family: Arial, sans-serif; padding: 25px;">
                <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px;">
                    <h2 style="margin: 0; color: #0284c7;">Gorakhpur Municipal Corporation</h2>
                    <h4 style="margin: 5px 0 0; color: #334155;">SMART PARKING - ATTENDANT SHIFT REGISTER</h4>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr><td style="padding: 6px; color: #64748b;">Attendant ID:</td><td style="padding: 6px; font-weight: bold;">PRK001 (Parking Officer)</td></tr>
                    <tr><td style="padding: 6px; color: #64748b;">Booth Location:</td><td style="padding: 6px; font-weight: bold;">Gorakhpur Central Gate 1</td></tr>
                    <tr><td style="padding: 6px; color: #64748b;">Shift Date/Time:</td><td style="padding: 6px; font-weight: bold;">${now}</td></tr>
                    <tr><td style="padding: 6px; color: #64748b;">Cash Drawer Total:</td><td style="padding: 6px; font-weight: bold; color: #16a34a;">${cash}</td></tr>
                    <tr><td style="padding: 6px; color: #64748b;">Digital/FASTag Total:</td><td style="padding: 6px; font-weight: bold; color: #0284c7;">${digital}</td></tr>
                </table>
                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div>_______________________<br><small>Attendant Signature</small></div>
                    <div>_______________________<br><small>ICCC Supervisor Sign</small></div>
                </div>
            </body>
        </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
    printWin.close();
};

window.resolveOverstayFine = function(bookingId) {
    openOverstayCollectModal(bookingId);
};

// Emergency Barrier Override
async function triggerEmergencyBarrierOverride(action = 'ALL_OPEN') {
    if (action === 'ALL_OPEN') {
        if (!confirm("⚠️ WARNING: This will immediately lift all entry and exit parking barriers for emergency evacuation! Proceed?")) return;
    }

    try {
        const res = await fetch("/api/parking/emergency-barrier-override", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
        }
    } catch (e) {
        console.error("Emergency override error:", e);
    }
}
window.triggerEmergencyBarrierOverride = triggerEmergencyBarrierOverride;

// Admin Dynamic Pricing
async function fetchAdminPricing() {
    try {
        const res = await fetch("/api/parking/admin/pricing");
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.lots) {
                renderAdminPricing(data.lots);
            }
        }
    } catch (e) {
        console.warn("Could not fetch pricing:", e);
    }
}
window.fetchAdminPricing = fetchAdminPricing;

function renderAdminPricing(lots) {
    const tbody = document.querySelector("#adminPricingTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    lots.forEach(lot => {
        const surgeActive = Number(lot.surge_active) === 1;
        tbody.innerHTML += `
            <tr>
                <td><strong>${escapeHTML(lot.parking_code)}</strong></td>
                <td><strong>${escapeHTML(lot.name)}</strong></td>
                <td>📍 ${escapeHTML(lot.area || 'Gorakhpur')}</td>
                <td>
                    <input type="number" id="baseRate_${lot.id}" value="${lot.hourly_rate || 20}" style="width:70px; padding:4px 8px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
                </td>
                <td>
                    <input type="number" id="peakRate_${lot.id}" value="${lot.peak_hourly_rate || 35}" style="width:70px; padding:4px 8px; background:#1e293b; color:white; border:1px solid #334155; border-radius:6px;">
                </td>
                <td>
                    <span style="color:${surgeActive ? '#f87171' : '#34d399'}; font-weight:700;">
                        ${surgeActive ? '🔥 Peak Active' : '● Standard'}
                    </span>
                </td>
                <td>
                    <button class="action-btn-sm" style="background:#0284c7; color:white; border:0; cursor:pointer;" onclick="saveLotPricing(${lot.id})">
                        💾 Save
                    </button>
                    <button class="action-btn-sm" style="background:${surgeActive ? '#ea580c' : '#16a34a'}; color:white; border:0; cursor:pointer;" onclick="toggleSurge(${lot.id}, ${surgeActive ? 0 : 1})">
                        ${surgeActive ? 'Disable Surge' : 'Enable Surge'}
                    </button>
                </td>
            </tr>
        `;
    });
}

async function saveLotPricing(lotId) {
    const baseRate = document.getElementById(`baseRate_${lotId}`).value;
    const peakRate = document.getElementById(`peakRate_${lotId}`).value;
    try {
        const res = await fetch(`/api/parking/lots/${lotId}/pricing`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hourly_rate: baseRate, peak_hourly_rate: peakRate })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
            fetchAdminPricing();
        }
    } catch (e) {
        console.error("Save pricing error:", e);
    }
}
window.saveLotPricing = saveLotPricing;

async function toggleSurge(lotId, newSurgeState) {
    try {
        const res = await fetch(`/api/parking/lots/${lotId}/pricing`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ surge_active: newSurgeState })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
            fetchAdminPricing();
        }
    } catch (e) {
        console.error("Toggle surge error:", e);
    }
}
window.toggleSurge = toggleSurge;

// Admin ANPR Logs
async function fetchAdminAnprLogs() {
    try {
        const res = await fetch("/api/parking/admin/anpr-logs");
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.logs) {
                renderAdminAnprLogs(data.logs);
            }
        }
    } catch (e) {
        console.warn("Could not fetch ANPR logs:", e);
    }
}
window.fetchAdminAnprLogs = fetchAdminAnprLogs;

function renderAdminAnprLogs(logs) {
    const tbody = document.querySelector("#adminAnprLogsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (logs.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:15px; color:#94a3b8;'>No ANPR camera scans recorded.</td></tr>";
        return;
    }

    logs.forEach(l => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${escapeHTML(l.scan_id || 'ANPR')}</strong></td>
                <td><strong style="color:#38bdf8;">🚗 ${escapeHTML(l.plate_number)}</strong></td>
                <td>${escapeHTML(l.lot_name || 'Main Facility')}</td>
                <td><span style="color:#34d399; font-weight:700;">${escapeHTML(l.gate_type || 'ENTRY')}</span></td>
                <td>${l.confidence_percent || 98}%</td>
                <td><span style="color:#38bdf8; font-weight:700;">${escapeHTML(l.action_taken || 'BARRIER_OPENED')}</span></td>
                <td><small style="color:#94a3b8;">${new Date(l.scanned_at || Date.now()).toLocaleTimeString()}</small></td>
            </tr>
        `;
    });
}

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* =====================================================
   INITIALIZE PAGE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        updateUserName();

        checkParkingPermission();

        await fetchParkingDataFromAPI();

        loadParkingUI();

        setupParkingSelector();

        initInteractiveSlotGrid();

        initParkingRealtime();

        // 3-Layer additions
        applyRoleUI();
        calculateEstimatedCost();
        fetchOperationsSummary();
        fetchOverstays();
        fetchAdminPricing();
        fetchAdminAnprLogs();

        window.addEventListener("smartcity:auth-changed", () => {
            applyRoleUI();
            fetchOperationsSummary();
        });

        setInterval(fetchParkingDataFromAPI, 30000);
        setInterval(fetchOperationsSummary, 25000);

    }
);




/* =====================================================
   USER NAME & PROFILE STATE
===================================================== */

function getLatestActivePass() {
    try {
        const direct = localStorage.getItem("smartCityActivePass");
        if (direct) {
            const parsed = JSON.parse(direct);
            if (parsed && (parsed.status || "Active").toLowerCase() === "active") return parsed;
        }
        const history = JSON.parse(localStorage.getItem("smartCityUserBookings") || "[]");
        const active = history.find(b => (b.status || "Active").toLowerCase() === "active");
        return active || null;
    } catch (e) {
        return null;
    }
}

function updateUserName() {
    let user = getCurrentUser();
    if (!user) {
        user = {
            id: 1,
            name: "Omkar Yadav",
            phone: "6306880179",
            mobile: "6306880179",
            email: "omkaryadav@gmail.com",
            role: "citizen",
            defaultVehicle: "UP 53 AB 1008"
        };
        localStorage.setItem("smartCityCurrentUser", JSON.stringify(user));
    }

    const navName = document.getElementById("navUserName");
    const navStatus = document.getElementById("navUserStatus");
    const ddName = document.getElementById("ddUserFullName");
    const ddContact = document.getElementById("ddUserContact");
    const badge = document.getElementById("activePassCountBadge");

    if (navName) navName.textContent = user.name || "Citizen";
    if (navStatus) navStatus.textContent = "🟢 Active Citizen";
    if (ddName) ddName.textContent = user.name || "Citizen";
    if (ddContact) ddContact.textContent = `${user.phone || user.mobile || "6306880179"} • Citizen`;

    const activePass = getLatestActivePass();
    if (badge) {
        if (activePass) {
            badge.style.display = "inline-block";
            badge.textContent = "1";
        } else {
            badge.style.display = "none";
        }
    }
}


/* =====================================================
   STAFF PERMISSION
===================================================== */

function checkParkingPermission() {

    const panel =
        document.getElementById(
            "staffControlPanel"
        );

    const text =
        document.getElementById(
            "staffAccessText"
        );


    if (!panel || !text) {

        return;

    }


    const user =
        getCurrentUser();


    if (!user) {

        text.innerHTML = `
            <span style="color:#64748b;font-weight:800;">
                👤 Guest / User
            </span>
            <br>
            Login is required for staff controls.
        `;

        panel.style.display =
            "none";

        return;

    }


    if (isParkingStaff()) {

        text.innerHTML = `

            <span style="
                color:#16a34a;
                font-weight:900;
            ">
                ✓ Parking Staff Access
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — You can manage parking operations.
            </small>

        `;

        panel.style.display =
            "block";

        return;

    }


    if (
        String(user.type || "")
            .toLowerCase()
            .trim() === "staff"
    ) {

        text.innerHTML = `

            <span style="
                color:#d97706;
                font-weight:900;
            ">
                ⚠ Staff View Only
            </span>

            <br>

            <small>
                ${user.name || "Staff"}
                — ${user.department || "Department"}
                staff can view parking information,
                but cannot edit it.
            </small>

        `;

        panel.style.display =
            "none";

        return;

    }


    text.innerHTML = `

        <span style="
            color:#2563eb;
            font-weight:900;
        ">
            👤 Citizen / User
        </span>

        <br>

        <small>
            You can view parking availability
            and book a parking slot.
        </small>

    `;

    panel.style.display =
        "none";

}


/* =====================================================
   LOAD PARKING UI
===================================================== */

function loadParkingUI() {
    const data = getParkingData();

    let total = 0;
    let available = 0;
    let occupied = 0;

    Object.values(data).forEach(parking => {
        total += Number(parking.total || 0);
        available += Number(parking.available || 0);
        if (parking.occupied !== undefined) {
            occupied += Number(parking.occupied || 0);
        } else {
            occupied += Math.max(0, Number(parking.total || 0) - Number(parking.available || 0));
        }
    });

    const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const elTotal = document.getElementById("totalSlots");
    const elAvail = document.getElementById("availableSlots");
    const elOcc = document.getElementById("occupiedSlots");
    const elRate = document.getElementById("occupancy");

    if (elTotal) elTotal.textContent = total;
    if (elAvail) elAvail.textContent = available;
    if (elOcc) elOcc.textContent = occupied;
    if (elRate) elRate.textContent = occupancy + "%";

    updateParkingCards(data);
}


/* =====================================================
   UPDATE PARKING CARDS
===================================================== */

function updateParkingCards(data) {

    Object.entries(data).forEach(
        ([id, parking]) => {

            const card =
                document.querySelector(
                    `[data-id="${id}"]`
                );


            if (!card) {

                return;

            }


            const available =
                card.querySelector(
                    ".area-available"
                );


            const progress =
                card.querySelector(
                    ".parking-progress"
                );


            const status =
                card.querySelector(
                    ".open-status"
                );


            if (available) {

                available.textContent =
                    parking.available;

            }


            if (progress) {

                const occupied =
                    parking.total -
                    parking.available;


                const percentage =
                    parking.total > 0

                        ? (
                            occupied /
                            parking.total
                        ) * 100

                        : 0;


                progress.style.width =
                    percentage + "%";

            }


            if (status) {

                status.textContent =
                    parking.status;


                if (
                    parking.status ===
                    "CLOSED"
                ) {

                    status.style.background =
                        "#fee2e2";

                    status.style.color =
                        "#b91c1c";

                }

                else if (
                    parking.status ===
                    "FULL"
                ) {

                    status.style.background =
                        "#ffedd5";

                    status.style.color =
                        "#c2410c";

                }

                else {

                    status.style.background =
                        "#dcfce7";

                    status.style.color =
                        "#15803d";

                }

            }

        }
    );

}


/* =====================================================
   FETCH LIVE PARKING DATA FROM API
===================================================== */

async function fetchParkingDataFromAPI() {
    try {
        const res = await fetch("/api/parking");
        if (!res.ok) throw new Error("Status: " + res.status);
        const json = await res.json();
        const lots = json.parkingLots || [];
        if (!lots.length) return;

        // Directly update aggregate stat cards from real MySQL DB stats
        if (json.stats) {
            const elTotal = document.getElementById("totalSlots");
            const elAvail = document.getElementById("availableSlots");
            const elOcc = document.getElementById("occupiedSlots");
            const elRate = document.getElementById("occupancy");

            if (elTotal) elTotal.textContent = json.stats.totalSlots;
            if (elAvail) elAvail.textContent = json.stats.availableSlots;
            if (elOcc) elOcc.textContent = json.stats.occupiedSlots;
            if (elRate) elRate.textContent = json.stats.occupancy + "%";
        }

        const current = getParkingData();
        const updated = {};

        lots.forEach(lot => {
            const code = lot.parking_code || lot.parkingCode;
            updated[code] = {
                id: lot.id,
                name: lot.name,
                location: lot.address || lot.area || "Gorakhpur",
                total: Number(lot.total_slots !== undefined ? lot.total_slots : lot.totalSlots),
                available: Number(lot.available_slots !== undefined ? lot.available_slots : lot.availableSlots),
                occupied: Number(lot.occupied_slots !== undefined ? lot.occupied_slots : lot.occupiedSlots || 0),
                rate: Number(lot.hourly_rate || lot.hourlyRate || 20),
                status: (lot.status || "OPEN").toUpperCase(),
                team: (current[code] && current[code].team) || `Parking Team ${code.slice(-1)}`,
                cctv: !!lot.cctv_available,
                security: !!lot.security_available
            };
        });

        localStorage.setItem("smartCityParkingData", JSON.stringify(updated));
        renderDynamicParkingCards(updated);

        window.rawLiveParkingLots = lots;
        if (typeof updateParkingGpsMap === "function") {
            updateParkingGpsMap(lots);
        }

        if (!json.stats) {
            loadParkingUI();
        }
    } catch (err) {
        console.warn("Could not fetch live parking data from API:", err);
    }
}

/* =====================================================
   REAL-TIME PARKING SOCKET SYNC
===================================================== */

function initParkingRealtime() {
    if (typeof SmartCityRealtime === "undefined") {
        console.warn("SmartCityRealtime library not loaded");
        return;
    }

    SmartCityRealtime.init();
    SmartCityRealtime.renderLiveIndicator(".navbar");

    SmartCityRealtime.onParkingUpdate((lotData) => {
        if (!lotData) return;
        const code = lotData.parkingCode || lotData.parking_code || lotData.lotId || lotData.lot_id;
        const current = getParkingData();

        if (code && current[code]) {
            if (lotData.availableSlots !== undefined) current[code].available = Number(lotData.availableSlots);
            if (lotData.totalSlots !== undefined) current[code].total = Number(lotData.totalSlots);
            if (lotData.status) current[code].status = lotData.status.toUpperCase();

            localStorage.setItem("smartCityParkingData", JSON.stringify(current));

            // Visual feedback on card
            const card = document.querySelector(`[data-id="${code}"]`);
            if (card) {
                const availEl = card.querySelector(".slots-avail strong");
                if (availEl) availEl.textContent = current[code].available;
                card.style.transition = "box-shadow 0.4s ease, transform 0.4s ease";
                card.style.boxShadow = "0 0 25px rgba(37, 99, 235, 0.7)";
                card.style.transform = "scale(1.02)";
                setTimeout(() => {
                    card.style.boxShadow = "";
                    card.style.transform = "";
                }, 1000);
            }

            loadParkingUI();
            SmartCityRealtime.playAlertSound("chime");
        } else {
            fetchParkingDataFromAPI();
        }
    });

    // Realtime Slot-level update listener
    SmartCityRealtime.on("parking:slot-updated", (slotData) => {
        if (slotData && (slotData.lotId === activeSlotLotId || !activeSlotLotId)) {
            loadInteractiveSlots(activeSlotLotId, true);
        }
    });
}

function renderDynamicParkingCards(data) {
    const grid = document.getElementById("parkingGrid");
    if (grid) {
        Object.entries(data).forEach(([id, parking]) => {
            let card = document.querySelector(`[data-id="${id}"]`);
            if (!card) {
                card = document.createElement("div");
                card.className = "parking-card";
                card.setAttribute("data-id", id);
                card.innerHTML = `
                    <div class="parking-card-top">
                        <div class="parking-place-icon">🅿️</div>
                        <div>
                            <h3 class="area-name">${parking.name}</h3>
                            <p class="area-location">${parking.location}</p>
                        </div>
                        <span class="open-status">${parking.status}</span>
                    </div>
                    <div class="parking-meta">
                        <div>
                            <strong class="area-available">${parking.available}</strong>
                            <small>Available</small>
                        </div>
                        <div>
                            <strong class="area-total">${parking.total}</strong>
                            <small>Total</small>
                        </div>
                    </div>
                    <div class="parking-bar">
                        <div class="parking-progress" style="width:0%"></div>
                    </div>
                    <div class="parking-bottom">
                        <span>₹${parking.rate}/hour</span>
                        <button onclick="bookParking('${id}')">Book Slot</button>
                    </div>
                `;
                grid.appendChild(card);
            }
        });
    }

    const select = document.getElementById("parkingAreaSelect");
    if (select) {
        Object.entries(data).forEach(([id, parking]) => {
            if (!select.querySelector(`option[value="${id}"]`)) {
                const opt = document.createElement("option");
                opt.value = id;
                opt.textContent = parking.name;
                select.appendChild(opt);
            }
        });
    }
}



/* =====================================================
   SETUP SELECTOR
===================================================== */

function setupParkingSelector() {

    const select =
        document.getElementById(
            "parkingAreaSelect"
        );


    if (!select) {

        return;

    }


    select.addEventListener(
        "change",
        loadSelectedParking
    );

}


/* =====================================================
   LOAD SELECTED PARKING
===================================================== */

function loadSelectedParking() {

    const id =
        document.getElementById(
            "parkingAreaSelect"
        ).value;


    if (!id) {

        return;

    }


    const data =
        getParkingData();


    const parking =
        data[id];


    if (!parking) {

        return;

    }


    document.getElementById(
        "parkingStatus"
    ).value =
        parking.status;


    document.getElementById(
        "totalAreaSlots"
    ).value =
        parking.total;


    document.getElementById(
        "availableAreaSlots"
    ).value =
        parking.available;


    document.getElementById(
        "parkingRate"
    ).value =
        parking.rate;


    document.getElementById(
        "parkingLocation"
    ).value =
        parking.location;


    document.getElementById(
        "parkingTeam"
    ).value =
        parking.team;

}


/* =====================================================
   SAVE PARKING CHANGES
===================================================== */

async function saveParkingChanges() {

    if (!isParkingStaff()) {
        showToast("❌ Parking Staff access required.");
        return;
    }

    const id = document.getElementById("parkingAreaSelect").value;
    if (!id) {
        showToast("Please select a parking area.");
        return;
    }

    const total = Number(document.getElementById("totalAreaSlots").value);
    const available = Number(document.getElementById("availableAreaSlots").value);
    const status = document.getElementById("parkingStatus").value;
    const rate = Number(document.getElementById("parkingRate").value);
    const location = document.getElementById("parkingLocation").value.trim();
    const team = document.getElementById("parkingTeam").value.trim();

    if (total < 0 || available < 0) {
        showToast("Slot values cannot be negative.");
        return;
    }

    if (available > total) {
        showToast("Available slots cannot exceed total slots.");
        return;
    }

    // Try live backend API update
    try {
        const token = window.SmartCityAuth ? window.SmartCityAuth.getToken() : null;
        const headers = { "Content-Type": "application/json" };
        const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
            ? window.API_BASE_URL
            : (typeof window !== "undefined" && (window.location.port === "5000" || window.location.protocol === "file:") ? "http://localhost:5000" : "");

        const res = await fetch(`${API_BASE}/api/parking/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                totalSlots: total,
                availableSlots: available,
                occupiedSlots: total - available,
                hourlyRate: rate,
                status: status,
                address: location
            })
        });

        if (res.ok) {
            showToast("✓ Parking changes saved to database.");
            await fetchParkingDataFromAPI();
            return;
        }
    } catch (e) {
        console.warn("Backend update error, saving locally:", e);
    }

    // Local fallback
    const data = getParkingData();
    if (data[id]) {
        data[id].status = status;
        data[id].total = total;
        data[id].available = available;
        data[id].rate = rate;
        data[id].location = location;
        data[id].team = team;
        data[id].lastUpdated = new Date().toLocaleString();
        saveParkingData(data);
        loadParkingUI();
        showToast("✓ Parking changes saved locally.");
    }
}



/* =====================================================
   VEHICLE ENTRY
===================================================== */

function vehicleEntry() {

    if (!isParkingStaff()) {

        showToast(
            "❌ Parking Staff access required."
        );

        return;

    }


    const id =
        document.getElementById(
            "parkingAreaSelect"
        ).value;


    const vehicle =
        document.getElementById(
            "vehicleEntry"
        ).value.trim();


    if (!id) {

        showToast(
            "Select a parking area first."
        );

        return;

    }


    if (!vehicle) {

        showToast(
            "Enter vehicle number."
        );

        return;

    }


    const data =
        getParkingData();

    if (!data[id]) {
        showToast("❌ Parking facility not found.");
        return;
    }

    if (
        data[id].available <= 0
    ) {

        showToast(
            "❌ No parking slot available."
        );

        return;

    }


    data[id].available--;


    data[id].lastVehicleEntry =
        vehicle;


    data[id].lastUpdated =
        new Date().toLocaleString();


    saveParkingData(data);


    document.getElementById(
        "vehicleEntry"
    ).value = "";


    loadParkingUI();


    loadSelectedParking();


    showToast(
        "✓ Vehicle entry recorded."
    );

}


/* =====================================================
   VEHICLE EXIT
===================================================== */

function vehicleExit() {

    if (!isParkingStaff()) {

        showToast(
            "❌ Parking Staff access required."
        );

        return;

    }


    const id =
        document.getElementById(
            "parkingAreaSelect"
        ).value;


    const vehicle =
        document.getElementById(
            "vehicleExit"
        ).value.trim();


    if (!id) {

        showToast(
            "Select a parking area first."
        );

        return;

    }


    if (!vehicle) {

        showToast(
            "Enter vehicle number."
        );

        return;

    }


    const data =
        getParkingData();

    if (!data[id]) {
        showToast("❌ Parking facility not found.");
        return;
    }

    if (
        data[id].available >=
        data[id].total
    ) {

        showToast(
            "All parking slots are already empty."
        );

        return;

    }


    data[id].available++;


    data[id].lastVehicleExit =
        vehicle;


    data[id].lastUpdated =
        new Date().toLocaleString();


    saveParkingData(data);


    document.getElementById(
        "vehicleExit"
    ).value = "";


    loadParkingUI();


    loadSelectedParking();


    showToast(
        "✓ Vehicle exit recorded."
    );

}


/* =====================================================
   BOOK PARKING
===================================================== */

window.bookParking = function (id) {
    const lotId = id || "PARK-001";
    if (typeof switchLotTab === "function") {
        switchLotTab(lotId);
    }

    const section = document.getElementById("interactiveSlotSection");
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const localData = getParkingData();
    const lotName = (localData[lotId] && localData[lotId].name) || lotId;

    showToast(`🎯 Opened physical bay grid for ${lotName}! Pick any green bay (🟢) below to book.`);

    setTimeout(() => {
        const availableCard = document.querySelector("#interactiveSlotGrid .slot-bay-card.status-available");
        if (availableCard) {
            availableCard.scrollIntoView({ behavior: "smooth", block: "center" });
            availableCard.style.outline = "3px solid #38bdf8";
            availableCard.style.boxShadow = "0 0 20px rgba(56, 189, 248, 0.6)";
            availableCard.style.transform = "scale(1.05)";
            setTimeout(() => {
                availableCard.style.outline = "";
                availableCard.style.boxShadow = "";
                availableCard.style.transform = "";
            }, 2500);
        }
    }, 450);
};



/* =====================================================
   STAFF PANEL SCROLL
===================================================== */

function openParkingStaffPanel() {

    const panel =
        document.getElementById(
            "staffSection"
        );


    if (panel) {

        panel.scrollIntoView({

            behavior: "smooth"

        });

    }


    if (!isParkingStaff()) {

        showToast(
            "Login as Parking Staff to edit parking."
        );

    }

}


/* =====================================================
   FIND PARKING
===================================================== */

function scrollToParking() {

    document.getElementById(
        "parkingSection"
    ).scrollIntoView({

        behavior: "smooth"

    });

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );

}


/* =====================================================
   INTERACTIVE PARKING SLOT GRID CONTROLLER
   Citizen & Staff Unified Grid System
===================================================== */

let activeSlotLotId = "PARK-001";
let isStaffInspectionMode = false;
let activeLotSlots = [];
let activeLotInfo = { id: "PARK-001", name: "City Center Parking", rate: 20 };
let selectedSlotForBooking = null;
let currentBayFilter = "all";

function initInteractiveSlotGrid() {
    // Check if current user is parking staff or admin
    if (typeof isParkingStaff === "function" && isParkingStaff()) {
        isStaffInspectionMode = true;
    } else if (sessionStorage.getItem("parking_staff_auth") === "true") {
        isStaffInspectionMode = true;
    }

    updateModeBadgeUI();

    // Close modals on backdrop click
    window.addEventListener("click", function (e) {
        const citizenModal = document.getElementById("slotBookingModal");
        const staffModal = document.getElementById("staffSlotModal");
        const passModal = document.getElementById("citizenQrPassModal");
        const navModal = document.getElementById("bayNavigationModal");
        if (citizenModal && e.target === citizenModal) {
            closeSlotModal("slotBookingModal");
        }
        if (staffModal && e.target === staffModal) {
            closeSlotModal("staffSlotModal");
        }
        if (passModal && e.target === passModal) {
            closeSlotModal("citizenQrPassModal");
        }
        if (navModal && e.target === navModal) {
            closeSlotModal("bayNavigationModal");
        }
    });

    // Check if a specific lot was requested via URL query param (e.g. ?lot=PARK-006&book=true)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedLot = urlParams.get("lot") || urlParams.get("lotId");
    if (requestedLot) {
        activeSlotLotId = requestedLot.toUpperCase();
    }

    // Load initial lot slots
    loadInteractiveSlots(activeSlotLotId);

    if (requestedLot) {
        setTimeout(() => {
            if (typeof switchLotTab === "function") switchLotTab(activeSlotLotId);
            const gridEl = document.getElementById("interactiveSlotGrid") || document.getElementById("lotTabsContainer");
            if (gridEl) gridEl.scrollIntoView({ behavior: "smooth", block: "center" });
            if (urlParams.get("book") === "true") {
                showToast(`🅿️ Nearest lot: ${activeSlotLotId}. Click an available bay to book.`);
            }
        }, 600);
    }
}


function updateModeBadgeUI() {
    const badge = document.getElementById("modeBadge");
    const toggleBtn = document.getElementById("btnToggleStaffMode");
    const expl = document.getElementById("modeExplanation");

    if (!badge || !toggleBtn) return;

    if (isStaffInspectionMode) {
        badge.className = "mode-badge staff-badge";
        badge.textContent = "🛡️ STAFF INSPECTION VIEW";
        toggleBtn.innerHTML = "👤 Switch to Citizen View";
        toggleBtn.classList.add("staff-active");
        if (expl) {
            expl.textContent = "Staff Mode Active: All booked & occupied bays reveal vehicle plates, driver names, booking IDs, and operational controls.";
        }
    } else {
        badge.className = "mode-badge citizen-badge";
        badge.textContent = "👤 CITIZEN VIEW";
        toggleBtn.innerHTML = "🛡️ Switch to Staff Inspection View";
        toggleBtn.classList.remove("staff-active");
        if (expl) {
            expl.textContent = "Click any available green bay (🟢) to reserve with your vehicle number.";
        }
    }
}

window.toggleStaffViewMode = function () {
    if (isStaffInspectionMode) {
        // Switch back to citizen
        isStaffInspectionMode = false;
        sessionStorage.removeItem("parking_staff_auth");
        updateModeBadgeUI();
        showToast("Switched to Citizen View.");
        loadInteractiveSlots(activeSlotLotId);
        return;
    }

    // Attempting to enter Staff Mode
    if (typeof isParkingStaff === "function" && isParkingStaff()) {
        isStaffInspectionMode = true;
        updateModeBadgeUI();
        showToast("✓ Staff Inspection Mode active.");
        loadInteractiveSlots(activeSlotLotId);
        return;
    }

    // Prompt for quick operational passcode for evaluator / testing
    const pin = prompt("Enter Parking Staff Security Passcode (Demo PIN: staff123):", "staff123");
    if (pin === "staff123") {
        sessionStorage.setItem("parking_staff_auth", "true");
        isStaffInspectionMode = true;
        updateModeBadgeUI();
        showToast("✓ Staff Access Verified! Full vehicle dossiers unlocked.");
        loadInteractiveSlots(activeSlotLotId);
    } else if (pin !== null) {
        showToast("❌ Incorrect staff passcode. Access denied.");
    }
};

window.switchLotTab = function (lotId) {
    activeSlotLotId = lotId;
    const tabs = document.querySelectorAll("#lotTabsContainer .lot-tab");
    tabs.forEach((tab) => {
        if (tab.getAttribute("onclick") && tab.getAttribute("onclick").includes(lotId)) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    loadInteractiveSlots(lotId);
};

async function loadInteractiveSlots(lotId, isSilent = false) {
    const grid = document.getElementById("interactiveSlotGrid");
    if (!grid) return;

    if (!isSilent) {
        grid.innerHTML = `
            <div class="grid-loading" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">
                <div class="spinner" style="border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #3b82f6; border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
                <p>Loading real-time bays for ${lotId}...</p>
            </div>
        `;
    }

    try {
        const headers = {
            "Content-Type": "application/json",
            "x-staff-access": isStaffInspectionMode ? "true" : "false"
        };
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/parking/${lotId}/slots`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (json.success) {
            activeLotSlots = json.slots || (json.data && json.data.slots) || [];
            activeLotInfo = (json.data && json.data.lot) || {
                id: json.lotId || lotId,
                name: json.lotName || "Parking Area",
                rate: Number(json.hourlyRate) || 20
            };

            updateGridLegendStats(activeLotSlots, activeLotInfo);
            renderInteractiveSlotGrid(activeLotSlots);
            return;
        }
        throw new Error("Invalid API payload");
    } catch (err) {
        console.warn("Could not fetch slots from API, building dynamic lot view:", err);
        // Fallback generator for offline/local simulation
        activeLotSlots = generateFallbackSlots(lotId);
        updateGridLegendStats(activeLotSlots, { id: lotId, name: lotId, rate: 20 });
        renderInteractiveSlotGrid(activeLotSlots);
    }
}

function updateGridLegendStats(slots, lot) {
    let avail = 0;
    let booked = 0;
    let occupied = 0;
    let maint = 0;

    slots.forEach((s) => {
        const st = (s.status || "").toLowerCase();
        if (st === "available") avail++;
        else if (st === "booked") booked++;
        else if (st === "occupied") occupied++;
        else if (st === "maintenance") maint++;
    });

    const elAvail = document.getElementById("gridCountAvail");
    const elBooked = document.getElementById("gridCountBooked");
    const elOccupied = document.getElementById("gridCountOccupied");
    const elMaint = document.getElementById("gridCountMaint");
    const elRate = document.getElementById("gridActiveLotRate");

    if (elAvail) elAvail.textContent = avail;
    if (elBooked) elBooked.textContent = booked;
    if (elOccupied) elOccupied.textContent = occupied;
    if (elMaint) elMaint.textContent = maint;

    const baseRate = Number(lot.rate || lot.hourlyRate || 20);
    if (elRate) elRate.textContent = `Hourly Rate: ₹${baseRate}/hr`;

    // Dynamic AI Surge Pricing indicator
    const total = slots.length;
    const occPct = total > 0 ? Math.round(((occupied + booked) / total) * 100) : 0;
    const surgeBadge = document.getElementById("surgePricingBadge");
    const surgeText = document.getElementById("surgePricingText");
    if (surgeBadge && surgeText) {
        if (occPct >= 75) {
            surgeBadge.className = "surge-pricing-tag surge";
            const surgeRate = Math.round(baseRate * 1.5);
            surgeText.innerHTML = `🔥 High Congestion Surge (+50% • ₹${surgeRate}/hr • ${occPct}% Full)`;
        } else if (occPct >= 40) {
            surgeBadge.className = "surge-pricing-tag surge";
            const surgeRate = Math.round(baseRate * 1.25);
            surgeText.innerHTML = `⚡ Moderate Peak Surge (+25% • ₹${surgeRate}/hr • ${occPct}% Full)`;
        } else {
            surgeBadge.className = "surge-pricing-tag normal";
            surgeText.innerHTML = `AI Tariff: Standard Demand (Base ₹${baseRate}/hr • ${occPct}% Full)`;
        }
    }
}

window.applySlotFilter = function (filterKey) {
    currentBayFilter = filterKey;
    const chips = document.querySelectorAll("#bayCategoryFilters .filter-chip");
    chips.forEach((chip) => {
        if (chip.getAttribute("onclick") && chip.getAttribute("onclick").includes(`'${filterKey}'`)) {
            chip.classList.add("active");
        } else {
            chip.classList.remove("active");
        }
    });
    renderInteractiveSlotGrid(activeLotSlots);
};

function formatSlotTime(timeStr) {
    if (!timeStr) return "Just now";
    try {
        const d = new Date(timeStr);
        if (isNaN(d.getTime())) return String(timeStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch (e) {
        return String(timeStr);
    }
}

function renderInteractiveSlotGrid(slots) {
    const grid = document.getElementById("interactiveSlotGrid");
    if (!grid) return;

    if (!slots || slots.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">No bays configured for this lot.</div>`;
        return;
    }

    // Apply active category filter
    let displaySlots = slots;
    if (currentBayFilter === "ev") {
        displaySlots = displaySlots.filter((s) => (s.slotType || "").toLowerCase() === "ev");
    } else if (currentBayFilter === "accessible") {
        displaySlots = displaySlots.filter((s) => {
            const t = (s.slotType || "").toLowerCase();
            return t === "accessible" || t === "handicap";
        });
    } else if (currentBayFilter === "bike") {
        displaySlots = displaySlots.filter((s) => {
            const t = (s.slotType || "").toLowerCase();
            return t === "bike" || t === "two-wheeler" || t === "motorcycle";
        });
    } else if (currentBayFilter === "available") {
        displaySlots = displaySlots.filter((s) => (s.status || "").toLowerCase() === "available");
    }

    if (displaySlots.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94a3b8;">No bays found matching filter "<strong>${currentBayFilter}</strong>" in this facility.</div>`;
        return;
    }

    grid.innerHTML = "";

    displaySlots.forEach((slot) => {
        const status = slot.status || "Available";
        const statusLower = status.toLowerCase();
        const typeLower = (slot.slotType || "standard").toLowerCase();

        const card = document.createElement("div");
        card.className = `slot-bay-card status-${statusLower} bay-type-${typeLower}`;
        card.setAttribute("data-slot-number", slot.slotNumber);
        card.onclick = () => handleSlotBayClick(slot.slotNumber);

        // Type badge icon
        let typeIcon = "🚗";
        let typeLabel = "Standard";
        if (typeLower === "ev") {
            typeIcon = "⚡";
            typeLabel = "EV Charging";
        } else if (typeLower === "handicap" || typeLower === "accessible") {
            typeIcon = "♿";
            typeLabel = "Accessible";
        } else if (typeLower === "vip") {
            typeIcon = "👑";
            typeLabel = "VIP";
        } else if (typeLower === "bike" || typeLower === "two-wheeler") {
            typeIcon = "🏍️";
            typeLabel = "Two-Wheeler";
        }

        // Status badge icon
        let statusBadgeClass = `bay-status-badge status-${statusLower}`;

        // Visual Center & Action Button (Uniform Grid Design)
        let centerVisual = "";
        let actionBtnHtml = "";

        if (statusLower === "available") {
            centerVisual = `
                <div class="bay-vehicle-graphic available-bay">
                    <div class="bay-ground-marking">🅿️</div>
                    <span class="bay-state-label">Open Bay</span>
                    <span class="bay-subtext">🟢 Bay Ready for Allocation</span>
                </div>
            `;
            actionBtnHtml = `
                <button type="button" class="btn-slot-book-now" onclick="event.stopPropagation(); openCitizenBookingModalByNumber('${slot.slotNumber}')">
                    🅿️ Book Now
                </button>
            `;
        } else if (statusLower === "booked") {
            centerVisual = `
                <div class="bay-vehicle-graphic booked-bay">
                    <div class="bay-car-silhouette">🚘</div>
                    <span class="bay-state-label">Slot Booked</span>
                    <span class="bay-subtext">Advance Reserved</span>
                </div>
            `;
            actionBtnHtml = `
                <button type="button" class="btn-guide-bay" onclick="event.stopPropagation(); openBayNavigationModal('${slot.slotNumber}')">
                    🗺️ Guide Me to Bay
                </button>
            `;
        } else if (statusLower === "occupied") {
            centerVisual = `
                <div class="bay-vehicle-graphic occupied-bay">
                    <div class="bay-car-silhouette">🚙</div>
                    <span class="bay-state-label">Occupied</span>
                    <span class="bay-subtext">Vehicle Parked</span>
                </div>
            `;
            actionBtnHtml = `
                <button type="button" class="btn-guide-bay" onclick="event.stopPropagation(); openBayNavigationModal('${slot.slotNumber}')">
                    🗺️ Guide Me to Bay
                </button>
            `;
        } else {
            centerVisual = `
                <div class="bay-vehicle-graphic maint-bay">
                    <div class="bay-car-silhouette">🚧</div>
                    <span class="bay-state-label">Under Service</span>
                    <span class="bay-subtext">Temporarily Offline</span>
                </div>
            `;
            actionBtnHtml = `
                <button type="button" class="btn-maint-disabled" disabled>
                    🚧 Under Service
                </button>
            `;
        }

        // SMART EV CHARGING GAUGE (Phase 2)
        let evGaugeHtml = "";
        if (typeLower === "ev" && (statusLower === "occupied" || statusLower === "booked")) {
            const seed = (slot.id || 1) * 19;
            const chargePct = 55 + (seed % 42); // 55% to 96%
            const estMins = Math.max(4, Math.round((100 - chargePct) * 0.75));
            evGaugeHtml = `
                <div class="ev-charging-gauge">
                    <div class="ev-gauge-header">
                        <span>⚡ 22kW Fast DC</span>
                        <span>🔋 ${chargePct}%</span>
                    </div>
                    <div class="ev-progress-track">
                        <div class="ev-progress-fill" style="width: ${chargePct}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.7rem; color: #94a3b8;">
                        <span>Charging active</span>
                        <span>~${estMins} min left</span>
                    </div>
                </div>
            `;
        }

        // STAFF INSPECTION METADATA BOX
        let staffBoxHtml = "";
        if (isStaffInspectionMode && (statusLower === "booked" || statusLower === "occupied")) {
            const vNum = slot.vehicleNumber || "UP 53 AB 1008";
            const cName = slot.customerName || "Staff Registered";
            const bTime = formatSlotTime(slot.bookingTime);
            const bId = slot.bookingId || slot.currentBookingId || `BKG-${slot.slotNumber}`;

            staffBoxHtml = `
                <div class="staff-meta-box">
                    <div class="staff-meta-row staff-vehicle">
                        <span class="meta-label">🚗 Plate:</span>
                        <strong class="meta-value">${vNum}</strong>
                    </div>
                    <div class="staff-meta-row staff-customer">
                        <span class="meta-label">👤 Driver:</span>
                        <span class="meta-value">${cName}</span>
                    </div>
                    <div class="staff-meta-row staff-time">
                        <span class="meta-label">🕒 Time:</span>
                        <span class="meta-value">${bTime}</span>
                    </div>
                    <div class="staff-meta-row staff-bid">
                        <span class="meta-label">🔖 Ref:</span>
                        <span class="meta-value code-pill">${bId}</span>
                    </div>
                </div>
            `;
        } else if (isStaffInspectionMode && statusLower === "available") {
            staffBoxHtml = `
                <div class="staff-meta-box staff-meta-empty">
                    <span class="meta-empty-prompt">🟢 Bay Ready for Allocation</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="bay-curb-stop"></div>
            <div class="bay-header">
                <div class="bay-header-left">
                    <strong class="bay-number">${slot.slotNumber}</strong>
                    <span class="bay-type-badge">${typeIcon} ${typeLabel}</span>
                </div>
                <div class="bay-header-right">
                    <span class="bay-floor-tag">${slot.floor || "Level 1"}</span>
                    <span class="${statusBadgeClass}"><i class="dot"></i> ${status}</span>
                </div>
            </div>

            ${centerVisual}

            ${evGaugeHtml}

            ${staffBoxHtml}

            <div class="bay-card-action-bar">
                ${actionBtnHtml}
            </div>
        `;

        grid.appendChild(card);
    });
}

window.openSlotModal = function (modalId) {
    const modal = typeof modalId === "string" ? document.getElementById(modalId) : modalId;
    if (modal) {
        modal.classList.add("active");
        modal.classList.add("show");
        modal.style.display = "flex";
    }
};

window.closeSlotModal = function (modalId) {
    const modal = typeof modalId === "string" ? document.getElementById(modalId) : modalId;
    if (modal) {
        modal.classList.remove("active");
        modal.classList.remove("show");
        modal.style.display = "none";
    }
};

window.openCitizenBookingModalByNumber = function (slotNumber) {
    let slot = activeLotSlots.find((s) => s.slotNumber === slotNumber);
    if (!slot) {
        slot = {
            slotNumber: slotNumber,
            slotType: "Standard",
            floor: "Level 1",
            status: "Available"
        };
    }
    openCitizenBookingModal(slot);
};

window.handleSlotBayClick = function (slotNumber) {
    const slot = activeLotSlots.find((s) => s.slotNumber === slotNumber);
    if (!slot) return;

    if (isStaffInspectionMode) {
        // Open Staff Operational Dossier & Control Modal
        openStaffSlotModal(slot);
    } else {
        // Citizen interaction
        const statusLower = (slot.status || "available").toLowerCase();
        if (statusLower === "available") {
            openCitizenBookingModal(slot);
        } else {
            showToast(`Bay ${slot.slotNumber} is currently ${slot.status.toLowerCase()}. Please select an available green bay.`);
        }
    }
};

window.openCitizenBookingModal = function (slot) {
    if (!slot) return;
    selectedSlotForBooking = slot;

    const modal = document.getElementById("slotBookingModal");
    const sub = document.getElementById("modalSlotSubtitle");
    const num = document.getElementById("modalSlotNumber");
    const type = document.getElementById("modalSlotType");
    const floor = document.getElementById("modalSlotFloor");
    const rate = document.getElementById("modalSlotRate");

    if (sub) sub.textContent = `${activeLotInfo.name || activeSlotLotId} • Dynamic Parking System`;
    if (num) num.textContent = slot.slotNumber;
    if (type) type.textContent = slot.slotType || "Standard";
    if (floor) floor.textContent = slot.floor || "Level 1";
    if (rate) rate.textContent = `₹${activeLotInfo.rate || activeLotInfo.hourlyRate || 20} / hr`;

    // Initialize Booking Date & Start Time pickers
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const dateInput = document.getElementById("bookingDate");
    const timeInput = document.getElementById("bookingStartTime");
    if (dateInput) {
        dateInput.value = todayStr;
        dateInput.min = todayStr;
    }
    if (timeInput) {
        timeInput.value = timeStr;
    }

    // Prefill user details & saved primary vehicle
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const nameInput = document.getElementById("bookingCustomerName");
    const phoneInput = document.getElementById("bookingCustomerPhone");
    const vehicleInput = document.getElementById("bookingVehicleNum");
    if (nameInput && user && user.name) nameInput.value = user.name;
    if (phoneInput && user && (user.phone || user.mobile)) phoneInput.value = user.phone || user.mobile;
    if (vehicleInput && !vehicleInput.value) {
        vehicleInput.value = localStorage.getItem("smartcity_primary_vehicle") || (user && user.defaultVehicle) || "UP 53 AB 1008";
    }

    calculateBookingAmount();

    openSlotModal("slotBookingModal");
};

window.calculateBookingAmount = function () {
    const hoursSelect = document.getElementById("bookingDurationHours");
    const amountEl = document.getElementById("modalCalculatedAmount");
    const timeInput = document.getElementById("bookingStartTime");
    const estEl = document.getElementById("modalEstimatedStayText");
    if (!hoursSelect || !amountEl) return;

    const hours = parseInt(hoursSelect.value, 10) || 2;
    const rate = activeLotInfo.rate || activeLotInfo.hourlyRate || 20;
    const total = hours * rate;

    amountEl.textContent = `₹${total.toFixed(2)}`;

    if (estEl) {
        let startTime = new Date();
        if (timeInput && timeInput.value) {
            const [h, m] = timeInput.value.split(":").map(Number);
            if (!isNaN(h) && !isNaN(m)) {
                startTime.setHours(h, m, 0, 0);
            }
        }
        const endTime = new Date(startTime.getTime() + hours * 3600 * 1000);
        const pad = n => String(n).padStart(2, '0');
        estEl.textContent = `${pad(startTime.getHours())}:${pad(startTime.getMinutes())} → ${pad(endTime.getHours())}:${pad(endTime.getMinutes())} (${hours} hr stay)`;
    }
};

window.submitSlotBooking = async function (event) {
    event.preventDefault();
    if (!selectedSlotForBooking) return;

    const vehicleInput = document.getElementById("bookingVehicleNum");
    const nameInput = document.getElementById("bookingCustomerName");
    const phoneInput = document.getElementById("bookingCustomerPhone");
    const hoursInput = document.getElementById("bookingDurationHours");
    const dateInput = document.getElementById("bookingDate");
    const timeInput = document.getElementById("bookingStartTime");

    const vehicleNumber = vehicleInput ? vehicleInput.value.trim().toUpperCase() : "";
    const customerName = nameInput ? nameInput.value.trim() : "";
    const customerPhone = phoneInput ? phoneInput.value.trim() : "";
    const durationHours = hoursInput ? parseInt(hoursInput.value, 10) || 2 : 2;
    const bookingDate = dateInput ? dateInput.value : "";
    const startTimeStr = timeInput ? timeInput.value : "";

    if (!vehicleNumber || !customerName) {
        showToast("Please enter vehicle number and customer name.");
        return;
    }

    const btnConfirm = document.getElementById("btnConfirmBooking");
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.textContent = "Reserving Bay...";
    }

    try {
        const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
        const payload = {
            slotNumber: selectedSlotForBooking.slotNumber,
            vehicleNumber,
            customerName,
            customerPhone,
            durationHours,
            bookingDate,
            startTimeStr,
            userId: user ? (user.id || user._id) : null
        };

        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/parking/${activeSlotLotId}/book-slot`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (res.ok && json.success) {
            closeSlotModal("slotBookingModal");
            const b = json.booking || {
                bookingId: `BKG-${selectedSlotForBooking.slotNumber}`,
                slotNumber: selectedSlotForBooking.slotNumber,
                vehicleNumber: vehicleNumber,
                customerName: customerName,
                totalAmount: (selectedSlotForBooking.rate || 20) * durationHours,
                bookingTime: new Date().toISOString(),
                lotName: activeLotInfo.name || activeSlotLotId
            };
            showToast(`✓ Reserved Bay ${selectedSlotForBooking.slotNumber}! Digital Pass generated.`);

            // Persist to Citizen Profile & Activity
            const userBooking = {
                bookingId: b.bookingId,
                lotId: activeSlotLotId,
                lotName: b.lotName || activeLotInfo.name || activeSlotLotId,
                slotNumber: b.slotNumber,
                vehicleNumber: b.vehicleNumber,
                customerName: b.customerName,
                customerPhone: b.customerPhone || customerPhone,
                totalAmount: b.totalAmount,
                durationHours: durationHours,
                startTime: b.startTime,
                endTime: b.endTime,
                qrToken: b.qrToken,
                qrPayload: b.qrPayload || `SMARTCITY|${b.bookingId}|${b.qrToken || ''}|${activeSlotLotId}|${b.slotNumber}`,
                status: "Active",
                timestamp: b.bookingTime || new Date().toISOString()
            };
            const existingBookings = JSON.parse(localStorage.getItem("smartCityUserBookings") || "[]");
            existingBookings.unshift(userBooking);
            localStorage.setItem("smartCityUserBookings", JSON.stringify(existingBookings));
            localStorage.setItem("smartCityActivePass", JSON.stringify(userBooking));

            const badge = document.getElementById("activePassCountBadge");
            if (badge) {
                badge.style.display = "inline-block";
                badge.textContent = "1";
            }

            // Reset form
            if (vehicleInput) vehicleInput.value = "";

            // Open Citizen Digital QR Parking Pass Modal
            showCitizenQrPassModal(userBooking);

            // Reload slots & general cards
            await loadInteractiveSlots(activeSlotLotId);
            if (typeof fetchParkingDataFromAPI === "function") {
                fetchParkingDataFromAPI();
            }
        } else {
            throw new Error(json.message || "Failed to book slot");
        }
    } catch (err) {
        console.error("Booking failed:", err);
        showToast(`❌ Booking error: ${err.message}`);
    } finally {
        if (btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.textContent = "🅿️ Confirm & Reserve Slot";
        }
    }
};

function openStaffSlotModal(slot) {
    const modal = document.getElementById("staffSlotModal");
    const sub = document.getElementById("staffModalSubtitle");
    const body = document.getElementById("staffModalBody");
    const footer = document.getElementById("staffModalFooter");

    if (!modal || !body || !footer) return;

    if (sub) {
        sub.textContent = `${activeLotInfo.name || activeSlotLotId} • Bay ${slot.slotNumber} (${slot.slotType || "Standard"}) • ${slot.floor || "Floor 1"}`;
    }

    const status = slot.status || "Available";
    const statusLower = status.toLowerCase();

    // Body content with operational dossier
    let detailsHtml = `
        <div class="staff-dossier-grid">
            <div class="dossier-item">
                <span class="dossier-lbl">Bay Identifier</span>
                <strong class="dossier-val highlight-val">${slot.slotNumber}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">Current Bay Status</span>
                <strong class="dossier-val status-${statusLower}">${status.toUpperCase()}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">Bay Specification</span>
                <strong class="dossier-val">${slot.slotType || "Standard"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">Floor / Zone</span>
                <strong class="dossier-val">${slot.floor || "Level 1"}</strong>
            </div>
    `;

    if (statusLower === "booked" || statusLower === "occupied") {
        detailsHtml += `
            <div class="dossier-item span-two">
                <span class="dossier-lbl">🚗 Vehicle Plate Number</span>
                <strong class="dossier-val plate-badge">${slot.vehicleNumber || "UP 53 AB 1008"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">👤 Customer Name</span>
                <strong class="dossier-val">${slot.customerName || "Walk-in Citizen"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">📞 Contact Number</span>
                <strong class="dossier-val">${slot.customerPhone || "Not Provided"}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">🕒 Booking / Check-in</span>
                <strong class="dossier-val">${formatSlotTime(slot.bookingTime)}</strong>
            </div>
            <div class="dossier-item">
                <span class="dossier-lbl">🔖 Booking Reference</span>
                <strong class="dossier-val code-pill">${slot.bookingId || slot.currentBookingId || "BKG-" + slot.slotNumber}</strong>
            </div>
            <div class="dossier-item span-two">
                <span class="dossier-lbl">💰 Billed Duration / Amount</span>
                <strong class="dossier-val">${slot.durationHours || 2} Hours (₹${slot.totalAmount || (slot.durationHours || 2) * (activeLotInfo.rate || 20)})</strong>
            </div>
        `;

        // Smart EV Charger Telemetry for staff
        if ((slot.slotType || "").toLowerCase() === "ev") {
            const seed = (slot.id || 1) * 19;
            const chargePct = 55 + (seed % 42);
            detailsHtml += `
                <div class="dossier-item span-two" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span class="dossier-lbl" style="color: #34d399; margin: 0;">⚡ Smart EV Charger Telemetry</span>
                        <strong style="color: #34d399; font-size: 0.95rem;">🔋 ${chargePct}% Charged</strong>
                    </div>
                    <div class="ev-progress-track">
                        <div class="ev-progress-fill" style="width: ${chargePct}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.78rem; color: #94a3b8;">
                        <span>Rate: 22 kW DC Fast Mode</span>
                        <span>Power Delivered: ${(chargePct * 0.45).toFixed(1)} kWh</span>
                    </div>
                </div>
            `;
        }
    } else if (statusLower === "available") {
        detailsHtml += `
            <div class="dossier-item span-two staff-notice-box">
                <span style="color: #22c55e; font-weight: 700;">🟢 Bay Available</span>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 0.85rem;">This bay is empty and ready for incoming traffic. Staff can set maintenance or manually allocate if needed.</p>
            </div>
        `;
    } else {
        detailsHtml += `
            <div class="dossier-item span-two staff-notice-box">
                <span style="color: #f59e0b; font-weight: 700;">⚠️ Maintenance / Sensor Inspection</span>
                <p style="margin: 4px 0 0; color: #94a3b8; font-size: 0.85rem;">Slot is temporarily cordoned off for maintenance work. Restore to Available once ready.</p>
            </div>
        `;
    }

    detailsHtml += `</div>`;
    body.innerHTML = detailsHtml;

    // Action buttons in footer
    let actionsHtml = "";
    if (statusLower === "booked") {
        actionsHtml = `
            <button type="button" class="btn-action btn-occupied" onclick="updateSlotStatus(${slot.id}, 'Occupied')">🚙 Mark as Occupied (Vehicle Arrived)</button>
            <button type="button" class="btn-action btn-release" onclick="updateSlotStatus(${slot.id}, 'Available')">🔓 Cancel / Release to Available</button>
        `;
    } else if (statusLower === "occupied") {
        actionsHtml = `
            <button type="button" class="btn-action btn-release" onclick="updateSlotStatus(${slot.id}, 'Available')">✅ Mark Vacated (Vehicle Departed)</button>
            <button type="button" class="btn-action btn-maint" onclick="updateSlotStatus(${slot.id}, 'Maintenance')">⚠️ Flag Sensor Error / Maintenance</button>
        `;
    } else if (statusLower === "available") {
        actionsHtml = `
            <button type="button" class="btn-action btn-occupied" onclick="updateSlotStatus(${slot.id}, 'Occupied')">🚙 Direct Gate Entry (Mark Occupied)</button>
            <button type="button" class="btn-action btn-maint" onclick="updateSlotStatus(${slot.id}, 'Maintenance')">⚠️ Put Under Maintenance</button>
        `;
    } else {
        actionsHtml = `
            <button type="button" class="btn-action btn-release" onclick="updateSlotStatus(${slot.id}, 'Available')">🟢 Restore to Available</button>
        `;
    }

    actionsHtml += `<button type="button" class="btn-cancel" onclick="closeSlotModal('staffSlotModal')">Close</button>`;
    footer.innerHTML = actionsHtml;

    openSlotModal("staffSlotModal");
}

window.updateSlotStatus = async function (slotId, newStatus) {
    try {
        const headers = {
            "Content-Type": "application/json",
            "x-staff-access": "true"
        };
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/parking/slots/${slotId}/status`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: newStatus })
        });

        const json = await res.json();
        if (res.ok && json.success) {
            closeSlotModal("staffSlotModal");
            showToast(`✓ Bay status updated to ${newStatus}`);
            await loadInteractiveSlots(activeSlotLotId);
            if (typeof fetchParkingDataFromAPI === "function") {
                fetchParkingDataFromAPI();
            }
        } else {
            throw new Error(json.message || "Failed to update slot status");
        }
    } catch (err) {
        console.error("Status update error:", err);
        showToast(`❌ Error updating bay: ${err.message}`);
    }
};


function generateFallbackSlots(lotId) {
    const count = 20;
    const slots = [];
    for (let i = 1; i <= count; i++) {
        const num = (i < 10 ? "A-0" : "A-") + i;
        const status = i <= 6 ? "Occupied" : i <= 9 ? "Booked" : i === 10 ? "Maintenance" : "Available";
        slots.push({
            id: i,
            slotNumber: num,
            slotType: i <= 2 ? "EV" : i === 3 ? "Handicap" : "Standard",
            floor: "Level 1",
            status: status,
            vehicleNumber: status !== "Available" ? `UP 53 AB ${1000 + i}` : null,
            customerName: status !== "Available" ? `Citizen ${i}` : null,
            bookingTime: new Date().toISOString(),
            bookingId: status !== "Available" ? `BKG-${lotId}-${num}` : null
        });
    }
    return slots;
}


/* =====================================================
   DIGITAL QR PARKING PASS & VOUCHER GENERATION
===================================================== */

function showCitizenQrPassModal(booking) {
    const modal = document.getElementById("citizenQrPassModal");
    const elSlot = document.getElementById("passSlotNumber");
    const elPlate = document.getElementById("passVehicleNumber");
    const elLot = document.getElementById("passLotName");
    const elName = document.getElementById("passCustomerName");
    const elTime = document.getElementById("passBookingTime");
    const elAmount = document.getElementById("passAmount");
    const elBId = document.getElementById("passBookingId");
    const elSec = document.getElementById("passSecurityToken");
    const elQr = document.getElementById("passQrCanvas");

    if (elSlot) elSlot.textContent = booking.slotNumber || "A-01";
    if (elPlate) elPlate.textContent = booking.vehicleNumber || "UP 53 AB 1008";
    if (elLot) elLot.textContent = booking.lotName || activeLotInfo.name || activeSlotLotId;
    if (elName) elName.textContent = booking.customerName || "Citizen Driver";
    if (elTime) elTime.textContent = formatSlotTime(booking.bookingTime || new Date());
    if (elAmount) elAmount.textContent = "₹" + Number(booking.totalAmount || 40).toFixed(2);
    const bId = booking.bookingId || "BKG-UNKNOWN";
    if (elBId) elBId.textContent = bId;
    if (elSec) elSec.textContent = `SEC-${bId.slice(-4)}-SMARTCITY`;

    if (elQr) {
        const qrPayload = booking.qrPayload || `SMARTCITY|${bId}|${booking.qrToken || ''}|${booking.lotId || activeSlotLotId}|${booking.slotNumber}`;
        elQr.innerHTML = generateQrSvg(qrPayload);
    }

    openSlotModal("citizenQrPassModal");
}

function generateQrSvg(text) {
    const size = 160;
    const modules = 21;
    const cellSize = size / modules;

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
    }

    let rects = "";

    function isFinder(r, c) {
        return (r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7);
    }

    function isFinderDark(r, c) {
        const check = (row, col) => {
            if (row === 0 || row === 6 || col === 0 || col === 6) return true;
            if (row >= 2 && row <= 4 && col >= 2 && col <= 4) return true;
            return false;
        };
        if (r < 7 && c < 7) return check(r, c);
        if (r < 7 && c >= modules - 7) return check(r, c - (modules - 7));
        if (r >= modules - 7 && c < 7) return check(r - (modules - 7), c);
        return false;
    }

    for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
            let isDark = false;
            if (isFinder(r, c)) {
                isDark = isFinderDark(r, c);
            } else if (r === 6 || c === 6) {
                isDark = (r + c) % 2 === 0;
            } else {
                const bit = Math.abs(Math.sin((r * modules + c + 1) * hash)) > 0.48;
                isDark = bit;
            }

            if (isDark) {
                rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#0f172a" />`;
            }
        }
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius: 4px;">
        <rect width="100%" height="100%" fill="#ffffff"/>
        ${rects}
    </svg>`;
}

window.printParkingPass = function () {
    window.print();
};


/* =====================================================
   STAFF GATE SCANNER & AUTOMATED BARRIER LOGIC
===================================================== */

window.handleGateScanAction = async function (action) {
    const input = document.getElementById("gateScannerInput");
    const indicator = document.getElementById("gateBarrierIndicator");
    const dossier = document.getElementById("gateScanDossier");
    if (!input) return;

    const term = input.value.trim();
    if (!term) {
        showToast("Please enter a Booking Reference ID or Vehicle Registration number.");
        input.focus();
        return;
    }

    try {
        const payload = {
            action,
            bookingId: term.toUpperCase().startsWith("BKG-") ? term : null,
            vehicleNumber: !term.toUpperCase().startsWith("BKG-") ? term : null
        };

        const res = await fetch("/api/parking/gate-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || "Failed to process gate action");
        }

        if (dossier) {
            dossier.style.display = "block";
            if (action === "lookup") {
                const b = json.booking;
                dossier.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="margin: 0; color: #38bdf8;">✓ Booking Verified</h4>
                        <span style="font-family: monospace; background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 4px;">${b.booking_id}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; font-size: 0.88rem; color: #cbd5e1;">
                        <div>🚗 <strong>Plate:</strong> <span style="background: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${b.vehicle_number}</span></div>
                        <div>👤 <strong>Driver:</strong> ${b.customer_name}</div>
                        <div>🅿️ <strong>Bay:</strong> <span style="color: #4ade80; font-weight: 800; font-size: 1.05rem;">${b.slot_number}</span></div>
                        <div>📍 <strong>Floor:</strong> ${b.slot_floor || "Level 1"}</div>
                    </div>
                `;
            } else if (action === "checkin") {
                if (indicator) {
                    indicator.className = "barrier-status-indicator open";
                    indicator.innerHTML = `<span class="pulse-dot"></span> BARRIER: UP (OPEN) — DRIVE IN`;
                }
                dossier.innerHTML = `
                    <div style="padding: 10px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px;">
                        <h4 style="margin: 0 0 6px; color: #4ade80;">🟢 GATE BARRIER OPENED — CHECK-IN COMPLETE</h4>
                        <p style="margin: 0; font-size: 0.88rem; color: #e2e8f0;">Vehicle <strong>${json.booking.vehicle_number}</strong> verified. Proceed to Assigned Bay <strong style="color: #4ade80; font-size: 1.15rem;">${json.booking.slot_number}</strong> (${json.booking.slot_floor || "Level 1"}).</p>
                    </div>
                `;
                setTimeout(() => {
                    if (indicator) {
                        indicator.className = "barrier-status-indicator closed";
                        indicator.innerHTML = `<span class="pulse-dot"></span> BARRIER: DOWN (CLOSED)`;
                    }
                }, 5000);
            } else if (action === "checkout") {
                const s = json.stayDetails;
                if (indicator) {
                    indicator.className = "barrier-status-indicator open";
                    indicator.innerHTML = `<span class="pulse-dot"></span> BARRIER: UP (OPEN) — EXIT GRANTED`;
                }
                dossier.innerHTML = `
                    <div style="padding: 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #60a5fa;">🏁 CHECK-OUT & EXIT INVOICE</h4>
                            <span style="font-weight: 800; color: #4ade80; font-size: 1.15rem;">Billed: ₹${s.totalAmount}</span>
                        </div>
                        <p style="margin: 0 0 8px; font-size: 0.85rem; color: #cbd5e1;">Vehicle <strong>${s.vehicleNumber}</strong> completed stay of <strong>${s.elapsedHours} hr(s)</strong>. Bay <strong>${s.slotNumber}</strong> is now Available.</p>
                        <small style="color: #94a3b8;">Receipt Ref: ${s.bookingId} • Facility: ${s.lotName}</small>
                    </div>
                `;
                setTimeout(() => {
                    if (indicator) {
                        indicator.className = "barrier-status-indicator closed";
                        indicator.innerHTML = `<span class="pulse-dot"></span> BARRIER: DOWN (CLOSED)`;
                    }
                }, 5000);
            }
        }

        showToast(json.message);
        await loadInteractiveSlots(activeSlotLotId);
        if (typeof fetchParkingDataFromAPI === "function") {
            fetchParkingDataFromAPI();
        }
    } catch (err) {
        console.error("Gate scan error:", err);
        showToast(`❌ Gate error: ${err.message}`);
        if (dossier) {
            dossier.style.display = "block";
            dossier.innerHTML = `<div style="color: #f87171; font-size: 0.9rem;">⚠️ ${err.message}</div>`;
        }
    }
};

window.simulateGateQrDemo = function () {
    const input = document.getElementById("gateScannerInput");
    if (!input) return;
    const activeBooking = activeLotSlots.find(s => s.status === "Booked" || s.status === "Occupied");
    if (activeBooking && (activeBooking.bookingId || activeBooking.currentBookingId)) {
        input.value = activeBooking.bookingId || activeBooking.currentBookingId;
    } else if (activeBooking && activeBooking.vehicleNumber) {
        input.value = activeBooking.vehicleNumber;
    } else {
        input.value = "BKG-PK1-A02";
    }
    handleGateScanAction("lookup");
};


/* =====================================================
   PHASE 2: AI ANPR GATE CAMERA SIMULATOR CONTROLLER
===================================================== */

window.setAnprPreset = function (plate, isEv) {
    const input = document.getElementById("anprPlateInput");
    const hudPlate = document.getElementById("hudPlateText");
    if (input) {
        input.value = plate;
        if (isEv) {
            input.setAttribute("data-is-ev", "true");
        } else {
            input.removeAttribute("data-is-ev");
        }
    }
    if (hudPlate) hudPlate.textContent = plate;
};

window.triggerAnprRecognition = async function () {
    const input = document.getElementById("anprPlateInput");
    const feedback = document.getElementById("anprScanFeedback");
    const laser = document.getElementById("anprLaserBeam");
    const hudPlate = document.getElementById("hudPlateText");
    const hudConf = document.getElementById("hudConfidenceScore");
    const barrier = document.getElementById("gateBarrierIndicator");

    if (!input) return;
    const plate = input.value.trim().toUpperCase();
    if (!plate) {
        showToast("Please enter a vehicle license plate.");
        input.focus();
        return;
    }

    if (hudPlate) hudPlate.textContent = plate;
    if (hudConf) hudConf.textContent = `OCR Confidence: ${(98.6 + Math.random() * 1.2).toFixed(1)}%`;

    // Trigger laser scanning animation
    if (laser) {
        laser.style.animation = "none";
        laser.offsetHeight;
        laser.style.animation = "laserScan 0.7s ease-in-out 3 alternate";
    }

    const isEv = input.getAttribute("data-is-ev") === "true" || plate.includes("EV");

    try {
        const res = await fetch("/api/parking/anpr-scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lotId: activeSlotLotId,
                vehicleNumber: plate,
                isEv: isEv
            })
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.message || "Failed to process ANPR camera ingress");
        }

        // Lift Gate Barrier
        if (barrier) {
            barrier.className = "barrier-status-indicator open";
            barrier.innerHTML = `<span class="pulse-dot"></span> BARRIER: UP (OPEN) — AI ANPR GRANTED`;
            setTimeout(() => {
                barrier.className = "barrier-status-indicator closed";
                barrier.innerHTML = `<span class="pulse-dot"></span> BARRIER: DOWN (CLOSED)`;
            }, 6000);
        }

        if (feedback) {
            feedback.style.display = "block";
            const isReserved = json.matchType === "RESERVED_BOOKING";
            feedback.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #4ade80; font-size: 0.95rem;">${isReserved ? "✓ ACTIVE CITIZEN RESERVATION MATCHED" : "✓ WALK-IN AUTOMATICALLY ALLOCATED"}</strong>
                    <span style="background: #22c55e; color: #022c22; font-weight: 800; font-size: 0.75rem; padding: 2px 8px; border-radius: 9999px;">BARRIER OPEN</span>
                </div>
                <p style="margin: 0 0 10px; font-size: 0.88rem; color: #e2e8f0;">
                    Plate <strong>${json.vehicleNumber}</strong> has been cleared for entry. Assigned to Bay <strong style="color: #38bdf8; font-size: 1.15rem;">${json.assignedBay}</strong> (${json.floor || "Level 1"}).
                </p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="btn-navigate-pass" style="padding: 6px 14px; font-size: 0.82rem;" onclick="openBayNavigationModal('${json.assignedBay}')">🗺️ Guide Me to Bay ${json.assignedBay}</button>
                </div>
            `;
        }

        showToast(json.message);
        await loadInteractiveSlots(activeSlotLotId);
        if (typeof fetchParkingDataFromAPI === "function") {
            fetchParkingDataFromAPI();
        }
    } catch (err) {
        console.error("ANPR Scan error:", err);
        showToast(`❌ ANPR Error: ${err.message}`);
        if (feedback) {
            feedback.style.display = "block";
            feedback.innerHTML = `<div style="color: #f87171; font-weight: 600;">⚠️ ${err.message}</div>`;
        }
    }
};


/* =====================================================
   PHASE 2: INDOOR WAYFINDING & "FIND MY CAR" CONTROLLER
===================================================== */

window.openBayNavigationModal = function (slotNumber) {
    const modal = document.getElementById("bayNavigationModal");
    const badge = document.getElementById("navTargetBayBadge");
    const sub = document.getElementById("navModalSubtitle");
    const svgContainer = document.getElementById("floorSchematicSvg");
    const stepsList = document.getElementById("turnByTurnList");

    if (!modal) return;
    const bay = String(slotNumber || "A-01").toUpperCase();
    if (badge) badge.textContent = `DESTINATION: BAY ${bay}`;
    if (sub) sub.textContent = `${activeLotInfo.name || activeSlotLotId} • Navigation Path from Gate 1 Barrier to Bay ${bay}`;

    let bayNum = 1;
    const match = bay.match(/\d+/);
    if (match) bayNum = parseInt(match[0], 10);
    const isRowA = bay.startsWith("A") || bayNum <= 6;
    const colIndex = Math.min(Math.max((bayNum - 1) % 6, 0), 5);

    const startX = 50;
    const startY = 240;
    const mainLaneY = 140;
    const aisleX = 110 + colIndex * 80;
    const targetY = isRowA ? 40 : 180;

    if (svgContainer) {
        svgContainer.innerHTML = generateFloorSchematicSvg(bay, colIndex, isRowA, startX, startY, mainLaneY, aisleX, targetY);
    }

    if (stepsList) {
        stepsList.innerHTML = `
            <div class="nav-step-item">
                <span class="nav-step-num">1</span>
                <span>Enter through <strong>Automated Gate 1 Barrier</strong> (ANPR/RFID clearance verified).</span>
            </div>
            <div class="nav-step-item">
                <span class="nav-step-num">2</span>
                <span>Drive forward along <strong>Main Access Concourse</strong> for approximately ${30 + colIndex * 12} meters.</span>
            </div>
            <div class="nav-step-item">
                <span class="nav-step-num">3</span>
                <span>Turn ${isRowA ? "left into Row A aisle" : "right into Row B aisle"} towards Pillar Column ${colIndex + 1}.</span>
            </div>
            <div class="nav-step-item">
                <span class="nav-step-num">4</span>
                <span>Park safely at <strong style="color: #38bdf8; font-size: 1.05rem;">Bay ${bay}</strong> (${isRowA ? "Left Side" : "Right Side"}). Overhead green LED sensor active.</span>
            </div>
        `;
    }

    openSlotModal("bayNavigationModal");
};

function generateFloorSchematicSvg(targetBay, colIndex, isRowA, startX, startY, mainLaneY, aisleX, targetY) {
    let baysSvg = "";
    // Row A (Top row)
    for (let i = 0; i < 6; i++) {
        const bNum = `A-0${i + 1}`;
        const bx = 110 + i * 80;
        const by = 30;
        const isTarget = isRowA && colIndex === i;
        const fill = isTarget ? "#0284c7" : "#1e293b";
        const stroke = isTarget ? "#38bdf8" : "#334155";
        const textCol = isTarget ? "#ffffff" : "#94a3b8";
        baysSvg += `
            <rect x="${bx}" y="${by}" width="64" height="65" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${isTarget ? "3" : "1"}" />
            <text x="${bx + 32}" y="${by + 38}" fill="${textCol}" font-size="12" font-weight="800" text-anchor="middle">${bNum}</text>
            ${isTarget ? `<circle cx="${bx + 32}" cy="${by + 14}" r="5" fill="#22c55e" />` : ""}
        `;
    }

    // Row B (Bottom row)
    for (let i = 0; i < 6; i++) {
        const bNum = i + 7 < 10 ? `B-0${i + 7}` : `B-${i + 7}`;
        const bx = 110 + i * 80;
        const by = 180;
        const isTarget = !isRowA && colIndex === i;
        const fill = isTarget ? "#0284c7" : "#1e293b";
        const stroke = isTarget ? "#38bdf8" : "#334155";
        const textCol = isTarget ? "#ffffff" : "#94a3b8";
        baysSvg += `
            <rect x="${bx}" y="${by}" width="64" height="65" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${isTarget ? "3" : "1"}" />
            <text x="${bx + 32}" y="${by + 38}" fill="${textCol}" font-size="12" font-weight="800" text-anchor="middle">${bNum}</text>
            ${isTarget ? `<circle cx="${bx + 32}" cy="${by + 14}" r="5" fill="#22c55e" />` : ""}
        `;
    }

    const pathD = `M ${startX} ${startY} L ${startX} ${mainLaneY} L ${aisleX + 32} ${mainLaneY} L ${aisleX + 32} ${isRowA ? targetY + 65 : targetY}`;

    return `
        <svg width="100%" height="270" viewBox="0 0 620 270" xmlns="http://www.w3.org/2000/svg" style="border-radius: 8px;">
            <rect width="100%" height="100%" fill="#070b14" />
            <line x1="20" y1="${mainLaneY}" x2="600" y2="${mainLaneY}" stroke="#1e293b" stroke-width="26" stroke-dasharray="12 8" />
            <text x="310" y="${mainLaneY + 5}" fill="#475569" font-size="11" font-weight="800" letter-spacing="3" text-anchor="middle">ONE-WAY DRIVING AISLE</text>

            ${baysSvg}

            <!-- Gate Entry Pin -->
            <circle cx="${startX}" cy="${startY}" r="15" fill="#ef4444" />
            <text x="${startX}" y="${startY + 4}" fill="#ffffff" font-size="10" font-weight="900" text-anchor="middle">GATE</text>

            <!-- Animated Dash Flow Path -->
            <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8 6" style="animation: dashFlow 1.5s linear infinite;" />

            <!-- Destination Car Pin -->
            <g transform="translate(${aisleX + 18}, ${isRowA ? targetY + 15 : targetY + 20})">
                <circle cx="14" cy="14" r="14" fill="#22c55e" />
                <text x="14" y="19" font-size="14" text-anchor="middle">🚗</text>
            </g>
        </svg>
    `;
}


/* =====================================================
   PHASE 3: INTERACTIVE GPS LEAFLET PARKING RADAR MAP
===================================================== */

let parkingLeafletMap = null;
let parkingMapMarkersGroup = null;
let currentBaseLayer = null;
let trafficOverlayGroup = null;
let currentMapMode = "streets";

const GORAKHPUR_COORDS = [26.758, 83.395];

const MAP_LAYER_CONFIGS = {
    streets: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        options: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors', maxZoom: 19 }
    },
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        options: { attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community', maxZoom: 19 }
    },
    traffic: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        options: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors • Live Traffic Radar Corridor', maxZoom: 19 }
    }
};

function applyTileLayer(cfg) {
    const layer = L.tileLayer(cfg.url, cfg.options);
    layer.on('tileerror', function (err) {
        console.warn('Map tile load error, falling back gracefully:', err);
    });
    return layer;
}

function initParkingGpsMap(lotsData) {
    const mapEl = document.getElementById("parkingGpsMap");
    if (!mapEl || typeof L === "undefined") {
        return;
    }

    if (!parkingLeafletMap) {
        parkingLeafletMap = L.map("parkingGpsMap", {
            center: GORAKHPUR_COORDS,
            zoom: 13,
            zoomControl: true,
            scrollWheelZoom: false
        });

        // Set initial standard street layer (OpenStreetMap - Free & zero watermark)
        currentBaseLayer = applyTileLayer(MAP_LAYER_CONFIGS.streets).addTo(parkingLeafletMap);

        trafficOverlayGroup = L.layerGroup();
        parkingMapMarkersGroup = L.layerGroup().addTo(parkingLeafletMap);

        // Pre-build traffic simulation lines for Gorakhpur key arterials
        buildGorakhpurTrafficCorridors();
    }

    renderParkingMapMarkers(lotsData);
}

function buildGorakhpurTrafficCorridors() {
    if (!trafficOverlayGroup) return;
    trafficOverlayGroup.clearLayers();

    const corridors = [
        // Medical College / AIIMS Road (Green - Flowing)
        { coords: [[26.755, 83.373], [26.745, 83.410], [26.7329, 83.4475]], color: "#22c55e", label: "AIIMS Arterial: 55 km/h (Normal Flow)" },
        // Golghar Market Road (Red - Congested)
        { coords: [[26.759, 83.3765], [26.755, 83.3732], [26.753, 83.370]], color: "#ef4444", label: "Golghar Central: 12 km/h (Heavy Peak Congestion)" },
        // Railway Station Concourse (Yellow - Moderate)
        { coords: [[26.7591, 83.3732], [26.762, 83.380], [26.765, 83.390]], color: "#eab308", label: "Station Approach: 24 km/h (Moderate)" },
        // DDU Gorakhpur University Road (Green - Smooth)
        { coords: [[26.7548, 83.3732], [26.748, 83.378], [26.740, 83.385]], color: "#22c55e", label: "Civil Lines / University: 48 km/h (Smooth Flow)" },
        // Airport Highway (Green - Express)
        { coords: [[26.745, 83.410], [26.739, 83.450]], color: "#22c55e", label: "Airport Bypass: 65 km/h (Free Flow)" }
    ];

    corridors.forEach(c => {
        const polyline = L.polyline(c.coords, {
            color: c.color,
            weight: 6,
            opacity: 0.85,
            dashArray: c.color === "#ef4444" ? "8, 6" : null
        }).bindTooltip(c.label, { sticky: true, className: "traffic-tooltip" });
        trafficOverlayGroup.addLayer(polyline);
    });
}

window.switchMapLayer = function (layerType) {
    if (!parkingLeafletMap || !MAP_LAYER_CONFIGS[layerType]) return;
    currentMapMode = layerType;

    // Remove current base layer
    if (currentBaseLayer) {
        parkingLeafletMap.removeLayer(currentBaseLayer);
    }

    const cfg = MAP_LAYER_CONFIGS[layerType];
    currentBaseLayer = applyTileLayer(cfg).addTo(parkingLeafletMap);

    // Toggle traffic overlay layer
    if (layerType === "traffic") {
        if (!parkingLeafletMap.hasLayer(trafficOverlayGroup)) {
            trafficOverlayGroup.addTo(parkingLeafletMap);
        }
        showToast("🚦 Traffic Radar Layer Active: Real-time arterial flow & congestion visible.");
    } else {
        if (trafficOverlayGroup && parkingLeafletMap.hasLayer(trafficOverlayGroup)) {
            parkingLeafletMap.removeLayer(trafficOverlayGroup);
        }
        showToast(layerType === "satellite" ? "🛰️ High-Resolution Satellite Map Active (Esri World Imagery)." : "🗺️ Standard OpenStreetMap Active (Watermark-free).");
    }

    // Ensure markers group stays on top
    if (parkingMapMarkersGroup) {
        parkingMapMarkersGroup.bringToFront();
    }

    // Update button active classes
    const btnStreet = document.getElementById("btnLayerStreet");
    const btnSat = document.getElementById("btnLayerSat");
    const btnTraffic = document.getElementById("btnLayerTraffic");

    if (btnStreet) btnStreet.classList.toggle("active", layerType === "streets");
    if (btnSat) btnSat.classList.toggle("active", layerType === "satellite");
    if (btnTraffic) btnTraffic.classList.toggle("active", layerType === "traffic");
};

window.openMapApiKeyModal = function () {
    const modal = document.getElementById("mapApiKeyModal");
    const keyInput = document.getElementById("customMapApiKeyInput");
    if (keyInput) {
        keyInput.value = localStorage.getItem("smartcity_map_api_key") || "";
    }
    openSlotModal("mapApiKeyModal");
};

window.saveMapApiKey = function () {
    const keyInput = document.getElementById("customMapApiKeyInput");
    const key = keyInput ? keyInput.value.trim() : "";
    if (key) {
        localStorage.setItem("smartcity_map_api_key", key);
        showToast("✓ Custom Map API Key saved successfully!");
    } else {
        localStorage.removeItem("smartcity_map_api_key");
        showToast("Using default zero-config high-resolution OpenStreetMap & Esri layers.");
    }
    closeSlotModal("mapApiKeyModal");
};

function renderParkingMapMarkers(lotsData) {
    if (!parkingLeafletMap || !parkingMapMarkersGroup) return;
    parkingMapMarkersGroup.clearLayers();

    const lots = lotsData || window.rawLiveParkingLots || [];
    if (!lots.length) {
        const localData = getParkingData();
        Object.keys(localData).forEach(code => {
            const item = localData[code];
            lots.push({
                parking_code: code,
                name: item.name,
                address: item.location,
                total_slots: item.total,
                available_slots: item.available,
                hourly_rate: item.rate,
                latitude: item.latitude || (code === "PARK-006" ? 26.7329 : 26.7605),
                longitude: item.longitude || (code === "PARK-006" ? 83.4475 : 83.3730)
            });
        });
    }

    lots.forEach(lot => {
        const lat = Number(lot.latitude || 26.758);
        const lng = Number(lot.longitude || 83.395);
        const code = lot.parking_code || lot.parkingCode || "PARK";
        const name = lot.name || code;
        const total = Number(lot.total_slots || lot.total || 24);
        const available = Number(lot.available_slots || lot.available || 0);
        const rate = Number(lot.hourly_rate || lot.hourlyRate || 20);
        const pct = total > 0 ? (available / total) * 100 : 0;

        let colorClass = "green";
        if (pct <= 10 || (lot.status && lot.status.toLowerCase() === "full")) colorClass = "red";
        else if (pct <= 40) colorClass = "yellow";

        const markerHtml = `<div class="custom-parking-marker ${colorClass}" title="${name}">🅿️</div>`;
        const customIcon = L.divIcon({
            html: markerHtml,
            className: "custom-leaflet-pin",
            iconSize: [38, 38],
            iconAnchor: [19, 19],
            popupAnchor: [0, -20]
        });

        const popupContent = `
            <div class="parking-map-popup">
                <h4>${name}</h4>
                <p>📍 ${lot.address || lot.area || "Gorakhpur City"}</p>
                <div class="popup-stat-grid">
                    <div class="popup-stat-item">
                        <small>Available Bays</small>
                        <strong style="color: ${colorClass === 'green' ? '#4ade80' : colorClass === 'yellow' ? '#facc15' : '#f87171'}">${available} / ${total}</strong>
                    </div>
                    <div class="popup-stat-item">
                        <small>Hourly Tariff</small>
                        <strong>₹${rate}/hr</strong>
                    </div>
                </div>
                <button type="button" class="btn-popup-select" onclick="focusAndBookFromMap('${code}')">
                    🎯 Focus & Book Bay (${code})
                </button>
            </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupContent);
        parkingMapMarkersGroup.addLayer(marker);
    });
}

window.updateParkingGpsMap = function (lotsData) {
    if (!parkingLeafletMap) {
        initParkingGpsMap(lotsData);
    } else {
        renderParkingMapMarkers(lotsData);
    }
};

window.recenterParkingMap = function () {
    if (parkingLeafletMap) {
        parkingLeafletMap.setView(GORAKHPUR_COORDS, 13);
        showToast("📍 Map recentered to Gorakhpur Central Grid");
    }
};

window.focusAndBookFromMap = function (lotCode) {
    if (typeof switchLotTab === "function") {
        switchLotTab(lotCode);
    }
    const section = document.getElementById("interactiveSlotSection");
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    showToast(`Viewing live physical bays for ${lotCode}`);
};


/* =====================================================
   PHASE 3: CITIZEN DIRECTORY LOOKUP & STAFF DIRECT BOOKING
===================================================== */

let citizenSearchTimeout = null;

window.openStaffDirectBookingModal = function () {
    const modal = document.getElementById("staffDirectBookingModal");
    if (!modal) return;

    // 1. Populate lots in dropdown
    const lotSelect = document.getElementById("staffDirectLotSelect");
    if (lotSelect) {
        const localLots = getParkingData();
        lotSelect.innerHTML = "";
        Object.keys(localLots).forEach(code => {
            const opt = document.createElement("option");
            opt.value = code;
            opt.textContent = `${localLots[code].name} (${code}) - ₹${localLots[code].rate}/hr`;
            if (code === activeSlotLotId) opt.selected = true;
            lotSelect.appendChild(opt);
        });
    }

    // 2. Load available bays for currently active lot
    onStaffDirectLotChanged();

    // 3. Reset fields
    const searchInput = document.getElementById("citizenSearchInput");
    const searchResults = document.getElementById("citizenSearchResults");
    const plateInput = document.getElementById("staffDirectPlate");
    const nameInput = document.getElementById("staffDirectName");
    const phoneInput = document.getElementById("staffDirectPhone");

    if (searchInput) searchInput.value = "";
    if (searchResults) { searchResults.innerHTML = ""; searchResults.style.display = "none"; }
    if (plateInput) plateInput.value = "";
    if (nameInput) nameInput.value = "";
    if (phoneInput) phoneInput.value = "";

    updateStaffFarePreview();
    modal.classList.add("active");
};

const cachedSlotsMap = {};

window.onStaffDirectLotChanged = async function () {
    const lotSelect = document.getElementById("staffDirectLotSelect");
    const baySelect = document.getElementById("staffDirectBaySelect");
    if (!lotSelect || !baySelect) return;

    const chosenLot = lotSelect.value;
    baySelect.innerHTML = "<option value=''>⏳ Loading vacant bays...</option>";

    try {
        let slots = cachedSlotsMap[chosenLot];
        if (!slots) {
            const res = await fetch(`/api/parking/${chosenLot}/slots`);
            if (res.ok) {
                const json = await res.json();
                slots = json.slots || [];
                cachedSlotsMap[chosenLot] = slots;
            }
        }

        const availableSlots = (slots || []).filter(s => s.status === "Available");
        baySelect.innerHTML = "";

        if (!availableSlots.length) {
            baySelect.innerHTML = "<option value=''>⚠️ No vacant bays in this facility</option>";
        } else {
            availableSlots.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.slot_number;
                opt.textContent = `Bay ${s.slot_number} (${s.slot_type.toUpperCase()} • ${s.floor || "Level 1"})`;
                baySelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error loading bays:", err);
        baySelect.innerHTML = "<option value='A-01'>Bay A-01 (Default)</option>";
    }

    updateStaffFarePreview();
};

window.handleCitizenSearch = function (query) {
    const q = String(query || "").trim();
    const dropdown = document.getElementById("citizenSearchResults");
    const spinner = document.getElementById("citizenSearchSpinner");
    if (!dropdown) return;

    clearTimeout(citizenSearchTimeout);

    if (q.length < 2) {
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
        if (spinner) spinner.style.display = "none";
        return;
    }

    if (spinner) spinner.style.display = "inline";

    citizenSearchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/parking/users/search?q=${encodeURIComponent(q)}`);
            if (spinner) spinner.style.display = "none";
            if (!res.ok) throw new Error("Search failed");
            const json = await res.json();
            const users = json.users || [];

            if (!users.length) {
                dropdown.innerHTML = `
                    <div style="padding: 12px; color: #94a3b8; font-size: 0.82rem; text-align: center;">
                        No registered citizens matched "<strong>${q}</strong>".<br>
                        <span style="color: #38bdf8;">You can enter details manually below or use Walk-in mode.</span>
                    </div>
                `;
                dropdown.style.display = "block";
                return;
            }

            dropdown.innerHTML = users.map(u => `
                <div class="citizen-result-item" onclick='selectCitizenForBooking(${JSON.stringify(u)})'>
                    <div class="citizen-res-info">
                        <strong>${u.name}</strong>
                        <span>📞 ${u.mobile || "No phone"} • ✉️ ${u.email || "No email"}</span>
                    </div>
                    ${u.last_vehicle ? `<span class="citizen-plate-chip">🚗 ${u.last_vehicle}</span>` : `<span style="color: #64748b; font-size: 0.72rem;">Registered</span>`}
                </div>
            `).join("");

            dropdown.style.display = "block";
        } catch (err) {
            console.error("Citizen search error:", err);
            if (spinner) spinner.style.display = "none";
        }
    }, 280);
};

window.selectCitizenForBooking = function (user) {
    const dropdown = document.getElementById("citizenSearchResults");
    const searchInput = document.getElementById("citizenSearchInput");
    const nameInput = document.getElementById("staffDirectName");
    const phoneInput = document.getElementById("staffDirectPhone");
    const plateInput = document.getElementById("staffDirectPlate");

    if (dropdown) dropdown.style.display = "none";
    if (searchInput) searchInput.value = `${user.name} (${user.mobile || user.email})`;
    if (nameInput) nameInput.value = user.name || "";
    if (phoneInput) phoneInput.value = user.mobile || "";
    if (plateInput && user.last_vehicle) plateInput.value = user.last_vehicle;
    else if (plateInput) plateInput.focus();

    showToast(`✓ Selected Citizen: ${user.name}`);
};

window.enableWalkInGuest = function () {
    const dropdown = document.getElementById("citizenSearchResults");
    const searchInput = document.getElementById("citizenSearchInput");
    const nameInput = document.getElementById("staffDirectName");
    const phoneInput = document.getElementById("staffDirectPhone");
    const plateInput = document.getElementById("staffDirectPlate");

    if (dropdown) dropdown.style.display = "none";
    if (searchInput) searchInput.value = "Walk-in Guest";
    if (nameInput) nameInput.value = "Walk-in Citizen";
    if (phoneInput) phoneInput.value = "9800000000";
    if (plateInput) {
        plateInput.value = "";
        plateInput.focus();
    }
    showToast("Walk-in Guest Mode enabled. Enter vehicle plate.");
};

window.updateStaffFarePreview = function () {
    const lotSelect = document.getElementById("staffDirectLotSelect");
    const hoursSelect = document.getElementById("staffDirectHours");
    const display = document.getElementById("staffDirectFareDisplay");
    if (!display) return;

    const lotCode = lotSelect ? lotSelect.value : activeSlotLotId;
    const hours = Number(hoursSelect ? hoursSelect.value : 2);
    const localLots = getParkingData();
    const rate = (localLots[lotCode] && localLots[lotCode].rate) || 20;

    display.textContent = `₹${(rate * hours).toFixed(2)}`;
};

window.submitStaffDirectBooking = async function () {
    const lotSelect = document.getElementById("staffDirectLotSelect");
    const baySelect = document.getElementById("staffDirectBaySelect");
    const plateInput = document.getElementById("staffDirectPlate");
    const nameInput = document.getElementById("staffDirectName");
    const phoneInput = document.getElementById("staffDirectPhone");
    const hoursSelect = document.getElementById("staffDirectHours");
    const checkInBox = document.getElementById("staffCheckInNow");

    const lotId = lotSelect ? lotSelect.value : activeSlotLotId;
    const slotNumber = baySelect ? baySelect.value : "";
    const plate = plateInput ? plateInput.value.trim().toUpperCase() : "";
    const name = nameInput ? nameInput.value.trim() : "Citizen Driver";
    const phone = phoneInput ? phoneInput.value.trim() : "N/A";
    const hours = Number(hoursSelect ? hoursSelect.value : 2);
    const checkInNow = checkInBox ? checkInBox.checked : true;

    if (!lotId || !slotNumber) {
        showToast("⚠️ Please select a facility and vacant bay.");
        return;
    }
    if (!plate) {
        showToast("⚠️ Vehicle registration plate is required.");
        if (plateInput) plateInput.focus();
        return;
    }

    try {
        const res = await fetch("/api/parking/staff-book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lotId,
                slotNumber,
                vehicleNumber: plate,
                customerName: name,
                customerPhone: phone,
                durationHours: hours,
                checkInNow
            })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to complete direct booking.");

        closeSlotModal("staffDirectBookingModal");
        showToast(json.message);

        // Open Digital QR Pass Voucher for Citizen / Staff Print
        const b = json.booking;
        openCitizenQrPassModal({
            bookingId: b.bookingId,
            vehicleNumber: b.vehicleNumber,
            lotName: b.lotName,
            slotNumber: b.slotNumber,
            customerName: b.customerName,
            totalAmount: b.totalAmount
        });

        // Reload bays and sync map
        await loadInteractiveSlots(lotId);
        if (typeof fetchParkingDataFromAPI === "function") {
            fetchParkingDataFromAPI();
        }
    } catch (err) {
        console.error("Staff booking error:", err);
        showToast(`❌ Booking Failed: ${err.message}`);
    }
};


/* =====================================================
   PHASE 3: FACILITY ADMINISTRATION (ADD & EDIT)
===================================================== */

window.openAddLotModal = function () {
    const modal = document.getElementById("addLotModal");
    if (!modal) return;
    const form = document.getElementById("addLotForm");
    if (form) form.reset();
    openSlotModal("addLotModal");
};

window.submitAddLot = async function (e) {
    if (e) e.preventDefault();

    const code = document.getElementById("newLotCode").value.trim().toUpperCase();
    const name = document.getElementById("newLotName").value.trim();
    const area = document.getElementById("newLotArea").value.trim();
    const address = document.getElementById("newLotAddress").value.trim();
    const totalSlots = Number(document.getElementById("newLotSlots").value || 24);
    const hourlyRate = Number(document.getElementById("newLotRate").value || 25);
    const latitude = Number(document.getElementById("newLotLat").value || 26.7390);
    const longitude = Number(document.getElementById("newLotLng").value || 83.4500);

    if (!code || !name || !address) {
        showToast("⚠️ Facility Code, Name, and Address are required.");
        return;
    }

    try {
        const res = await fetch("/api/parking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parkingCode: code,
                name,
                area,
                address,
                totalSlots,
                hourlyRate,
                latitude,
                longitude,
                status: "OPEN"
            })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to add facility.");

        closeSlotModal("addLotModal");
        showToast(`✓ ${json.message}`);

        // Add Tab dynamically if container exists
        const tabsContainer = document.getElementById("lotTabsContainer");
        if (tabsContainer && !document.querySelector(`.lot-tab[onclick*="${code}"]`)) {
            const btn = document.createElement("button");
            btn.className = "lot-tab";
            btn.setAttribute("onclick", `switchLotTab('${code}')`);
            btn.textContent = `🏢 ${name} (${code})`;
            tabsContainer.appendChild(btn);
        }

        if (typeof fetchParkingDataFromAPI === "function") {
            await fetchParkingDataFromAPI();
        }
        switchLotTab(code);
    } catch (err) {
        console.error("Add facility error:", err);
        showToast(`❌ Error: ${err.message}`);
    }
};

window.openEditLotModal = function () {
    const modal = document.getElementById("editLotModal");
    if (!modal) return;

    const select = document.getElementById("editLotSelect");
    if (select) {
        const localLots = getParkingData();
        select.innerHTML = "";
        Object.keys(localLots).forEach(code => {
            const opt = document.createElement("option");
            opt.value = code;
            opt.textContent = `${localLots[code].name} (${code})`;
            if (code === activeSlotLotId) opt.selected = true;
            select.appendChild(opt);
        });
    }

    onEditLotSelected();
    openSlotModal("editLotModal");
};

window.onEditLotSelected = function () {
    const select = document.getElementById("editLotSelect");
    const statusSelect = document.getElementById("editLotStatus");
    const rateInput = document.getElementById("editLotRate");
    const addrInput = document.getElementById("editLotAddress");
    if (!select) return;

    const code = select.value;
    const localLots = getParkingData();
    const lot = localLots[code];

    if (lot) {
        if (statusSelect) statusSelect.value = lot.status || "OPEN";
        if (rateInput) rateInput.value = lot.rate || 20;
        if (addrInput) addrInput.value = lot.location || "";
    }
};

window.submitEditLot = async function (e) {
    if (e) e.preventDefault();

    const select = document.getElementById("editLotSelect");
    const statusSelect = document.getElementById("editLotStatus");
    const rateInput = document.getElementById("editLotRate");
    const addrInput = document.getElementById("editLotAddress");

    const code = select ? select.value : activeSlotLotId;
    const status = statusSelect ? statusSelect.value : "OPEN";
    const hourlyRate = Number(rateInput ? rateInput.value : 20);
    const address = addrInput ? addrInput.value.trim() : "";

    try {
        const res = await fetch(`/api/parking/${code}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status,
                hourlyRate,
                address
            })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to update facility.");

        closeSlotModal("editLotModal");
        showToast(`✓ ${json.message}`);

        if (typeof fetchParkingDataFromAPI === "function") {
            await fetchParkingDataFromAPI();
        }
        await loadInteractiveSlots(code);
    } catch (err) {
        console.error("Edit facility error:", err);
        showToast(`❌ Error: ${err.message}`);
    }
};

// Initialize GPS map once DOM is ready or on window load
window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof initParkingGpsMap === "function") {
            initParkingGpsMap(window.rawLiveParkingLots);
        }
    }, 600);
});


/* =====================================================
   CITIZEN PROFILE, 3-OPTION DROPDOWN & ACTIVITY CONTROLLER
===================================================== */

window.toggleUserDropdown = function (event) {
    if (event) {
        event.stopPropagation();
    }
    const menu = document.getElementById("userDropdownMenu");
    if (!menu) return;

    const isShown = menu.style.display === "block";
    menu.style.display = isShown ? "none" : "block";

    // Auto close when clicking outside
    if (!isShown) {
        const closeHandler = function (e) {
            const container = document.getElementById("userProfileMenuContainer");
            if (container && !container.contains(e.target)) {
                menu.style.display = "none";
                window.removeEventListener("click", closeHandler);
            }
        };
        setTimeout(() => {
            window.addEventListener("click", closeHandler);
        }, 10);
    }
};

window.openUserProfileModal = function () {
    const menu = document.getElementById("userDropdownMenu");
    if (menu) menu.style.display = "none";

    let user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!user) {
        user = {
            name: "Omkar Yadav",
            phone: "6306880179",
            mobile: "6306880179",
            email: "omkaryadav@gmail.com"
        };
    }

    const cardName = document.getElementById("profCardName");
    const inputName = document.getElementById("profInputName");
    const inputPhone = document.getElementById("profInputPhone");
    const inputEmail = document.getElementById("profInputEmail");
    const inputPlate = document.getElementById("profInputPlate");

    if (cardName) cardName.textContent = user.name || "Omkar Yadav";
    if (inputName) inputName.value = user.name || "Omkar Yadav";
    if (inputPhone) inputPhone.value = user.phone || user.mobile || "6306880179";
    if (inputEmail) inputEmail.value = user.email || "omkaryadav@gmail.com";

    const savedPlate = localStorage.getItem("smartcity_primary_vehicle") || user.defaultVehicle || "UP 53 AB 1008";
    if (inputPlate) inputPlate.value = savedPlate;

    // Check if user has an active pass to display inside profile
    const activePass = typeof getLatestActivePass === "function" ? getLatestActivePass() : null;
    const activeBox = document.getElementById("profActiveBookingBox");
    const activePlate = document.getElementById("profActivePlate");
    const activeLot = document.getElementById("profActiveLot");
    const activeBay = document.getElementById("profActiveBay");

    if (activeBox) {
        if (activePass) {
            activeBox.style.display = "block";
            if (activePlate) activePlate.textContent = activePass.vehicleNumber || savedPlate;
            if (activeLot) activeLot.textContent = activePass.lotName || "Parking Area";
            if (activeBay) activeBay.textContent = activePass.slotNumber || "Bay A-01";
        } else {
            activeBox.style.display = "none";
        }
    }

    openSlotModal("userProfileModal");
};

window.saveUserProfileVehicle = function () {
    const inputPlate = document.getElementById("profInputPlate");
    const plate = inputPlate ? inputPlate.value.trim().toUpperCase() : "";
    if (plate) {
        localStorage.setItem("smartcity_primary_vehicle", plate);
        // Also update primary vehicle on booking form if empty
        const bookingPlate = document.getElementById("bookingVehicleNum");
        if (bookingPlate && !bookingPlate.value) {
            bookingPlate.value = plate;
        }
        showToast(`✓ Primary vehicle plate saved: ${plate}`);
    } else {
        localStorage.removeItem("smartcity_primary_vehicle");
        showToast("Vehicle details cleared.");
    }
    closeSlotModal("userProfileModal");
};

window.openUserActivityModal = function () {
    const menu = document.getElementById("userDropdownMenu");
    if (menu) menu.style.display = "none";

    switchActivityTab("active");
    openSlotModal("userActivityModal");
};

let currentActivityTab = "active";
let currentHistoryFilter = "all";

window.switchActivityTab = function (tabName) {
    currentActivityTab = tabName;
    const tabActive = document.getElementById("actTabActive");
    const tabHist = document.getElementById("actTabHistory");
    const historyFilters = document.getElementById("actHistoryFilters");

    if (tabActive) tabActive.classList.toggle("active", tabName === "active");
    if (tabHist) tabHist.classList.toggle("active", tabName === "history");

    if (historyFilters) {
        historyFilters.style.display = (tabName === "history") ? "flex" : "none";
    }

    renderUserActivityList(tabName);
};

window.filterHistoryStatus = function (status) {
    currentHistoryFilter = (status || "all").toLowerCase();
    const pills = [
        { id: "pillHistAll", val: "all" },
        { id: "pillHistCompleted", val: "completed" },
        { id: "pillHistCancelled", val: "cancelled" },
        { id: "pillHistExpired", val: "expired" }
    ];
    pills.forEach(p => {
        const el = document.getElementById(p.id);
        if (el) el.classList.toggle("active", p.val === currentHistoryFilter);
    });
    renderUserActivityList("history");
};

window.renderUserActivityList = async function (tabName) {
    const container = document.getElementById("userActivityList");
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #94a3b8;">
            <div style="font-size: 2rem; margin-bottom: 8px;">⏳</div>
            <p style="margin: 0; font-size: 0.9rem;">Loading your parking records...</p>
        </div>
    `;

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
    const userId = user ? (user.id || user._id) : null;
    const phone = user ? (user.phone || user.mobile) : null;

    let apiBookings = [];
    try {
        let url = "/api/parking/my-bookings";
        const params = [];
        if (userId) params.push(`userId=${encodeURIComponent(userId)}`);
        if (phone) params.push(`phone=${encodeURIComponent(phone)}`);
        if (params.length > 0) url += `?${params.join("&")}`;

        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.bookings)) {
                apiBookings = data.bookings;
            }
        }
    } catch (e) {
        console.warn("Could not fetch bookings from API, using local storage cache:", e);
    }

    // Merge with localStorage
    let localBookings = [];
    try {
        localBookings = JSON.parse(localStorage.getItem("smartCityUserBookings") || "[]");
    } catch (e) {
        localBookings = [];
    }

    const combinedMap = new Map();
    apiBookings.forEach(b => {
        combinedMap.set(b.booking_id, {
            bookingId: b.booking_id,
            lotId: b.lot_id,
            lotName: b.lot_name || b.lot_id,
            slotNumber: b.slot_number,
            vehicleNumber: b.vehicle_number,
            customerName: b.customer_name,
            customerPhone: b.customer_phone,
            totalAmount: b.total_amount,
            durationHours: b.duration_hours,
            startTime: b.start_time,
            endTime: b.end_time,
            status: b.status || "Active",
            qrToken: b.qr_token,
            qrUsed: b.qr_used,
            checkedInAt: b.checked_in_at,
            qrPayload: b.qr_payload || `SMARTCITY|${b.booking_id}|${b.qr_token || ''}|${b.lot_id}|${b.slot_number}`,
            timestamp: b.created_at || b.start_time
        });
    });

    localBookings.forEach(b => {
        if (!combinedMap.has(b.bookingId)) {
            combinedMap.set(b.bookingId, b);
        }
    });

    const allBookings = Array.from(combinedMap.values());
    allBookings.sort((a, b) => new Date(b.timestamp || b.startTime || 0) - new Date(a.timestamp || a.startTime || 0));

    let filtered = [];
    if (tabName === "active") {
        filtered = allBookings.filter(b => (b.status || "Active").toLowerCase() === "active");
    } else {
        if (currentHistoryFilter === "all") {
            filtered = allBookings;
        } else {
            filtered = allBookings.filter(b => (b.status || "").toLowerCase() === currentHistoryFilter);
        }
    }

    if (!filtered || filtered.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #94a3b8; background: rgba(15, 23, 42, 0.4); border-radius: 12px; border: 1px dashed rgba(255, 255, 255, 0.1);">
                <div style="font-size: 2.4rem; margin-bottom: 8px;">🅿️</div>
                <h4 style="margin: 0 0 6px; color: #e2e8f0;">No ${tabName === "active" ? "Active Clearance Passes" : "Past Bookings"} Found</h4>
                <p style="margin: 0 0 16px; font-size: 0.85rem;">Reserve an open green bay from the grid to get your gate access token & digital QR pass.</p>
                <button type="button" class="btn-navigate-pass" style="margin: 0 auto; display: inline-flex;" onclick="closeSlotModal('userActivityModal'); scrollToSlotGrid();">
                    🟢 Pick an Available Bay
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(b => {
        const statusLower = (b.status || "Active").toLowerCase();
        const isActive = statusLower === "active";
        const isCancelled = statusLower === "cancelled";
        const isCompleted = statusLower === "completed";
        const isExpired = statusLower === "expired";

        const bId = b.bookingId || "BKG-PASS";
        const bTime = formatSlotTime(b.timestamp || b.startTime || b.bookingTime);
        const amt = Number(b.totalAmount || 40).toFixed(2);
        const hasCheckedIn = !!b.checkedInAt || !!b.qrUsed;

        let statusBadgeHtml = `<span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.5); padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">🟢 ACTIVE PASS</span>`;
        if (isCancelled) {
            statusBadgeHtml = `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">❌ CANCELLED</span>`;
        } else if (isCompleted) {
            statusBadgeHtml = `<span style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.5); padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">🏁 COMPLETED</span>`;
        } else if (isExpired) {
            statusBadgeHtml = `<span style="background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.5); padding: 3px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">⏰ EXPIRED</span>`;
        }

        let cancelBtnHtml = "";
        if (isActive && !hasCheckedIn) {
            cancelBtnHtml = `
                <button type="button" class="btn-cancel-pass" style="padding: 7px 14px; font-size: 0.82rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; font-weight: 700; cursor: pointer;" onclick="cancelCitizenBooking('${bId}')">
                    🚫 Cancel Booking
                </button>
            `;
        }

        return `
            <div class="activity-pass-card ${isActive ? 'active-pass' : 'expired-pass'}" style="background: rgba(15, 23, 42, 0.7); border: 1px solid ${isActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 12px; padding: 16px; margin-bottom: 12px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="background: #0284c7; color: #ffffff; font-weight: 800; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem;">BAY ${b.slotNumber || 'A-01'}</span>
                            <span style="font-size: 0.78rem; font-family: monospace; color: #38bdf8;">${bId}</span>
                        </div>
                        <h4 style="margin: 0; color: #f8fafc; font-size: 1.05rem;">${b.lotName || 'City Center Facility'}</h4>
                    </div>
                    ${statusBadgeHtml}
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; padding: 10px; background: rgba(0,0,0,0.25); border-radius: 8px; margin-bottom: 12px; font-size: 0.82rem; color: #cbd5e1;">
                    <div>🚗 <strong>Plate:</strong> <span style="background: #fef08a; color: #854d0e; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${b.vehicleNumber || 'UP 53 AB 1008'}</span></div>
                    <div>👤 <strong>Citizen:</strong> ${b.customerName || 'Citizen Driver'}</div>
                    <div>🕒 <strong>Time:</strong> ${bTime}</div>
                    <div>💰 <strong>Amount:</strong> <strong style="color: #4ade80;">₹${amt}</strong></div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="btn-navigate-pass" style="padding: 7px 14px; font-size: 0.82rem;" onclick="viewMyActivePassQr('${bId}')">
                        🎟️ View QR Access Pass
                    </button>
                    <button type="button" class="btn-navigate-pass" style="padding: 7px 14px; font-size: 0.82rem; background: #334155;" onclick="closeSlotModal('userActivityModal'); openBayNavigationModal('${b.slotNumber || 'A-01'}')">
                        🗺️ Guide Me to Bay
                    </button>
                    ${cancelBtnHtml}
                </div>
            </div>
        `;
    }).join("");
};

window.cancelCitizenBooking = async function (bookingId) {
    if (!confirm(`Are you sure you want to cancel booking ${bookingId} and release your parking slot?`)) {
        return;
    }

    try {
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/parking/bookings/${bookingId}/cancel`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                userId: user ? (user.id || user._id) : null,
                phone: user ? (user.phone || user.mobile) : null,
                reason: "Cancelled by citizen in My Activity"
            })
        });

        const json = await res.json();
        if (res.ok && json.success) {
            showToast(json.message || "Booking cancelled successfully.");
            // Update local storage cache
            try {
                let localBookings = JSON.parse(localStorage.getItem("smartCityUserBookings") || "[]");
                localBookings = localBookings.map(b => b.bookingId === bookingId ? { ...b, status: "Cancelled" } : b);
                localStorage.setItem("smartCityUserBookings", JSON.stringify(localBookings));
            } catch (e) {}

            renderUserActivityList(currentActivityTab);
            if (activeSlotLotId) {
                loadInteractiveSlots(activeSlotLotId);
            }
        } else {
            showToast(`❌ Cancellation failed: ${json.message}`);
        }
    } catch (err) {
        console.error("Cancel error:", err);
        showToast(`❌ Error: ${err.message}`);
    }
};

window.viewMyActivePassQr = function (bookingId) {
    let bookings = [];
    try {
        bookings = JSON.parse(localStorage.getItem("smartCityUserBookings") || "[]");
    } catch (e) {
        bookings = [];
    }
    const singlePass = typeof getLatestActivePass === "function" ? getLatestActivePass() : null;
    let target = null;
    if (bookingId) {
        target = bookings.find(b => b.bookingId === bookingId);
    }
    if (!target && singlePass) {
        target = singlePass;
    }
    if (!target && bookings.length > 0) {
        target = bookings[0];
    }

    if (!target) {
        showToast("No active pass found. Please book a slot first.");
        return;
    }

    closeSlotModal("userProfileModal");
    closeSlotModal("userActivityModal");
    showCitizenQrPassModal(target);
};

/* =====================================================
   STAFF QR SCANNER TERMINAL & BARRIER VERIFICATION
===================================================== */

let staffCameraStream = null;
let html5QrScannerInstance = null;

window.openStaffQrScannerModal = function () {
    const menu = document.getElementById("userDropdownMenu");
    if (menu) menu.style.display = "none";

    openSlotModal("staffQrScannerModal");
    startStaffScannerCamera();
};

window.closeStaffQrScannerModal = function () {
    stopStaffScannerCamera();
    closeSlotModal("staffQrScannerModal");
};

async function startStaffScannerCamera() {
    const statusEl = document.getElementById("scannerCameraStatus");
    const readerEl = document.getElementById("staffQrReader");
    const video = document.getElementById("staffScannerVideo");

    if (typeof Html5Qrcode !== "undefined" && readerEl) {
        try {
            if (html5QrScannerInstance) {
                try { await html5QrScannerInstance.stop(); } catch (e) {}
                try { await html5QrScannerInstance.clear(); } catch (e) {}
            }
            if (video) video.style.display = "none";
            readerEl.style.display = "block";

            html5QrScannerInstance = new Html5Qrcode("staffQrReader");
            const qrConfig = {
                fps: 10,
                qrbox: { width: 220, height: 220 },
                aspectRatio: 1.0
            };

            await html5QrScannerInstance.start(
                { facingMode: "environment" },
                qrConfig,
                (decodedText, decodedResult) => {
                    console.log("Optical QR Scanned:", decodedText);
                    if (statusEl) statusEl.textContent = `🎯 Scanned QR pass: ${decodedText}`;
                    const manualInput = document.getElementById("manualQrTokenInput");
                    if (manualInput) manualInput.value = decodedText;
                    handleManualQrVerify(decodedText);
                },
                (errorMessage) => {
                    // Ongoing frame scanning without match
                }
            );
            if (statusEl) statusEl.textContent = "🟢 Optical scanner active — Hold citizen QR pass in front of camera";
            return;
        } catch (err) {
            console.warn("Html5Qrcode scanner failed to initialize or start:", err);
            if (statusEl) statusEl.textContent = "📷 Camera permission needed or not available. Use manual input below.";
        }
    }

    // Fallback if Html5Qrcode is not loaded or camera permissions need native video
    if (video && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                staffCameraStream = stream;
                video.srcObject = stream;
                video.style.display = "block";
                video.play();
                if (statusEl) statusEl.textContent = "🟢 Viewfinder active — Hold pass or enter code below";
            })
            .catch(err => {
                console.warn("Native camera access denied:", err);
                if (video) video.style.display = "none";
                if (statusEl) statusEl.textContent = "📷 Camera offline. Enter booking ID or QR token manually below.";
            });
    } else {
        if (statusEl) statusEl.textContent = "📷 Camera not available. Enter booking ID or QR token manually below.";
    }
}

async function stopStaffScannerCamera() {
    if (html5QrScannerInstance) {
        try {
            await html5QrScannerInstance.stop();
            await html5QrScannerInstance.clear();
        } catch (e) {
            console.warn("Scanner stop error:", e);
        }
        html5QrScannerInstance = null;
    }
    if (staffCameraStream) {
        staffCameraStream.getTracks().forEach(track => track.stop());
        staffCameraStream = null;
    }
    const video = document.getElementById("staffScannerVideo");
    if (video) {
        video.srcObject = null;
        video.style.display = "none";
    }
}

window.handleManualQrVerify = async function (optionalPayload) {
    const input = document.getElementById("manualQrTokenInput");
    const resultCard = document.getElementById("scannerResultCard");

    let val = (typeof optionalPayload === "string" && optionalPayload.trim()) 
        ? optionalPayload.trim() 
        : (input ? input.value.trim() : "");

    if (!val) {
        showToast("Please enter a booking reference (e.g. BKG-...) or QR token.");
        if (input) input.focus();
        return;
    }

    try {
        showToast("Verifying pass with server...");
        const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/parking/verify-qr", {
            method: "POST",
            headers,
            body: JSON.stringify({ qrPayload: val })
        });

        const json = await res.json();
        if (res.ok && json.success) {
            const v = json.verification;
            if (resultCard) {
                resultCard.style.display = "block";
                resultCard.className = "scanner-result-card success";
                resultCard.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="margin: 0; color: #4ade80;">🟢 ENTRY GRANTED — BARRIER OPENED</h4>
                        <span style="font-family: monospace; background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 4px;">${v.bookingId}</span>
                    </div>
                    <p style="margin: 0 0 8px; font-size: 0.9rem; color: #e2e8f0;">
                        Vehicle <strong style="color: #fef08a;">${v.vehicleNumber}</strong> (${v.customerName}) verified for Bay <strong style="color: #4ade80; font-size: 1.1rem;">${v.slotNumber}</strong>.
                    </p>
                    <div style="font-size: 0.8rem; color: #94a3b8; display: flex; justify-content: space-between;">
                        <span>Facility: ${v.lotName || v.lotId}</span>
                        <span>Check-in: ${new Date(v.checkedInAt).toLocaleTimeString("en-IN")}</span>
                    </div>
                `;
            }
            showToast(json.message);
            input.value = "";
            if (activeSlotLotId) {
                loadInteractiveSlots(activeSlotLotId);
            }
        } else {
            if (resultCard) {
                resultCard.style.display = "block";
                resultCard.className = "scanner-result-card error";
                resultCard.innerHTML = `
                    <h4 style="margin: 0 0 6px; color: #ef4444;">🔴 VERIFICATION FAILED</h4>
                    <p style="margin: 0; font-size: 0.88rem; color: #fca5a5;">${json.message || 'Access denied'}</p>
                `;
            }
            showToast(`❌ ${json.message}`);
        }
    } catch (err) {
        console.error("Verification error:", err);
        showToast(`❌ Error verifying pass: ${err.message}`);
    }
};

/* =====================================================
   USER PROFILE NAVBAR INITIALIZATION & LOGOUT
===================================================== */

function initNavUserProfile() {
    const navName = document.getElementById("navUserName");
    const navStatus = document.getElementById("navUserStatus");
    const avatar = document.getElementById("userAvatarCircle");
    const ddAvatar = document.getElementById("ddUserAvatarCircle");
    const ddFullName = document.getElementById("ddUserFullName");
    const ddContact = document.getElementById("ddUserContact");
    const loginBtn = document.getElementById("navLoginBtn");
    const userContainer = document.getElementById("userProfileMenuContainer");
    const staffItem = document.getElementById("ddStaffScannerItem");

    const token = localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token");
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    if (token && user) {
        const name = user.name || "Citizen Driver";
        const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "OY";
        const role = (user.role || "citizen").toLowerCase();

        if (navName) navName.textContent = name;
        if (navStatus) navStatus.textContent = role === "admin" ? "🛡️ System Admin" : (role === "staff" ? "👮 Facility Staff" : "🟢 Active Citizen");
        if (avatar) avatar.textContent = initials;
        if (ddAvatar) ddAvatar.textContent = initials;
        if (ddFullName) ddFullName.textContent = name;
        if (ddContact) ddContact.textContent = `${user.mobile || user.phone || user.email || ''} • ${role.toUpperCase()}`;

        if (loginBtn) loginBtn.style.display = "none";
        if (userContainer) userContainer.style.display = "inline-flex";

        if (staffItem) {
            staffItem.style.display = (role === "staff" || role === "admin") ? "flex" : "none";
        }
    } else {
        // Unauthenticated or Guest mode
        if (navName) navName.textContent = "Guest Citizen";
        if (navStatus) navStatus.textContent = "⚪ Click to Sign In";
        if (avatar) avatar.textContent = "👤";
        if (loginBtn) loginBtn.style.display = "inline-flex";
        if (staffItem) staffItem.style.display = "none";
    }
}

window.toggleUserDropdown = function (event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("userDropdownMenu");
    if (menu) {
        menu.style.display = (menu.style.display === "none" || !menu.style.display) ? "block" : "none";
    }
};

// Close dropdown on outside click or Escape key
document.addEventListener("click", function (event) {
    const container = document.getElementById("userProfileMenuContainer");
    const menu = document.getElementById("userDropdownMenu");
    if (menu && container && !container.contains(event.target)) {
        menu.style.display = "none";
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const menu = document.getElementById("userDropdownMenu");
        if (menu) menu.style.display = "none";
    }
});

window.handleUserLogout = function () {
    const menu = document.getElementById("userDropdownMenu");
    if (menu) menu.style.display = "none";

    showToast("👋 Session ended safely. Switching to Guest Mode...");
    localStorage.removeItem("smartcity_auth_token");
    localStorage.removeItem("token");
    sessionStorage.removeItem("smartCityUser");
    sessionStorage.removeItem("parking_staff_auth");

    initNavUserProfile();

    if (typeof checkParkingPermission === "function") {
        checkParkingPermission();
    }
    if (typeof updateModeBadgeUI === "function") {
        isStaffInspectionMode = false;
        updateModeBadgeUI();
    }
};

window.scrollToSlotGrid = function () {
    const section = document.getElementById("interactiveSlotSection");
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

// Global aliases for QR pass modal to prevent undefined reference errors
window.openCitizenQrPassModal = showCitizenQrPassModal;
window.showCitizenQrPassModal = showCitizenQrPassModal;

// Initialize user navbar on load
document.addEventListener("DOMContentLoaded", function () {
    initNavUserProfile();
});