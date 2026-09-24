/**
 * SmartCity Gorakhpur - Shared Authentication Helper
 * ---------------------------------------------------
 * Provides JWT token storage, session management, cross-tab synchronization,
 * universal login modal, global notification bell drawer, and an automatic
 * Authorization-header fetch wrapper for all pages.
 *
 * Usage:
 *   SmartCityAuth.setSession(token, user)   - called after login
 *   SmartCityAuth.getToken()                - retrieve stored JWT
 *   SmartCityAuth.getUser()                 - retrieve stored user object
 *   SmartCityAuth.isAuthenticated()         - true if a valid token exists
 *   SmartCityAuth.isStaff()                 - true if logged-in user is staff/admin
 *   SmartCityAuth.isCitizen()               - true if logged-in user is citizen
 *   SmartCityAuth.getRole()                 - returns user role (citizen, staff, admin)
 *   SmartCityAuth.getDepartment()           - returns user department
 *   SmartCityAuth.canEdit(dept)             - returns boolean permission for department
 *   SmartCityAuth.logout()                  - clears session
 *   SmartCityAuth.fetch(url, options)       - fetch wrapper with Bearer token
 *   SmartCityAuth.showLoginModal()          - opens universal login modal on any page
 */

const SmartCityAuth = (() => {
    const TOKEN_KEY = "smartCityJWT";
    const USER_KEY  = "smartCityCurrentUser";

    // Dynamic API Base URL resolution
    function _getApiBase() {
        if (typeof window !== "undefined" && window.API_BASE_URL) return window.API_BASE_URL;
        if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http")) {
            return window.location.port === "5000" ? window.location.origin : (window.location.protocol === "file:" ? "http://localhost:5000" : "");
        }
        return "http://localhost:5000";
    }

    // -------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------

    function _decodePayload(token) {
        try {
            const base64Url = token.split(".")[1];
            if (!base64Url) return null;
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
            );
            return JSON.parse(jsonPayload);
        } catch {
            return null;
        }
    }

    function _isTokenExpired(token) {
        const payload = _decodePayload(token);
        if (!payload || !payload.exp) return true;
        return Date.now() / 1000 > payload.exp - 10;
    }

    function _escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[m]);
    }

    // -------------------------------------------------------
    // PUBLIC SESSION API & STRICT DATA ISOLATION
    // -------------------------------------------------------

    function _clearUserDataCache() {
        const userSpecificKeys = [
            "patientId",
            "smartCityUserBookings",
            "smartCityActivePass",
            "smartcity_primary_vehicle",
            "smartCityEmergencies",
            "smartCityPoliceIncidents",
            "smartBinsCache",
            "selectedHospitalId",
            "selectedHospital",
            "smartcity_active_doctor",
            "waterRole",
            "parkingRole",
            "parking_staff_auth",
            "smartCityUser"
        ];
        userSpecificKeys.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });
    }

    async function _syncCitizenPatientProfile() {
        try {
            const res = await authFetch(`${_getApiBase()}/api/patients`);
            if (res.ok) {
                const data = await res.json();
                if (data.patients && data.patients.length > 0) {
                    localStorage.setItem("patientId", data.patients[0].patient_id);
                    renderUserHeader();
                } else {
                    localStorage.removeItem("patientId");
                    renderUserHeader();
                }
            }
        } catch (_) {}
    }

    function setSession(token, user) {
        // Enforce strict data isolation: purge previous user's cached storage
        _clearUserDataCache();

        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem("smartcity_auth_token", token);
            localStorage.setItem("token", token);
            localStorage.setItem("smartCityJWT", token);
        }
        if (user) {
            const userStr = JSON.stringify(user);
            localStorage.setItem(USER_KEY, userStr);
            localStorage.setItem("smartcity_user", userStr);
            localStorage.setItem("currentUser", userStr);
            localStorage.setItem("smartCityCurrentUser", userStr);
        }
        renderUserHeader();
        refreshNotificationCount();

        // If citizen, automatically load strictly their own patient dossier if registered
        if (user && (user.role || user.type || "").toLowerCase() === "citizen") {
            _syncCitizenPatientProfile();
        }

        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("smartcity:auth-change", { detail: { token, user } }));
        }
    }

    function getToken() {
        const token = localStorage.getItem(TOKEN_KEY) ||
                      localStorage.getItem("smartcity_auth_token") ||
                      localStorage.getItem("token") ||
                      localStorage.getItem("smartCityJWT");
        if (!token) return null;
        if (_isTokenExpired(token)) {
            logout();
            return null;
        }
        return token;
    }

    function getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY) ||
                        localStorage.getItem("smartcity_user") ||
                        localStorage.getItem("currentUser") ||
                        localStorage.getItem("smartCityCurrentUser");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function isAuthenticated() {
        return getToken() !== null;
    }

    function isStaff() {
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "staff" || role === "admin" || role === "doctor";
    }

    function isCitizen() {
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "citizen";
    }

    function getRole() {
        const user = getUser();
        return user ? (user.role || user.type || "citizen").toLowerCase() : "guest";
    }

    function getDepartment() {
        const user = getUser();
        return user && user.department ? user.department.toLowerCase() : null;
    }

    function canEdit(department) {
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        if (role === "admin") return true;
        if (role === "staff") {
            const userDept = (user.department || "").toLowerCase();
            const targetDept = (department || "").toLowerCase();
            return userDept === targetDept;
        }
        return false;
    }

    function logout() {
        _clearUserDataCache();
        const authKeys = [
            TOKEN_KEY, USER_KEY,
            "smartcity_auth_token", "token", "smartCityJWT",
            "smartcity_user", "currentUser", "smartCityCurrentUser"
        ];
        authKeys.forEach(k => {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
        });
        renderUserHeader();
        refreshNotificationCount();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("smartcity:auth-change", { detail: { token: null, user: null } }));
            window.location.reload();
        }
    }

    async function authFetch(url, options = {}) {
        const token = getToken();
        const headers = Object.assign({}, options.headers || {});
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url, Object.assign({}, options, { headers }));
        if (res.status === 401 && token) {
            logout();
        }
        return res;
    }

    // -------------------------------------------------------
    // GLOBAL NOTIFICATIONS
    // -------------------------------------------------------

    async function refreshNotificationCount() {
        const countBadge = document.getElementById("scGlobalNotifCount");
        if (!countBadge) return;

        if (!isAuthenticated()) {
            countBadge.style.display = "none";
            return;
        }

        try {
            const res = await authFetch(`${_getApiBase()}/api/notifications/unread-count`);
            if (res.ok) {
                const data = await res.json();
                const unread = data.unreadCount || 0;
                if (unread > 0) {
                    countBadge.textContent = unread > 99 ? "99+" : unread;
                    countBadge.style.display = "inline-flex";
                } else {
                    countBadge.style.display = "none";
                }
            }
        } catch (e) {}
    }

    async function toggleNotificationDrawer() {
        let drawer = document.getElementById("scGlobalNotifDrawer");
        if (drawer) {
            drawer.remove();
            return;
        }

        if (!isAuthenticated()) {
            showLoginModal("citizen");
            return;
        }

        drawer = document.createElement("div");
        drawer.id = "scGlobalNotifDrawer";
        drawer.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            width: 360px;
            max-width: calc(100vw - 40px);
            max-height: 480px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #f1f5f9;
        `;

        drawer.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(30,41,59,0.5);">
                <div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:14px;">
                    <span>🔔</span> Notifications
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button id="scNotifMarkAllReadBtn" style="background:transparent; border:none; color:#38bdf8; font-size:12px; cursor:pointer; padding:2px 4px;">Mark all read</button>
                    <button id="scNotifCloseBtn" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; line-height:1;">✕</button>
                </div>
            </div>
            <div id="scNotifList" style="overflow-y:auto; flex:1; padding:10px; display:flex; flex-direction:column; gap:8px;">
                <div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">Loading notifications...</div>
            </div>
        `;

        document.body.appendChild(drawer);

        drawer.querySelector("#scNotifCloseBtn").addEventListener("click", () => drawer.remove());
        drawer.querySelector("#scNotifMarkAllReadBtn").addEventListener("click", async () => {
            try {
                await authFetch(`${_getApiBase()}/api/notifications/read-all`, { method: "PUT" });
                refreshNotificationCount();
                loadNotifications();
            } catch (e) {}
        });

        async function loadNotifications() {
            const listEl = drawer.querySelector("#scNotifList");
            try {
                const res = await authFetch(`${_getApiBase()}/api/notifications`);
                if (res.ok) {
                    const { data } = await res.json();
                    if (!data || data.length === 0) {
                        listEl.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">No notifications yet.</div>`;
                        return;
                    }

                    listEl.innerHTML = data.map(n => `
                        <div style="background:${n.is_read ? 'rgba(30,41,59,0.4)' : 'rgba(56,189,248,0.08)'}; border:1px solid ${n.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.3)'}; border-radius:8px; padding:10px; font-size:12px;">
                            <div style="font-weight:700; color:${n.is_read ? '#cbd5e1' : '#38bdf8'}; margin-bottom:3px; display:flex; justify-content:space-between;">
                                <span>${_escapeHtml(n.title)}</span>
                                <span style="font-size:10px; color:#94a3b8;">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style="color:#e2e8f0; line-height:1.4;">${_escapeHtml(n.message)}</div>
                        </div>
                    `).join("");
                }
            } catch (err) {
                listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#f87171; font-size:12px;">Failed to load notifications.</div>`;
            }
        }

        loadNotifications();
    }

    // -------------------------------------------------------
    // QUICK PERSONA LOGIN HELPER
    // -------------------------------------------------------
    async function quickLoginPersona(roleKey) {
        let endpoint = `${_getApiBase()}/api/login`;
        let payload = {};

        if (roleKey === "citizen") {
            payload = { loginId: "6306880179", password: "password123" };
        } else if (roleKey === "citizen2") {
            payload = { loginId: "9876543210", password: "citizen123" };
        } else if (roleKey === "traffic") {
            endpoint = `${_getApiBase()}/api/staff-login`;
            payload = { staffId: "TR-VERMA", password: "verma123" };
        } else if (roleKey === "hospital") {
            endpoint = `${_getApiBase()}/api/staff-login`;
            payload = { staffId: "STAFF-001", password: "admin123" };
        } else if (roleKey === "admin") {
            endpoint = `${_getApiBase()}/api/staff-login`;
            payload = { staffId: "TR-ADMIN", password: "admin123" };
        }

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.token) {
                setSession(data.token, data.user);
                const actModal = document.getElementById("scActivityCenterModal");
                if (actModal) actModal.remove();
                const logModal = document.getElementById("scGlobalLoginModal");
                if (logModal) logModal.remove();
                renderUserHeader();
                window.location.reload();
            } else {
                alert("Login failed: " + (data.message || "Invalid credentials"));
            }
        } catch (e) {
            alert("Connection error: " + e.message);
        }
    }

    // -------------------------------------------------------
    // CITIZEN & STAFF ACTIVITY CENTER MODAL
    // -------------------------------------------------------
    function openActivityCenter(defaultTab = "requests") {
        const existing = document.getElementById("scActivityCenterModal");
        if (existing) existing.remove();

        const currentUser = getUser();
        if (!currentUser) {
            showLoginModal("citizen", { message: "Please sign in to view your activity history." });
            return;
        }

        const isStaffUser = isStaff();
        const modal = document.createElement("div");
        modal.id = "scActivityCenterModal";
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(8px);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
        `;

        modal.innerHTML = `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; width:100%; max-width:850px; max-height:88vh; box-shadow:0 25px 60px rgba(15,23,42,0.25); display:flex; flex-direction:column; overflow:hidden;">
                <!-- Header -->
                <div style="padding:18px 24px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; background:#f8fafc;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:42px; height:42px; border-radius:12px; background:#eff6ff; display:flex; align-items:center; justify-content:center; font-size:22px;">📊</div>
                        <div>
                            <h2 style="font-size:18px; font-weight:800; color:#0f172a; margin:0;">Activity Center &amp; Citizen Dossier</h2>
                            <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Live tracking of service requests, healthcare appointments, and municipal reservations</p>
                        </div>
                    </div>
                    <button id="scActivityCloseBtn" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; color:#64748b; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">✕</button>
                </div>

                <!-- Tabs -->
                <div style="display:flex; border-bottom:1px solid #e2e8f0; background:#f8fafc; padding:0 20px; gap:8px;">
                    <button class="sc-act-tab active" data-tab="requests" style="padding:12px 16px; border:none; background:transparent; font-size:13px; font-weight:700; color:#2563eb; border-bottom:2px solid #2563eb; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <span>📋</span> Grievances &amp; Requests
                    </button>
                    <button class="sc-act-tab" data-tab="appointments" style="padding:12px 16px; border:none; background:transparent; font-size:13px; font-weight:600; color:#64748b; border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <span>🏥</span> Health &amp; Doctors
                    </button>
                    <button class="sc-act-tab" data-tab="parking" style="padding:12px 16px; border:none; background:transparent; font-size:13px; font-weight:600; color:#64748b; border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <span>🅿️</span> Parking Passes
                    </button>
                    <button class="sc-act-tab" data-tab="security" style="padding:12px 16px; border:none; background:transparent; font-size:13px; font-weight:600; color:#64748b; border-bottom:2px solid transparent; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <span>🛡️</span> Session &amp; Demo Roles
                    </button>
                </div>

                <!-- Content Area -->
                <div id="scActivityContent" style="padding:22px; overflow-y:auto; flex:1; background:#ffffff;">
                    <div style="text-align:center; padding:40px; color:#64748b; font-size:13px;">Loading your activity...</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector("#scActivityCloseBtn").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        const tabBtns = modal.querySelectorAll(".sc-act-tab");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                tabBtns.forEach(b => {
                    b.classList.remove("active");
                    b.style.color = "#64748b";
                    b.style.fontWeight = "600";
                    b.style.borderBottom = "2px solid transparent";
                });
                btn.classList.add("active");
                btn.style.color = "#2563eb";
                btn.style.fontWeight = "700";
                btn.style.borderBottom = "2px solid #2563eb";
                loadTabContent(btn.getAttribute("data-tab"));
            });
        });

        async function loadTabContent(tab) {
            const container = modal.querySelector("#scActivityContent");
            container.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b; font-size:13px;">Loading...</div>`;

            if (tab === "requests") {
                try {
                    const res = await authFetch(`${_getApiBase()}/api/requests`);
                    const json = await res.json();
                    const list = json.data || json.requests || (Array.isArray(json) ? json : []);

                    if (!list || list.length === 0) {
                        container.innerHTML = `
                            <div style="text-align:center; padding:45px 20px;">
                                <div style="font-size:40px; margin-bottom:10px;">📋</div>
                                <h3 style="font-size:16px; font-weight:700; color:#0f172a; margin-bottom:6px;">No Service Requests Found</h3>
                                <p style="font-size:13px; color:#64748b; max-width:380px; margin:0 auto 16px auto;">You haven't lodged any municipal complaints yet. You can report civic issues with instant SLA tracking.</p>
                                <button onclick="document.getElementById('scActivityCenterModal').remove(); if(typeof openGrievanceModal === 'function') openGrievanceModal();" style="background:#2563eb; color:#fff; border:none; padding:10px 18px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer;">✍️ Lodge New Grievance</button>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                            <span style="font-size:13px; font-weight:700; color:#0f172a;">${list.length} Registered Requests</span>
                            <button onclick="document.getElementById('scActivityCenterModal').remove(); if(typeof openGrievanceModal === 'function') openGrievanceModal();" style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">+ New Complaint</button>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${list.map(r => {
                                const statusColor = r.status === 'Resolved' ? '#10b981' : (r.status === 'In Progress' ? '#f59e0b' : '#3b82f6');
                                const statusBg = r.status === 'Resolved' ? '#ecfdf5' : (r.status === 'In Progress' ? '#fffbeb' : '#eff6ff');
                                const priorityColor = r.priority === 'CRITICAL' ? '#dc2626' : (r.priority === 'HIGH' ? '#ea580c' : '#0284c7');
                                return `
                                    <div style="border:1px solid #e2e8f0; border-radius:14px; padding:16px; background:#f8fafc; display:flex; flex-direction:column; gap:8px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <div style="display:flex; align-items:center; gap:8px;">
                                                <span style="font-family:monospace; font-weight:700; font-size:13px; color:#0f172a; background:#e2e8f0; padding:2px 8px; border-radius:6px;">${_escapeHtml(r.request_code || r.tracking_id || 'REQ')}</span>
                                                <span style="font-size:13px; font-weight:700; color:#0f172a;">${_escapeHtml(r.department || 'Civic')} • ${_escapeHtml(r.category || 'General')}</span>
                                            </div>
                                            <div style="display:flex; gap:6px;">
                                                <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px; background:${statusBg}; color:${statusColor}; border:1px solid ${statusColor}40;">${_escapeHtml(r.status || 'Submitted')}</span>
                                                <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px; background:#fef2f2; color:${priorityColor}; border:1px solid ${priorityColor}40;">${_escapeHtml(r.priority || 'MEDIUM')}</span>
                                            </div>
                                        </div>
                                        <p style="font-size:13px; color:#475569; margin:0; line-height:1.5;">${_escapeHtml(r.description || '')}</p>
                                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#64748b; margin-top:4px; padding-top:8px; border-top:1px dashed #e2e8f0;">
                                            <span>📍 ${_escapeHtml(r.address || 'Gorakhpur Central')}</span>
                                            <span>⏱️ SLA: <b>${r.sla_hours ? r.sla_hours + 'h' : '24h Target'}</b> • ${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Active'}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                } catch (e) {
                    container.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error fetching requests: ${e.message}</div>`;
                }
            } else if (tab === "appointments") {
                try {
                    const endpoint = `${_getApiBase()}/api/appointments`;
                    const res = await authFetch(endpoint);
                    const json = await res.json();
                    const list = json.data || json.appointments || (Array.isArray(json) ? json : []);

                    if (!list || list.length === 0) {
                        container.innerHTML = `
                            <div style="text-align:center; padding:45px 20px;">
                                <div style="font-size:40px; margin-bottom:10px;">👨‍⚕️</div>
                                <h3 style="font-size:16px; font-weight:700; color:#0f172a; margin-bottom:6px;">No Doctor Appointments Scheduled</h3>
                                <p style="font-size:13px; color:#64748b; max-width:380px; margin:0 auto 16px auto;">You have not booked any digital OPD slots. Check live specialist availability across BRD Medical College &amp; AIIMS.</p>
                                <button onclick="document.getElementById('scActivityCenterModal').remove(); if(typeof openDoctorBooking === 'function') openDoctorBooking();" style="background:#2563eb; color:#fff; border:none; padding:10px 18px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer;">🩺 Book Doctor Slot</button>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${list.map(a => `
                                <div style="border:1px solid #e2e8f0; border-radius:14px; padding:16px; background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:700; font-size:14px; color:#0f172a;">${_escapeHtml(a.doctor_name || 'Dr. Specialist')}</div>
                                        <div style="font-size:12px; color:#64748b; margin-top:2px;">🏥 ${_escapeHtml(a.hospital_name || 'Gorakhpur Health Hub')} • ${_escapeHtml(a.specialization || 'General')}</div>
                                        <div style="font-size:11px; color:#2563eb; font-weight:600; margin-top:4px;">📅 Date: ${_escapeHtml(a.appointment_date || 'Upcoming')} • ⏰ Slot: ${_escapeHtml(a.slot_time || '10:00 AM')}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:999px; background:#ecfdf5; color:#059669; border:1px solid #10b98140;">CONFIRMED</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } catch (e) {
                    container.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error fetching appointments: ${e.message}</div>`;
                }
            } else if (tab === "parking") {
                try {
                    const res = await authFetch(`${_getApiBase()}/api/parking/my-bookings`);
                    const json = await res.json();
                    const list = json.data || json.bookings || (Array.isArray(json) ? json : []);

                    if (!list || list.length === 0) {
                        container.innerHTML = `
                            <div style="text-align:center; padding:45px 20px;">
                                <div style="font-size:40px; margin-bottom:10px;">🅿️</div>
                                <h3 style="font-size:16px; font-weight:700; color:#0f172a; margin-bottom:6px;">No Active Parking Reservations</h3>
                                <p style="font-size:13px; color:#64748b; max-width:380px; margin:0 auto 16px auto;">Pre-book multi-level parking slots at Golghar, Railway Station, or City Mall with contactless QR gate entry.</p>
                                <a href="${window.location.pathname.includes('/pages/') ? '../parking/parking.html' : 'pages/parking/parking.html'}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; padding:10px 18px; border-radius:10px; font-size:13px; font-weight:700;">🅿️ Reserve Parking Bay</a>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${list.map(b => `
                                <div style="border:1px solid #e2e8f0; border-radius:14px; padding:16px; background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:700; font-size:14px; color:#0f172a;">${_escapeHtml(b.lot_name || 'Golghar Smart Parking')}</div>
                                        <div style="font-size:12px; color:#64748b; margin-top:2px;">🚗 Vehicle: <b>${_escapeHtml(b.vehicle_number || 'UP53-XXXX')}</b> • Slot: <span style="font-family:monospace; font-weight:700; color:#4f46e5;">${_escapeHtml(b.slot_code || b.slot_number || 'A-1')}</span></div>
                                        <div style="font-size:11px; color:#64748b; margin-top:4px;">⏱️ Booked: ${new Date(b.created_at || Date.now()).toLocaleTimeString()}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <span style="font-size:10px; font-weight:800; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#4f46e5; border:1px solid #6366f140;">PASS ACTIVE</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } catch (e) {
                    container.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error fetching parking bookings: ${e.message}</div>`;
                }
            } else if (tab === "security") {
                const u = getUser() || {};
                container.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:18px;">
                        <div style="border:1px solid #e2e8f0; border-radius:14px; padding:18px; background:#f8fafc;">
                            <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#0f172a;">Active Identity &amp; Device</h4>
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; font-size:13px;">
                                <div><span style="color:#64748b;">User:</span> <b>${_escapeHtml(u.name || 'User')}</b></div>
                                <div><span style="color:#64748b;">Contact:</span> <b>${_escapeHtml(u.mobile || u.phone || u.email || 'N/A')}</b></div>
                                <div><span style="color:#64748b;">Role:</span> <span style="font-weight:700; color:#2563eb;">${_escapeHtml((u.role || 'Citizen').toUpperCase())}</span></div>
                                <div><span style="color:#64748b;">Department:</span> <b>${_escapeHtml((u.department || 'Public Citizen').toUpperCase())}</b></div>
                                <div><span style="color:#64748b;">Security Token:</span> <span style="color:#10b981; font-weight:700;">✅ Active JWT Bearer</span></div>
                                <div><span style="color:#64748b;">Client:</span> <b>Gorakhpur SmartCity Web</b></div>
                            </div>
                        </div>

                        <!-- 1-Click Persona Switcher for Quick Demo / Evaluation -->
                        <div style="border:1px solid #bfdbfe; border-radius:14px; padding:18px; background:#eff6ff;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                <span style="font-size:18px;">⚡</span>
                                <h4 style="margin:0; font-size:14px; font-weight:700; color:#1e40af;">Instant Demo Persona Switcher</h4>
                            </div>
                            <p style="font-size:12px; color:#3b82f6; margin:0 0 14px 0;">Switch between verified roles with 1 click to test citizen and staff views:</p>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
                                <button onclick="SmartCityAuth.quickLoginPersona('citizen')" style="background:#ffffff; border:1px solid #bfdbfe; border-radius:10px; padding:10px; text-align:left; cursor:pointer;">
                                    <div style="font-weight:700; font-size:12px; color:#0f172a;">🚗 Citizen 1 (Omkar)</div>
                                    <div style="font-size:11px; color:#64748b;">Omkar Yadav (6306880179)</div>
                                </button>
                                <button onclick="SmartCityAuth.quickLoginPersona('citizen2')" style="background:#ffffff; border:1px solid #a7f3d0; border-radius:10px; padding:10px; text-align:left; cursor:pointer;">
                                    <div style="font-weight:700; font-size:12px; color:#059669;">👤 Citizen 2 (Demo)</div>
                                    <div style="font-size:11px; color:#64748b;">Demo Citizen (9876543210)</div>
                                </button>
                                <button onclick="SmartCityAuth.quickLoginPersona('traffic')" style="background:#ffffff; border:1px solid #fed7aa; border-radius:10px; padding:10px; text-align:left; cursor:pointer;">
                                    <div style="font-weight:700; font-size:12px; color:#ea580c;">👮 Traffic Inspector</div>
                                    <div style="font-size:11px; color:#64748b;">Insp. R.K. Verma (TR-VERMA)</div>
                                </button>
                                <button onclick="SmartCityAuth.quickLoginPersona('hospital')" style="background:#ffffff; border:1px solid #bae6fd; border-radius:10px; padding:10px; text-align:left; cursor:pointer;">
                                    <div style="font-weight:700; font-size:12px; color:#0284c7;">🏥 Hospital Admin Staff</div>
                                    <div style="font-size:11px; color:#64748b;">Desk Staff (STAFF-001)</div>
                                </button>
                                <button onclick="SmartCityAuth.quickLoginPersona('admin')" style="background:#ffffff; border:1px solid #e9d5ff; border-radius:10px; padding:10px; text-align:left; cursor:pointer;">
                                    <div style="font-weight:700; font-size:12px; color:#9333ea;">🛡️ ICCC Director</div>
                                    <div style="font-size:11px; color:#64748b;">Municipal Admin (TR-ADMIN)</div>
                                </button>
                            </div>
                        </div>

                        <div style="text-align:right;">
                            <button onclick="if(confirm('Are you sure you want to sign out?')) SmartCityAuth.logout();" style="background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-size:13px; font-weight:700; padding:10px 18px; border-radius:10px; cursor:pointer;">
                                🚪 Terminate Active Session
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        loadTabContent(defaultTab);
    }

    // -------------------------------------------------------
    // UNIVERSAL MODAL LOGIN DIALOG
    // -------------------------------------------------------
    function showLoginModal(defaultTab = "citizen", options = {}) {
        const existing = document.getElementById("scGlobalLoginModal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "scGlobalLoginModal";
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(8px);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="background:#0f172a; border:1px solid rgba(56,189,248,0.3); border-radius:20px; width:100%; max-width:440px; box-shadow:0 25px 60px rgba(0,0,0,0.85); overflow:hidden; color:#f8fafc;">
                <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; background:rgba(30,41,59,0.5);">
                    <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px;">
                        <span>🏛️</span> SmartCity AI Portal Access
                    </div>
                    <button id="scModalCloseBtn" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
                </div>

                <!-- 1-Click Quick Demo Login Chips -->
                <div style="padding:14px 20px 0 20px;">
                    <div style="background:rgba(30,41,59,0.85); border:1px dashed rgba(56,189,248,0.35); border-radius:12px; padding:10px 12px;">
                        <div style="font-size:11px; font-weight:700; color:#e2e8f0; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                            <span>⚡ 1-Click Instant Persona Sign-In:</span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:6px;">
                            <button type="button" onclick="SmartCityAuth.quickLoginPersona('citizen')" style="background:#1e293b; border:1px solid #334155; color:#38bdf8; font-size:11px; font-weight:700; padding:6px 8px; border-radius:6px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:6px;">
                                <span>🚗</span> Omkar (Citizen 1)
                            </button>
                            <button type="button" onclick="SmartCityAuth.quickLoginPersona('citizen2')" style="background:#1e293b; border:1px solid #334155; color:#34d399; font-size:11px; font-weight:700; padding:6px 8px; border-radius:6px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:6px;">
                                <span>👤</span> Demo (Citizen 2)
                            </button>
                            <button type="button" onclick="SmartCityAuth.quickLoginPersona('traffic')" style="background:#1e293b; border:1px solid #334155; color:#fb923c; font-size:11px; font-weight:700; padding:6px 8px; border-radius:6px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:6px;">
                                <span>👮</span> TR-VERMA (Traffic)
                            </button>
                            <button type="button" onclick="SmartCityAuth.quickLoginPersona('hospital')" style="background:#1e293b; border:1px solid #334155; color:#38bdf8; font-size:11px; font-weight:700; padding:6px 8px; border-radius:6px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:6px;">
                                <span>🏥</span> STAFF-001 (Staff)
                            </button>
                            <button type="button" onclick="SmartCityAuth.quickLoginPersona('admin')" style="background:#1e293b; border:1px solid #334155; color:#c084fc; font-size:11px; font-weight:700; padding:6px 8px; border-radius:6px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:6px;">
                                <span>🛡️</span> TR-ADMIN (ICCC)
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(15,23,42,0.8); margin-top:14px;">
                    <button class="sc-tab-btn" data-tab="citizen" style="flex:1; padding:10px; border:none; background:transparent; color:#38bdf8; font-weight:600; font-size:13px; border-bottom:2px solid #38bdf8; cursor:pointer;">Citizen Portal</button>
                    <button class="sc-tab-btn" data-tab="staff" style="flex:1; padding:10px; border:none; background:transparent; color:#94a3b8; font-weight:600; font-size:13px; border-bottom:2px solid transparent; cursor:pointer;">Staff / Officer</button>
                    <button class="sc-tab-btn" data-tab="register" style="flex:1; padding:10px; border:none; background:transparent; color:#94a3b8; font-weight:600; font-size:13px; border-bottom:2px solid transparent; cursor:pointer;">Register</button>
                </div>

                <div style="padding:20px;">
                    <!-- Citizen Form -->
                    <form id="scCitizenForm" style="display:flex; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Mobile Number or Email</label>
                            <input type="text" id="scCitLoginId" required placeholder="e.g. 6306880179" style="width:100%; padding:10px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div style="position:relative;">
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Password</label>
                            <input type="password" id="scCitPassword" required placeholder="••••••••" style="width:100%; padding:10px 12px; padding-right:36px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                            <span onclick="const p=document.getElementById('scCitPassword'); p.type = p.type==='password'?'text':'password';" style="position:absolute; right:10px; bottom:8px; cursor:pointer; color:#94a3b8; font-size:14px;">👁️</span>
                        </div>
                        <button type="submit" style="margin-top:6px; background:#0284c7; color:#fff; font-weight:700; padding:11px; border-radius:10px; border:none; cursor:pointer; font-size:14px; transition:background 0.2s;">Sign In to Citizen Portal</button>
                    </form>

                    <!-- Staff Form -->
                    <form id="scStaffForm" style="display:none; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Official Staff / Doctor ID</label>
                            <input type="text" id="scStaffId" required placeholder="e.g. TR-VERMA, STAFF-001, TR-ADMIN" style="width:100%; padding:10px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div style="position:relative;">
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Official Password</label>
                            <input type="password" id="scStaffPassword" required placeholder="••••••••" style="width:100%; padding:10px 12px; padding-right:36px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                            <span onclick="const p=document.getElementById('scStaffPassword'); p.type = p.type==='password'?'text':'password';" style="position:absolute; right:10px; bottom:8px; cursor:pointer; color:#94a3b8; font-size:14px;">👁️</span>
                        </div>
                        <button type="submit" style="margin-top:6px; background:#0ea5e9; color:#fff; font-weight:700; padding:11px; border-radius:10px; border:none; cursor:pointer; font-size:14px;">Sign In to Department</button>
                    </form>

                    <!-- Register Form -->
                    <form id="scRegisterForm" style="display:none; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Full Name</label>
                            <input type="text" id="scRegName" required placeholder="Full Name" style="width:100%; padding:10px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Mobile Number</label>
                            <input type="tel" id="scRegMobile" required placeholder="10-digit mobile" style="width:100%; padding:10px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Email Address</label>
                            <input type="email" id="scRegEmail" required placeholder="name@example.com" style="width:100%; padding:10px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Password</label>
                            <input type="password" id="scRegPassword" required placeholder="Create password" style="width:100%; padding:10px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <button type="submit" style="margin-top:6px; background:#10b981; color:#fff; font-weight:700; padding:11px; border-radius:10px; border:none; cursor:pointer; font-size:14px;">Create Citizen Account</button>
                    </form>

                    <div id="scModalMsg" style="margin-top:12px; font-size:12px; text-align:center; min-height:16px;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Tab switching
        const tabBtns = modal.querySelectorAll(".sc-tab-btn");
        const forms = {
            citizen: modal.querySelector("#scCitizenForm"),
            staff: modal.querySelector("#scStaffForm"),
            register: modal.querySelector("#scRegisterForm")
        };
        const msgEl = modal.querySelector("#scModalMsg");

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.getAttribute("data-tab");
                tabBtns.forEach(b => {
                    b.style.color = "#94a3b8";
                    b.style.borderBottom = "2px solid transparent";
                });
                btn.style.color = tab === "register" ? "#10b981" : "#38bdf8";
                btn.style.borderBottom = `2px solid ${tab === "register" ? '#10b981' : '#38bdf8'}`;

                Object.keys(forms).forEach(k => {
                    forms[k].style.display = k === tab ? "flex" : "none";
                });
                msgEl.textContent = "";
            });
        });

        // Activate requested defaultTab if specified
        if (defaultTab && forms[defaultTab]) {
            tabBtns.forEach(b => {
                b.style.color = "#94a3b8";
                b.style.borderBottom = "2px solid transparent";
            });
            const activeBtn = modal.querySelector(`.sc-tab-btn[data-tab="${defaultTab}"]`);
            if (activeBtn) {
                activeBtn.style.color = defaultTab === "register" ? "#10b981" : "#38bdf8";
                activeBtn.style.borderBottom = `2px solid ${defaultTab === "register" ? '#10b981' : '#38bdf8'}`;
            }
            Object.keys(forms).forEach(k => {
                forms[k].style.display = k === defaultTab ? "flex" : "none";
            });
        }

        if (options && options.message && msgEl) {
            msgEl.textContent = options.message;
            msgEl.style.color = "#38bdf8";
        }

        // Close on background click or ✕
        modal.querySelector("#scModalCloseBtn").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        // Citizen Login Handler
        forms.citizen.addEventListener("submit", async (e) => {
            e.preventDefault();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Authenticating...";
            try {
                const res = await fetch(`${_getApiBase()}/api/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        loginId: modal.querySelector("#scCitLoginId").value.trim(),
                        password: modal.querySelector("#scCitPassword").value
                    })
                });
                const data = await res.json();
                if (res.ok && data.token) {
                    setSession(data.token, data.user);
                    msgEl.style.color = "#34d399";
                    msgEl.textContent = "Login successful!";
                    setTimeout(() => {
                        modal.remove();
                        if (options && typeof options.onSuccess === "function") {
                            options.onSuccess(data.user, data.token);
                        } else {
                            window.location.reload();
                        }
                    }, 350);
                } else {
                    msgEl.style.color = "#f87171";
                    msgEl.textContent = data.message || "Invalid credentials.";
                }
            } catch (err) {
                msgEl.style.color = "#f87171";
                msgEl.textContent = "Unable to connect to login server.";
            }
        });

        // Staff Login Handler
        forms.staff.addEventListener("submit", async (e) => {
            e.preventDefault();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Authenticating staff...";
            try {
                const res = await fetch(`${_getApiBase()}/api/staff-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        staffId: modal.querySelector("#scStaffId").value.trim(),
                        password: modal.querySelector("#scStaffPassword").value
                    })
                });
                const data = await res.json();
                if (res.ok && data.token) {
                    setSession(data.token, data.user);
                    msgEl.style.color = "#34d399";
                    msgEl.textContent = `Welcome ${data.user.name} (${data.user.department})!`;
                    setTimeout(() => {
                        modal.remove();
                        if (options && typeof options.onSuccess === "function") {
                            options.onSuccess(data.user, data.token);
                        } else {
                            window.location.reload();
                        }
                    }, 350);
                } else {
                    msgEl.style.color = "#f87171";
                    msgEl.textContent = data.message || "Invalid staff ID or password.";
                }
            } catch (err) {
                msgEl.style.color = "#f87171";
                msgEl.textContent = "Unable to connect to staff login server.";
            }
        });

        // Register Handler
        forms.register.addEventListener("submit", async (e) => {
            e.preventDefault();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Creating account...";
            try {
                const res = await fetch(`${_getApiBase()}/api/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: modal.querySelector("#scRegName").value.trim(),
                        mobile: modal.querySelector("#scRegMobile").value.trim(),
                        email: modal.querySelector("#scRegEmail").value.trim(),
                        password: modal.querySelector("#scRegPassword").value
                    })
                });
                const data = await res.json();
                if (res.ok && data.token) {
                    setSession(data.token, data.user);
                    msgEl.style.color = "#34d399";
                    msgEl.textContent = "Account created successfully!";
                    setTimeout(() => {
                        modal.remove();
                        window.location.reload();
                    }, 350);
                } else {
                    msgEl.style.color = "#f87171";
                    msgEl.textContent = data.message || "Registration failed.";
                }
            } catch (err) {
                msgEl.style.color = "#f87171";
                msgEl.textContent = "Unable to connect to registration server.";
            }
        });
    }

    // -------------------------------------------------------
    // USER HEADER & NOTIFICATION BELL RENDERING
    // -------------------------------------------------------

    function renderUserHeader() {
        if (typeof document === "undefined") return;
        const user = getUser();
        const existing = document.getElementById("scGlobalHeaderControls");
        if (existing) existing.remove();

        const container = document.createElement("div");
        container.id = "scGlobalHeaderControls";
        container.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            z-index: 9999;
        `;

        // Notification Bell Button
        const notifBtn = document.createElement("button");
        notifBtn.id = "scGlobalNotifBtn";
        notifBtn.title = "View Notifications";
        notifBtn.style.cssText = `
            position: relative;
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #f1f5f9;
            font-size: 14px;
            backdrop-filter: blur(8px);
            transition: border-color 0.2s;
        `;
        notifBtn.innerHTML = `
            <span>🔔</span>
            <span id="scGlobalNotifCount" style="position:absolute; top:-4px; right:-4px; background:#ef4444; color:#fff; font-size:10px; font-weight:800; border-radius:999px; padding:1px 5px; min-width:16px; height:16px; display:none; align-items:center; justify-content:center; box-shadow:0 0 6px rgba(239,68,68,0.8); line-height:1;"></span>
        `;
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNotificationDrawer();
        });

        // User Badge
        const badge = document.createElement("div");
        badge.id = "scGlobalUserBadge";
        badge.className = "sc-global-user-badge";

        if (user && isAuthenticated()) {
            const isStaffUser = isStaff();
            const roleColor = isStaffUser ? "#38bdf8" : "#34d399";
            const roleBorder = isStaffUser ? "rgba(56, 189, 248, 0.4)" : "rgba(52, 211, 153, 0.4)";
            const roleBg = isStaffUser ? "rgba(56, 189, 248, 0.15)" : "rgba(52, 211, 153, 0.15)";
            const displayName = user.name || user.username || user.email || (isStaffUser ? "Staff Officer" : "Citizen");
            const dept = (user.department || (isStaffUser ? "operations" : "")).toLowerCase();
            const deptTitle = dept ? (dept.charAt(0).toUpperCase() + dept.slice(1)) : "";
            const roleName = (user.role || (isStaffUser ? "STAFF" : "CITIZEN")).toUpperCase();
            const roleLabel = deptTitle ? `${roleName} • ${deptTitle}` : roleName;
            const initials = displayName.split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || (isStaffUser ? "ST" : "CT");

            badge.style.cssText = `
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                padding: 4px 14px 4px 6px;
                border-radius: 9999px;
                background: rgba(15, 23, 42, 0.88);
                backdrop-filter: blur(12px);
                border: 1px solid ${roleBorder};
                color: #f1f5f9;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                cursor: pointer;
                user-select: none;
                transition: all 0.2s ease;
            `;

            badge.innerHTML = `
                <div style="width:26px; height:26px; border-radius:50%; background:${isStaffUser ? '#0284c7' : '#10b981'}; color:#ffffff; font-weight:800; font-size:11px; display:flex; align-items:center; justify-content:center;">
                    ${_escapeHtml(initials)}
                </div>
                <span style="font-weight:600; font-size:13px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${_escapeHtml(displayName)}
                </span>
                <span style="background:${roleBg}; color:${roleColor}; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; border:1px solid ${roleBorder}; letter-spacing:0.3px;">
                    ${_escapeHtml(roleLabel)}
                </span>
                <span style="font-size:10px; color:#94a3b8; transition:transform 0.2s;" id="scDropdownArrow">▾</span>

                <!-- Dropdown Menu -->
                <div id="scGlobalUserDropdown" style="display:none; position:absolute; top:calc(100% + 10px); right:0; width:260px; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 15px 40px rgba(15,23,42,0.18); padding:16px; z-index:100000; cursor:default; color:#0f172a; text-align:left;">
                    <div style="display:flex; align-items:center; gap:12px; padding-bottom:12px; border-bottom:1px solid #f1f5f9;">
                        <div style="width:40px; height:40px; border-radius:50%; background:${isStaffUser ? '#0284c7' : '#10b981'}; color:#ffffff; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center;">
                            ${_escapeHtml(initials)}
                        </div>
                        <div style="overflow:hidden;">
                            <div style="font-weight:700; font-size:14px; color:#0f172a; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${_escapeHtml(displayName)}">${_escapeHtml(displayName)}</div>
                            <div style="font-size:11px; color:#64748b; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${_escapeHtml(user.email || user.mobile || 'SmartCity Account')}</div>
                        </div>
                    </div>

                    <div style="margin:12px 0 6px 0; font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.6px;">Role Credentials</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; font-size:12px;">
                        <span style="color:#0f172a; font-weight:600;">${isStaffUser ? '🛡️ ' + roleLabel : '🟢 Active Citizen'}</span>
                        <span style="font-size:10px; background:#ecfdf5; color:#059669; font-weight:700; padding:2px 6px; border-radius:4px;">VERIFIED</span>
                    </div>

                    ${(!isStaffUser && localStorage.getItem("patientId")) ? `
                    <div style="margin-top:10px;">
                        <a href="${window.location.pathname.includes('/pages/') ? '../hospital/hospital.html' : 'pages/hospital/hospital.html'}" style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:#eff6ff; border-radius:10px; border:1px solid #bfdbfe; color:#2563eb; font-size:12px; font-weight:600; text-decoration:none;">
                            <span>🪪</span>
                            <span>Patient Dossier: ${localStorage.getItem("patientId")}</span>
                        </a>
                    </div>` : ''}

                    <div style="margin-top:10px;">
                        <button type="button" id="scDropdownActivityBtn" style="width:100%; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:12px; font-weight:700; padding:9px 12px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition:all 0.2s;">
                            <span style="display:flex; align-items:center; gap:8px;"><span>📊</span> My Activity & History</span>
                            <span style="color:#2563eb; font-size:12px;">→</span>
                        </button>
                    </div>

                    <div style="border-top:1px solid #f1f5f9; margin:14px 0 10px 0;"></div>
                    <button type="button" id="scDropdownSignOutBtn" style="width:100%; border:none; background:#fef2f2; color:#dc2626; font-size:12px; font-weight:700; padding:10px 14px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background 0.2s;">
                        <span>🚪</span> Sign Out
                    </button>
                </div>
            `;

            // Toggle dropdown
            const dd = badge.querySelector("#scGlobalUserDropdown");
            const arrow = badge.querySelector("#scDropdownArrow");
            badge.addEventListener("click", (e) => {
                if (e.target.closest("#scDropdownSignOutBtn") || e.target.closest("#scDropdownActivityBtn")) return;
                e.stopPropagation();
                const isShowing = dd.style.display === "block";
                dd.style.display = isShowing ? "none" : "block";
                if (arrow) arrow.style.transform = isShowing ? "rotate(0deg)" : "rotate(180deg)";
            });

            // Activity Center Button
            const actBtn = badge.querySelector("#scDropdownActivityBtn");
            if (actBtn) {
                actBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dd.style.display = "none";
                    if (arrow) arrow.style.transform = "rotate(0deg)";
                    openActivityCenter("requests");
                });
            }

            // Sign out
            badge.querySelector("#scDropdownSignOutBtn").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to sign out?")) {
                    logout();
                }
            });

            // Close on click outside
            document.addEventListener("click", (e) => {
                if (!badge.contains(e.target) && dd) {
                    dd.style.display = "none";
                    if (arrow) arrow.style.transform = "rotate(0deg)";
                }
            });

            // Citizen Patient ID Quick Link (ONLY FOR CITIZENS who have a patientId)
            const pId = localStorage.getItem("patientId");
            if (!isStaffUser && pId) {
                const patientChip = document.createElement("button");
                patientChip.type = "button";
                patientChip.id = "scGlobalPatientChip";
                patientChip.style.cssText = `
                    background: rgba(37, 99, 235, 0.15);
                    border: 1px solid rgba(59, 130, 246, 0.4);
                    color: #60a5fa;
                    border-radius: 9999px;
                    padding: 4px 10px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    transition: all 0.2s;
                `;
                patientChip.innerHTML = `🪪 <span>${_escapeHtml(pId)}</span>`;
                patientChip.title = "View My Patient ID, QR Code & Medical Dossier";
                patientChip.addEventListener("click", () => {
                    const targetUrl = window.location.pathname.includes("/pages/")
                        ? "../hospital/hospital.html"
                        : "pages/hospital/hospital.html";
                    window.location.href = targetUrl;
                });
                container.appendChild(patientChip);
            }
        } else {
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                padding: 4px 12px;
                border-radius: 9999px;
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.16);
                color: #e2e8f0;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                transition: background 0.2s;
            `;
            badge.innerHTML = `
                <span>👤</span>
                <span style="font-weight:600;">Sign In</span>
            `;
            badge.addEventListener("click", () => showLoginModal("citizen"));
        }

        container.appendChild(notifBtn);
        container.appendChild(badge);

        const targets = [
            document.querySelector(".header-right"),
            document.querySelector(".nav-links"),
            document.querySelector(".nav-actions"),
            document.querySelector(".top-bar"),
            document.querySelector(".navbar"),
            document.querySelector("header"),
            document.querySelector("nav")
        ];

        for (const target of targets) {
            if (target) {
                target.appendChild(container);
                break;
            }
        }

        refreshNotificationCount();
    }

    // -------------------------------------------------------
    // CROSS-TAB SESSION SYNCHRONIZATION
    // -------------------------------------------------------
    if (typeof window !== "undefined") {
        window.addEventListener("storage", (e) => {
            if (e.key === TOKEN_KEY || e.key === USER_KEY) {
                renderUserHeader();
                refreshNotificationCount();
            }
        });
    }

    return {
        setSession,
        getToken,
        getUser,
        isAuthenticated,
        isStaff,
        isCitizen,
        getRole,
        getDepartment,
        canEdit,
        logout,
        fetch: authFetch,
        renderUserHeader,
        showLoginModal,
        openActivityCenter,
        quickLoginPersona,
        refreshNotificationCount
    };
})();

if (typeof window !== "undefined") {
    window.SmartCityAuth = SmartCityAuth;
    window.openActivityCenter = SmartCityAuth.openActivityCenter;
    window.quickLoginPersona = SmartCityAuth.quickLoginPersona;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            SmartCityAuth.renderUserHeader();
        });
    } else {
        SmartCityAuth.renderUserHeader();
    }
}
