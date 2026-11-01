const fs = require('fs');
const path = 'frontend/pages/emergency/emergency.html';
let content = fs.readFileSync(path, 'utf8');

const ambulanceModalHtml = `
    <!-- =====================================================
         HOSPITAL NETWORK AMBULANCE DISPATCH & LIVE TRACKING MODAL
    ====================================================== -->
    <div
        class="modal-overlay"
        id="ambulanceModal"
        style="display: none; align-items: center; justify-content: center; z-index: 5000;"
    >
        <div class="modal ambulance-modal-box">
            <button
                type="button"
                class="close-btn"
                onclick="closeAmbulanceModal()"
                aria-label="Close Ambulance Modal"
            >
                ×
            </button>

            <div class="modal-icon" style="font-size: 32px; margin-bottom: 6px;">
                🚑
            </div>

            <h2 style="margin: 0 0 6px;">
                Ambulance Dispatch &amp; Live Tracking
            </h2>

            <p class="modal-subtitle" style="color: #94a3b8; font-size: 13px; margin: 0 0 16px;">
                Connected to Gorakhpur Accredited Hospital Network (AIIMS, BRD Medical College, District Hospital) with real-time GPS telemetry and traffic green-wave priority.
            </p>

            <!-- Emergency request bar: capture patient location + destination hospital -->
            <div id="ambulanceRequestBar" class="ambulance-request-bar">
                <button type="button" class="emergency-request-btn" id="btnEmergencyRequest" onclick="startEmergencyRequest()">
                    🚨 Request Emergency Ambulance (1-Click Auto Dispatch)
                </button>
                <div id="emergencyRequestPanel" class="emergency-request-panel" style="display:none;"></div>
            </div>

            <div id="ambulanceResult">
                <!-- Map Container -->
                <div id="ambulanceMap" class="ambulance-map"></div>

                <!-- Live route / ETA / status panel for the ambulance currently being tracked -->
                <div id="ambulanceRoutePanel" class="ambulance-route-panel"></div>

                <!-- Active Hospital Fleet Directory -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin: 18px 0 10px;">
                    <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #f8fafc;">
                        Active Hospital Fleet Ambulances
                    </h3>
                    <span style="font-size: 12px; color: #10b981; font-weight: 600;">
                        ● Live Telemetry Active
                    </span>
                </div>
                <div id="ambulanceList" class="ambulance-list"></div>
            </div>

            <div class="ambulance-actions" style="margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button
                    type="button"
                    class="refresh-btn"
                    onclick="refreshAmbulance()"
                    style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; background: rgba(255, 255, 255, 0.1); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.15);"
                >
                    🔄 Refresh Ambulances
                </button>

                <a
                    href="../hospital/hospital.html"
                    style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; background: #2563eb; color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 6px;"
                >
                    🏥 View Hospital Beds
                </a>

                <button
                    type="button"
                    onclick="window.location.href='tel:108'"
                    style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; background: #dc2626; color: #fff; border: 0;"
                >
                    📞 Call 108 Emergency
                </button>
            </div>
        </div>
    </div>
`;

if (!content.includes('id="ambulanceModal"')) {
    const marker = 'id="emergencyModal"';
    const idx = content.indexOf(marker);
    if (idx !== -1) {
        // Find preceding modal-overlay
        const overlayIdx = content.lastIndexOf('<div', idx);
        content = content.slice(0, overlayIdx) + ambulanceModalHtml + '\n\n    ' + content.slice(overlayIdx);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully injected ambulanceModal into emergency.html');
    } else {
        console.error('emergencyModal marker not found');
    }
} else {
    console.log('ambulanceModal already present in emergency.html');
}

