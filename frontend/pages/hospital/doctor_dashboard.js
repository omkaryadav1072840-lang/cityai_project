/**
 * SmartCity AI - Doctor Portal & Clinical Console Controller
 * Features:
 *  - Multi-doctor profile switcher
 *  - Real-time synchronized appointment queue (with audio chime)
 *  - Live QR code camera scanner (html5-qrcode) & manual Patient ID lookup
 *  - Complete patient medical dossier ("kahan kahan dawa karwaya", records, reports, prescriptions)
 *  - In-clinic consultation writer & status management
 */

const API_BASE = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
    ? window.API_BASE_URL
    : (window.location.origin.includes(':5000') ? '' : 'http://localhost:5000');

function getAuthHeaders(extra = {}) {
    const token = localStorage.getItem("smartcity_auth_token") || (window.SmartCityAuth && window.SmartCityAuth.getToken ? window.SmartCityAuth.getToken() : null);
    const headers = { ...extra };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

let allDoctors = [];
let currentDoctor = null;
let currentQueue = [];
let activeFilter = 'all';
let html5QrScanner = null;
let activePatientId = null;
let activeAppointmentId = null;

// Audio notification chime using Web Audio API
function playChime(type = 'ding') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'ding') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'scan') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {
        // AudioContext autoplay restrictions or not supported
    }
}

// Toast notification helper
function showToast(message, type = 'info') {
    const toast = document.getElementById('docToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `doc-toast show ${type}`;
    setTimeout(() => {
        toast.className = 'doc-toast';
    }, 4000);
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    await initDoctorProfiles();
    initSocketConnection();
});

// Load all doctors from backend and populate selector
async function initDoctorProfiles() {
    try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        if (!res.ok) throw new Error('Failed to load doctors');
        const data = await res.json();
        allDoctors = Array.isArray(data) ? data : (data.doctors || data.data || []);

        const select = document.getElementById('doctorSelect');
        select.innerHTML = '';

        if (!allDoctors || allDoctors.length === 0) {
            select.innerHTML = '<option value="">No doctors available</option>';
            return;
        }

        allDoctors.forEach(doc => {
            const opt = document.createElement('option');
            const docId = doc.doctor_id || doc.doctorId || doc.id;
            opt.value = docId;
            opt.textContent = `${doc.name} (${doc.specialization} - ${doc.hospital || doc.hospital_id || 'SmartCity Hospital'})`;
            select.appendChild(opt);
        });

        // Determine saved doctor or default
        const savedDocId = localStorage.getItem('smartcity_active_doctor') || allDoctors[0].doctor_id || allDoctors[0].doctorId || allDoctors[0].id;
        select.value = savedDocId;
        switchActiveDoctor();
    } catch (err) {
        console.error('Error loading doctor profiles:', err);
        showToast('Unable to load doctor profiles from server', 'error');
    }
}

// Switch active doctor profile
function switchActiveDoctor() {
    const select = document.getElementById('doctorSelect');
    const selectedId = select.value;
    currentDoctor = allDoctors.find(d => (d.doctor_id || d.doctorId || d.id) == selectedId) || allDoctors[0];

    if (currentDoctor) {
        const docId = currentDoctor.doctor_id || currentDoctor.doctorId || currentDoctor.id;
        localStorage.setItem('smartcity_active_doctor', docId);

        // Update profile chip in navbar
        const nameEl = document.getElementById('docDisplayName');
        const deptEl = document.getElementById('docDeptInfo');
        if (nameEl) nameEl.textContent = currentDoctor.name;
        if (deptEl) deptEl.textContent = `${currentDoctor.specialization} • ${currentDoctor.hospital || currentDoctor.hospital_id || 'SmartCity Hospital'}`;

        // Load queue for this doctor
        loadDoctorQueue();
    }
}

// Load Appointments for Active Doctor
async function loadDoctorQueue() {
    if (!currentDoctor) return;
    const doctorId = currentDoctor.doctor_id || currentDoctor.doctorId || currentDoctor.id;
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading patient appointment queue for ${currentDoctor.name}...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/api/doctor/${doctorId}/appointments`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch doctor appointments');
        const data = await res.json();
        currentQueue = data.appointments || (Array.isArray(data) ? data : []);

        updateQueueStats(currentQueue);
        renderQueue(currentQueue);
    } catch (err) {
        console.error('Error fetching appointments:', err);
        queueList.innerHTML = `
            <div class="empty-state">
                <p>⚠️ Failed to load queue. Please check server connection.</p>
            </div>
        `;
    }
}

// Update Top Stat Counters
function updateQueueStats(appts) {
    const list = Array.isArray(appts) ? appts : [];
    const total = list.length;
    const waiting = list.filter(a => ['Confirmed', 'Scheduled', 'Pending'].includes(a.status)).length;
    const inProgress = list.filter(a => a.status === 'In Consultation').length;
    const completed = list.filter(a => a.status === 'Completed').length;

    document.getElementById('statTotalAppts').textContent = total;
    document.getElementById('statWaitingAppts').textContent = waiting;
    document.getElementById('statInConsultation').textContent = inProgress;
    document.getElementById('statCompletedAppts').textContent = completed;
}

// Filter Queue
function filterQueue(filter) {
    activeFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(filter.toLowerCase()) || (filter === 'all' && btn.textContent === 'All'));
    });
    renderQueue(currentQueue);
}

// Render Queue Cards
function renderQueue(appts) {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    const list = Array.isArray(appts) ? appts : [];
    let filtered = list;
    if (activeFilter === 'Confirmed') {
        filtered = list.filter(a => ['Confirmed', 'Scheduled', 'Pending'].includes(a.status));
    } else if (activeFilter === 'In Consultation') {
        filtered = list.filter(a => a.status === 'In Consultation');
    } else if (activeFilter === 'Completed') {
        filtered = list.filter(a => a.status === 'Completed');
    }

    if (!filtered || filtered.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 38px;">🩺</span>
                <p>No appointments found in this category.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(appt => {
        const card = document.createElement('div');
        card.className = `queue-card ${appt.status === 'In Consultation' ? 'active-consult' : ''}`;

        const pId = appt.patient_id || appt.patientId || 'N/A';
        const pName = appt.patient_name || appt.patientName || 'Anonymous Patient';
        const pAge = appt.patient_age || appt.patientAge;
        const pGender = appt.patient_gender || appt.patientGender;
        const pBlood = appt.patient_blood_group || appt.bloodGroup;
        const apptDate = appt.appointment_date ? String(appt.appointment_date).split('T')[0] : (appt.appointmentDate ? String(appt.appointmentDate).split('T')[0] : 'Today');
        const apptTime = appt.appointment_time || appt.appointmentTime || appt.timeSlot || 'Scheduled';
        const statusClass = (appt.status || 'Confirmed').toLowerCase().replace(/\s+/g, '-');

        card.innerHTML = `
            <div class="queue-card-top">
                <div class="appt-time-badge">
                    <span>🕒 ${apptTime}</span>
                    <small style="color:var(--text-muted); font-size:11px;">${apptDate}</small>
                </div>
                <span class="status-pill status-${statusClass}">${appt.status || 'Confirmed'}</span>
            </div>

            <div class="queue-patient-row">
                <div class="patient-avatar-circle">
                    ${pName.charAt(0).toUpperCase()}
                </div>
                <div class="queue-patient-info">
                    <h4>${pName}</h4>
                    <div class="patient-meta-tags">
                        <span>🆔 ${pId}</span>
                        ${pAge ? `<span>Age: ${pAge}</span>` : ''}
                        ${pGender ? `<span>${pGender}</span>` : ''}
                        ${pBlood ? `<span>🩸 ${pBlood}</span>` : ''}
                    </div>
                </div>
            </div>

            ${appt.reason ? `<div class="queue-reason"><strong>Reason:</strong> ${appt.reason}</div>` : ''}

            <div class="queue-card-actions">
                <button class="btn-action btn-action-primary" onclick="openPatientDossier('${pId}', ${appt.id})">
                    🩺 Open Medical History
                </button>
                ${appt.status !== 'In Consultation' && appt.status !== 'Completed' ? `
                    <button class="btn-action btn-action-amber" onclick="updateAppointmentStatus(${appt.id}, 'In Consultation')">
                        ▶️ Start Consult
                    </button>
                ` : ''}
                ${appt.status !== 'Completed' ? `
                    <button class="btn-action btn-action-green" onclick="updateAppointmentStatus(${appt.id}, 'Completed')">
                        ✓ Mark Done
                    </button>
                ` : ''}
            </div>
        `;
        queueList.appendChild(card);
    });
}

// Update Appointment Status via PUT API
async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update status');

        showToast(`Appointment status updated to "${newStatus}"`, 'success');
        loadDoctorQueue();
    } catch (err) {
        console.error('Error updating status:', err);
        showToast(err.message, 'error');
    }
}

// ================= QR CODE CAMERA SCANNER =================
async function startCameraScanner() {
    const btnStart = document.getElementById('btnStartCamera');
    const btnStop = document.getElementById('btnStopCamera');
    const readerDiv = document.getElementById('qr-reader');

    try {
        if (!html5QrScanner) {
            html5QrScanner = new Html5Qrcode("qr-reader");
        }

        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-flex';

        await html5QrScanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText, decodedResult) => {
                // Successful QR Scan!
                handleQrScanSuccess(decodedText);
            },
            (errorMessage) => {
                // Parse error / camera scanning frame (silent)
            }
        );
    } catch (err) {
        console.error('Unable to start QR camera:', err);
        showToast('Camera access denied or not available. Use manual search.', 'error');
        btnStart.style.display = 'inline-flex';
        btnStop.style.display = 'none';
    }
}

async function stopCameraScanner() {
    const btnStart = document.getElementById('btnStartCamera');
    const btnStop = document.getElementById('btnStopCamera');

    if (html5QrScanner) {
        try {
            await html5QrScanner.stop();
        } catch (e) {
            console.warn('QR scanner stop error:', e);
        }
    }
    btnStart.style.display = 'inline-flex';
    btnStop.style.display = 'none';
}

function handleQrScanSuccess(decodedText) {
    playChime('scan');
    stopCameraScanner();

    // Clean scanned patient ID
    const patientId = decodedText.trim();
    showToast(`📸 QR Scanned Successfully: ${patientId}`, 'success');

    // Attempt to match with existing appointment if in queue
    const matchedAppt = currentQueue.find(a => a.patientId === patientId);
    const appointmentId = matchedAppt ? matchedAppt.id : null;

    openPatientDossier(patientId, appointmentId);
}

function lookupPatientFromInput() {
    const input = document.getElementById('manualPatientId');
    const patientId = input.value.trim();
    if (!patientId) {
        showToast('Please enter a valid Patient ID or Code', 'error');
        return;
    }

    const matchedAppt = currentQueue.find(a => a.patientId === patientId);
    const appointmentId = matchedAppt ? matchedAppt.id : null;
    openPatientDossier(patientId, appointmentId);
}

// ================= PATIENT MEDICAL DOSSIER MODAL =================
async function openPatientDossier(patientId, appointmentId = null) {
    activePatientId = patientId;
    activeAppointmentId = appointmentId;

    const modal = document.getElementById('dossierModal');
    const body = document.getElementById('dossierBody');
    modal.classList.add('active');

    body.innerHTML = `
        <div class="loading-state" style="padding: 50px;">
            <div class="spinner"></div>
            <p>Retrieving complete electronic medical dossier for <strong>${patientId}</strong>...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/api/doctor/patient-history/${patientId}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            throw new Error('Patient record not found on server');
        }
        const data = await res.json();
        renderDossierContent(data);
    } catch (err) {
        console.error('Error loading patient history:', err);
        body.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 40px;">⚠️</span>
                <h3>Patient Dossier Not Found</h3>
                <p>No past medical records or profiles found for ID: <code>${patientId}</code>.</p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="closeDossierModal()">Close</button>
                </div>
            </div>
        `;
    }
}

function renderDossierContent(data) {
    const body = document.getElementById('dossierBody');
    const p = data.patient || {};
    const records = data.records || [];
    const reports = data.reports || [];
    const prescriptions = data.prescriptions || [];
    const pastAppts = data.pastAppointments || [];

    body.innerHTML = `
        <!-- PATIENT HERO PROFILE -->
        <div class="patient-hero">
            <div class="hero-left">
                <div class="patient-avatar-large">
                    ${p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                    <h2>${p.name || 'Patient ' + (p.patientId || activePatientId)}</h2>
                    <p style="color:var(--text-muted); font-size:13px;">
                        Patient ID: <strong style="color:var(--accent-cyan);">${p.patientId || activePatientId}</strong>
                        ${p.phone ? ` • 📞 ${p.phone}` : ''}
                        ${p.address ? ` • 📍 ${p.address}` : ''}
                    </p>
                </div>
            </div>

            <div class="hero-tags">
                <div class="hero-tag">
                    <small>Age / Gender</small>
                    <strong>${p.age || 'N/A'} yrs • ${p.gender || 'N/A'}</strong>
                </div>
                <div class="hero-tag">
                    <small>Blood Group</small>
                    <strong style="color:#ef4444;">${p.bloodGroup || 'Unknown'}</strong>
                </div>
                <div class="hero-tag">
                    <small>Total Visits</small>
                    <strong>${records.length + pastAppts.length} Times</strong>
                </div>
            </div>
        </div>

        <!-- TWO COLUMN CLINICAL DOSSIER -->
        <div class="dossier-grid">

            <!-- LEFT: PAST MEDICAL HISTORY & REPORTS ("KAHAN KAHAN DAWA KARWAYA HAI") -->
            <div class="history-col">

                <!-- 1. PAST CLINICAL CONSULTATIONS -->
                <div class="history-section">
                    <div class="history-section-header">
                        <h3>🏥 Clinical Consultation History ("Kahan Kahan Dawa Karwaya")</h3>
                        <span class="badge-count">${records.length} Records</span>
                    </div>

                    ${records.length === 0 ? `
                        <p class="empty-note">No previous diagnostic records on file for this patient.</p>
                    ` : `
                        <div class="timeline-list">
                            ${records.map(rec => `
                                <div class="timeline-card">
                                    <div class="timeline-card-header">
                                        <div>
                                            <strong class="diag-title">${rec.diagnosis || 'Clinical Consultation'}</strong>
                                            <div class="doc-meta">
                                                👨‍⚕️ ${rec.doctor_name || rec.doctorName || 'Attending Physician'} 
                                                ${rec.specialization ? `(${rec.specialization})` : ''} 
                                                ${rec.hospital ? `• 🏢 ${rec.hospital}` : ''}
                                            </div>
                                        </div>
                                        <span class="record-date">${rec.record_date ? String(rec.record_date).split('T')[0] : (rec.visitDate ? String(rec.visitDate).split('T')[0] : 'Past')}</span>
                                    </div>

                                    ${rec.symptoms ? `
                                        <div class="notes-box" style="margin-bottom:8px;">
                                            <strong>Symptoms Reported:</strong> ${rec.symptoms}
                                        </div>
                                    ` : ''}

                                    ${rec.treatment ? `
                                        <div class="treatment-box">
                                            <strong>Prescribed Treatment:</strong> ${rec.treatment}
                                        </div>
                                    ` : ''}

                                    ${rec.notes ? `
                                        <div class="notes-box">
                                            <em>Clinical Notes:</em> ${rec.notes}
                                        </div>
                                    ` : ''}

                                    ${rec.followUpDate || rec.follow_up_date ? `
                                        <div class="follow-up-tag">
                                            📅 Recommended Follow-up: ${String(rec.followUpDate || rec.follow_up_date).split('T')[0]}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- 2. DIAGNOSTIC LAB REPORTS -->
                <div class="history-section">
                    <div class="history-section-header">
                        <h3>🧪 Diagnostic & Lab Reports</h3>
                        <span class="badge-count">${reports.length} Reports</span>
                    </div>

                    ${reports.length === 0 ? `
                        <p class="empty-note">No laboratory reports uploaded yet.</p>
                    ` : `
                        <div class="reports-grid">
                            ${reports.map(rep => `
                                <div class="report-card">
                                    <div class="report-icon">📄</div>
                                    <div class="report-details">
                                        <strong>${rep.title || rep.report_type || rep.reportName || 'Diagnostic Report'}</strong>
                                        <small>
                                            ${rep.report_date ? String(rep.report_date).split('T')[0] : 'Recent'} • 
                                            ${rep.hospital_name || rep.doctor_name || 'Hospital Lab'}
                                        </small>
                                        ${rep.resultSummary || rep.status ? `<p class="report-summary">Status: ${rep.status || 'Verified'}</p>` : ''}
                                    </div>
                                    <span class="badge-pill">${rep.report_type || 'Lab Test'}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- 3. PAST PRESCRIPTIONS -->
                ${prescriptions.length > 0 ? `
                    <div class="history-section">
                        <div class="history-section-header">
                            <h3>💊 Prescriptions Record</h3>
                            <span class="badge-count">${prescriptions.length} Records</span>
                        </div>
                        <div class="prescriptions-list">
                            ${prescriptions.map(med => `
                                <div class="rx-card">
                                    <div class="rx-header">
                                        <strong>💊 ${med.prescription_file || med.medicineName || 'Prescription Order'}</strong>
                                        <span class="rx-dosage">${med.status || 'Issued'}</span>
                                    </div>
                                    <div class="rx-meta">
                                        <span>Consultant: Dr. ${med.doctor_name || med.doctorName || 'Attending Physician'}</span>
                                        <span>Date: ${med.created_at ? String(med.created_at).split('T')[0] : 'N/A'}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

            </div>

            <!-- RIGHT: NEW CLINICAL CONSULTATION WRITER PAD -->
            <div class="consultation-col">
                <div class="consultation-box">
                    <div class="consultation-header">
                        <h3>✍️ Clinical Consultation Pad</h3>
                        <p>Prescribe treatment, record diagnosis, and update patient's medical file</p>
                    </div>

                    <form id="consultationForm" onsubmit="submitConsultation(event)">
                        <div class="form-group">
                            <label for="consultDiagnosis">Clinical Diagnosis <span class="req">*</span></label>
                            <input 
                                type="text" 
                                id="consultDiagnosis" 
                                class="form-control" 
                                placeholder="e.g. Acute Viral Bronchitis, Essential Hypertension" 
                                required 
                            />
                        </div>

                        <div class="form-group">
                            <label for="consultTreatment">Prescription & Medical Treatment <span class="req">*</span></label>
                            <textarea 
                                id="consultTreatment" 
                                class="form-control" 
                                rows="3" 
                                placeholder="e.g. 1. Paracetamol 650mg TDS x 3 days&#10;2. Azithromycin 500mg OD x 5 days&#10;3. Steam inhalation twice daily" 
                                required
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label for="consultNotes">Clinical Advice & Doctor Notes</label>
                            <textarea 
                                id="consultNotes" 
                                class="form-control" 
                                rows="2" 
                                placeholder="Advised blood routine checkup if fever persists. Avoid cold beverages."
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label for="consultFollowUp">Recommended Follow-up Date</label>
                            <input 
                                type="date" 
                                id="consultFollowUp" 
                                class="form-control" 
                            />
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" id="btnSubmitConsultation" style="width: 100%; padding: 12px;">
                                💾 Save Consultation & Complete OPD Visit
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    `;

    // Pre-fill tomorrow or next week for follow up date default
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dateInput = document.getElementById('consultFollowUp');
    if (dateInput) {
        dateInput.value = nextWeek.toISOString().split('T')[0];
    }
}

// Submit Doctor Consultation
async function submitConsultation(event) {
    event.preventDefault();

    const diagnosis = document.getElementById('consultDiagnosis').value.trim();
    const treatment = document.getElementById('consultTreatment').value.trim();
    const notes = document.getElementById('consultNotes').value.trim();
    const followUpDate = document.getElementById('consultFollowUp').value;

    if (!diagnosis || !treatment) {
        showToast('Please fill in both Diagnosis and Treatment fields.', 'error');
        return;
    }

    const btn = document.getElementById('btnSubmitConsultation');
    btn.disabled = true;
    btn.textContent = 'Saving Consultation...';

    try {
        const payload = {
            patientId: activePatientId,
            doctorId: currentDoctor.doctor_id || currentDoctor.doctorId || currentDoctor.id,
            diagnosis,
            treatment,
            notes,
            followUpDate: followUpDate || null,
            appointmentId: activeAppointmentId || null
        };

        const res = await fetch(`${API_BASE}/api/doctor/consultation`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save consultation');

        showToast('✅ Consultation saved and appointment completed successfully!', 'success');
        playChime('ding');

        // Close modal after short delay and reload queue
        setTimeout(() => {
            closeDossierModal();
            loadDoctorQueue();
        }, 800);

    } catch (err) {
        console.error('Error saving consultation:', err);
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = '💾 Save Consultation & Complete OPD Visit';
    }
}

function closeDossierModal() {
    const modal = document.getElementById('dossierModal');
    if (modal) modal.classList.remove('active');
    activePatientId = null;
    activeAppointmentId = null;
}

// ================= REAL-TIME WEBSOCKET LISTENERS =================
function initSocketConnection() {
    try {
        const socket = window.SmartCityRealtime?.socket || (typeof io !== 'undefined' ? io(API_BASE || undefined) : null);
        if (!socket) {
            console.warn('Socket.IO not initialized on Doctor Portal');
            return;
        }

        socket.on('connect', () => {
            console.log('⚡ Doctor Portal connected to real-time socket:', socket.id);
        });

        // Listen for new appointment booked
        socket.on('appointment:new', (newAppt) => {
            console.log('🔔 New appointment notification received:', newAppt);
            const myDoctorId = currentDoctor ? (currentDoctor.doctor_id || currentDoctor.doctorId || currentDoctor.id) : null;
            const myDoctorName = currentDoctor ? currentDoctor.name : null;

            if (!newAppt.doctorId || newAppt.doctorId == myDoctorId || (myDoctorName && (newAppt.doctor == myDoctorName || newAppt.doctorName == myDoctorName))) {
                playChime('ding');
                showToast(`🔔 New Appointment Booked: ${newAppt.patientName || newAppt.patient_name || 'Patient'} (${newAppt.timeSlot || newAppt.appointmentTime || 'Today'})`, 'success');
                loadDoctorQueue();
            }
        });

        // Listen for appointment status updates
        socket.on('appointment:status-updated', (update) => {
            console.log('🔄 Appointment status update received:', update);
            loadDoctorQueue();
        });

    } catch (err) {
        console.warn('Socket connection error:', err);
    }
}
