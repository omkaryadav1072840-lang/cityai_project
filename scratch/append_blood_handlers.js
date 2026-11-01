const fs = require('fs');

const path = 'frontend/pages/hospital/hospital.js';
let content = fs.readFileSync(path, 'utf8');

const addition = `

// ====================================================================
// BLOOD BANK & VOLUNTARY DONOR ROUTING HANDLERS
// ====================================================================
function openBloodBankPage() {
    window.location.href = "blood_bank.html";
}

function openDonorRegistrationModal() {
    window.location.href = "blood_bank.html#donor-register";
}

window.openBloodBankPage = openBloodBankPage;
window.openDonorRegistrationModal = openDonorRegistrationModal;
`;

if (!content.includes('openBloodBankPage')) {
    content += addition;
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added openBloodBankPage and openDonorRegistrationModal to hospital.js");
} else {
    console.log("Already added.");
}

