const fs = require('fs');

const path = 'frontend/pages/hospital/hospital.html';
let content = fs.readFileSync(path, 'utf8');

const target = `            <!-- 12. UPLOAD PRESCRIPTION -->
            <div class="service-card" data-service-cat="pharmacy" onclick="openPrescriptionUpload()">
                <div class="service-card-header">
                    <div class="service-icon-wrap orange-icon">
                        📄
                    </div>
                    <span class="service-status-chip chip-orange">AI Rx Scan</span>
                </div>
                <div class="service-card-body">
                    <h3>Upload Prescription</h3>
                    <p>
                        Upload doctor's prescription slip for automated medicine extraction, dosage reminders, and pharmacist fulfillment.
                    </p>
                </div>
                <div class="service-card-footer">
                    <button type="button" class="service-action-btn" onclick="event.stopPropagation(); openPrescriptionUpload()">
                        <span>Upload Slip</span>
                        <span class="btn-arrow">→</span>
                    </button>
                </div>
            </div>`;

const replacement = `            <!-- 12. BLOOD BANK & DONATION -->
            <div class="service-card blood-bank-card" data-service-cat="emergency" onclick="openBloodBankPage()" tabindex="0" role="region" aria-label="Blood Bank and Voluntary Donation Services">
                <div class="service-card-header">
                    <div class="service-icon-wrap red-icon" aria-hidden="true">
                        🩸
                    </div>
                    <span class="service-status-chip chip-red">BLOOD BANK</span>
                </div>
                <div class="service-card-body">
                    <h3>Blood Bank &amp; Donation</h3>
                    <p>
                        Find available blood, request blood during emergencies, and register as a voluntary donor.
                    </p>
                </div>
                <div class="service-card-footer">
                    <div class="dual-action-row">
                        <button type="button" class="service-action-btn" style="padding: 10px 10px; font-size: 12px;" onclick="event.stopPropagation(); openBloodBankPage()" aria-label="Find Available Blood">
                            <span>Find Blood</span>
                            <span class="btn-arrow">→</span>
                        </button>
                        <button type="button" class="service-sub-btn" style="border-color: rgba(220, 38, 38, 0.3); color: #dc2626;" onclick="event.stopPropagation(); openDonorRegistrationModal()" aria-label="Register as Voluntary Blood Donor">
                            <span>❤️ Become a Donor</span>
                        </button>
                    </div>
                </div>
            </div>`;

const crlfTarget = target.replace(/\r?\n/g, '\r\n');
const crlfReplacement = replacement.replace(/\r?\n/g, '\r\n');

if (content.includes(crlfTarget)) {
    content = content.replace(crlfTarget, crlfReplacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced Upload Prescription card with Blood Bank card!");
} else {
    console.error("Could not find target card in hospital.html!");
    process.exit(1);
}

