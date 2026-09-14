const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        }).on('error', reject);
    });
}

async function verifyBookingInDoctorPortal() {
    console.log('🩺 Verifying doctor appointment queue retrieval for Dr. Amit Kumar...');

    // Test with string doctor_id "DOC003"
    const resString = await get('http://localhost:5000/api/doctor/DOC003/appointments');
    console.log(`By string ID "DOC003": Status ${resString.status}, Appointments count: ${resString.data.count}`);
    
    // Test with numeric ID "3"
    const resNum = await get('http://localhost:5000/api/doctor/3/appointments');
    console.log(`By numeric ID "3": Status ${resNum.status}, Appointments count: ${resNum.data.count}`);

    const latest = resString.data.appointments[0];
    console.log('\nLatest appointment details:');
    console.log(`   ID: ${latest.id}`);
    console.log(`   Patient Name: "${latest.patient_name}"`);
    console.log(`   Patient ID: "${latest.patient_id}"`);
    console.log(`   Doctor Name: "${latest.doctor_name}"`);
    console.log(`   Time: "${latest.appointment_time}"`);
    console.log(`   Date: "${latest.appointment_date}"`);
    console.log(`   Status: "${latest.status}"`);

    if (resString.data.count >= 2 && resNum.data.count >= 2) {
        console.log('\n✅ VERIFIED: Both string DOC003 and numeric 3 correctly return the booked appointments!');
    } else {
        throw new Error('Appointment retrieval count mismatch');
    }
}

verifyBookingInDoctorPortal().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
