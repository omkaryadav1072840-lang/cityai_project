const fs = require('fs');
const path = require('path');

async function testPrescriptionFlow() {
    console.log('Testing Prescription Upload & Fetch API...');
    const testFilePath = path.join(__dirname, 'test_prescription_sample.txt');
    fs.writeFileSync(testFilePath, 'Dr. Alok Nath Tripathi - AIIMS Gorakhpur\nRx: Tab Sorbitrate 5mg SOS\nPatient: SC-2026-318028');

    const form = new FormData();
    form.append('patientId', 'SC-2026-318028');
    form.append('doctorName', 'Dr. Alok Nath Tripathi (AIIMS)');
    const fileBlob = new Blob(['Dr. Alok Nath Tripathi - AIIMS Gorakhpur\nRx: Tab Sorbitrate 5mg SOS\nPatient: SC-2026-318028'], { type: 'application/pdf' });
    form.append('prescriptionFile', fileBlob, 'test_prescription_sample.pdf');

    try {
        const uploadRes = await fetch('http://localhost:5000/api/prescriptions/upload', {
            method: 'POST',
            body: form
        });

        const uploadData = await uploadRes.json();
        console.log('Upload Response Status:', uploadRes.status);
        console.log('Upload Response Body:', uploadData);

        if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
        }

        const newRxId = uploadData.prescription?.id;
        console.log('Uploaded Prescription ID:', newRxId);

        // Fetch prescriptions for this patient
        const fetchRes = await fetch('http://localhost:5000/api/prescriptions/SC-2026-318028');
        const fetchData = await fetchRes.json();
        console.log('Fetch Response Status:', fetchRes.status);
        console.log('Total Prescriptions for SC-2026-318028:', fetchData.prescriptions?.length);

        // Cleanup test record and file
        if (newRxId) {
            const db = require('../backend/config/db');
            await new Promise((resolve, reject) => {
                db.query('DELETE FROM prescriptions WHERE id = ?', [newRxId], (err, res) => {
                    if (err) reject(err);
                    else {
                        console.log('Cleaned up test prescription record #', newRxId);
                        resolve(res);
                    }
                });
            });
        }

        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        console.log('✅ Prescription Flow Test Passed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Prescription test error:', err);
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        process.exit(1);
    }
}

testPrescriptionFlow();
