/**
 * SmartCity Gorakhpur - Shared Authentication & Civic Identity System
 * -------------------------------------------------------------------
 * Provides JWT token storage, session management, cross-tab synchronization,
 * universal glassmorphic login modal, universal citizen & staff profile modal,
 * activity center drawer, and authenticated fetch wrapper for all modules.
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
    // HELPERS & TOAST NOTIFICATION
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
        if (str === null || str === undefined) return "";
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[m]);
    }

    function showToast(message, type = "info") {
        let container = document.getElementById("scGlobalToastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "scGlobalToastContainer";
            container.className = "sc-toast-container";
            document.body.appendChild(container);
        }

        const icons = {
            success: "✅",
            error: "❌",
            warning: "⚠️",
            info: "ℹ️"
        };

        const toast = document.createElement("div");
        toast.className = `sc-toast-item sc-toast-${type}`;
        toast.innerHTML = `
            <span class="sc-toast-icon">${icons[type] || "ℹ️"}</span>
            <span class="sc-toast-msg">${_escapeHtml(message)}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("sc-toast-fadeout");
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // -------------------------------------------------------
    // INJECT UNIVERSAL AUTHENTICATION & PROFILE CSS
    // -------------------------------------------------------

    function _injectAuthStyles() {
        if (document.getElementById("smartcity-auth-system-styles")) return;

        const styleEl = document.createElement("style");
        styleEl.id = "smartcity-auth-system-styles";
        styleEl.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

            :root {
                --sc-auth-font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                --sc-auth-bg: #070d19;
                --sc-auth-surface: rgba(15, 23, 42, 0.96);
                --sc-auth-surface-glass: rgba(22, 34, 58, 0.85);
                --sc-auth-surface-input: rgba(11, 19, 36, 0.85);
                --sc-auth-border: rgba(56, 189, 248, 0.25);
                --sc-auth-border-glow: rgba(56, 189, 248, 0.55);
                --sc-auth-primary: #0284c7;
                --sc-auth-cyan: #38bdf8;
                --sc-auth-emerald: #10b981;
                --sc-auth-amber: #f59e0b;
                --sc-auth-rose: #ef4444;
                --sc-auth-text: #f8fafc;
                --sc-auth-text-muted: #94a3b8;
            }

            /* Backdrops */
            .sc-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(4, 8, 16, 0.82);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                font-family: var(--sc-auth-font);
                animation: scFadeIn 0.22s ease-out;
            }

            @keyframes scFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scSlideUp {
                from { opacity: 0; transform: scale(0.96) translateY(16px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }

            /* Universal Modal Dialog Card */
            .sc-dialog-card {
                background: linear-gradient(155deg, rgba(15, 23, 42, 0.97) 0%, rgba(9, 14, 28, 0.99) 100%);
                border: 1px solid var(--sc-auth-border);
                border-radius: 22px;
                box-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.9), 0 0 45px rgba(56, 189, 248, 0.12);
                color: var(--sc-auth-text);
                width: 100%;
                max-width: 520px;
                max-height: 92vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: scSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .sc-dialog-card.sc-card-wide {
                max-width: 860px;
            }

            /* Header Section */
            .sc-dialog-header {
                padding: 18px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(30, 41, 59, 0.4);
            }

            .sc-header-title-wrap {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .sc-header-icon-box {
                width: 44px;
                height: 44px;
                border-radius: 14px;
                background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
                border: 1px solid var(--sc-auth-border);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
            }

            .sc-header-title {
                font-size: 17px;
                font-weight: 800;
                color: #ffffff;
                margin: 0;
                letter-spacing: -0.3px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sc-header-subtitle {
                font-size: 12px;
                color: var(--sc-auth-text-muted);
                margin: 2px 0 0 0;
            }

            .sc-close-btn {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #94a3b8;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 15px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .sc-close-btn:hover {
                background: rgba(239, 68, 68, 0.2);
                border-color: rgba(239, 68, 68, 0.4);
                color: #ef4444;
                transform: scale(1.05);
            }

            /* Quick Persona Bar */
            .sc-persona-bar {
                padding: 14px 24px;
                background: rgba(11, 19, 36, 0.65);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            .sc-persona-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                color: var(--sc-auth-cyan);
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .sc-persona-chips {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                gap: 8px;
            }

            .sc-persona-btn {
                background: rgba(30, 41, 59, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.09);
                border-radius: 10px;
                padding: 8px 10px;
                color: var(--sc-auth-text);
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .sc-persona-btn:hover {
                background: rgba(56, 189, 248, 0.15);
                border-color: var(--sc-auth-cyan);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
            }

            .sc-persona-btn.sc-p-citizen { color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
            .sc-persona-btn.sc-p-citizen2 { color: #34d399; border-color: rgba(52, 211, 153, 0.3); }
            .sc-persona-btn.sc-p-traffic { color: #fb923c; border-color: rgba(251, 146, 60, 0.3); }
            .sc-persona-btn.sc-p-hospital { color: #818cf8; border-color: rgba(129, 140, 248, 0.3); }
            .sc-persona-btn.sc-p-admin { color: #c084fc; border-color: rgba(192, 132, 252, 0.3); }

            /* Segmented Tabs Bar */
            .sc-segmented-tabs {
                display: flex;
                background: rgba(11, 19, 36, 0.9);
                padding: 6px;
                margin: 16px 24px 0 24px;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                gap: 4px;
            }

            .sc-tab-pill {
                flex: 1;
                padding: 10px 14px;
                border: none;
                background: transparent;
                color: #94a3b8;
                font-size: 13px;
                font-weight: 700;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .sc-tab-pill:hover {
                color: #f1f5f9;
                background: rgba(255, 255, 255, 0.04);
            }

            .sc-tab-pill.active {
                background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                color: #ffffff;
                box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
            }

            .sc-tab-pill.active-emerald {
                background: linear-gradient(135deg, #10b981 0%, #047857 100%);
                box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
            }

            /* Dialog Body */
            .sc-dialog-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            /* Modern Input Form Styling */
            .sc-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .sc-field-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .sc-field-label {
                font-size: 12px;
                font-weight: 600;
                color: #cbd5e1;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .sc-field-label span.req {
                color: #38bdf8;
                font-size: 11px;
            }

            .sc-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }

            .sc-input-icon {
                position: absolute;
                left: 14px;
                font-size: 15px;
                color: #64748b;
                pointer-events: none;
                transition: color 0.2s;
            }

            .sc-input-control {
                width: 100%;
                background: var(--sc-auth-surface-input);
                border: 1px solid rgba(148, 163, 184, 0.22);
                border-radius: 12px;
                padding: 12px 14px 12px 42px;
                color: #ffffff;
                font-size: 13.5px;
                font-family: inherit;
                outline: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .sc-input-control:focus {
                border-color: var(--sc-auth-cyan);
                background: rgba(15, 23, 42, 0.95);
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.22);
            }

            .sc-input-control:focus + .sc-input-icon,
            .sc-input-wrapper:focus-within .sc-input-icon {
                color: var(--sc-auth-cyan);
            }

            .sc-input-control::placeholder {
                color: #64748b;
            }

            .sc-input-control[readonly] {
                background: rgba(15, 23, 42, 0.5);
                color: #94a3b8;
                border-color: rgba(255, 255, 255, 0.08);
                cursor: not-allowed;
            }

            .sc-eye-btn {
                position: absolute;
                right: 12px;
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                font-size: 15px;
                padding: 4px;
                transition: color 0.2s;
            }

            .sc-eye-btn:hover {
                color: #f1f5f9;
            }

            /* Action Buttons */
            .sc-submit-btn {
                margin-top: 6px;
                background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
                color: #ffffff;
                font-size: 14px;
                font-weight: 700;
                padding: 13px 20px;
                border-radius: 12px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 6px 20px rgba(2, 132, 199, 0.35);
            }

            .sc-submit-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 8px 25px rgba(2, 132, 199, 0.5);
                filter: brightness(1.08);
            }

            .sc-submit-btn.sc-btn-staff {
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
            }

            .sc-submit-btn.sc-btn-emerald {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
            }

            .sc-message-box {
                margin-top: 14px;
                font-size: 12.5px;
                text-align: center;
                min-height: 18px;
                font-weight: 600;
            }

            /* =======================================================
               PROFILE MODAL SPECIALIZED STYLES
               ======================================================= */
            
            .sc-profile-hero {
                position: relative;
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
                border: 1px solid var(--sc-auth-border);
                border-radius: 18px;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 20px;
                overflow: hidden;
            }

            .sc-profile-hero::before {
                content: "";
                position: absolute;
                top: -50px;
                right: -50px;
                width: 140px;
                height: 140px;
                background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%);
                pointer-events: none;
            }

            .sc-profile-avatar-wrap {
                position: relative;
                flex-shrink: 0;
            }

            .sc-profile-avatar-circle {
                width: 68px;
                height: 68px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0284c7 0%, #10b981 100%);
                color: #ffffff;
                font-size: 24px;
                font-weight: 800;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid rgba(56, 189, 248, 0.4);
                box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
            }

            .sc-profile-avatar-circle.staff-avatar {
                background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
            }

            .sc-avatar-status-dot {
                position: absolute;
                bottom: 2px;
                right: 2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #10b981;
                border: 3px solid #0f172a;
                box-shadow: 0 0 8px #10b981;
            }

            .sc-profile-meta {
                flex: 1;
                min-width: 0;
            }

            .sc-profile-name {
                font-size: 20px;
                font-weight: 800;
                color: #ffffff;
                margin: 0 0 6px 0;
                letter-spacing: -0.4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sc-profile-badges-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px;
            }

            .sc-badge {
                font-size: 11px;
                font-weight: 700;
                padding: 3px 9px;
                border-radius: 999px;
                letter-spacing: 0.3px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            .sc-badge-verified {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
                border: 1px solid rgba(52, 211, 153, 0.35);
            }

            .sc-badge-id {
                background: rgba(56, 189, 248, 0.15);
                color: #38bdf8;
                border: 1px solid rgba(56, 189, 248, 0.35);
                font-family: monospace;
            }

            .sc-badge-role {
                background: rgba(99, 102, 241, 0.18);
                color: #a5b4fc;
                border: 1px solid rgba(129, 140, 248, 0.35);
            }

            .sc-profile-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }

            @media (max-width: 640px) {
                .sc-profile-grid {
                    grid-template-columns: 1fr;
                }
            }

            .sc-card-panel {
                background: rgba(30, 41, 59, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .sc-panel-header {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                color: var(--sc-auth-cyan);
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 2px;
            }

            .sc-footer-actions {
                padding: 16px 24px;
                background: rgba(15, 23, 42, 0.95);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                flex-wrap: wrap;
            }

            .sc-btn-secondary {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #e2e8f0;
                font-size: 13px;
                font-weight: 700;
                padding: 10px 18px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .sc-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.14);
                color: #ffffff;
            }

            .sc-btn-danger {
                background: rgba(239, 68, 68, 0.12);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #f87171;
                font-size: 13px;
                font-weight: 700;
                padding: 10px 18px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .sc-btn-danger:hover {
                background: rgba(239, 68, 68, 0.25);
                border-color: #ef4444;
                color: #ffffff;
            }

            /* Global Dropdown Glassmorphism */
            .sc-global-dropdown {
                position: absolute;
                top: calc(100% + 12px);
                right: 0;
                width: 290px;
                background: linear-gradient(155deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 28, 0.99) 100%);
                border: 1px solid rgba(56, 189, 248, 0.35);
                border-radius: 18px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(56, 189, 248, 0.15);
                padding: 16px;
                z-index: 999999;
                color: #f8fafc;
                text-align: left;
                animation: scSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .sc-dropdown-user-row {
                display: flex;
                align-items: center;
                gap: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .sc-dd-avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0284c7 0%, #10b981 100%);
                color: #ffffff;
                font-weight: 800;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(56, 189, 248, 0.4);
                box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
            }

            .sc-dd-item-btn {
                width: 100%;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(30, 41, 59, 0.5);
                color: #f8fafc;
                font-size: 12.5px;
                font-weight: 700;
                padding: 10px 14px;
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 8px;
                transition: all 0.2s;
                text-decoration: none;
                font-family: inherit;
            }

            .sc-dd-item-btn:hover {
                background: rgba(56, 189, 248, 0.15);
                border-color: rgba(56, 189, 248, 0.4);
                color: #38bdf8;
                transform: translateX(2px);
            }

            /* Toasts */
            .sc-toast-container {
                position: fixed;
                top: 24px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            }

            .sc-toast-item {
                pointer-events: auto;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(56, 189, 248, 0.4);
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 999px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 13px;
                font-weight: 600;
                font-family: var(--sc-auth-font);
                animation: scSlideUp 0.2s ease-out;
            }

            .sc-toast-success { border-color: #10b981; }
            .sc-toast-error { border-color: #ef4444; }
            .sc-toast-fadeout { opacity: 0; transform: translateY(-10px); transition: all 0.3s; }
        `;
        document.head.appendChild(styleEl);
    }

    // -------------------------------------------------------
    // PUBLIC SESSION API & CACHE MANAGEMENT
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
        showToast("Signed out of SmartCity Portal.", "info");
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("smartcity:auth-change", { detail: { token: null, user: null } }));
            setTimeout(() => window.location.reload(), 300);
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
        } catch (_) {}
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

        _injectAuthStyles();

        drawer = document.createElement("div");
        drawer.id = "scGlobalNotifDrawer";
        drawer.style.cssText = `
            position: fixed;
            top: 74px;
            right: 24px;
            width: 380px;
            max-width: calc(100vw - 32px);
            max-height: 520px;
            background: linear-gradient(155deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 28, 0.99) 100%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 20px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(56, 189, 248, 0.15);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: var(--sc-auth-font);
            color: #f1f5f9;
            animation: scSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        drawer.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(30,41,59,0.5);">
                <div style="display:flex; align-items:center; gap:10px; font-weight:800; font-size:15px; color:#ffffff;">
                    <span style="font-size:18px;">🔔</span> City Alert Stream
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button id="scNotifMarkAllReadBtn" style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; font-size:11.5px; font-weight:700; border-radius:6px; cursor:pointer; padding:4px 8px; transition:all 0.2s;">Mark all read</button>
                    <button id="scNotifCloseBtn" class="sc-close-btn" style="width:28px; height:28px; font-size:13px;">✕</button>
                </div>
            </div>
            <div id="scNotifList" style="overflow-y:auto; flex:1; padding:12px; display:flex; flex-direction:column; gap:10px;">
                <div style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">Loading notifications...</div>
            </div>
        `;

        document.body.appendChild(drawer);

        drawer.querySelector("#scNotifCloseBtn").addEventListener("click", () => drawer.remove());
        drawer.querySelector("#scNotifMarkAllReadBtn").addEventListener("click", async () => {
            try {
                await authFetch(`${_getApiBase()}/api/notifications/read-all`, { method: "PUT" });
                refreshNotificationCount();
                loadNotifications();
                showToast("All notifications marked as read", "success");
            } catch (_) {}
        });

        async function loadNotifications() {
            const listEl = drawer.querySelector("#scNotifList");
            try {
                const res = await authFetch(`${_getApiBase()}/api/notifications`);
                if (res.ok) {
                    const { data } = await res.json();
                    if (!data || data.length === 0) {
                        listEl.innerHTML = `
                            <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
                                <div style="font-size:32px; margin-bottom:8px;">📭</div>
                                <div style="font-weight:700; color:#e2e8f0; font-size:14px;">No new alerts</div>
                                <div style="font-size:12px; color:#64748b; margin-top:2px;">All municipal alerts and appointments are caught up.</div>
                            </div>
                        `;
                        return;
                    }

                    listEl.innerHTML = data.map(n => `
                        <div style="background:${n.is_read ? 'rgba(30,41,59,0.45)' : 'rgba(56,189,248,0.1)'}; border:1px solid ${n.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.35)'}; border-radius:12px; padding:12px; font-size:12.5px; transition:border-color 0.2s;">
                            <div style="font-weight:700; color:${n.is_read ? '#cbd5e1' : '#38bdf8'}; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                                <span>${_escapeHtml(n.title)}</span>
                                <span style="font-size:10.5px; color:#94a3b8; font-weight:500;">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style="color:#e2e8f0; line-height:1.45;">${_escapeHtml(n.message)}</div>
                        </div>
                    `).join("");
                }
            } catch (_) {
                listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#f87171; font-size:12px;">Failed to load alerts.</div>`;
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
            showToast("Authenticating persona...", "info");
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
                const profModal = document.getElementById("scGlobalProfileModal");
                if (profModal) profModal.remove();
                renderUserHeader();
                showToast(`Welcome back, ${data.user.name || 'User'}!`, "success");
                setTimeout(() => window.location.reload(), 300);
            } else {
                alert("Login failed: " + (data.message || "Invalid credentials"));
            }
        } catch (e) {
            alert("Connection error: " + e.message);
        }
    }

    // -------------------------------------------------------
    // UNIVERSAL CITIZEN & STAFF PROFILE MODAL
    // -------------------------------------------------------

    function showProfileModal(activeTab = "identity") {
        _injectAuthStyles();

        const existing = document.getElementById("scGlobalProfileModal");
        if (existing) existing.remove();

        const user = getUser();
        if (!user || !isAuthenticated()) {
            showLoginModal("citizen", { message: "Please sign in to view your official profile." });
            return;
        }

        const isStaffUser = isStaff();
        const displayName = user.name || (isStaffUser ? "Staff Officer" : "Omkar Yadav");
        const mobile = user.mobile || user.phone || "6306880179";
        const email = user.email || (isStaffUser ? "officer@smartcity.gov.in" : "omkaryadav@gmail.com");
        const citizenId = user.citizen_id || user.citizenId || (isStaffUser ? (user.staff_id || "ST-TR-VERMA") : "GKP-CIT-2026-001");
        const roleLabel = isStaffUser ? (user.department ? `${user.role.toUpperCase()} • ${user.department.toUpperCase()}` : "STAFF OFFICER") : "VERIFIED CITIZEN";
        const initials = displayName.split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || (isStaffUser ? "ST" : "OY");
        const savedVehicle = localStorage.getItem("smartcity_primary_vehicle") || user.vehicleNumber || "UP 53 AB 1008";
        const pId = localStorage.getItem("patientId") || user.patientId || (isStaffUser ? null : "PAT-1002348");
        const ward = user.ward || "Ward 14 - Golghar Commercial / Civil Lines";
        const bloodGroup = user.bloodGroup || "O+ Positive";
        const emergencyContactName = user.emergencyContactName || "Rajesh Yadav";
        const emergencyContactPhone = user.emergencyContactPhone || "9876543210";

        const modal = document.createElement("div");
        modal.id = "scGlobalProfileModal";
        modal.className = "sc-modal-backdrop";

        modal.innerHTML = `
            <div class="sc-dialog-card sc-card-wide" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
                    <div class="sc-header-title-wrap">
                        <div class="sc-header-icon-box">🏛️</div>
                        <div>
                            <h2 class="sc-header-title">
                                <span>Official Digital Identity Dossier</span>
                                <span class="sc-badge sc-badge-verified">✓ ACTIVE KYC</span>
                            </h2>
                            <p class="sc-header-subtitle">Gorakhpur Smart City Municipal Authority • Citizen &amp; Official Registry</p>
                        </div>
                    </div>
                    <button type="button" class="sc-close-btn" id="scProfileCloseBtn">✕</button>
                </div>

                <!-- Hero Avatar & Identity Card -->
                <div style="padding: 20px 24px 0 24px;">
                    <div class="sc-profile-hero">
                        <div class="sc-profile-avatar-wrap">
                            <div class="sc-profile-avatar-circle ${isStaffUser ? 'staff-avatar' : ''}">
                                ${_escapeHtml(initials)}
                            </div>
                            <span class="sc-avatar-status-dot" title="Authenticated & Active"></span>
                        </div>
                        <div class="sc-profile-meta">
                            <h3 class="sc-profile-name" id="scProfDisplayName">${_escapeHtml(displayName)}</h3>
                            <div class="sc-profile-badges-row">
                                <span class="sc-badge sc-badge-id">ID: ${_escapeHtml(citizenId)}</span>
                                <span class="sc-badge ${isStaffUser ? 'sc-badge-role' : 'sc-badge-verified'}">${_escapeHtml(roleLabel)}</span>
                                <span class="sc-badge" style="background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid rgba(255,255,255,0.1);">
                                    🛡️ Security Clearance: Level ${isStaffUser ? '4' : '3'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabs Navigation -->
                <div class="sc-segmented-tabs" style="margin-top:0;">
                    <button type="button" class="sc-tab-pill active" data-tab="identity">
                        <span>🪪</span> Identity &amp; Contact
                    </button>
                    ${!isStaffUser ? `
                    <button type="button" class="sc-tab-pill" data-tab="mobility">
                        <span>🚗</span> Smart Vehicle &amp; Fastag
                    </button>
                    <button type="button" class="sc-tab-pill" data-tab="health">
                        <span>🩺</span> Health &amp; Ayushman
                    </button>
                    ` : `
                    <button type="button" class="sc-tab-pill" data-tab="ops">
                        <span>⚡</span> Operations &amp; Shifts
                    </button>
                    `}
                    <button type="button" class="sc-tab-pill" data-tab="security">
                        <span>🛡️</span> Security &amp; Personas
                    </button>
                </div>

                <!-- Body / Tab Content Panes -->
                <div class="sc-dialog-body">
                    <!-- Tab 1: Identity & Contact -->
                    <div id="scTabPane-identity" class="sc-profile-pane">
                        <form id="scProfileForm-identity">
                            <div class="sc-profile-grid">
                                <div class="sc-card-panel">
                                    <div class="sc-panel-header">
                                        <span>👤 Personal Credentials</span>
                                        <span style="font-size:10px; color:#10b981;">VERIFIED</span>
                                    </div>
                                    <div class="sc-field-group">
                                        <label class="sc-field-label">Full Name</label>
                                        <div class="sc-input-wrapper">
                                            <span class="sc-input-icon">👤</span>
                                            <input type="text" id="scProfInputName" class="sc-input-control" value="${_escapeHtml(displayName)}" required />
                                        </div>
                                    </div>
                                    <div class="sc-field-group">
                                        <label class="sc-field-label">Registered Mobile Number</label>
                                        <div class="sc-input-wrapper">
                                            <span class="sc-input-icon">📱</span>
                                            <input type="tel" id="scProfInputMobile" class="sc-input-control" value="${_escapeHtml(mobile)}" readonly />
                                        </div>
                                    </div>
                                    <div class="sc-field-group">
                                        <label class="sc-field-label">Email Address</label>
                                        <div class="sc-input-wrapper">
                                            <span class="sc-input-icon">✉️</span>
                                            <input type="email" id="scProfInputEmail" class="sc-input-control" value="${_escapeHtml(email)}" required />
                                        </div>
                                    </div>
                                </div>

                                <div class="sc-card-panel">
                                    <div class="sc-panel-header">
                                        <span>📍 Municipal Jurisdiction &amp; Ward</span>
                                    </div>
                                    <div class="sc-field-group">
                                        <label class="sc-field-label">Residential Ward</label>
                                        <div class="sc-input-wrapper">
                                            <span class="sc-input-icon">🏙️</span>
                                            <select id="scProfInputWard" class="sc-input-control" style="background:#0b1324;">
                                                <option ${ward.includes('Golghar') ? 'selected' : ''}>Ward 14 - Golghar Commercial / Civil Lines</option>
                                                <option ${ward.includes('Gorakhnath') ? 'selected' : ''}>Ward 03 - Gorakhnath Dham Sector</option>
                                                <option ${ward.includes('Medical') ? 'selected' : ''}>Ward 09 - Medical College / BRD Area</option>
                                                <option ${ward.includes('Taramandal') ? 'selected' : ''}>Ward 18 - Taramandal Lakeview Zone</option>
                                                <option ${ward.includes('Basharatpur') ? 'selected' : ''}>Ward 22 - Basharatpur Industrial Belt</option>
                                                <option ${ward.includes('Rustampur') ? 'selected' : ''}>Ward 07 - Rustampur South</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="sc-field-group">
                                        <label class="sc-field-label">City &amp; Postal District</label>
                                        <div class="sc-input-wrapper">
                                            <span class="sc-input-icon">🏛️</span>
                                            <input type="text" class="sc-input-control" value="Gorakhpur, Uttar Pradesh - 273001" readonly />
                                        </div>
                                    </div>
                                    <div class="sc-field-group">
                                        <label class="sc-field-label">Aadhaar / DigiLocker Linking</label>
                                        <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:10px; font-size:12px; display:flex; align-items:center; gap:8px;">
                                            <span>🔒</span>
                                            <span>UIDAI Aadhaar Linked: <b>•••• •••• 8819</b> (Verified)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    ${!isStaffUser ? `
                    <!-- Tab 2: Smart Vehicle & Mobility -->
                    <div id="scTabPane-mobility" class="sc-profile-pane" style="display: none;">
                        <div class="sc-profile-grid">
                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>🚗 Primary Vehicle Registration</span>
                                    <span style="font-size:10px; color:#38bdf8;">PARKING &amp; TOLL</span>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">License Plate Number <span class="req">(Auto-fills all parking bookings)</span></label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">🚘</span>
                                        <input type="text" id="scProfInputVehicle" class="sc-input-control" style="font-weight:700; text-transform:uppercase; letter-spacing:1px;" value="${_escapeHtml(savedVehicle)}" placeholder="e.g. UP 53 AB 1008" />
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Vehicle Category</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">⚡</span>
                                        <select id="scProfInputVehType" class="sc-input-control" style="background:#0b1324;">
                                            <option selected>4-Wheeler (Sedan / Hatchback / SUV)</option>
                                            <option>2-Wheeler (Motorcycle / EV Scooter)</option>
                                            <option>Commercial Electric Vehicle (EV Taxi)</option>
                                        </select>
                                    </div>
                                </div>
                                <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); border-radius:10px; padding:12px; font-size:12px; line-height:1.45;">
                                    <div style="font-weight:700; color:#38bdf8; margin-bottom:2px;">📶 Integrated Fastag RFID Status</div>
                                    <div style="color:#e2e8f0;">FTG-UP53-8801 • Active auto-clearance at Golghar, Railway Station, and BRD multi-tier gates.</div>
                                </div>
                            </div>

                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>🅿️ Quick Mobility Shortcuts</span>
                                </div>
                                <p style="font-size:12px; color:#94a3b8; line-height:1.5; margin:0;">
                                    Manage your live barrier clearance passes, bay navigations, and real-time multi-tier reservations.
                                </p>
                                <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                                    <button type="button" class="sc-btn-secondary" onclick="document.getElementById('scGlobalProfileModal').remove(); const pLink = window.location.pathname.includes('/pages/') ? '../parking/parking.html' : 'pages/parking/parking.html'; window.location.href = pLink;">
                                        <span>🅿️</span> Launch Smart Parking Module
                                    </button>
                                    <button type="button" class="sc-btn-secondary" onclick="document.getElementById('scGlobalProfileModal').remove(); SmartCityAuth.openActivityCenter('parking');">
                                        <span>🎫</span> View Active Parking Tickets &amp; QR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 3: Health & Ayushman Dossier -->
                    <div id="scTabPane-health" class="sc-profile-pane" style="display: none;">
                        <div class="sc-profile-grid">
                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>🏥 Ayushman Health Card &amp; Emergency</span>
                                    <span style="font-size:10px; color:#34d399;">DIGITAL HEALTH ID</span>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Assigned Patient Dossier ID</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">🪪</span>
                                        <input type="text" class="sc-input-control" value="${_escapeHtml(pId || 'PAT-1002348')}" readonly />
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Blood Group</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">🩸</span>
                                        <select id="scProfInputBlood" class="sc-input-control" style="background:#0b1324;">
                                            <option ${bloodGroup.includes('O+') ? 'selected' : ''}>O+ Positive</option>
                                            <option ${bloodGroup.includes('A+') ? 'selected' : ''}>A+ Positive</option>
                                            <option ${bloodGroup.includes('B+') ? 'selected' : ''}>B+ Positive</option>
                                            <option ${bloodGroup.includes('AB+') ? 'selected' : ''}>AB+ Positive</option>
                                            <option ${bloodGroup.includes('O-') ? 'selected' : ''}>O- Negative</option>
                                            <option ${bloodGroup.includes('A-') ? 'selected' : ''}>A- Negative</option>
                                            <option ${bloodGroup.includes('B-') ? 'selected' : ''}>B- Negative</option>
                                            <option ${bloodGroup.includes('AB-') ? 'selected' : ''}>AB- Negative</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Emergency Contact Person</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">🆘</span>
                                        <input type="text" id="scProfInputEmName" class="sc-input-control" value="${_escapeHtml(emergencyContactName)}" />
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Emergency Phone</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">📞</span>
                                        <input type="tel" id="scProfInputEmPhone" class="sc-input-control" value="${_escapeHtml(emergencyContactPhone)}" />
                                    </div>
                                </div>
                            </div>

                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>🩺 Medical Dossier Quick Access</span>
                                </div>
                                <p style="font-size:12px; color:#94a3b8; line-height:1.5; margin:0;">
                                    Instant linkage with AIIMS Gorakhpur, BRD Medical College, pathology reports, prescription history, and emergency triage.
                                </p>
                                <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
                                    <button type="button" class="sc-btn-secondary" onclick="document.getElementById('scGlobalProfileModal').remove(); const hLink = window.location.pathname.includes('/pages/') ? '../hospital/hospital.html' : 'pages/hospital/hospital.html'; window.location.href = hLink;">
                                        <span>🪪</span> Open Digital OPD Pass &amp; Medical QR
                                    </button>
                                    <button type="button" class="sc-btn-secondary" onclick="document.getElementById('scGlobalProfileModal').remove(); SmartCityAuth.openActivityCenter('appointments');">
                                        <span>📅</span> Track Doctor Appointments
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <!-- Tab 2 (Staff): Operations & Shift -->
                    <div id="scTabPane-ops" class="sc-profile-pane" style="display: none;">
                        <div class="sc-profile-grid">
                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>⚡ Official Duty &amp; Roster</span>
                                    <span style="font-size:10px; color:#fb923c;">ACTIVE ON-DUTY</span>
                                </div>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12.5px;">
                                    <div><span style="color:#94a3b8;">Department:</span> <b style="color:#ffffff;">${_escapeHtml((user.department || 'Operations').toUpperCase())}</b></div>
                                    <div><span style="color:#94a3b8;">Duty Shift:</span> <b style="color:#ffffff;">General (08:00 - 20:00)</b></div>
                                    <div><span style="color:#94a3b8;">Assigned Sector:</span> <b style="color:#ffffff;">Gorakhpur Central</b></div>
                                    <div><span style="color:#94a3b8;">Radio Channel:</span> <b style="color:#38bdf8;">CH-04 TACTICAL</b></div>
                                </div>
                            </div>
                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>📋 Active Operations</span>
                                </div>
                                <div style="font-size:12.5px; color:#cbd5e1; line-height:1.5;">
                                    You have full supervisory authority to dispatch response teams, verify civic escalations, and issue emergency alerts.
                                </div>
                                <button type="button" class="sc-btn-secondary" style="margin-top:8px;" onclick="document.getElementById('scGlobalProfileModal').remove(); SmartCityAuth.openActivityCenter('requests');">
                                    <span>📋</span> Open SLA &amp; Complaints Console
                                </button>
                            </div>
                        </div>
                    </div>
                    `}

                    <!-- Tab 4: Security & Personas -->
                    <div id="scTabPane-security" class="sc-profile-pane" style="display: none;">
                        <div class="sc-profile-grid">
                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>🔒 Active Token &amp; Encryption</span>
                                    <span style="font-size:10px; color:#10b981;">ENCRYPTED</span>
                                </div>
                                <div style="font-size:12px; color:#cbd5e1; display:flex; flex-direction:column; gap:8px;">
                                    <div>Token Standard: <b>JWT HMAC-SHA256</b></div>
                                    <div>Session Timeout: <b>24 Hours Active Refresh</b></div>
                                    <div>Client Origin: <b>SmartCity AI Unified Client</b></div>
                                </div>
                            </div>
                            <div class="sc-card-panel">
                                <div class="sc-panel-header">
                                    <span>⚡ 1-Click Instant Persona Switching</span>
                                </div>
                                <div class="sc-persona-chips">
                                    <button type="button" class="sc-persona-btn sc-p-citizen" onclick="SmartCityAuth.quickLoginPersona('citizen')">
                                        <span>🚗</span> Omkar (Citizen 1)
                                    </button>
                                    <button type="button" class="sc-persona-btn sc-p-citizen2" onclick="SmartCityAuth.quickLoginPersona('citizen2')">
                                        <span>👤</span> Demo Citizen
                                    </button>
                                    <button type="button" class="sc-persona-btn sc-p-traffic" onclick="SmartCityAuth.quickLoginPersona('traffic')">
                                        <span>👮</span> Insp. Verma
                                    </button>
                                    <button type="button" class="sc-persona-btn sc-p-hospital" onclick="SmartCityAuth.quickLoginPersona('hospital')">
                                        <span>🏥</span> Hospital Desk
                                    </button>
                                    <button type="button" class="sc-persona-btn sc-p-admin" onclick="SmartCityAuth.quickLoginPersona('admin')">
                                        <span>🛡️</span> ICCC Director
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="sc-footer-actions">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" id="scProfileSaveBtn" class="sc-submit-btn" style="padding:9px 18px; margin:0; font-size:13px;">
                            <span>💾</span> Save Profile Changes
                        </button>
                        <button type="button" id="scProfileActivityBtn" class="sc-btn-secondary" style="padding:9px 16px; margin:0;">
                            <span>📊</span> My Activity
                        </button>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" id="scProfileSignOutBtn" class="sc-btn-danger" style="padding:9px 16px; margin:0;">
                            <span>🚪</span> Sign Out
                        </button>
                        <button type="button" class="sc-btn-secondary" id="scProfileCancelBtn" style="padding:9px 16px; margin:0;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close Handlers
        const closeBtn = modal.querySelector("#scProfileCloseBtn");
        const cancelBtn = modal.querySelector("#scProfileCancelBtn");
        const dismissModal = () => modal.remove();
        if (closeBtn) closeBtn.addEventListener("click", dismissModal);
        if (cancelBtn) cancelBtn.addEventListener("click", dismissModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) dismissModal();
        });

        // Tab Navigation
        const tabs = modal.querySelectorAll(".sc-tab-pill");
        const panes = modal.querySelectorAll(".sc-profile-pane");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const target = tab.getAttribute("data-tab");
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                panes.forEach(p => {
                    p.style.display = p.id === `scTabPane-${target}` ? "block" : "none";
                });
            });
        });

        // Save Profile Changes
        const saveBtn = modal.querySelector("#scProfileSaveBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", async () => {
                saveBtn.disabled = true;
                saveBtn.innerHTML = `<span>⏳</span> Saving...`;

                const nameVal = modal.querySelector("#scProfInputName") ? modal.querySelector("#scProfInputName").value.trim() : displayName;
                const emailVal = modal.querySelector("#scProfInputEmail") ? modal.querySelector("#scProfInputEmail").value.trim() : email;
                const vehicleVal = modal.querySelector("#scProfInputVehicle") ? modal.querySelector("#scProfInputVehicle").value.trim().toUpperCase() : savedVehicle;
                const wardVal = modal.querySelector("#scProfInputWard") ? modal.querySelector("#scProfInputWard").value : ward;
                const bloodVal = modal.querySelector("#scProfInputBlood") ? modal.querySelector("#scProfInputBlood").value : bloodGroup;
                const emNameVal = modal.querySelector("#scProfInputEmName") ? modal.querySelector("#scProfInputEmName").value.trim() : emergencyContactName;
                const emPhoneVal = modal.querySelector("#scProfInputEmPhone") ? modal.querySelector("#scProfInputEmPhone").value.trim() : emergencyContactPhone;

                // 1. Update localStorage vehicle plate immediately (syncs to parking module)
                if (vehicleVal) {
                    localStorage.setItem("smartcity_primary_vehicle", vehicleVal);
                }

                // 2. Build updated user payload
                const updatedUser = Object.assign({}, user, {
                    name: nameVal,
                    email: emailVal,
                    vehicleNumber: vehicleVal,
                    ward: wardVal,
                    bloodGroup: bloodVal,
                    emergencyContactName: emNameVal,
                    emergencyContactPhone: emPhoneVal
                });

                // 3. Send PUT request to backend
                try {
                    await authFetch(`${_getApiBase()}/api/auth/profile`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updatedUser)
                    });
                } catch (_) {}

                // 4. Update session
                setSession(getToken(), updatedUser);
                renderUserHeader();

                // 5. Update displayed name in modal
                const nameDisplay = modal.querySelector("#scProfDisplayName");
                if (nameDisplay) nameDisplay.textContent = nameVal;

                saveBtn.disabled = false;
                saveBtn.innerHTML = `<span>💾</span> Save Profile Changes`;
                showToast("Profile details updated successfully!", "success");
            });
        }

        // Activity button inside profile
        const actBtn = modal.querySelector("#scProfileActivityBtn");
        if (actBtn) {
            actBtn.addEventListener("click", () => {
                modal.remove();
                openActivityCenter("requests");
            });
        }

        // Sign out button inside profile
        const soBtn = modal.querySelector("#scProfileSignOutBtn");
        if (soBtn) {
            soBtn.addEventListener("click", () => {
                if (confirm("Are you sure you want to sign out?")) {
                    modal.remove();
                    logout();
                }
            });
        }
    }

    // -------------------------------------------------------
    // UNIVERSAL MODAL LOGIN DIALOG
    // -------------------------------------------------------

    function showLoginModal(defaultTab = "citizen", options = {}) {
        _injectAuthStyles();

        const existing = document.getElementById("scGlobalLoginModal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "scGlobalLoginModal";
        modal.className = "sc-modal-backdrop";

        modal.innerHTML = `
            <div class="sc-dialog-card" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
                    <div class="sc-header-title-wrap">
                        <div class="sc-header-icon-box">🏛️</div>
                        <div>
                            <h2 class="sc-header-title">SmartCity AI Portal Access</h2>
                            <p class="sc-header-subtitle">Unified Digital Municipal Identity &amp; Command Services</p>
                        </div>
                    </div>
                    <button type="button" class="sc-close-btn" id="scModalCloseBtn">✕</button>
                </div>

                <!-- 1-Click Instant Persona Sign-In Bar -->
                <div class="sc-persona-bar">
                    <div class="sc-persona-label">
                        <span>⚡ 1-Click Instant Persona Sign-In:</span>
                    </div>
                    <div class="sc-persona-chips">
                        <button type="button" class="sc-persona-btn sc-p-citizen" onclick="SmartCityAuth.quickLoginPersona('citizen')">
                            <span>🚗</span> Omkar (Citizen 1)
                        </button>
                        <button type="button" class="sc-persona-btn sc-p-citizen2" onclick="SmartCityAuth.quickLoginPersona('citizen2')">
                            <span>👤</span> Demo (Citizen 2)
                        </button>
                        <button type="button" class="sc-persona-btn sc-p-traffic" onclick="SmartCityAuth.quickLoginPersona('traffic')">
                            <span>👮</span> Insp. Verma (Traffic)
                        </button>
                        <button type="button" class="sc-persona-btn sc-p-hospital" onclick="SmartCityAuth.quickLoginPersona('hospital')">
                            <span>🏥</span> STAFF-001 (Hospital)
                        </button>
                        <button type="button" class="sc-persona-btn sc-p-admin" onclick="SmartCityAuth.quickLoginPersona('admin')">
                            <span>🛡️</span> TR-ADMIN (ICCC)
                        </button>
                    </div>
                </div>

                <!-- Segmented Tabs -->
                <div class="sc-segmented-tabs">
                    <button type="button" class="sc-tab-pill active" data-tab="citizen">
                        <span>👤</span> Citizen Sign-In
                    </button>
                    <button type="button" class="sc-tab-pill" data-tab="staff">
                        <span>👮</span> Staff / Officer
                    </button>
                    <button type="button" class="sc-tab-pill" data-tab="register">
                        <span>✨</span> Register
                    </button>
                </div>

                <!-- Form Body -->
                <div class="sc-dialog-body">
                    <!-- Citizen Form -->
                    <form id="scCitizenForm" class="sc-form">
                        <div class="sc-field-group">
                            <label class="sc-field-label">Mobile Number or Email <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">📱</span>
                                <input type="text" id="scCitLoginId" class="sc-input-control" required placeholder="e.g. 6306880179 or citizen@example.com" />
                            </div>
                        </div>
                        <div class="sc-field-group">
                            <label class="sc-field-label">Password <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">🔒</span>
                                <input type="password" id="scCitPassword" class="sc-input-control" required placeholder="••••••••" />
                                <button type="button" class="sc-eye-btn" onclick="const p=document.getElementById('scCitPassword'); p.type = p.type==='password'?'text':'password';">👁️</button>
                            </div>
                        </div>
                        <button type="submit" class="sc-submit-btn">
                            <span>🚀</span> Sign In to Citizen Portal
                        </button>
                    </form>

                    <!-- Staff Form -->
                    <form id="scStaffForm" class="sc-form" style="display: none;">
                        <div class="sc-field-group">
                            <label class="sc-field-label">Official Staff / Officer ID <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">🪪</span>
                                <input type="text" id="scStaffId" class="sc-input-control" required placeholder="e.g. TR-VERMA, STAFF-001, TR-ADMIN" />
                            </div>
                        </div>
                        <div class="sc-field-group">
                            <label class="sc-field-label">Official Password <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">🔒</span>
                                <input type="password" id="scStaffPassword" class="sc-input-control" required placeholder="••••••••" />
                                <button type="button" class="sc-eye-btn" onclick="const p=document.getElementById('scStaffPassword'); p.type = p.type==='password'?'text':'password';">👁️</button>
                            </div>
                        </div>
                        <button type="submit" class="sc-submit-btn sc-btn-staff">
                            <span>🛡️</span> Sign In to Command Department
                        </button>
                    </form>

                    <!-- Register Form -->
                    <form id="scRegisterForm" class="sc-form" style="display: none;">
                        <div class="sc-field-group">
                            <label class="sc-field-label">Full Citizen Name <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">👤</span>
                                <input type="text" id="scRegName" class="sc-input-control" required placeholder="Enter your full name" />
                            </div>
                        </div>
                        <div class="sc-field-group">
                            <label class="sc-field-label">10-Digit Mobile Number <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">📱</span>
                                <input type="tel" id="scRegMobile" class="sc-input-control" required placeholder="e.g. 6306880179" />
                            </div>
                        </div>
                        <div class="sc-field-group">
                            <label class="sc-field-label">Email Address <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">✉️</span>
                                <input type="email" id="scRegEmail" class="sc-input-control" required placeholder="name@example.com" />
                            </div>
                        </div>
                        <div class="sc-field-group">
                            <label class="sc-field-label">Create Password <span class="req">*</span></label>
                            <div class="sc-input-wrapper">
                                <span class="sc-input-icon">🔒</span>
                                <input type="password" id="scRegPassword" class="sc-input-control" required placeholder="Min 6 characters" />
                            </div>
                        </div>
                        <button type="submit" class="sc-submit-btn sc-btn-emerald">
                            <span>✨</span> Create New Citizen Account
                        </button>
                    </form>

                    <div id="scModalMsg" class="sc-message-box"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Tab switching
        const tabBtns = modal.querySelectorAll(".sc-tab-pill");
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
                    b.classList.remove("active", "active-emerald");
                });
                if (tab === "register") {
                    btn.classList.add("active-emerald");
                } else {
                    btn.classList.add("active");
                }

                Object.keys(forms).forEach(k => {
                    forms[k].style.display = k === tab ? "flex" : "none";
                });
                msgEl.textContent = "";
            });
        });

        // Activate requested defaultTab
        if (defaultTab && forms[defaultTab]) {
            tabBtns.forEach(b => b.classList.remove("active", "active-emerald"));
            const activeBtn = modal.querySelector(`.sc-tab-pill[data-tab="${defaultTab}"]`);
            if (activeBtn) {
                if (defaultTab === "register") activeBtn.classList.add("active-emerald");
                else activeBtn.classList.add("active");
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
            msgEl.textContent = "Authenticating citizen credentials...";
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
                    showToast(`Signed in as ${data.user.name || 'Citizen'}`, "success");
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
                    msgEl.textContent = data.message || "Invalid mobile number or password.";
                }
            } catch (_) {
                msgEl.style.color = "#f87171";
                msgEl.textContent = "Unable to connect to login server.";
            }
        });

        // Staff Login Handler
        forms.staff.addEventListener("submit", async (e) => {
            e.preventDefault();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Authenticating official staff credentials...";
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
                    showToast(`Welcome Officer ${data.user.name}`, "success");
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
            } catch (_) {
                msgEl.style.color = "#f87171";
                msgEl.textContent = "Unable to connect to staff login server.";
            }
        });

        // Register Handler
        forms.register.addEventListener("submit", async (e) => {
            e.preventDefault();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Creating citizen account in municipal registry...";
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
                    showToast("Citizen account registered successfully!", "success");
                    setTimeout(() => {
                        modal.remove();
                        window.location.reload();
                    }, 350);
                } else {
                    msgEl.style.color = "#f87171";
                    msgEl.textContent = data.message || "Registration failed.";
                }
            } catch (_) {
                msgEl.style.color = "#f87171";
                msgEl.textContent = "Unable to connect to registration server.";
            }
        });
    }

    // -------------------------------------------------------
    // CITIZEN & STAFF ACTIVITY CENTER MODAL (DARK HUD)
    // -------------------------------------------------------

    function openActivityCenter(defaultTab = "requests") {
        _injectAuthStyles();

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
        modal.className = "sc-modal-backdrop";

        modal.innerHTML = `
            <div class="sc-dialog-card sc-card-wide" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
                    <div class="sc-header-title-wrap">
                        <div class="sc-header-icon-box">📊</div>
                        <div>
                            <h2 class="sc-header-title">Citizen Activity &amp; Live Service History</h2>
                            <p class="sc-header-subtitle">Real-time status of service requests, healthcare appointments, and parking passes</p>
                        </div>
                    </div>
                    <button type="button" class="sc-close-btn" id="scActivityCloseBtn">✕</button>
                </div>

                <!-- Tabs -->
                <div class="sc-segmented-tabs">
                    <button type="button" class="sc-tab-pill sc-act-tab active" data-tab="requests">
                        <span>📋</span> Grievances &amp; SLA
                    </button>
                    <button type="button" class="sc-tab-pill sc-act-tab" data-tab="appointments">
                        <span>🏥</span> Healthcare OPD
                    </button>
                    <button type="button" class="sc-tab-pill sc-act-tab" data-tab="parking">
                        <span>🅿️</span> Parking Passes
                    </button>
                    <button type="button" class="sc-tab-pill sc-act-tab" data-tab="security">
                        <span>🛡️</span> Session &amp; Demo Roles
                    </button>
                </div>

                <!-- Content Area -->
                <div id="scActivityContent" class="sc-dialog-body">
                    <div style="text-align:center; padding:40px; color:#94a3b8; font-size:13px;">Loading your municipal activity stream...</div>
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
                tabBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                loadTabContent(btn.getAttribute("data-tab"));
            });
        });

        async function loadTabContent(tab) {
            const container = modal.querySelector("#scActivityContent");
            container.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-size:13px;">Loading...</div>`;

            if (tab === "requests") {
                try {
                    const res = await authFetch(`${_getApiBase()}/api/requests`);
                    const json = await res.json();
                    const list = json.data || json.requests || (Array.isArray(json) ? json : []);

                    if (!list || list.length === 0) {
                        container.innerHTML = `
                            <div style="text-align:center; padding:50px 20px;">
                                <div style="font-size:42px; margin-bottom:12px;">📋</div>
                                <h3 style="font-size:16px; font-weight:700; color:#ffffff; margin-bottom:6px;">No Active Service Requests</h3>
                                <p style="font-size:13px; color:#94a3b8; max-width:400px; margin:0 auto 18px auto;">You haven't lodged any municipal complaints yet. Report road, sanitation, water, or traffic issues with automated SLA tracking.</p>
                                <button onclick="document.getElementById('scActivityCenterModal').remove(); if(typeof openGrievanceModal === 'function') openGrievanceModal();" class="sc-submit-btn" style="margin:0 auto; display:inline-flex;">✍️ Lodge New Grievance</button>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                            <span style="font-size:13px; font-weight:700; color:#38bdf8;">${list.length} Registered Civic Requests</span>
                            <button onclick="document.getElementById('scActivityCenterModal').remove(); if(typeof openGrievanceModal === 'function') openGrievanceModal();" class="sc-btn-secondary" style="font-size:12px; padding:6px 12px;">+ New Complaint</button>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${list.map(r => {
                                const statusColor = r.status === 'Resolved' ? '#10b981' : (r.status === 'In Progress' ? '#f59e0b' : '#38bdf8');
                                const statusBg = r.status === 'Resolved' ? 'rgba(16,185,129,0.15)' : (r.status === 'In Progress' ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.15)');
                                const priorityColor = r.priority === 'CRITICAL' ? '#ef4444' : (r.priority === 'HIGH' ? '#f97316' : '#38bdf8');
                                return `
                                    <div style="border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; background:rgba(30,41,59,0.5); display:flex; flex-direction:column; gap:8px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center;">
                                            <div style="display:flex; align-items:center; gap:8px;">
                                                <span style="font-family:monospace; font-weight:700; font-size:12px; color:#38bdf8; background:rgba(56,189,248,0.12); padding:3px 8px; border-radius:6px; border:1px solid rgba(56,189,248,0.3);">${_escapeHtml(r.request_code || r.tracking_id || 'REQ')}</span>
                                                <span style="font-size:13px; font-weight:700; color:#ffffff;">${_escapeHtml(r.department || 'Civic')} • ${_escapeHtml(r.category || 'General')}</span>
                                            </div>
                                            <div style="display:flex; gap:6px;">
                                                <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px; background:${statusBg}; color:${statusColor}; border:1px solid ${statusColor}40;">${_escapeHtml(r.status || 'Submitted')}</span>
                                                <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px; background:rgba(239,68,68,0.15); color:${priorityColor}; border:1px solid ${priorityColor}40;">${_escapeHtml(r.priority || 'MEDIUM')}</span>
                                            </div>
                                        </div>
                                        <p style="font-size:13px; color:#cbd5e1; margin:0; line-height:1.5;">${_escapeHtml(r.description || '')}</p>
                                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:#94a3b8; margin-top:4px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.08);">
                                            <span>📍 ${_escapeHtml(r.address || 'Gorakhpur Central')}</span>
                                            <span>⏱️ SLA: <b style="color:#ffffff;">${r.sla_hours ? r.sla_hours + 'h' : '24h Target'}</b> • ${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Active'}</span>
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
                            <div style="text-align:center; padding:50px 20px;">
                                <div style="font-size:42px; margin-bottom:12px;">👨‍⚕️</div>
                                <h3 style="font-size:16px; font-weight:700; color:#ffffff; margin-bottom:6px;">No Doctor Appointments Scheduled</h3>
                                <p style="font-size:13px; color:#94a3b8; max-width:400px; margin:0 auto 18px auto;">You have not booked any digital OPD slots. Check live specialist availability across BRD Medical College &amp; AIIMS Gorakhpur.</p>
                                <button onclick="document.getElementById('scActivityCenterModal').remove(); const hUrl = window.location.pathname.includes('/pages/') ? '../hospital/hospital.html' : 'pages/hospital/hospital.html'; window.location.href = hUrl;" class="sc-submit-btn" style="margin:0 auto; display:inline-flex;">🩺 Book Doctor OPD Slot</button>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${list.map(a => `
                                <div style="border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; background:rgba(30,41,59,0.5); display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:700; font-size:14px; color:#ffffff;">${_escapeHtml(a.doctor_name || 'Dr. Specialist')}</div>
                                        <div style="font-size:12px; color:#94a3b8; margin-top:2px;">🏥 ${_escapeHtml(a.hospital_name || 'Gorakhpur Health Hub')} • ${_escapeHtml(a.specialization || 'General')}</div>
                                        <div style="font-size:11.5px; color:#38bdf8; font-weight:600; margin-top:4px;">📅 Date: ${_escapeHtml(a.appointment_date || 'Upcoming')} • ⏰ Slot: ${_escapeHtml(a.slot_time || '10:00 AM')}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <span style="font-size:10px; font-weight:800; padding:4px 9px; border-radius:999px; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.35);">CONFIRMED</span>
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
                            <div style="text-align:center; padding:50px 20px;">
                                <div style="font-size:42px; margin-bottom:12px;">🅿️</div>
                                <h3 style="font-size:16px; font-weight:700; color:#ffffff; margin-bottom:6px;">No Active Parking Reservations</h3>
                                <p style="font-size:13px; color:#94a3b8; max-width:400px; margin:0 auto 18px auto;">Pre-book multi-level parking slots at Golghar, Railway Station, or City Mall with contactless QR gate entry.</p>
                                <a href="${window.location.pathname.includes('/pages/') ? '../parking/parking.html' : 'pages/parking/parking.html'}" class="sc-submit-btn" style="text-decoration:none; display:inline-flex; margin:0 auto;">🅿️ Reserve Parking Bay</a>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            ${list.map(b => `
                                <div style="border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; background:rgba(30,41,59,0.5); display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:700; font-size:14px; color:#ffffff;">${_escapeHtml(b.lot_name || 'Golghar Smart Parking')}</div>
                                        <div style="font-size:12px; color:#94a3b8; margin-top:2px;">🚗 Vehicle: <b style="color:#ffffff;">${_escapeHtml(b.vehicle_number || 'UP53-XXXX')}</b> • Bay: <span style="font-family:monospace; font-weight:700; color:#38bdf8;">${_escapeHtml(b.slot_code || b.slot_number || 'A-1')}</span></div>
                                        <div style="font-size:11px; color:#64748b; margin-top:4px;">⏱️ Booked: ${new Date(b.created_at || Date.now()).toLocaleTimeString()}</div>
                                    </div>
                                    <div style="text-align:right;">
                                        <span style="font-size:10px; font-weight:800; padding:4px 9px; border-radius:999px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.35);">PASS ACTIVE</span>
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
                        <div class="sc-card-panel">
                            <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#ffffff;">Active Identity &amp; Device</h4>
                            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; font-size:13px;">
                                <div><span style="color:#94a3b8;">User:</span> <b style="color:#ffffff;">${_escapeHtml(u.name || 'User')}</b></div>
                                <div><span style="color:#94a3b8;">Contact:</span> <b style="color:#ffffff;">${_escapeHtml(u.mobile || u.phone || u.email || 'N/A')}</b></div>
                                <div><span style="color:#94a3b8;">Role:</span> <span style="font-weight:700; color:#38bdf8;">${_escapeHtml((u.role || 'Citizen').toUpperCase())}</span></div>
                                <div><span style="color:#94a3b8;">Department:</span> <b style="color:#ffffff;">${_escapeHtml((u.department || 'Public Citizen').toUpperCase())}</b></div>
                                <div><span style="color:#94a3b8;">Security Token:</span> <span style="color:#34d399; font-weight:700;">✅ Active JWT Bearer</span></div>
                                <div><span style="color:#94a3b8;">Client:</span> <b style="color:#ffffff;">Gorakhpur SmartCity Web</b></div>
                            </div>
                        </div>

                        <div class="sc-card-panel">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                <span style="font-size:18px;">⚡</span>
                                <h4 style="margin:0; font-size:14px; font-weight:700; color:#38bdf8;">Instant Demo Persona Switcher</h4>
                            </div>
                            <p style="font-size:12px; color:#94a3b8; margin:0 0 14px 0;">Switch between verified roles with 1 click to test citizen and staff views:</p>
                            <div class="sc-persona-chips">
                                <button type="button" class="sc-persona-btn sc-p-citizen" onclick="SmartCityAuth.quickLoginPersona('citizen')">
                                    <span>🚗</span> Omkar (Citizen 1)
                                </button>
                                <button type="button" class="sc-persona-btn sc-p-citizen2" onclick="SmartCityAuth.quickLoginPersona('citizen2')">
                                    <span>👤</span> Demo (Citizen 2)
                                </button>
                                <button type="button" class="sc-persona-btn sc-p-traffic" onclick="SmartCityAuth.quickLoginPersona('traffic')">
                                    <span>👮</span> Insp. Verma
                                </button>
                                <button type="button" class="sc-persona-btn sc-p-hospital" onclick="SmartCityAuth.quickLoginPersona('hospital')">
                                    <span>🏥</span> STAFF-001 (Staff)
                                </button>
                                <button type="button" class="sc-persona-btn sc-p-admin" onclick="SmartCityAuth.quickLoginPersona('admin')">
                                    <span>🛡️</span> TR-ADMIN (ICCC)
                                </button>
                            </div>
                        </div>

                        <div style="text-align:right;">
                            <button onclick="if(confirm('Are you sure you want to sign out?')) SmartCityAuth.logout();" class="sc-btn-danger">
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
    // USER HEADER RENDERING & PAGE DEDUPLICATION
    // -------------------------------------------------------

    function renderUserHeader() {
        if (typeof document === "undefined") return;
        _injectAuthStyles();

        const user = getUser();
        const existing = document.getElementById("scGlobalHeaderControls");
        if (existing) existing.remove();

        // Harmonize and deduplicate local page profile buttons if they exist
        const pageProfileBtn = document.getElementById("profileButton") || document.getElementById("userBadgeBtn");
        if (pageProfileBtn) {
            pageProfileBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isAuthenticated()) {
                    showProfileModal();
                } else {
                    showLoginModal("citizen");
                }
            };
        }

        // Sync local header elements if present on page
        const navUserName = document.getElementById("navUserName") || document.getElementById("profileName") || document.getElementById("profileNavName") || document.getElementById("profCardName");
        if (navUserName) {
            navUserName.textContent = user ? (user.name || "Omkar Yadav") : "Sign In";
        }
        const navLoginBtn = document.getElementById("navLoginBtn");
        if (navLoginBtn) {
            navLoginBtn.style.display = isAuthenticated() ? "none" : "inline-flex";
        }

        // If local custom profile menu container exists on page (e.g. in parking/traffic), hide it to prevent duplicate UI
        const localMenuContainer = document.getElementById("userProfileMenuContainer");
        if (localMenuContainer) {
            localMenuContainer.style.display = "none";
        }
        const localProfileMenu = document.getElementById("profileMenu");
        if (localProfileMenu) {
            localProfileMenu.style.display = "none";
        }
        const localNotifBtn = document.querySelector(".notification-btn");
        if (localNotifBtn && localNotifBtn.id !== "scGlobalNotifBtn") {
            localNotifBtn.style.display = "none";
        }
        const localProfileBtn = document.getElementById("profileButton");
        if (localProfileBtn) {
            localProfileBtn.style.display = "none";
        }
        const localRoleBadge = document.getElementById("roleBadge");
        if (localRoleBadge && localRoleBadge.id !== "scGlobalUserBadge") {
            localRoleBadge.style.display = "none";
        }
        const policeBadge = document.getElementById("policeUserBadgeBtn");
        if (policeBadge) {
            policeBadge.style.display = "none";
        }

        const container = document.createElement("div");
        container.id = "scGlobalHeaderControls";
        container.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            font-family: var(--sc-auth-font);
        `;

        // Notification Bell Button
        const notifBtn = document.createElement("button");
        notifBtn.id = "scGlobalNotifBtn";
        notifBtn.title = "View Municipal Notifications & Alerts";
        notifBtn.style.cssText = `
            position: relative;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #f1f5f9;
            font-size: 15px;
            backdrop-filter: blur(8px);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notifBtn.innerHTML = `
            <span>🔔</span>
            <span id="scGlobalNotifCount" style="position:absolute; top:-4px; right:-4px; background:#ef4444; color:#fff; font-size:10px; font-weight:800; border-radius:999px; padding:1px 5px; min-width:16px; height:16px; display:none; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(239,68,68,0.9); line-height:1;"></span>
        `;
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleNotificationDrawer();
        });

        // User Profile Badge
        const badge = document.createElement("div");
        badge.id = "scGlobalUserBadge";
        badge.className = "sc-global-user-badge";

        if (user && isAuthenticated()) {
            const isStaffUser = isStaff();
            const roleColor = isStaffUser ? "#38bdf8" : "#34d399";
            const roleBorder = isStaffUser ? "rgba(56, 189, 248, 0.45)" : "rgba(52, 211, 153, 0.45)";
            const roleBg = isStaffUser ? "rgba(56, 189, 248, 0.15)" : "rgba(52, 211, 153, 0.15)";
            const displayName = user.name || user.username || (isStaffUser ? "Staff Officer" : "Citizen");
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
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(14px);
                border: 1px solid ${roleBorder};
                color: #f1f5f9;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
                cursor: pointer;
                user-select: none;
                transition: all 0.2s ease;
            `;

            badge.innerHTML = `
                <div style="width:28px; height:28px; border-radius:50%; background:${isStaffUser ? 'linear-gradient(135deg, #0284c7, #6366f1)' : 'linear-gradient(135deg, #0284c7, #10b981)'}; color:#ffffff; font-weight:800; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(56,189,248,0.3);">
                    ${_escapeHtml(initials)}
                </div>
                <span style="font-weight:700; font-size:13px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${_escapeHtml(displayName)}
                </span>
                <span style="background:${roleBg}; color:${roleColor}; font-size:10px; font-weight:800; padding:2px 8px; border-radius:999px; border:1px solid ${roleBorder}; letter-spacing:0.3px;">
                    ${_escapeHtml(roleLabel)}
                </span>
                <span style="font-size:10px; color:#94a3b8; transition:transform 0.2s;" id="scDropdownArrow">▾</span>

                <!-- Dropdown Menu -->
                <div id="scGlobalUserDropdown" class="sc-global-dropdown" style="display:none;">
                    <div class="sc-dropdown-user-row">
                        <div class="sc-dd-avatar" style="${isStaffUser ? 'background:linear-gradient(135deg, #0284c7, #6366f1);' : ''}">
                            ${_escapeHtml(initials)}
                        </div>
                        <div style="overflow:hidden;">
                            <div style="font-weight:800; font-size:14px; color:#ffffff; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${_escapeHtml(displayName)}">${_escapeHtml(displayName)}</div>
                            <div style="font-size:11.5px; color:#94a3b8; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${_escapeHtml(user.email || user.mobile || 'SmartCity Citizen ID')}</div>
                        </div>
                    </div>

                    <div style="margin:12px 0 6px 0; font-size:10px; font-weight:800; color:var(--sc-auth-cyan); text-transform:uppercase; letter-spacing:0.6px;">Account Credential</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:rgba(30,41,59,0.5); border-radius:10px; border:1px solid rgba(255,255,255,0.08); font-size:12px;">
                        <span style="color:#f1f5f9; font-weight:600;">${isStaffUser ? '🛡️ ' + roleLabel : '🟢 Active Citizen'}</span>
                        <span class="sc-badge sc-badge-verified" style="font-size:9.5px; padding:2px 6px;">VERIFIED</span>
                    </div>

                    <button type="button" id="scDropdownProfileBtn" class="sc-dd-item-btn" style="margin-top:10px; background:rgba(56,189,248,0.12); border-color:rgba(56,189,248,0.3); color:#38bdf8;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>👤</span> My Profile &amp; Dossier</span>
                        <span style="font-size:12px;">→</span>
                    </button>

                    <button type="button" id="scDropdownActivityBtn" class="sc-dd-item-btn">
                        <span style="display:flex; align-items:center; gap:8px;"><span>📊</span> My Activity &amp; Requests</span>
                        <span style="font-size:12px;">→</span>
                    </button>

                    ${(!isStaffUser && (localStorage.getItem("patientId") || user.patientId)) ? `
                    <a href="${window.location.pathname.includes('/pages/') ? '../hospital/hospital.html' : 'pages/hospital/hospital.html'}" class="sc-dd-item-btn" style="color:#60a5fa;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>🪪</span> Patient Medical Dossier</span>
                        <span style="font-size:12px;">→</span>
                    </a>` : ''}

                    <div style="border-top:1px solid rgba(255,255,255,0.08); margin:12px 0 10px 0;"></div>
                    <button type="button" id="scDropdownSignOutBtn" class="sc-btn-danger" style="width:100%; justify-content:center; padding:10px;">
                        <span>🚪</span> Sign Out
                    </button>
                </div>
            `;

            // Toggle dropdown
            const dd = badge.querySelector("#scGlobalUserDropdown");
            const arrow = badge.querySelector("#scDropdownArrow");
            badge.addEventListener("click", (e) => {
                if (e.target.closest("#scDropdownSignOutBtn") || e.target.closest("#scDropdownActivityBtn") || e.target.closest("#scDropdownProfileBtn")) return;
                e.stopPropagation();
                const isShowing = dd.style.display === "block";
                dd.style.display = isShowing ? "none" : "block";
                if (arrow) arrow.style.transform = isShowing ? "rotate(0deg)" : "rotate(180deg)";
            });

            // Profile Button
            const profBtn = badge.querySelector("#scDropdownProfileBtn");
            if (profBtn) {
                profBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dd.style.display = "none";
                    if (arrow) arrow.style.transform = "rotate(0deg)";
                    showProfileModal();
                });
            }

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
                    padding: 5px 12px;
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-family: inherit;
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
                gap: 8px;
                font-size: 12.5px;
                padding: 6px 16px;
                border-radius: 9999px;
                background: linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, rgba(37, 99, 235, 0.3) 100%);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(56, 189, 248, 0.45);
                color: #ffffff;
                cursor: pointer;
                font-family: inherit;
                font-weight: 700;
                transition: all 0.2s ease;
                box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
            `;
            badge.innerHTML = `
                <span>🔑</span>
                <span>Sign In</span>
            `;
            badge.addEventListener("click", () => showLoginModal("citizen"));
        }

        container.appendChild(notifBtn);
        container.appendChild(badge);

        const targets = [
            document.querySelector(".header-right"),
            document.querySelector(".nav-links"),
            document.querySelector(".nav-actions"),
            document.querySelector(".user-area"),
            document.querySelector(".nav-right"),
            document.querySelector(".doc-nav-right"),
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
        showProfileModal,
        openActivityCenter,
        quickLoginPersona,
        refreshNotificationCount,
        showToast
    };
})();

if (typeof window !== "undefined") {
    window.SmartCityAuth = SmartCityAuth;
    window.showLoginModal = SmartCityAuth.showLoginModal;
    window.showProfileModal = SmartCityAuth.showProfileModal;
    window.openUserProfileModal = SmartCityAuth.showProfileModal;
    window.openActivityCenter = SmartCityAuth.openActivityCenter;
    window.quickLoginPersona = SmartCityAuth.quickLoginPersona;
    window.showToast = SmartCityAuth.showToast;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            SmartCityAuth.renderUserHeader();
        });
    } else {
        SmartCityAuth.renderUserHeader();
    }
}
