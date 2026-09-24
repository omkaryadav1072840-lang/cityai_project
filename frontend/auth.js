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
    // PUBLIC SESSION API
    // -------------------------------------------------------

    function setSession(token, user) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem("smartcity_auth_token", token);
            localStorage.setItem("token", token);
        }
        if (user) {
            const userStr = JSON.stringify(user);
            localStorage.setItem(USER_KEY, userStr);
            localStorage.setItem("smartcity_user", userStr);
            localStorage.setItem("currentUser", userStr);
        }
        renderUserHeader();
        refreshNotificationCount();
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("smartcity:auth-change", { detail: { token, user } }));
        }
    }

    function getToken() {
        const token = localStorage.getItem(TOKEN_KEY) ||
                      localStorage.getItem("smartcity_auth_token") ||
                      localStorage.getItem("token");
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
                        localStorage.getItem("currentUser");
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
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem("smartcity_auth_token");
        localStorage.removeItem("token");
        localStorage.removeItem("smartcity_user");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("parking_staff_auth");
        sessionStorage.removeItem("smartCityUser");
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
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="background:#0f172a; border:1px solid rgba(56,189,248,0.3); border-radius:16px; width:100%; max-width:420px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.8); overflow:hidden; color:#f8fafc;">
                <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; background:rgba(30,41,59,0.5);">
                    <div style="font-weight:700; font-size:16px; display:flex; align-items:center; gap:8px;">
                        <span>🏛️</span> SmartCity AI Access
                    </div>
                    <button id="scModalCloseBtn" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">✕</button>
                </div>

                <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(15,23,42,0.8);">
                    <button class="sc-tab-btn" data-tab="citizen" style="flex:1; padding:10px; border:none; background:transparent; color:#38bdf8; font-weight:600; font-size:13px; border-bottom:2px solid #38bdf8; cursor:pointer;">Citizen Login</button>
                    <button class="sc-tab-btn" data-tab="staff" style="flex:1; padding:10px; border:none; background:transparent; color:#94a3b8; font-weight:600; font-size:13px; border-bottom:2px solid transparent; cursor:pointer;">Staff / Admin</button>
                    <button class="sc-tab-btn" data-tab="register" style="flex:1; padding:10px; border:none; background:transparent; color:#94a3b8; font-weight:600; font-size:13px; border-bottom:2px solid transparent; cursor:pointer;">Register</button>
                </div>

                <div style="padding:20px;">
                    <!-- Citizen Form -->
                    <form id="scCitizenForm" style="display:flex; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Mobile or Email</label>
                            <input type="text" id="scCitLoginId" required placeholder="e.g. 6306880179" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Password</label>
                            <input type="password" id="scCitPassword" required placeholder="••••••••" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <button type="submit" style="margin-top:6px; background:#0284c7; color:#fff; font-weight:600; padding:10px; border-radius:8px; border:none; cursor:pointer; font-size:14px; transition:background 0.2s;">Sign In as Citizen</button>
                    </form>

                    <!-- Staff Form -->
                    <form id="scStaffForm" style="display:none; flex-direction:column; gap:12px;">
                        <div style="font-size:11px; background:rgba(30,41,59,0.85); border:1px dashed rgba(56,189,248,0.35); border-radius:8px; padding:8px 10px; color:#94a3b8; display:flex; flex-direction:column; gap:5px;">
                            <span style="color:#e2e8f0; font-weight:600;">🔑 Click to Auto-fill Demo Staff Credentials:</span>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <span style="color:#38bdf8; background:#1e293b; padding:3px 7px; border-radius:5px; cursor:pointer; font-family:monospace; border:1px solid rgba(56,189,248,0.25);" onclick="document.getElementById('scStaffId').value='TR-VERMA'; document.getElementById('scStaffPassword').value='verma123';">👮 TR-VERMA (verma123)</span>
                                <span style="color:#38bdf8; background:#1e293b; padding:3px 7px; border-radius:5px; cursor:pointer; font-family:monospace; border:1px solid rgba(56,189,248,0.25);" onclick="document.getElementById('scStaffId').value='TR-PANDEY'; document.getElementById('scStaffPassword').value='pandey123';">👮 TR-PANDEY (pandey123)</span>
                                <span style="color:#a855f7; background:#1e293b; padding:3px 7px; border-radius:5px; cursor:pointer; font-family:monospace; border:1px solid rgba(168,85,247,0.25);" onclick="document.getElementById('scStaffId').value='TR-ADMIN'; document.getElementById('scStaffPassword').value='admin123';">🛡️ TR-ADMIN (admin123)</span>
                            </div>
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Official Staff ID</label>
                            <input type="text" id="scStaffId" required placeholder="e.g. TR-VERMA, TR-PANDEY, TR-ADMIN" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Password</label>
                            <input type="password" id="scStaffPassword" required placeholder="••••••••" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <button type="submit" style="margin-top:6px; background:#0ea5e9; color:#fff; font-weight:600; padding:10px; border-radius:8px; border:none; cursor:pointer; font-size:14px;">Sign In to Department</button>
                    </form>

                    <!-- Register Form -->
                    <form id="scRegisterForm" style="display:none; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Full Name</label>
                            <input type="text" id="scRegName" required placeholder="Full Name" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Mobile Number</label>
                            <input type="tel" id="scRegMobile" required placeholder="10-digit mobile" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Email Address</label>
                            <input type="email" id="scRegEmail" required placeholder="name@example.com" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; color:#94a3b8; margin-bottom:4px;">Password</label>
                            <input type="password" id="scRegPassword" required placeholder="Create password" style="width:100%; padding:9px 12px; border-radius:8px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
                        </div>
                        <button type="submit" style="margin-top:6px; background:#10b981; color:#fff; font-weight:600; padding:10px; border-radius:8px; border:none; cursor:pointer; font-size:14px;">Create Citizen Account</button>
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
            if (defaultTab === "staff") {
                const staffInp = modal.querySelector("#scStaffId");
                const passInp = modal.querySelector("#scStaffPassword");
                if (options && options.prefillStaffId && staffInp) {
                    staffInp.value = options.prefillStaffId;
                    if (passInp) setTimeout(() => passInp.focus(), 100);
                } else if (staffInp) {
                    setTimeout(() => staffInp.focus(), 100);
                }
            }
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
            const roleBg = isStaffUser ? "rgba(56, 189, 248, 0.12)" : "rgba(52, 211, 153, 0.12)";
            const displayName = user.name || user.username || user.email || (isStaffUser ? "Staff Officer" : "Citizen");
            const deptLabel = user.department ? ` • ${user.department.toUpperCase()}` : "";
            const roleLabel = `${(user.role || (isStaffUser ? "STAFF" : "CITIZEN")).toUpperCase()}${deptLabel}`;

            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                padding: 4px 12px;
                border-radius: 9999px;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(10px);
                border: 1px solid ${roleBorder};
                color: #f1f5f9;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;

            badge.innerHTML = `
                <span style="font-size:14px;">${isStaffUser ? "🛡️" : "👤"}</span>
                <span style="font-weight:600; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${_escapeHtml(displayName)}">${_escapeHtml(displayName)}</span>
                <span style="background:${roleBg}; color:${roleColor}; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; border:1px solid ${roleBorder};">${_escapeHtml(roleLabel)}</span>
                <button type="button" id="scGlobalLogoutBtn" style="background:transparent; border:none; color:#f87171; cursor:pointer; font-size:14px; font-weight:bold; padding:2px 4px; display:inline-flex; align-items:center; line-height:1; transition:color 0.2s;" title="Sign out session">✕</button>
            `;

            badge.querySelector("#scGlobalLogoutBtn").addEventListener("click", (e) => {
                e.preventDefault();
                logout();
            });

            // Citizen Patient ID Quick Link
            const pId = localStorage.getItem("patientId");
            if (pId || !isStaffUser) {
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
                patientChip.innerHTML = `🪪 <span>${pId ? _escapeHtml(pId) : "My Patient ID"}</span>`;
                patientChip.title = "View My Patient ID, QR Code & Medical Dossier";
                patientChip.addEventListener("click", () => {
                    if (window.location.pathname.includes("/pages/hospital/")) {
                        if (typeof openPatientFile === "function") {
                            openPatientFile(pId);
                        }
                    } else {
                        const targetUrl = window.location.pathname.includes("/pages/")
                            ? "../hospital/hospital.html"
                            : "pages/hospital/hospital.html";
                        window.location.href = targetUrl;
                    }
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
        refreshNotificationCount
    };
})();

if (typeof window !== "undefined") {
    window.SmartCityAuth = SmartCityAuth;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            SmartCityAuth.renderUserHeader();
        });
    } else {
        SmartCityAuth.renderUserHeader();
    }
}
