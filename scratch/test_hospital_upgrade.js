const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING HOSPITAL UPGRADE INTEGRATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Unified Staff Login - Hospital Admin
    console.log('--- 1. Staff Login Tests ---');
    const adminLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/staff-login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { staffId: 'STAFF-HOSP-ADMIN', password: 'admin123' });

    assert(adminLogin.status === 200 && adminLogin.body.token, 'Hospital Admin logged in successfully with JWT token');
    assert(adminLogin.body.user && adminLogin.body.user.hospitalId === 'HOSP-001', 'Admin hospitalId is HOSP-001');
    assert(adminLogin.body.user && adminLogin.body.user.hospitalRole === 'hospital_admin', 'Admin hospitalRole is hospital_admin');
    const adminToken = adminLogin.body.token;

    // 2. Unified Doctor Login via staff-login fallback
    const docLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/staff-login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { staffId: 'DOC-101', password: 'doctor123' });

    assert(docLogin.status === 200 && docLogin.body.token, 'Doctor DOC-101 logged in via unified login');
    assert(docLogin.body.user && docLogin.body.user.role === 'doctor' && docLogin.body.user.hospitalId === 'HOSP-001', 'Doctor role and hospital verified');
    const docToken = docLogin.body.token;

    // 3. Hospital B Staff Login (Receptionist for BRD Medical College)
    const hospBLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/staff-login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { staffId: 'STAFF-BRD-REC', password: 'staff123' });

    assert(hospBLogin.status === 200 && hospBLogin.body.user.hospitalId === 'HOSP-002', 'BRD Staff logged in with HOSP-002');
    const brdToken = hospBLogin.body.token;

    // 4. Multi-Hospital Isolation Test
    console.log('\n--- 2. Multi-Hospital RBAC Isolation ---');
    const crossAccess = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hospitals/HOSP-001/dashboard',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${brdToken}`
      }
    });
    assert(crossAccess.status === 403, `Hospital B staff accessing Hospital A blocked with 403 (Got: ${crossAccess.status}, msg: ${crossAccess.body.message})`);

    // 5. Authorized Hospital A Dashboard Fetch
    const authorizedDashboard = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hospitals/HOSP-001/dashboard',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert(authorizedDashboard.status === 200 && authorizedDashboard.body.success, 'Authorized staff retrieved HOSP-001 dashboard stats');
    const stats = authorizedDashboard.body.stats;
    assert(typeof stats.beds_available === 'number', `Dashboard has beds_available: ${stats.beds_available}`);
    assert(typeof stats.pending_lab_tests === 'number', `Dashboard has pending_lab_tests: ${stats.pending_lab_tests}`);
    assert(typeof stats.emergency_cases === 'number', `Dashboard has emergency_cases: ${stats.emergency_cases}`);
    assert(typeof stats.doctors_available === 'number', `Dashboard has doctors_available: ${stats.doctors_available}`);

    // 6. Diagnostics Categories & Tests Catalog
    console.log('\n--- 3. Diagnostics Catalog & Category Filtering ---');
    const categories = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/categories',
      method: 'GET'
    });
    assert(categories.status === 200 && categories.body.categories.length >= 4, `Retrieved ${categories.body.categories.length} diagnostic categories`);

    const testsHosp1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/tests?hospital_id=HOSP-001',
      method: 'GET'
    });
    assert(testsHosp1.status === 200 && testsHosp1.body.tests.length >= 6, `HOSP-001 offers ${testsHosp1.body.tests.length} tests`);
    const cbcTest = testsHosp1.body.tests.find(t => t.code === 'CBC01' || t.name.includes('Complete Blood Count'));
    assert(!!cbcTest, `Found Complete Blood Count test: ${cbcTest ? cbcTest.test_id : 'none'}`);

    // 7. Online Citizen Test Booking
    console.log('\n--- 4. Online Test Booking with Token & QR ---');
    const onlineBooking = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      hospital_id: 'HOSP-001',
      test_id: cbcTest.test_id,
      patient_id: 'PT-TEST-001',
      patient_name: 'Rahul Verma',
      patient_mobile: '9876543210',
      patient_age: 29,
      patient_gender: 'Male',
      booking_type: 'ONLINE',
      booking_date: new Date().toISOString().split('T')[0],
      time_slot: '10:30 AM',
      collection_type: 'Hospital Lab'
    });

    assert(onlineBooking.status === 201 && onlineBooking.body.success, 'Online test booking created');
    assert(onlineBooking.body.booking.token_number && onlineBooking.body.booking.qr_token, `Received Token: ${onlineBooking.body.booking.token_number} and QR Token: ${onlineBooking.body.booking.qr_token}`);
    const createdBookingId = onlineBooking.body.booking.booking_id;

    // 8. Offline Receptionist Test Booking
    console.log('\n--- 5. Offline Receptionist Test Booking ---');
    const offlineBooking = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, {
      hospital_id: 'HOSP-001',
      test_id: cbcTest.test_id,
      patient_name: 'Pooja Tiwari',
      patient_mobile: '9988776655',
      patient_age: 42,
      patient_gender: 'Female',
      booking_type: 'OFFLINE',
      payment_method: 'Cash',
      payment_status: 'Paid'
    });
    assert(offlineBooking.status === 201 && offlineBooking.body.success, 'Offline test booked with instant token');
    assert(offlineBooking.body.booking.payment_status === 'Paid', 'Offline walk-in payment status is Paid');

    // 9. Diagnostics Live Queue & Queue Call Next
    console.log('\n--- 6. Diagnostics Live Queue Management ---');
    const queue = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/queue?hospital_id=HOSP-001',
      method: 'GET'
    });
    assert(queue.status === 200 && queue.body.queues.length > 0, `Active diagnostics queue has ${queue.body.queues.length} test queues`);

    const callNext = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/queue/call-next',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    }, { hospital_id: 'HOSP-001', test_id: cbcTest.test_id });
    assert(callNext.status === 200, `Queue advance response: ${callNext.body.message}`);

    // 10. Sample Collection Desk
    console.log('\n--- 7. Sample Collection Tracking ---');
    const sampleRecord = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/samples',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    }, {
      booking_id: createdBookingId,
      hospital_id: 'HOSP-001',
      test_id: cbcTest.test_id,
      patient_id: 'PT-TEST-001',
      sample_type: 'Whole Blood (EDTA)',
      collected_by: 'STAFF-HOSP-LAB',
      storage_condition: 'Refrigerated (2-8°C)',
      notes: 'Specimen collected without hemolysis'
    });
    assert(sampleRecord.status === 201 && sampleRecord.body.sample_id, `Sample collected successfully with ID: ${sampleRecord.body.sample_id}`);

    // 11. Diagnostic Report Publishing & Public QR Verification
    console.log('\n--- 8. Report Publishing & QR Verification ---');
    const reportPublish = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/diagnostics/reports',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    }, {
      booking_id: createdBookingId,
      hospital_id: 'HOSP-001',
      test_id: cbcTest.test_id,
      patient_id: 'PT-TEST-001',
      technician_name: 'Sunil Sharma (Senior Tech)',
      verified_by: 'Dr. Amitabh Sen, MD Pathology',
      parameters: [
        { parameter: 'Hemoglobin', result: '14.8', unit: 'g/dL', normal_range: '13.5 - 17.5', flag: 'Normal' },
        { parameter: 'Total Platelets', result: '250000', unit: '/mcL', normal_range: '150000 - 450000', flag: 'Normal' },
        { parameter: 'Total WBC Count', result: '7200', unit: '/mcL', normal_range: '4500 - 11000', flag: 'Normal' }
      ],
      remarks: 'All hematological parameters within normal limits.'
    });
    console.log('reportPublish result:', reportPublish);
    assert(reportPublish.status === 201 && reportPublish.body.success, 'Diagnostic report published successfully');
    const qrToken = reportPublish.body.qr_token;
    assert(!!qrToken, `Generated cryptographically secure QR Verification Token: ${qrToken}`);

    // Public QR Verification Check
    const verifyReport = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/diagnostics/reports/verify/${qrToken}`,
      method: 'GET'
    });
    assert(verifyReport.status === 200 && verifyReport.body.success, 'Public QR verification endpoint authenticated valid report');
    assert(verifyReport.body.verification_details && verifyReport.body.verification_details.hospital && verifyReport.body.verification_details.patient_name === 'Rahul Verma', 'Verified report patient matches Rahul Verma');

    // 12. Doctor Direct Test Ordering
    console.log('\n--- 9. Doctor Direct Test Ordering During Consultation ---');
    const doctorOrder = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/doctor/order-tests',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${docToken}`
      },
    }, {
      patientId: 'PT-TEST-001',
      patientName: 'Rahul Verma',
      doctorId: 'DOC-101',
      doctorName: 'Dr. Amitabh Sen',
      hospitalId: 'HOSP-001',
      notes: 'Follow up check for fatigue and mild dyspnea on exertion',
      testIds: [cbcTest.test_id]
    });
    assert(doctorOrder.status === 201 && doctorOrder.body.success, 'Doctor ordered test directly to diagnostics queue');
    assert(doctorOrder.body.orders[0].token_number, `Direct order generated diagnostic token: ${doctorOrder.body.orders[0].token_number}`);

    // 13. Bed Allocation and Discharge
    console.log('\n--- 10. Bed Management (Wards, Allocation, Discharge) ---');
    const wardBeds = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hospitals/HOSP-001/ward-beds',
      method: 'GET'
    });
    assert(wardBeds.status === 200 && wardBeds.body.beds.length > 0, `Retrieved ${wardBeds.body.beds.length} hospital ward beds`);
    
    // Find an available bed
    const targetBed = wardBeds.body.beds.find(bed => bed.status === 'Available');

    if (targetBed) {
      const bedAssign = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/hospitals/HOSP-001/ward-beds/assign',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
      }, {
        bed_id: targetBed.bed_id,
        patient_id: 'PT-TEST-001',
        patient_name: 'Rahul Verma',
        notes: 'Observation for intermittent chest tightness'
      });
      assert(bedAssign.status === 200 && bedAssign.body.success, `Bed ${targetBed.bed_number} allocated to patient`);

      // Discharge
      const bedDischarge = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/hospitals/HOSP-001/ward-beds/release',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
      }, { bed_id: targetBed.bed_id });
      assert(bedDischarge.status === 200 && bedDischarge.body.success, `Bed ${targetBed.bed_number} successfully discharged and released`);
    } else {
      console.log('ℹ️ All beds occupied, allocation cycle skipped');
    }

    // 14. Hospital Invoicing / Billing
    console.log('\n--- 11. Hospital Invoicing & Billing ---');
    const newInvoice = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hospitals/HOSP-001/invoices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    }, {
      patient_id: 'PT-TEST-001',
      patient_name: 'Rahul Verma',
      service_type: 'Diagnostics',
      total_amount: 400,
      payment_method: 'UPI',
      payment_status: 'Paid'
    });
    assert(newInvoice.status === 201 && newInvoice.body.success, 'Hospital invoice created with itemized breakdown');
    assert(newInvoice.body.invoice.invoice_id, `Generated Invoice ID: ${newInvoice.body.invoice.invoice_id}`);

    console.log(`\n==============================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==============================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unhandled test execution error:', err);
    process.exit(1);
  }
}

runTests();
