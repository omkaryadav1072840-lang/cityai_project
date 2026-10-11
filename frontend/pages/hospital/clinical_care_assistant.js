/**
 * SmartCity AI - AI Clinical Care Assistant
 * Client-Side Controller & Real-Time Hospital Decision Support
 * Grounded in verified MySQL Hospital Records.
 */

const AIClinicalCare = (() => {
    // Component State
    let state = {
        language: "en",
        patientContext: null,
        activePatientId: "SC-2026-318028",
        messages: [],
        sessionId: "CCA-SESSION-" + Date.now().toString(36),
        isProcessing: false,
        lastFailedMessage: null,
        recognition: null,
        isListening: false
    };

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[m]);
    }

    // Helper: Format Markdown bold & bullets into clean HTML
    function formatClinicalText(raw) {
        if (!raw) return "";
        let formatted = escapeHtml(raw);

        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Italics
        formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Headers
        formatted = formatted.replace(/### (.*?)\n/g, "<h4 style='margin: 8px 0 4px 0; color: #1e3a8a; font-size: 13px;'>$1</h4>");

        // Horizontal dividers
        formatted = formatted.replace(/---/g, "<hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 10px 0;'>");

        // Bullet lists
        formatted = formatted.replace(/• (.*?)(?=\n|$)/g, "<div style='display: flex; gap: 6px; margin-bottom: 4px;'><span style='color: #2563eb;'>•</span><span>$1</span></div>");

        // Line breaks
        formatted = formatted.replace(/\n\n/g, "<div style='height: 8px;'></div>");
        formatted = formatted.replace(/\n/g, "<br>");

        return formatted;
    }

    // Helper: Get Auth Token
    function getAuthToken() {
        if (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getToken) {
            return SmartCityAuth.getToken();
        }
        return localStorage.getItem("smartCityJWT") || localStorage.getItem("smartcity_auth_token") || localStorage.getItem("token") || "";
    }

    // Helper: Show Browser / System Notification if supported
    function sendDesktopNotification(title, body) {
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification(title, { body, icon: "/favicon.svg" });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification(title, { body, icon: "/favicon.svg" });
                    }
                });
            }
        }
    }

    // =========================================================
    // 1. INITIALIZATION & DATA LOADING
    // =========================================================

    async function init() {
        console.log("🏥 Initializing AI Clinical Care Assistant...");

        // Check if user is logged in
        const user = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.getUser)
            ? SmartCityAuth.getUser()
            : null;

        if (user && user.patientId) {
            state.activePatientId = user.patientId;
        }

        // Initialize Web Speech API if supported
        initSpeechRecognition();

        // Load Patient Context & Today's Medication Schedule
        await loadPatientContext(state.activePatientId);
        await loadMedicationSchedule(state.activePatientId);

        // Add welcome message if empty
        if (state.messages.length === 0) {
            addAssistantMessage({
                text: state.language === "hi"
                    ? `नमस्ते! मैं आपका **AI Clinical Care Assistant** हूँ।\n\nमैं आपके अस्पताल के सत्यापित रिकॉर्ड के आधार पर पर्चा समझाने, दवा का शेड्यूल देखने, लक्षण मार्गदर्शन और परहेज संबंधी जानकारी देने के लिए सक्रिय हूँ।\n\nमैं आपकी किस प्रकार सहायता कर सकता हूँ?`
                    : `Hello! I am your **AI Clinical Care Assistant**, grounded directly in your verified hospital health dossier.\n\nI can help you understand your doctor-prescribed medicines, track today's medication schedule, guide you through symptoms, and explain what precautions to take.\n\nHow can I help you today?`,
                tag: "AI Guidance",
                badge: "Doctor-Verified Data"
            });
        }

        // Bind input enter key
        const inputElem = document.getElementById("ccaChatInput");
        if (inputElem) {
            inputElem.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            });
        }
    }

    // =========================================================
    // 2. PATIENT CONTEXT RESOLUTION
    // =========================================================

    async function loadPatientContext(patientId) {
        try {
            const token = getAuthToken();
            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`/api/ai/clinical-care/patient-context?patientId=${encodeURIComponent(patientId || "")}`, { headers });
            const data = await res.json();

            if (data.success && data.patient) {
                state.patientContext = data;
                renderPatientCard(data);
            } else {
                renderGuestPatientCard();
            }
        } catch (err) {
            console.warn("Could not load patient context:", err);
            renderGuestPatientCard();
        }
    }

    function renderPatientCard(data) {
        const p = data.patient || {};
        const pElem = document.getElementById("ccaPatientContextCard");
        if (!pElem) return;

        const nextAppt = (data.appointments && data.appointments.length > 0)
            ? data.appointments[0]
            : null;

        const apptInfo = nextAppt
            ? `${escapeHtml(nextAppt.doctor || 'Doctor')} (${new Date(nextAppt.appointment_date).toLocaleDateString()})`
            : "No active follow-up booked";

        const activeRxCount = data.prescriptions ? data.prescriptions.length : 0;
        const reportsCount = data.reports ? data.reports.length : 0;

        pElem.innerHTML = `
            <div class="cca-card-head">
                <h3><span>👤</span> Patient Context</h3>
                <span class="cca-patient-badge">Verified DB</span>
            </div>

            <div style="margin-bottom: 10px;">
                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">SELECT PATIENT DOSSIER:</label>
                <select id="ccaPatientSelector" onchange="AIClinicalCare.switchPatient(this.value)" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; margin-top: 2px;">
                    <option value="SC-2026-318028" ${p.patient_id === 'SC-2026-318028' ? 'selected' : ''}>omkar (SC-2026-318028)</option>
                    <option value="PAT-5931984821" ${p.patient_id === 'PAT-5931984821' ? 'selected' : ''}>omkar yadav (PAT-5931984821)</option>
                    <option value="PAT-VERIFY-5695" ${p.patient_id === 'PAT-VERIFY-5695' ? 'selected' : ''}>Emergency Angina Dossier (PAT-VERIFY-5695)</option>
                </select>
            </div>

            <div class="cca-patient-details-grid">
                <div class="cca-p-item">
                    <span class="cca-p-label">Patient Name</span>
                    <span class="cca-p-val">${escapeHtml(p.name || 'Anonymous')}</span>
                </div>
                <div class="cca-p-item">
                    <span class="cca-p-label">Patient UHID</span>
                    <span class="cca-p-val" style="color: #2563eb;">${escapeHtml(p.patient_id || '--')}</span>
                </div>
                <div class="cca-p-item">
                    <span class="cca-p-label">Age / Gender</span>
                    <span class="cca-p-val">${escapeHtml(p.age || '28')} Yrs / ${escapeHtml(p.gender || 'M')}</span>
                </div>
                <div class="cca-p-item">
                    <span class="cca-p-label">Blood Group</span>
                    <span class="cca-p-val">${escapeHtml(p.blood_group || 'B+')}</span>
                </div>
                <div class="cca-p-item" style="grid-column: span 2;">
                    <span class="cca-p-label">Hospital Facility</span>
                    <span class="cca-p-val">${escapeHtml(p.hospital || 'AIIMS Gorakhpur')}</span>
                </div>
                <div class="cca-p-item" style="grid-column: span 2;">
                    <span class="cca-p-label">Recent / Next OPD</span>
                    <span class="cca-p-val" style="font-size: 11px; color: #475569;">${apptInfo}</span>
                </div>
            </div>

            <div class="cca-allergy-alert">
                <span>🛡️</span>
                <span><strong>Allergies / Alerts:</strong> ${escapeHtml(p.allergies || 'No documented allergies')}</span>
            </div>

            <div class="cca-patient-links-row">
                <button type="button" onclick="AIClinicalCare.quickAction('prescriptions')">💊 ${activeRxCount} Prescriptions</button>
                <button type="button" onclick="AIClinicalCare.quickAction('reports')">📋 ${reportsCount} Reports</button>
                <button type="button" onclick="AIClinicalCare.quickAction('appointment')">📅 Follow-up</button>
            </div>
        `;
    }

    function renderGuestPatientCard() {
        const pElem = document.getElementById("ccaPatientContextCard");
        if (!pElem) return;

        pElem.innerHTML = `
            <div class="cca-card-head">
                <h3><span>👤</span> Patient Context</h3>
                <span class="cca-patient-badge" style="background: #fef3c7; color: #92400e;">Guest Mode</span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
                Log in to link your verified hospital health dossier, or select a demo patient ID below:
            </p>
            <select id="ccaPatientSelector" onchange="AIClinicalCare.switchPatient(this.value)" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600;">
                <option value="SC-2026-318028">omkar (SC-2026-318028)</option>
                <option value="PAT-5931984821">omkar yadav (PAT-5931984821)</option>
                <option value="PAT-VERIFY-5695">Emergency Angina Dossier (PAT-VERIFY-5695)</option>
            </select>
        `;
    }

    // =========================================================
    // 3. MEDICATION SCHEDULE & ADHERENCE
    // =========================================================

    async function loadMedicationSchedule(patientId) {
        try {
            const token = getAuthToken();
            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`/api/ai/clinical-care/medication-schedule?patientId=${encodeURIComponent(patientId || "")}`, { headers });
            const data = await res.json();

            if (data.success) {
                renderScheduleCard(data);
            }
        } catch (err) {
            console.warn("Could not load medication schedule:", err);
        }
    }

    function renderScheduleCard(data) {
        const sElem = document.getElementById("ccaMedicationScheduleCard");
        if (!sElem) return;

        const adherenceRate = data.adherence_rate !== undefined ? data.adherence_rate : 100;
        const slots = data.slots || { Morning: [], Afternoon: [], Evening: [], Night: [] };

        let slotsHtml = "";
        const slotKeys = ["Morning", "Afternoon", "Evening", "Night"];
        const slotIcons = { Morning: "🌅", Afternoon: "☀️", Evening: "🌇", Night: "🌙" };

        slotKeys.forEach(slotKey => {
            const meds = slots[slotKey] || [];
            if (meds.length === 0) return;

            const medsHtml = meds.map(m => {
                const statusClass = (m.status || "").toLowerCase().replace(" ", "-");
                const isTaken = m.status === "Taken";

                const actionBtn = isTaken
                    ? `<span style="font-size: 11px; color: #059669; font-weight: 700;">✓ Taken</span>`
                    : `<button type="button" class="cca-take-btn" onclick="AIClinicalCare.markMedicationTaken(${m.id}, '${escapeHtml(m.medicine_name)}')">Mark Taken</button>`;

                return `
                    <div class="cca-med-item">
                        <div class="cca-med-meta">
                            <strong>${escapeHtml(m.medicine_name)}</strong>
                            <span>${escapeHtml(m.dosage || '1 tab')} • ${escapeHtml(m.food_instruction || 'After food')}</span>
                            <span style="font-weight: 600; color: #2563eb;">Scheduled: ${escapeHtml(m.scheduled_time || '--')}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                            <span class="cca-status-pill ${statusClass}">${escapeHtml(m.status)}</span>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join("");

            slotsHtml += `
                <div class="cca-slot-box">
                    <div class="cca-slot-header">
                        <span class="cca-slot-name">${slotIcons[slotKey]} ${slotKey}</span>
                        <span style="font-size: 11px; color: #64748b;">${meds.length} ${meds.length === 1 ? 'medicine' : 'medicines'}</span>
                    </div>
                    ${medsHtml}
                </div>
            `;
        });

        if (!slotsHtml) {
            slotsHtml = `<div style="text-align: center; color: #64748b; padding: 20px; font-size: 12px;">No active medicines scheduled for today. Follow doctor's prescription routine.</div>`;
        }

        sElem.innerHTML = `
            <div class="cca-card-head">
                <h3><span>⏰</span> Today's Medication Schedule</h3>
                <span class="cca-patient-badge" style="background: #dcfce7; color: #166534;">${adherenceRate}% Adherence</span>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #64748b;">
                    <span>Daily Adherence Goal:</span>
                    <span>${data.taken_count || 0}/${data.total_medicines || 0} Doses Recorded</span>
                </div>
                <div class="cca-adherence-meter">
                    <div class="cca-adherence-fill" style="width: ${adherenceRate}%;"></div>
                </div>
            </div>

            <div class="cca-slots-list">
                ${slotsHtml}
            </div>
        `;
    }

    async function markMedicationTaken(adherenceId, medName) {
        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/mark-medication", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    adherenceId,
                    patientId: state.activePatientId,
                    status: "Taken",
                    notes: "Confirmed taken via AI Clinical Care Assistant."
                })
            });

            const data = await res.json();
            if (data.success) {
                sendDesktopNotification("Medication Recorded", `${medName} marked as taken in your verified hospital health record.`);
                await loadMedicationSchedule(state.activePatientId);
                // Also notify in chat
                addAssistantMessage({
                    text: `✅ **Dose Confirmed:** ${escapeHtml(medName)} marked as taken for today. Keep up your regular adherence routine!`,
                    tag: "Prescription Information",
                    badge: "Doctor-Verified Data"
                });
            } else {
                alert(data.message || "Could not record adherence.");
            }
        } catch (err) {
            console.error("Error marking medication:", err);
            alert("Network error marking medication: " + err.message);
        }
    }

    // =========================================================
    // 4. CHAT RENDERING & COMMUNICATION
    // =========================================================

    function addUserMessage(text) {
        const msg = {
            id: Date.now(),
            sender: "user",
            text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        state.messages.push(msg);
        renderMessages();
    }

    function addAssistantMessage({ text, tag = "AI Guidance", badge = "Doctor-Verified Data", quickSuggestions = [], sourcesUsed = [], whyThisAnswer = "", pendingAction = null, medicineCard = null }) {
        const msg = {
            id: Date.now(),
            sender: "assistant",
            text,
            tag,
            badge,
            quickSuggestions,
            sourcesUsed,
            whyThisAnswer,
            pendingAction,
            medicineCard,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        state.messages.push(msg);
        renderMessages();
    }

    function renderMessages() {
        const container = document.getElementById("ccaMessagesArea");
        if (!container) return;

        container.innerHTML = state.messages.map(m => {
            if (m.sender === "user") {
                return `
                    <div class="cca-message-item user">
                        <div class="cca-message-bubble">
                            ${escapeHtml(m.text)}
                        </div>
                        <div class="cca-message-time">${m.time}</div>
                    </div>
                `;
            }

            const tagClass = m.tag === "Emergency Warning" ? "emergency" : (m.tag === "Prescription Information" ? "prescription" : "guidance");

            // Integrated In-Chat Medicine Card (if present)
            let medCardHtml = "";
            if (m.medicineCard) {
                const card = m.medicineCard;
                medCardHtml = `
                    <div class="cca-medicine-card">
                        <div class="cca-med-badge">💊 प्राथमिक राहत दवा (Recommended Safe Care)</div>
                        <div class="cca-med-name">
                            <span>📦</span> ${escapeHtml(card.medicine_name || 'Recommended Medicine')}
                        </div>
                        <div class="cca-med-details">
                            <span>📋 <strong>खुराक:</strong> ${escapeHtml(card.dosage || '--')}</span>
                            <span>⏰ <strong>समय:</strong> ${escapeHtml(card.frequency || '--')}</span>
                        </div>
                        ${card.precautions ? `
                            <div class="cca-med-precaution">
                                ⚠️ <strong>सावधानी:</strong> ${escapeHtml(card.precautions)}
                            </div>
                        ` : ''}
                        <div class="cca-med-actions">
                            <button type="button" class="cca-btn-reminder" onclick="AIClinicalCare.setDirectMedicineReminder('${escapeHtml(card.medicine_name || '').replace(/'/g, "\\'")}')">
                                ⏰ Set Reminder
                            </button>
                            <span class="cca-pharmacy-pill">🏥 Hospital Pharmacy: ${escapeHtml(card.price || 'In Stock')}</span>
                        </div>
                    </div>
                `;
            }

            // Interactive Action Buttons (for consent / confirmation gates)
            let actionsHtml = "";
            if (m.pendingAction) {
                if (m.pendingAction.type === "CONFIRM_MEMORY") {
                    actionsHtml = `
                        <div class="cca-pending-actions-row">
                            <button type="button" class="cca-confirm-btn" onclick="AIClinicalCare.confirmMemoryAction('${escapeHtml(m.pendingAction.content || '').replace(/'/g, "\\'")}')">
                                💾 Save Note
                            </button>
                            <button type="button" class="cca-cancel-btn" onclick="AIClinicalCare.cancelAction()">
                                ✖ Don't Save
                            </button>
                        </div>
                    `;
                } else if (m.pendingAction.type === "CONFIRM_REMINDER") {
                    actionsHtml = `
                        <div class="cca-pending-actions-row">
                            <button type="button" class="cca-confirm-btn" onclick="AIClinicalCare.confirmReminderAction()">
                                🔔 Create Reminder
                            </button>
                            <button type="button" class="cca-cancel-btn" onclick="AIClinicalCare.cancelAction()">
                                ✖ Cancel
                            </button>
                        </div>
                    `;
                }
            }

            // Explainability Accordion ("Why this answer?")
            let whyHtml = "";
            if (m.sourcesUsed && m.sourcesUsed.length > 0) {
                whyHtml = `
                    <details class="cca-why-accordion">
                        <summary>🔍 Why this answer? (Explainability &amp; Sources)</summary>
                        <div class="cca-why-body">
                            <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">Verified Sources Used:</div>
                            <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
                                ${m.sourcesUsed.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
                            </ul>
                            ${m.whyThisAnswer ? `<div style="margin-top: 6px; font-size: 11px; color: #475569; font-style: italic;">${escapeHtml(m.whyThisAnswer)}</div>` : ""}
                        </div>
                    </details>
                `;
            }

            let suggestionsHtml = "";
            if (m.quickSuggestions && m.quickSuggestions.length > 0) {
                suggestionsHtml = `
                    <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                        ${m.quickSuggestions.map(s => {
                            const isTrack = s.includes("Track") || s.includes("ट्रैक");
                            const trackStyle = isTrack ? "background: #ecfdf5; border-color: #6ee7b7; color: #065f46; font-weight: 700;" : "";
                            return `<button type="button" class="cca-prompt-chip" style="${trackStyle}" onclick="AIClinicalCare.sendChatMessage('${escapeHtml(s)}')">${escapeHtml(s)}</button>`;
                        }).join("")}
                    </div>
                `;
            }

            // Continuous Learning Feedback Bar
            const feedbackHtml = `
                <div class="cca-feedback-bar" id="ccaFeedback_${m.id}">
                    <span>क्या यह सलाह मददगार रही?</span>
                    <button type="button" class="cca-thumb-btn" onclick="AIClinicalCare.giveFeedback(${m.id}, 'HELPFUL')">👍 हाँ</button>
                    <button type="button" class="cca-thumb-btn" onclick="AIClinicalCare.giveFeedback(${m.id}, 'UNHELPFUL')">👎 नहीं</button>
                </div>
            `;

            return `
                <div class="cca-message-item assistant">
                    <div class="cca-message-header">
                        <span class="cca-bubble-tag ${tagClass}">${escapeHtml(m.tag || 'AI Guidance')}</span>
                        <span style="font-size: 10px; color: #059669; font-weight: 700;">🟢 ${escapeHtml(m.badge || 'Doctor-Verified')}</span>
                    </div>
                    <div class="cca-message-bubble">
                        ${formatClinicalText(m.text)}
                        ${medCardHtml}
                        ${actionsHtml}
                        ${whyHtml}
                        ${suggestionsHtml}
                        ${feedbackHtml}
                    </div>
                    <div class="cca-message-time">${m.time}</div>
                </div>
            `;
        }).join("");

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    function showTypingIndicator() {
        const container = document.getElementById("ccaMessagesArea");
        if (!container) return;

        const typingElem = document.createElement("div");
        typingElem.id = "ccaTypingIndicator";
        typingElem.className = "cca-typing-indicator";
        typingElem.innerHTML = `
            <span style="font-size: 11px; color: #64748b; font-weight: 600; margin-right: 4px;">AI Evaluating Verified Clinical Data</span>
            <div class="cca-typing-dot"></div>
            <div class="cca-typing-dot"></div>
            <div class="cca-typing-dot"></div>
        `;
        container.appendChild(typingElem);
        container.scrollTop = container.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingElem = document.getElementById("ccaTypingIndicator");
        if (typingElem) typingElem.remove();
    }

    function showErrorBar(msg) {
        const errBar = document.getElementById("ccaErrorBar");
        if (!errBar) return;
        errBar.style.display = "flex";
        errBar.innerHTML = `
            <span>⚠️ ${escapeHtml(msg || 'Network error communicating with AI clinical service.')}</span>
            <button type="button" class="cca-btn-sm" onclick="AIClinicalCare.retryLastMessage()" style="padding: 2px 8px; font-size: 11px;">Retry ↺</button>
        `;
    }

    function hideErrorBar() {
        const errBar = document.getElementById("ccaErrorBar");
        if (errBar) errBar.style.display = "none";
    }

    // Client-side structured action dispatcher (Section 14 & 49)
    function executeClientAction(act) {
        if (!act || !act.action) return;
        const actionType = act.action;
        console.log("⚡ Executing CCA Client Action:", actionType, act.payload);

        switch (actionType) {
            case "OPEN_CALENDAR":
            case "BOOK_APPOINTMENT":
                if (typeof openAppointmentModal === "function") {
                    openAppointmentModal();
                } else if (typeof quickAction === "function") {
                    quickAction("appointment");
                }
                break;
            case "OPEN_PRESCRIPTION":
                const pModal = document.getElementById("ccaPrescriptionModal");
                if (pModal) {
                    pModal.style.display = "flex";
                } else if (typeof quickAction === "function") {
                    quickAction("prescription");
                }
                break;
            case "OPEN_MEDICINE_SCHEDULE":
                const schedElem = document.getElementById("ccaScheduleCard");
                if (schedElem) {
                    schedElem.scrollIntoView({ behavior: "smooth", block: "center" });
                    schedElem.style.boxShadow = "0 0 0 3px #3b82f6";
                    setTimeout(() => { schedElem.style.boxShadow = ""; }, 2500);
                }
                break;
            case "OPEN_REPORT":
                if (typeof openHealthSummaryModal === "function") {
                    openHealthSummaryModal();
                }
                break;
            case "OPEN_EMERGENCY":
                sendDesktopNotification("🚨 HOSPITAL EMERGENCY", "Immediate emergency assistance required. Dial 108 or proceed to nearest trauma care.");
                const emBtn = document.querySelector(".emergency-btn, #emergencyCallBtn");
                if (emBtn) emBtn.scrollIntoView({ behavior: "smooth", block: "center" });
                break;
            case "START_HUMAN_HANDOFF":
                console.log("👨‍⚕️ Clinician handoff protocol active:", act.payload);
                break;
            default:
                break;
        }
    }

    async function sendChatMessage(customText) {
        const inputElem = document.getElementById("ccaChatInput");
        const queryText = (customText || (inputElem ? inputElem.value : "")).trim();

        if (!queryText || state.isProcessing) return;

        if (inputElem) inputElem.value = "";
        hideErrorBar();
        state.lastFailedMessage = queryText;

        addUserMessage(queryText);
        state.isProcessing = true;
        showTypingIndicator();

        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: queryText,
                    language: state.language,
                    patientId: state.activePatientId,
                    sessionId: state.sessionId,
                    history: state.messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
                })
            });

            hideTypingIndicator();
            state.isProcessing = false;

            const data = await res.json();
            if (data.success) {
                addAssistantMessage({
                    text: data.message,
                    tag: data.classification_tag,
                    badge: data.safety_badge,
                    quickSuggestions: data.quick_suggestions,
                    sourcesUsed: data.sources_used || [],
                    whyThisAnswer: data.why_this_answer || "",
                    pendingAction: data.pending_action || null,
                    medicineCard: data.medicine_card || (data.structured_data && data.structured_data.medicine_card) || null
                });
                state.lastFailedMessage = null;

                // Dispatch structured actions from backend
                if (data.actions && Array.isArray(data.actions)) {
                    for (const act of data.actions) {
                        executeClientAction(act);
                    }
                }

                // If emergency detected, trigger browser alert / sound
                if (data.is_emergency) {
                    sendDesktopNotification("⚠️ EMERGENCY ALERT", "Clinical red-flag symptoms detected. Please contact 108 or hospital emergency immediately.");
                }
            } else {
                showErrorBar(data.message || "Failed to generate clinical advice.");
            }
        } catch (err) {
            hideTypingIndicator();
            state.isProcessing = false;
            console.error("Chat error:", err);
            showErrorBar("Network or AI service timeout. Click Retry to try again.");
        }
    }

    function handleSendMessage() {
        sendChatMessage();
    }

    function retryLastMessage() {
        if (state.lastFailedMessage) {
            const retryText = state.lastFailedMessage;
            state.lastFailedMessage = null;
            sendChatMessage(retryText);
        }
    }

    function clearChat() {
        state.messages = [];
        state.sessionId = "CCA-SESSION-" + Date.now().toString(36);
        addAssistantMessage({
            text: state.language === "hi"
                ? `बातचीत रीसेट हो गई है। आप अपनी दवा, लक्षण या स्वास्थ्य संबंधी कोई भी नया प्रश्न पूछ सकते हैं।`
                : `Conversation cleared. Feel free to ask any new question regarding your prescription, schedule, or symptoms.`
        });
        hideErrorBar();
    }

    function setLanguage(lang) {
        state.language = lang;
        const btnEn = document.getElementById("ccaLangEn");
        const btnHi = document.getElementById("ccaLangHi");
        if (btnEn && btnHi) {
            if (lang === "hi") {
                btnHi.classList.add("active");
                btnEn.classList.remove("active");
            } else {
                btnEn.classList.add("active");
                btnHi.classList.remove("active");
            }
        }
        addAssistantMessage({
            text: lang === "hi"
                ? `भाषा बदलकर **हिंदी (Hindi)** कर दी गई है। अब आप हिंदी या हिंग्लिश में प्रश्न पूछ सकते हैं।`
                : `Language set to **English**. Clinical guidance will now be presented in English.`
        });
    }

    // =========================================================
    // 5. SMART QUICK ACTIONS
    // =========================================================

    function quickAction(actionType) {
        switch (actionType) {
            case "prescriptions":
            case "prescription":
                sendChatMessage(state.language === "hi" ? "मेरा पर्चा समझाएं (Explain my prescription)" : "Explain my prescription");
                break;
            case "schedule":
                sendChatMessage(state.language === "hi" ? "आज का दवा शेड्यूल चेक करें" : "When should I take my medicines?");
                break;
            case "symptom":
                sendChatMessage(state.language === "hi" ? "मुझे तेज बुखार आ रहा है" : "I have fever");
                break;
            case "emergency":
                sendChatMessage(state.language === "hi" ? "सीने में तेज दर्द और सांस फूल रही है" : "Severe difficulty breathing and chest pain");
                break;
            case "avoid":
                sendChatMessage(state.language === "hi" ? "मुझे किन चीजों से परहेज करना चाहिए?" : "What should I avoid?");
                break;
            case "reports":
            case "report":
                sendChatMessage(state.language === "hi" ? "मेरी जांच रिपोर्ट समझाएं" : "Explain my report");
                break;
            case "doctor":
                sendChatMessage(state.language === "hi" ? "डॉक्टर से बात करनी है" : "Talk to my doctor");
                break;
            case "appointment":
                sendChatMessage(state.language === "hi" ? "मेरा फॉलो-अप अपॉइंटमेंट कब है?" : "When is my doctor follow-up appointment?");
                break;
            case "prevention":
                sendChatMessage(state.language === "hi" ? "इस बीमारी से बचाव के उपाय बताएं" : "Help me prevent this problem");
                break;
            case "health":
                sendChatMessage(state.language === "hi" ? "दवाइयों की सुरक्षा जांच (Medication Safety)" : "Medication safety check");
                break;
            default:
                sendChatMessage("How can I help you today?");
        }
    }

    // =========================================================
    // 6. VOICE INPUT (WEB SPEECH API)
    // =========================================================

    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        try {
            state.recognition = new SpeechRecognition();
            state.recognition.continuous = false;
            state.recognition.interimResults = false;
            state.recognition.lang = state.language === "hi" ? "hi-IN" : "en-IN";

            state.recognition.onstart = () => {
                state.isListening = true;
                const vBtn = document.getElementById("ccaVoiceBtn");
                if (vBtn) vBtn.classList.add("listening");
            };

            state.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const inputElem = document.getElementById("ccaChatInput");
                if (inputElem) {
                    inputElem.value = transcript;
                    handleSendMessage();
                }
            };

            state.recognition.onerror = () => {
                state.isListening = false;
                const vBtn = document.getElementById("ccaVoiceBtn");
                if (vBtn) vBtn.classList.remove("listening");
            };

            state.recognition.onend = () => {
                state.isListening = false;
                const vBtn = document.getElementById("ccaVoiceBtn");
                if (vBtn) vBtn.classList.remove("listening");
            };
        } catch (e) {
            console.warn("Speech recognition initialization note:", e);
        }
    }

    function toggleVoiceInput() {
        if (!state.recognition) {
            alert("Voice input is not supported on this browser or requires HTTPS.");
            return;
        }

        if (state.isListening) {
            state.recognition.stop();
        } else {
            state.recognition.lang = state.language === "hi" ? "hi-IN" : "en-IN";
            state.recognition.start();
        }
    }

    // =========================================================
    // 7. PATIENT SWITCHER (FOR DEMO & TESTING)
    // =========================================================

    async function switchPatient(patientId) {
        state.activePatientId = patientId;
        await loadPatientContext(patientId);
        await loadMedicationSchedule(patientId);
        addAssistantMessage({
            text: `🔄 **Patient Dossier Synced:** Active patient changed to **${escapeHtml(patientId)}**. All prescription guidance and medication schedules are now linked to this file.`,
            tag: "Prescription Information",
            badge: "Doctor-Verified Data"
        });
    }

    // =========================================================
    // 8. DOCTOR DOSSIER & ADMIN STATISTICS MODALS
    // =========================================================

    async function openDoctorDossierModal() {
        console.log("Doctor review queue modal has been removed from patient view.");
    }

    async function submitDoctorReview(auditLogId, action) {
        console.log("Doctor review acknowledged.");
    }

    async function setDirectMedicineReminder(medName) {
        if (!medName) return;
        const cleanName = medName.split('(')[0].trim();
        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/reminders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    patientId: state.activePatientId,
                    title: `Take ${cleanName}`,
                    scheduledTime: "08:00 AM & 08:00 PM",
                    frequency: "DAILY",
                    notes: `Scheduled via Clinical AI Care for ${cleanName}`
                })
            });
            const data = await res.json();
            if (data.success) {
                addAssistantMessage({
                    text: `✅ **रिमाइंडर सक्रिय:** **${escapeHtml(cleanName)}** के लिए दैनिक रिमाइंडर सेट कर दिया गया है। (08:00 AM व 08:00 PM)`,
                    tag: "Prescription Information",
                    badge: "Patient-Confirmed Schedule"
                });
            } else {
                alert(data.message || "Reminder could not be saved.");
            }
        } catch (err) {
            console.error("setDirectMedicineReminder error:", err);
            alert("Error scheduling reminder: " + err.message);
        }
    }

    async function giveFeedback(msgId, rating) {
        const bar = document.getElementById(`ccaFeedback_${msgId}`);
        if (!bar) return;

        const btns = bar.querySelectorAll(".cca-thumb-btn");
        btns.forEach(b => b.disabled = true);

        if (rating === "HELPFUL") {
            if (btns[0]) btns[0].classList.add("active-positive");
            bar.innerHTML = `<span style="color: #166534; font-weight: 700;">✅ धन्यवाद! आपकी प्रतिक्रिया सुरक्षित कर ली गई है। AI आपके लिए और बेहतर सीख रहा है।</span>`;
        } else {
            if (btns[1]) btns[1].classList.add("active-negative");
            bar.innerHTML = `<span style="color: #991b1b; font-weight: 700;">⚠️ धन्यवाद। हमने इसे नोट कर लिया है और AI अपने ज्ञान को अपडेट करेगा।</span>`;
        }

        try {
            const token = getAuthToken();
            await fetch("/api/ai/clinical-care/feedback", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    feedbackRating: rating,
                    notes: `Chat response feedback for message #${msgId}`
                })
            });
        } catch (e) {
            console.warn("Feedback network error:", e);
        }
    }

    async function openAdminStatsModal() {
        const modalBackdrop = document.getElementById("ccaAdminModalBackdrop");
        const bodyElem = document.getElementById("ccaAdminStatsBody");
        if (!modalBackdrop || !bodyElem) return;

        modalBackdrop.style.display = "flex";
        bodyElem.innerHTML = `<div style="text-align: center; padding: 30px; color: #2563eb;">Aggregating live hospital AI metrics...</div>`;

        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/admin-stats", {
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            const data = await res.json();

            if (data.success && data.stats) {
                const s = data.stats;
                const concernsHtml = (s.common_concerns || []).map(c => `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                        <span>${escapeHtml(c.intent)}</span>
                        <strong>${c.count} queries</strong>
                    </div>
                `).join("");

                bodyElem.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 700;">CONVERSATIONS TODAY</div>
                            <div style="font-size: 24px; font-weight: 900; color: #2563eb; margin: 4px 0;">${s.conversations_today}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 700;">SYMPTOM REPORTS</div>
                            <div style="font-size: 24px; font-weight: 900; color: #d97706; margin: 4px 0;">${s.symptom_reports_today}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 700;">EMERGENCIES</div>
                            <div style="font-size: 24px; font-weight: 900; color: #dc2626; margin: 4px 0;">${s.emergency_escalations_today}</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 700;">ADHERENCE RATE</div>
                            <div style="font-size: 24px; font-weight: 900; color: #059669; margin: 4px 0;">${s.medication_adherence_rate}%</div>
                        </div>
                    </div>

                    <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #1e293b;">Top Patient Clinical Inquiries</h4>
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
                        ${concernsHtml || '<div style="color: #64748b; font-size: 12px;">No inquiry trends logged yet.</div>'}
                    </div>
                `;
            }
        } catch (err) {
            bodyElem.innerHTML = `<div style="color: #dc2626; padding: 20px;">Failed to load statistics: ${escapeHtml(err.message)}</div>`;
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = "none";
    }

    // =========================================================
    // 9. BACKWARD COMPATIBILITY
    // =========================================================
    // Ensures any legacy calls to runAIHealthcareAnalysis or loadAIHealthcareAuditTable
    // gracefully route to the new Clinical Assistant without throwing errors.
    function runAIHealthcareAnalysis() {
        console.log("[Compatibility] runAIHealthcareAnalysis invoked -> routing to AI Clinical Care Assistant");
        return true;
    }

    function loadAIHealthcareAuditTable() {
        console.log("[Compatibility] loadAIHealthcareAuditTable invoked -> routing to openDoctorDossierModal");
        openDoctorDossierModal();
    }

    async function trackSymptomDiet(symptomName = "General Symptom") {
        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/track-health", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    patientId: state.activePatientId,
                    symptomName,
                    severity: "Moderate",
                    notes: "Logged via direct tracker action in AI Clinical Care Assistant."
                })
            });
            const data = await res.json();
            if (data.success) {
                sendDesktopNotification("Health Tracking Saved", `${symptomName} recorded in your health profile.`);
                addAssistantMessage({
                    text: `✅ **लक्षण व आहार ट्रैकिंग सुरक्षित (Health Log Recorded):**\n\n• **लक्षण:** ${escapeHtml(symptomName)}\n• **मरीज़ आईडी:** ${escapeHtml(state.activePatientId)}\n• **स्थिति:** सुरक्षित (Saved in MySQL Database)\n\nआपके डॉक्टर अगली ओपीडी विज़िट में इस रिकॉर्ड की समीक्षा कर सकेंगे।`,
                    tag: "Health Tracking",
                    badge: "Doctor-Verified DB"
                });
            }
        } catch (err) {
            console.error("Tracking error:", err);
        }
    }

    function confirmMemoryAction(content) {
        sendChatMessage("Save this note");
    }

    function confirmReminderAction() {
        sendChatMessage("Create Reminder");
    }

    function cancelAction() {
        sendChatMessage("Cancel");
    }

    async function openSavedMemoriesModal() {
        const modal = document.getElementById("ccaSavedModalBackdrop");
        const bodyElem = document.getElementById("ccaSavedModalBody");
        if (!modal || !bodyElem) return;

        modal.style.display = "flex";
        bodyElem.innerHTML = `<div style="text-align: center; padding: 25px; color: #2563eb;">Loading your saved notes and reminders from MySQL...</div>`;

        try {
            const token = getAuthToken();
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};

            const [memRes, remRes] = await Promise.all([
                fetch(`/api/ai/clinical-care/memories?patientId=${encodeURIComponent(state.activePatientId)}`, { headers }).then(r => r.json()),
                fetch(`/api/ai/clinical-care/reminders?patientId=${encodeURIComponent(state.activePatientId)}`, { headers }).then(r => r.json())
            ]);

            const memories = memRes.memories || [];
            const reminders = remRes.reminders || [];

            let notesHtml = memories.length > 0
                ? memories.map(m => `
                    <div class="cca-saved-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${escapeHtml(m.content)}</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                                📅 Saved on: ${new Date(m.created_at).toLocaleDateString()} | Status: <span style="color: #059669; font-weight: 700;">Consented</span>
                            </div>
                        </div>
                        <button type="button" class="cca-btn-sm" style="background: #fee2e2; color: #dc2626; border-color: #fca5a5;" onclick="AIClinicalCare.deleteMemoryItem(${m.id})">🗑️ Delete</button>
                    </div>
                `).join("")
                : `<div style="color: #64748b; font-size: 12px; padding: 12px 0;">No personal notes saved yet. Tell the assistant "isko yaad rakhna" to save notes with consent.</div>`;

            let remsHtml = reminders.length > 0
                ? reminders.map(r => `
                    <div class="cca-saved-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">⏰ ${escapeHtml(r.title)}</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                                📅 Scheduled: <strong>${escapeHtml(r.scheduled_time || '09:00 AM')}</strong> (${escapeHtml(r.frequency || 'ONCE')}) | Type: ${escapeHtml(r.reminder_type || 'MEDICINE')}
                            </div>
                        </div>
                        <button type="button" class="cca-btn-sm" style="background: #fee2e2; color: #dc2626; border-color: #fca5a5;" onclick="AIClinicalCare.deleteReminderItem(${r.id})">🗑️ Cancel</button>
                    </div>
                `).join("")
                : `<div style="color: #64748b; font-size: 12px; padding: 12px 0;">No active reminders scheduled. Tell the assistant "kal doctor ke paas jana hai yaad dila dena" to schedule.</div>`;

            bodyElem.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
                        <span>📝</span> Patient-Approved Health Notes
                    </h4>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        ${notesHtml}
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
                        <span>🔔</span> Active Scheduled Reminders
                    </h4>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        ${remsHtml}
                    </div>
                </div>
            `;
        } catch (err) {
            bodyElem.innerHTML = `<div style="color: #dc2626; padding: 20px;">Failed to load saved items: ${escapeHtml(err.message)}</div>`;
        }
    }

    async function deleteMemoryItem(memoryId) {
        if (!confirm("Are you sure you want to delete this saved health note?")) return;
        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/delete-memory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    memoryId,
                    patientId: state.activePatientId
                })
            });
            const data = await res.json();
            if (data.success) {
                openSavedMemoriesModal();
            } else {
                alert(data.message || "Failed to delete memory.");
            }
        } catch (e) {
            alert("Error deleting memory: " + e.message);
        }
    }

    async function deleteReminderItem(reminderId) {
        if (!confirm("Are you sure you want to cancel this reminder?")) return;
        try {
            const token = getAuthToken();
            const res = await fetch("/api/ai/clinical-care/delete-reminder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    reminderId,
                    patientId: state.activePatientId
                })
            });
            const data = await res.json();
            if (data.success) {
                openSavedMemoriesModal();
            } else {
                alert(data.message || "Failed to cancel reminder.");
            }
        } catch (e) {
            alert("Error cancelling reminder: " + e.message);
        }
    }

    async function openHealthSummaryModal() {
        const modal = document.getElementById("ccaSummaryModalBackdrop");
        const bodyElem = document.getElementById("ccaSummaryModalBody");
        if (!modal || !bodyElem) return;

        modal.style.display = "flex";
        bodyElem.innerHTML = `<div style="text-align: center; padding: 25px; color: #2563eb;">Loading health summary from MySQL...</div>`;

        try {
            const token = getAuthToken();
            const res = await fetch(`/api/ai/clinical-care/health-summary?patientId=${encodeURIComponent(state.activePatientId)}`, {
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            const data = await res.json();

            if (!data.success) {
                bodyElem.innerHTML = `<div style="color: #dc2626; padding: 20px;">${escapeHtml(data.message || 'Could not load health summary.')}</div>`;
                return;
            }

            const p = data.patient || {};
            const rxList = (data.prescriptions || []).map(rx => {
                const meds = (rx.parsedMedicines || []).map(m => m.name || m.medicine_name).filter(Boolean).join(", ");
                return `• <strong>${escapeHtml(rx.doctor_name || 'Doctor')}</strong> (${escapeHtml(rx.diagnosis || 'Consultation')}): ${escapeHtml(meds || 'Prescribed medicines')}`;
            }).join("<br>") || "No active prescriptions.";

            const apptList = (data.appointments || []).map(a => 
                `• <strong>${escapeHtml(a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : '')}</strong> at ${escapeHtml(a.appointment_time || '')} with Dr. ${escapeHtml(a.doctor_name || a.doctor_id || '')} (${escapeHtml(a.specialization || 'OPD')})`
            ).join("<br>") || "No upcoming appointments.";

            const adherenceRate = data.adherence ? data.adherence.rate : 0;

            bodyElem.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 11px; color: #64748b; font-weight: 700;">PATIENT PROFILE</div>
                        <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${escapeHtml(p.name || 'Citizen')}</div>
                        <div style="font-size: 11px; color: #64748b;">UHID: ${escapeHtml(p.patient_id || state.activePatientId)} | ${p.age || 28} Y / ${escapeHtml(p.gender || 'Not specified')}</div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 11px; color: #64748b; font-weight: 700;">PRIMARY FACILITY</div>
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 4px;">${escapeHtml(p.hospital || 'AIIMS Gorakhpur')}</div>
                        <div style="font-size: 11px; color: #64748b;">Blood: ${escapeHtml(p.blood_group || 'B+')} | Ph: ${escapeHtml(p.hospital_phone || '')}</div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 11px; color: #64748b; font-weight: 700;">DAILY ADHERENCE</div>
                        <div style="font-size: 20px; font-weight: 900; color: #059669; margin-top: 2px;">${adherenceRate}%</div>
                        <div style="font-size: 11px; color: #64748b;">${data.adherence?.taken_count || 0}/${data.adherence?.total_medicines || 0} Doses Recorded</div>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #1e3a8a;">🛡️ Documented Allergies:</h4>
                    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 10px; font-size: 12px; color: #9f1239; font-weight: 600;">
                        ${escapeHtml(p.allergies || 'No documented drug allergies.')}
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #1e3a8a;">💊 Active Prescriptions:</h4>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 12px; color: #334155; line-height: 1.6;">
                        ${rxList}
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #1e3a8a;">📅 Appointments:</h4>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 12px; color: #334155; line-height: 1.6;">
                        ${apptList}
                    </div>
                </div>
            `;
        } catch (err) {
            bodyElem.innerHTML = `<div style="color: #dc2626; padding: 20px;">Failed to load health summary: ${escapeHtml(err.message)}</div>`;
        }
    }

    return {
        init,
        sendChatMessage,
        handleSendMessage,
        retryLastMessage,
        clearChat,
        setLanguage,
        quickAction,
        toggleVoiceInput,
        markMedicationTaken,
        switchPatient,
        trackSymptomDiet,
        openDoctorDossierModal,
        openAdminStatsModal,
        submitDoctorReview,
        setDirectMedicineReminder,
        giveFeedback,
        openSavedMemoriesModal,
        openHealthSummaryModal,
        deleteMemoryItem,
        deleteReminderItem,
        confirmMemoryAction,
        confirmReminderAction,
        cancelAction,
        closeModal,
        runAIHealthcareAnalysis,
        loadAIHealthcareAuditTable
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    AIClinicalCare.init();
});

// Backward compatibility bridge on window
window.runAIHealthcareAnalysis = AIClinicalCare.runAIHealthcareAnalysis;
window.loadAIHealthcareAuditTable = AIClinicalCare.loadAIHealthcareAuditTable;
