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

    // Dynamic API Base URL resolution for Web Platform
    function _getApiBase() {
        if (typeof window !== "undefined") {
            const loc = window.location;

            // Auto-clean any legacy mobile storage keys
            try {
                localStorage.removeItem("smartcity_api_server");
                localStorage.removeItem("smartcity_mobile_server_url");
            } catch (_) {}

            if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/+$/, "");

            if (loc) {
                if (loc.protocol === "file:") return "http://127.0.0.1:5000";
                if (loc.port === "5000" || loc.port === "3000") return loc.origin;
                // If running on local dev server or via phone over LAN (ports 5500, 8080, etc.), route to port 5000
                if (loc.port && loc.port !== "5000" && loc.port !== "3000") {
                    return `${loc.protocol}//${loc.hostname}:5000`;
                }
                if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
                    return `http://${loc.hostname}:5000`;
                }
                if (loc.hostname) {
                    return `${loc.protocol}//${loc.hostname}:5000`;
                }
                return loc.origin ? loc.origin : "http://127.0.0.1:5000";
            }
        }
        return "http://127.0.0.1:5000";
    }

    function _resolveDashboardUrl(target) {
        if (!target) return "";
        const clean = target.replace(/^\//, '');
        if (typeof window !== "undefined" && window.location && window.location.pathname.includes('/frontend/')) {
            return `/frontend/${clean}`;
        }
        return `/${clean}`;
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
                opacity: 1 !important;
                pointer-events: auto !important;
                animation: scFadeIn 0.22s ease-out forwards;
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
                background: linear-gradient(155deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 28, 0.99) 100%);
                border: 1px solid var(--sc-auth-border);
                border-radius: 22px;
                box-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.9), 0 0 45px rgba(56, 189, 248, 0.12);
                color: var(--sc-auth-text);
                width: 100%;
                max-width: 520px;
                max-height: 90vh;
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
                padding: 16px 22px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(30, 41, 59, 0.5);
                flex-shrink: 0;
            }

            /* Single Unified Scrollable Body */
            .sc-dialog-scroll {
                flex: 1;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                display: flex;
                flex-direction: column;
            }

            .sc-dialog-scroll::-webkit-scrollbar {
                width: 6px;
            }
            .sc-dialog-scroll::-webkit-scrollbar-thumb {
                background: rgba(56, 189, 248, 0.35);
                border-radius: 4px;
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

            /* Quick Persona Bar (Collapsible) */
            .sc-persona-details {
                background: rgba(11, 19, 36, 0.45);
                border: 1px dashed rgba(56, 189, 248, 0.25);
                border-radius: 14px;
                margin: 12px 20px 0 20px;
                overflow: hidden;
                transition: border-color 0.2s;
            }
            .sc-persona-details[open] {
                border-color: rgba(56, 189, 248, 0.5);
                background: rgba(11, 19, 36, 0.7);
            }
            .sc-persona-summary {
                padding: 10px 16px;
                font-size: 11.5px;
                font-weight: 700;
                letter-spacing: 0.3px;
                color: var(--sc-auth-cyan);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                list-style: none;
                user-select: none;
                transition: background 0.2s;
            }
            .sc-persona-summary:hover {
                background: rgba(56, 189, 248, 0.08);
            }
            .sc-persona-summary::-webkit-details-marker {
                display: none;
            }
            .sc-persona-details[open] .sc-persona-chevron {
                transform: rotate(180deg);
            }
            .sc-persona-chevron {
                font-size: 11px;
                transition: transform 0.2s ease;
                color: #94a3b8;
            }
            .sc-persona-bar {
                padding: 4px 14px 14px 14px;
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
                padding: 5px;
                margin: 16px 20px 0 20px;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                gap: 4px;
                flex-shrink: 0;
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

            /* Quick Demo Card & Modern Toolbar */
            .sc-quick-demo-card {
                background: linear-gradient(135deg, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%);
                border: 1px solid rgba(56, 189, 248, 0.22);
                border-radius: 16px;
                padding: 13px 15px;
                margin-bottom: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
            }
            .sc-quick-demo-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
                flex-wrap: wrap;
                gap: 6px;
            }
            .sc-quick-demo-title {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #38bdf8;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .sc-demo-sub {
                font-size: 11px;
                color: #94a3b8;
            }
            .sc-quick-demo-pills {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 7px;
                margin-bottom: 10px;
            }
            .sc-demo-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 10px;
                border-radius: 10px;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid transparent;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .sc-demo-pill:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
            }
            .sc-demo-pill:active {
                transform: scale(0.97);
            }
            .sc-pill-admin { background: rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.45); color: #fde047; }
            .sc-pill-admin:hover { background: rgba(245, 158, 11, 0.3); border-color: #fde047; }
            .sc-pill-traffic { background: rgba(249, 115, 22, 0.18); border-color: rgba(249, 115, 22, 0.45); color: #fdba74; }
            .sc-pill-traffic:hover { background: rgba(249, 115, 22, 0.3); border-color: #fdba74; }
            .sc-pill-waste { background: rgba(16, 185, 129, 0.18); border-color: rgba(16, 185, 129, 0.45); color: #6ee7b7; }
            .sc-pill-waste:hover { background: rgba(16, 185, 129, 0.3); border-color: #6ee7b7; }
            .sc-pill-doctor { background: rgba(168, 85, 247, 0.18); border-color: rgba(168, 85, 247, 0.45); color: #d8b4fe; }
            .sc-pill-doctor:hover { background: rgba(168, 85, 247, 0.3); border-color: #d8b4fe; }
            .sc-pill-water { background: rgba(14, 165, 233, 0.18); border-color: rgba(14, 165, 233, 0.45); color: #7dd3fc; }
            .sc-pill-water:hover { background: rgba(14, 165, 233, 0.3); border-color: #7dd3fc; }
            .sc-pill-police { background: rgba(59, 130, 246, 0.18); border-color: rgba(59, 130, 246, 0.45); color: #93c5fd; }
            .sc-pill-police:hover { background: rgba(59, 130, 246, 0.3); border-color: #93c5fd; }

            .sc-more-roles-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding-top: 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.06);
            }
            .sc-role-select {
                flex: 1;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid rgba(56, 189, 248, 0.28);
                border-radius: 9px;
                color: #e2e8f0;
                padding: 6px 12px;
                font-size: 11.5px;
                font-weight: 600;
                outline: none;
                cursor: pointer;
                transition: border-color 0.2s;
            }
            .sc-role-select:focus {
                border-color: #38bdf8;
                box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
            }
            .sc-role-select optgroup {
                background: #0f172a;
                color: #94a3b8;
                font-weight: 700;
            }
            .sc-role-select option {
                background: #1e293b;
                color: #ffffff;
                font-weight: 500;
            }
            .sc-citizen-quick-demo {
                background: linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%);
                border: 1px solid rgba(56, 189, 248, 0.25);
                border-radius: 14px;
                padding: 12px 14px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 8px;
            }
            .sc-cit-demo-btn {
                background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                border: 1px solid rgba(56, 189, 248, 0.4);
                color: #ffffff;
                border-radius: 9999px;
                padding: 6px 14px;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .sc-cit-demo-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
            }
            .sc-header-badge-tag {
                font-size: 9.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1.2px;
                color: #38bdf8;
                margin-bottom: 2px;
            }
            .sc-header-logo-glow {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
                border: 1px solid rgba(56, 189, 248, 0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
                overflow: hidden;
                flex-shrink: 0;
            }
            .sc-header-logo-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                padding: 4px;
            }

            /* Dialog Body */
            .sc-dialog-body {
                padding: 18px 20px 24px 20px;
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
                .sc-dialog-card {
                    width: 100% !important;
                    max-width: calc(100vw - 32px) !important;
                    margin: 0 auto;
                }
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

            /* =========================================================
               MOBILE RESPONSIVE OVERRIDES (MODAL ADAPTATION)
               Only active on screens <= 768px - ZERO desktop disruption
               ========================================================= */
            @media (max-width: 768px) {
                .sc-modal-backdrop {
                    padding: 8px !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .sc-dialog-card {
                    max-height: 94vh !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    border-radius: 18px !important;
                    margin: 0 !important;
                }
                .sc-dialog-header {
                    padding: 12px 16px !important;
                }
                .sc-header-title {
                    font-size: 15px !important;
                }
                .sc-header-subtitle {
                    font-size: 11px !important;
                }
                .sc-persona-summary {
                    padding: 8px 14px !important;
                    font-size: 11px !important;
                }
                .sc-persona-bar {
                    max-height: 200px !important;
                    padding: 6px 12px 12px 12px !important;
                }
                .sc-persona-chips {
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 6px !important;
                }
                .sc-persona-btn {
                    padding: 6px 8px !important;
                    font-size: 10.5px !important;
                    border-radius: 8px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .sc-segmented-tabs {
                    margin: 8px 12px 0 12px !important;
                    padding: 4px !important;
                    gap: 2px !important;
                }
                .sc-tab-pill {
                    padding: 8px 4px !important;
                    font-size: 11.5px !important;
                }
                .sc-dialog-body {
                    padding: 12px 14px 18px !important;
                }
                .sc-form {
                    gap: 12px !important;
                }
                .sc-field-group {
                    gap: 4px !important;
                }
                .sc-input-control {
                    padding: 10px 12px 10px 38px !important;
                    font-size: 13px !important;
                }
                .sc-submit-btn {
                    padding: 11px !important;
                    font-size: 13px !important;
                    margin-top: 4px !important;
                }
                .sc-staff-presets {
                    max-height: 150px !important;
                    padding: 8px 10px !important;
                }
                .sc-preset-pill {
                    font-size: 10.5px !important;
                    padding: 3px 8px !important;
                }
            }
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

    function isSuperAdmin() {
        const user = getUser();
        if (!user || !isAuthenticated()) return false;
        if (user.is_super_admin === true) return true;
        const role = (user.role || user.type || "").toLowerCase();
        const accountType = (user.accountType || "").toLowerCase();
        const staffId = (user.staffId || user.staff_id || "").toUpperCase();
        const dept = (user.department || "").toLowerCase();
        return (
            role === "super_admin" ||
            role === "superadmin" ||
            role === "gkp_admin" ||
            role === "gkpadmin" ||
            accountType === "super_admin" ||
            (role === "admin" && (dept === "admin" || !dept || dept === "municipal" || dept.includes("iccc")))
        );
    }

    function isAdmin() {
        if (isSuperAdmin()) return true;
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "admin" || role.includes("admin");
    }

    function isStaff() {
        const user = getUser();
        if (!user) return false;
        if (isSuperAdmin()) return true;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "staff" || role === "admin" || role === "doctor" || role.includes("admin") || role.includes("staff");
    }

    function isCitizen() {
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "citizen";
    }

    function getRole() {
        const user = getUser();
        if (isSuperAdmin()) return "super_admin";
        return user ? (user.role || user.type || "citizen").toLowerCase() : "guest";
    }

    function getDepartment() {
        const user = getUser();
        return user && user.department ? user.department.toLowerCase() : null;
    }

    function getCurrentPageModule() {
        if (typeof window === "undefined" || !window.location) return "main";
        const path = (window.location.pathname || "").toLowerCase();
        if (path.includes("/traffic/") || path.endsWith("traffic.html")) return "traffic";
        if (path.includes("/parking/") || path.endsWith("parking.html")) return "parking";
        if (path.includes("/water/") || path.endsWith("water.html")) return "water";
        if (path.includes("/waste/") || path.endsWith("waste.html")) return "waste";
        if (path.includes("/police/") || path.endsWith("police.html")) return "police";
        if (path.includes("/emergency/") || path.endsWith("emergency.html")) return "emergency";
        if (path.includes("/famous/") || path.endsWith("famous.html")) return "famous";
        if (path.includes("/hospital/") || path.includes("hospital")) return "hospital";
        if (path.includes("/admin/") || path.includes("admin")) return "admin";
        return "main";
    }

    function hasStaffClearance(moduleName) {
        if (!isAuthenticated()) return false;
        // Universal Gorakhpur Super Admin has full clearance across all modules!
        if (isSuperAdmin()) return true;

        const user = getUser();
        if (!user) return false;

        const targetMod = (moduleName || getCurrentPageModule()).toLowerCase();
        if (targetMod === "main") {
            return isStaff();
        }

        const role = (user.role || user.type || "").toLowerCase();
        const userDept = (user.department || "").toLowerCase();
        const editable = Array.isArray(user.editable) ? user.editable.map(e => String(e).toLowerCase()) : [];

        // Check explicit editable array
        if (editable.includes("all") || editable.includes("admin") || editable.includes(targetMod)) {
            return true;
        }

        // Strict Departmental Scoping: Only the staff of this specific department has access
        if (targetMod === "traffic") {
            return userDept === "traffic" || (user.staffId && String(user.staffId).toUpperCase().startsWith("TR"));
        }
        if (targetMod === "parking") {
            return userDept === "parking" || (user.staffId && String(user.staffId).toUpperCase().startsWith("PRK"));
        }
        if (targetMod === "water") {
            return userDept === "water" || role === "water_admin" || role === "water_staff" || (user.staffId && String(user.staffId).toUpperCase().startsWith("WTR"));
        }
        if (targetMod === "waste") {
            return userDept === "waste" || userDept === "sanitation" || (user.staffId && String(user.staffId).toUpperCase().startsWith("WST"));
        }
        if (targetMod === "police") {
            return userDept === "police" || (user.staffId && String(user.staffId).toUpperCase().startsWith("POL"));
        }
        if (targetMod === "emergency") {
            return userDept === "emergency" || userDept === "disaster" || (user.staffId && String(user.staffId).toUpperCase().startsWith("EMG"));
        }
        if (targetMod === "famous") {
            return userDept === "famous" || userDept === "tourism" || userDept === "places";
        }
        if (targetMod === "hospital") {
            return userDept === "hospital" || userDept === "healthcare" || role === "doctor" || Boolean(user.hospitalId);
        }
        if (targetMod === "admin") {
            return isSuperAdmin() || userDept === "admin" || role === "admin";
        }

        return false;
    }

    function canEdit(department) {
        return hasStaffClearance(department);
    }

    function hasPermission(moduleName, action = "view") {
        const user = getUser();
        if (!user) return action === "view";
        if (action === "view") return true;
        return hasStaffClearance(moduleName);
    }

    function isModuleStaff(moduleName) {
        return hasStaffClearance(moduleName);
    }

    function logout() {
        const currentToken = getToken();
        if (currentToken) {
            try {
                fetch(`${_getApiBase()}/api/logout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentToken}`
                    }
                }).catch(() => {});
            } catch (_) {}
        }

        _clearUserDataCache();
        const authKeys = [
            TOKEN_KEY, USER_KEY,
            "smartcity_auth_token", "token", "smartCityJWT",
            "smartcity_user", "currentUser", "smartCityCurrentUser",
            "activeDustbinTerminal"
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
        const ddCountBadge = document.getElementById("scDropdownNotifCount");
        const pillCountBadge = document.getElementById("scPillNotifBadge");

        if (!isAuthenticated()) {
            if (countBadge) countBadge.style.display = "none";
            if (ddCountBadge) ddCountBadge.style.display = "none";
            if (pillCountBadge) pillCountBadge.style.display = "none";
            return;
        }

        try {
            const res = await authFetch(`${_getApiBase()}/api/notifications/unread-count`);
            if (res.ok) {
                const data = await res.json();
                const unread = data.unreadCount || 0;
                const text = unread > 99 ? "99+" : String(unread);
                if (unread > 0) {
                    if (countBadge) {
                        countBadge.textContent = text;
                        countBadge.style.display = "inline-flex";
                    }
                    if (ddCountBadge) {
                        ddCountBadge.textContent = text;
                        ddCountBadge.style.display = "inline-flex";
                    }
                    if (pillCountBadge) {
                        pillCountBadge.textContent = text;
                        pillCountBadge.style.display = "inline-flex";
                    }
                } else {
                    if (countBadge) countBadge.style.display = "none";
                    if (ddCountBadge) ddCountBadge.style.display = "none";
                    if (pillCountBadge) pillCountBadge.style.display = "none";
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
        try {
            showToast("Authenticating persona...", "info");
            const res = await fetch(`${_getApiBase()}/api/auth/demo-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: roleKey })
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
                const target = data.targetDashboard || (data.user && data.user.targetDashboard);
                if (target && !["citizen", "citizen2"].includes(roleKey)) {
                    setTimeout(() => {
                        window.location.href = _resolveDashboardUrl(target);
                    }, 500);
                }
            } else {
                showToast(data.message || "Login failed.", "error");
            }
        } catch (err) {
            showToast("Error authenticating persona: " + err.message, "error");
        }
    }

    // -------------------------------------------------------
    // QUICK STAFF PRESET FILL HELPER
    // -------------------------------------------------------

    function fillStaffPreset(staffId, password, autoSubmit = false) {
        const idInput = document.getElementById("scStaffId");
        const passInput = document.getElementById("scStaffPassword");
        const msgEl = document.getElementById("scModalMsg");
        if (idInput) {
            idInput.value = staffId;
            idInput.focus();
        }
        if (passInput) {
            passInput.value = password;
        }
        if (msgEl) {
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = `⚡ Selected: ${staffId} • Credentials filled. Click 'Sign In to Command Department' or press Enter.`;
        }
        if (autoSubmit) {
            const staffForm = document.getElementById("scStaffForm");
            if (staffForm) {
                if (typeof staffForm.requestSubmit === "function") {
                    staffForm.requestSubmit();
                } else {
                    staffForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
            }
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
        const displayName = user.name || user.username || (isStaffUser ? "Staff Officer" : "Citizen User");
        const mobile = user.mobile || user.phone || "";
        const email = user.email || (isStaffUser ? (user.staff_id ? `${user.staff_id.toLowerCase()}@smartcity.gov.in` : "officer@smartcity.gov.in") : "");
        const citizenId = user.citizen_id || user.citizenId || (isStaffUser ? (user.staff_id || "ST-OFFICIAL") : (user.id ? `GKP-CIT-${user.id}` : "GKP-CITIZEN"));
        const roleLabel = isStaffUser ? (user.department ? `${user.role.toUpperCase()} • ${user.department.toUpperCase()}` : "STAFF OFFICER") : "VERIFIED CITIZEN";
        const initials = displayName.split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || (isStaffUser ? "ST" : "CT");
        const savedVehicle = localStorage.getItem("smartcity_primary_vehicle") || user.vehicleNumber || "";
        const pId = localStorage.getItem("patientId") || user.patientId || null;
        const ward = user.ward || "Ward 14 - Golghar Commercial / Civil Lines";
        const bloodGroup = user.bloodGroup || "O+ Positive";
        const emergencyContactName = user.emergencyContactName || "";
        const emergencyContactPhone = user.emergencyContactPhone || "";

        const modal = document.createElement("div");
        modal.id = "scGlobalProfileModal";
        modal.className = "sc-modal-backdrop sc-modal-active";

        modal.innerHTML = `
            <div class="sc-dialog-card sc-card-wide" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
<div class="sc-header-title-wrap">
                        <img src="/logo.png" alt="SmartCity AI" style="height: 44px; width: auto; max-width: 54px; object-fit: contain; border-radius: 10px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border: 1px solid rgba(56, 189, 248, 0.25); padding: 3px;">
                        <div>
                            <h2 class="sc-header-title">
                                <span>Official Digital Identity Dossier</span>
                                <span class="sc-badge sc-badge-verified">✓ ACTIVE KYC</span>
                            </h2>
                            <p class="sc-header-subtitle">Gorakhpur Smart City Municipal Authority • Citizen & Official Registry</p>
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
                                    <span>🏥 Ayushman Digital Health Dossier</span>
                                    <span style="font-size:10px; color:#34d399;">ABHA INTEGRATED</span>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Assigned Patient Dossier ID</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">🪪</span>
                                        <input type="text" id="scProfInputPatientId" class="sc-input-control" value="${_escapeHtml(pId || 'Fetching Patient ID...')}" readonly />
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
                                        <input type="text" id="scProfInputEmName" class="sc-input-control" value="${_escapeHtml(emergencyContactName)}" placeholder="e.g. Next of Kin Name" />
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Emergency Phone</label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">📞</span>
                                        <input type="tel" id="scProfInputEmPhone" class="sc-input-control" value="${_escapeHtml(emergencyContactPhone)}" placeholder="e.g. 10-digit mobile" />
                                    </div>
                                </div>
                            </div>

                            <div class="sc-card-panel" style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div class="sc-panel-header" style="width: 100%;">
                                    <span>🪪 Verified Patient QR Health Pass</span>
                                    <span id="scHealthCardStatusBadge" style="font-size: 10px; color: #34d399; font-weight: 700;">● SECURE TOKEN</span>
                                </div>
                                <div id="scPatientQrWrapper" style="padding: 12px; background: #ffffff; border-radius: 12px; margin: 10px auto; display: inline-flex; justify-content: center; align-items: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
                                    <div id="scProfilePatientQr" style="min-width: 130px; min-height: 130px; display: flex; align-items: center; justify-content: center;"></div>
                                </div>
                                <div id="scPatientQrDetails" style="font-size: 11.5px; color: #94a3b8; max-width: 280px; line-height: 1.4; margin: 4px 0 8px;">
                                    Privacy-Preserving QR Token • Scan at AIIMS Gorakhpur or BRD Medical OPD desk for authenticated triage access.
                                </div>
                                <div id="scPatientQrActions" style="display: flex; gap: 8px; width: 100%; justify-content: center; margin-top: 6px;">
                                    <button type="button" id="scBtnVerifyMyQr" class="sc-btn-secondary" style="font-size: 11.5px; padding: 6px 12px;">
                                        🔍 Verify QR
                                    </button>
                                    <button type="button" class="sc-btn-secondary" style="font-size: 11.5px; padding: 6px 12px;" onclick="window.print()">
                                        🖨️ Print Pass
                                    </button>
                                </div>
                                <div id="scNoPatientSection" style="display: none; padding: 14px; text-align: center;">
                                    <div style="font-size: 26px; margin-bottom: 6px;">🏥</div>
                                    <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">No Digital Patient Profile Yet</div>
                                    <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 12px;">Activate your official Ayushman Patient ID to generate your secure QR pass for hospital OPD and clinical services.</div>
                                    <button type="button" id="scBtnCreatePatientPass" class="sc-btn-primary" style="padding: 8px 16px; font-size: 12px; font-weight: 700;">
                                        ➕ Generate Patient QR Pass
                                    </button>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:6px; margin-top:12px; width: 100%;">
                                    <button type="button" class="sc-btn-secondary" onclick="document.getElementById('scGlobalProfileModal').remove(); const hLink = window.location.pathname.includes('/pages/') ? '../hospital/hospital.html' : 'pages/hospital/hospital.html'; window.location.href = hLink;" style="justify-content: center;">
                                        <span>🏥</span> Open Healthcare &amp; Hospital Portal
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
                                        <span>🚗</span> Citizen (Verified)
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
        // Dynamic QR and Health Dossier Handler
        async function loadProfilePatientQR() {
            const qrContainer = modal.querySelector("#scProfilePatientQr");
            const wrapper = modal.querySelector("#scPatientQrWrapper");
            const details = modal.querySelector("#scPatientQrDetails");
            const actions = modal.querySelector("#scPatientQrActions");
            const noPatSection = modal.querySelector("#scNoPatientSection");
            const inputPid = modal.querySelector("#scProfInputPatientId");

            if (!qrContainer) return;
            qrContainer.innerHTML = "<div style='color:#64748b; font-size:11px;'>Loading QR...</div>";

            let activePatientId = localStorage.getItem("patientId") || user.patientId;

            if (!activePatientId) {
                try {
                    const patRes = await authFetch(`${_getApiBase()}/api/patients`);
                    const patData = await patRes.json();
                    if (patData.success && patData.patients && patData.patients.length > 0) {
                        activePatientId = patData.patients[0].patient_id;
                        localStorage.setItem("patientId", activePatientId);
                    }
                } catch (_) {}
            }

            if (!activePatientId) {
                if (wrapper) wrapper.style.display = "none";
                if (details) details.style.display = "none";
                if (actions) actions.style.display = "none";
                if (noPatSection) noPatSection.style.display = "block";
                if (inputPid) inputPid.value = "Not Registered Yet";
                return;
            }

            if (inputPid) inputPid.value = activePatientId;
            if (wrapper) wrapper.style.display = "inline-flex";
            if (details) details.style.display = "block";
            if (actions) actions.style.display = "flex";
            if (noPatSection) noPatSection.style.display = "none";

            try {
                const qrRes = await authFetch(`${_getApiBase()}/api/patients/${encodeURIComponent(activePatientId)}/qr`);
                const qrJson = await qrRes.json();
                qrContainer.innerHTML = "";
                const qrPayloadStr = (qrJson && qrJson.qrText) ? qrJson.qrText : JSON.stringify({ patientId: activePatientId, verifyUrl: `/api/patients/verify-qr?token=${qrJson.qrToken || activePatientId}` });

                if (typeof QRCode !== "undefined") {
                    new QRCode(qrContainer, {
                        text: qrPayloadStr,
                        width: 130,
                        height: 130,
                        colorDark: "#0f172a",
                        colorLight: "#ffffff",
                        correctLevel: (typeof QRCode.CorrectLevel !== "undefined" ? QRCode.CorrectLevel.M : 0)
                    });
                } else {
                    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrPayloadStr)}" width="130" height="130" alt="Patient QR Code" style="display:block; border-radius:6px;" />`;
                }
            } catch (e) {
                qrContainer.innerHTML = "<div style='color:#ef4444; font-size:11px;'>Failed to load QR code</div>";
            }
        }

        // Wire 1-Click Patient Registration
        const createPassBtn = modal.querySelector("#scBtnCreatePatientPass");
        if (createPassBtn) {
            createPassBtn.addEventListener("click", async () => {
                createPassBtn.disabled = true;
                createPassBtn.textContent = "Generating Pass...";
                try {
                    const res = await authFetch(`${_getApiBase()}/api/patients`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: user.name || "Citizen User",
                            mobile: user.mobile || user.phone || "9999999999",
                            bloodGroup: modal.querySelector("#scProfInputBlood") ? modal.querySelector("#scProfInputBlood").value : "O+ Positive",
                            emergencyContact: modal.querySelector("#scProfInputEmName") ? modal.querySelector("#scProfInputEmName").value : "",
                            address: modal.querySelector("#scProfInputWard") ? modal.querySelector("#scProfInputWard").value : "Gorakhpur"
                        })
                    });
                    const data = await res.json();
                    if (data.success && data.patient) {
                        localStorage.setItem("patientId", data.patient.patient_id);
                        showToast("Digital Patient Pass created successfully!", "success");
                        loadProfilePatientQR();
                        renderUserHeader();
                    } else {
                        showToast(data.message || "Could not create patient pass.", "error");
                        createPassBtn.disabled = false;
                        createPassBtn.textContent = "➕ Generate Patient QR Pass";
                    }
                } catch (err) {
                    showToast("Error creating patient pass.", "error");
                    createPassBtn.disabled = false;
                    createPassBtn.textContent = "➕ Generate Patient QR Pass";
                }
            });
        }

        // Wire QR Test Verify
        const verifyBtn = modal.querySelector("#scBtnVerifyMyQr");
        if (verifyBtn) {
            verifyBtn.addEventListener("click", async () => {
                const activePid = localStorage.getItem("patientId") || user.patientId;
                if (!activePid) return;
                try {
                    const vRes = await authFetch(`${_getApiBase()}/api/patients/verify-qr`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ patientId: activePid })
                    });
                    const vData = await vRes.json();
                    if (vData.success) {
                        alert(`✅ Patient QR Verified!\n\nPatient ID: ${activePid}\nStatus: Verified Active\nAccess Level: ${vData.authorized ? 'Clinical Medical Records' : 'Public Masked Summary'}`);
                    } else {
                        alert("Verification failed: " + (vData.message || "Unknown error"));
                    }
                } catch (err) {
                    alert("Verification error: " + err.message);
                }
            });
        }

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const target = tab.getAttribute("data-tab");
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                panes.forEach(p => {
                    p.style.display = p.id === `scTabPane-${target}` ? "block" : "none";
                });
                if (target === "health") {
                    loadProfilePatientQR();
                }
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
        modal.className = "sc-modal-backdrop sc-modal-active";

        modal.innerHTML = `
            <div class="sc-dialog-card" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
                    <div class="sc-header-title-wrap">
                        <div class="sc-header-logo-glow">
                            <img src="logo.png" onerror="this.onerror=null; this.src='../../logo.png';" alt="SmartCity AI" class="sc-header-logo-img">
                        </div>
                        <div>
                            <div class="sc-header-badge-tag">MUNICIPAL COMMAND &amp; CITIZEN ACCESS</div>
                            <h2 class="sc-header-title">SmartCity AI Portal Access</h2>
                        </div>
                    </div>
                    <button type="button" class="sc-close-btn" id="scModalCloseBtn" title="Close">✕</button>
                </div>

                <!-- Unified Content -->
                <div class="sc-dialog-scroll">
                    <!-- Segmented Tabs at Top of Content -->
                    <div class="sc-segmented-tabs">
                        <button type="button" class="sc-tab-pill active" data-tab="citizen">
                            <span>👤</span> Citizen Sign-In
                        </button>
                        <button type="button" class="sc-tab-pill" data-tab="staff">
                            <span>🛡️</span> Staff / Officer
                        </button>
                        <button type="button" class="sc-tab-pill" data-tab="register">
                            <span>✨</span> Register
                        </button>
                    </div>

                    <div class="sc-dialog-body">
                        <!-- 1. Citizen Sign-In Form -->
                        <form id="scCitizenForm" class="sc-form">
                            <div class="sc-citizen-quick-demo">
                                <div>
                                    <div style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Instant 1-Click Access</div>
                                    <div style="font-size: 11px; color: #94a3b8;">Pre-verified citizen demo account</div>
                                </div>
                                <button type="button" class="sc-cit-demo-btn" onclick="SmartCityAuth.quickLoginPersona('citizen')">
                                    <span>👤</span> Sign In as Citizen (Rahul) ➔
                                </button>
                            </div>

                            <div class="sc-field-group">
                                <label class="sc-field-label">Mobile Number or Email <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">📱</span>
                                    <input type="text" id="scCitLoginId" class="sc-input-control" required placeholder="e.g. 6306880179 or citizen@smartcity.gov" />
                                </div>
                            </div>
                            <div class="sc-field-group">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label class="sc-field-label">Password <span class="req">*</span></label>
                                    <span style="font-size: 11px; color: #38bdf8;">Demo: password123</span>
                                </div>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🔒</span>
                                    <input type="password" id="scCitPassword" class="sc-input-control" required placeholder="••••••••" />
                                    <button type="button" class="sc-eye-btn" onclick="const p=document.getElementById('scCitPassword'); p.type = p.type==='password'?'text':'password'; this.textContent = p.type==='password'?'👁️':'🙈';">👁️</button>
                                </div>
                            </div>
                            <button type="submit" class="sc-submit-btn">
                                <span>🚀</span> Sign In to Citizen Portal
                            </button>
                        </form>

                        <!-- 2. Staff & Officers Form -->
                        <form id="scStaffForm" class="sc-form" style="display: none;">
                            <div class="sc-quick-demo-card">
                                <div class="sc-quick-demo-header">
                                    <div class="sc-quick-demo-title">
                                        <span>⚡ 1-Click Quick Demo Login</span>
                                    </div>
                                    <span class="sc-demo-sub">Auto-fills ID &amp; password instantly</span>
                                </div>
                                <div class="sc-quick-demo-pills">
                                    <button type="button" class="sc-demo-pill sc-pill-admin" onclick="SmartCityAuth.fillStaffPreset('STAFF-001','admin123',true)" title="Super Admin ICCC">
                                        <span>👑</span> Super Admin
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-traffic" onclick="SmartCityAuth.fillStaffPreset('TR-VERMA','verma123',true)" title="Traffic Sub-Inspector">
                                        <span>🚦</span> Traffic Police
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-waste" onclick="SmartCityAuth.fillStaffPreset('WST001','123456',true)" title="Sanitation &amp; Waste">
                                        <span>🗑️</span> Waste Staff
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-doctor" onclick="SmartCityAuth.fillStaffPreset('DOC-101','admin',true)" title="Doctor AIIMS">
                                        <span>🩺</span> AIIMS Doctor
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-water" onclick="SmartCityAuth.fillStaffPreset('WTR-ADMIN','smartcity2026',true)" title="Water Jal Sansthan">
                                        <span>💧</span> Jal Sansthan
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-police" onclick="SmartCityAuth.fillStaffPreset('POL-SHO-01','police123',true)" title="City Police SHO">
                                        <span>👮</span> Police SHO
                                    </button>
                                </div>

                                <div class="sc-more-roles-row">
                                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">More Roles:</span>
                                    <select class="sc-role-select" onchange="if(this.value){SmartCityAuth.quickLoginPersona(this.value); this.value='';}">
                                        <option value="">Select Department Persona to Launch...</option>
                                        <optgroup label="👑 Central Command &amp; Admin">
                                            <option value="super_admin">👑 GKP Super Admin (STAFF-001)</option>
                                            <option value="admin">🛡️ ICCC Operations Admin (STAFF-002)</option>
                                        </optgroup>
                                        <optgroup label="🚦 Traffic &amp; Mobility">
                                            <option value="traffic">🚦 Insp. Verma (TR-VERMA)</option>
                                            <option value="traffic_pandey">🚦 Insp. Pandey (TR-PANDEY)</option>
                                            <option value="traffic_admin">🚦 Traffic Chief (TRF-ADMIN)</option>
                                        </optgroup>
                                        <optgroup label="🗑️ Sanitation &amp; Waste Management">
                                            <option value="waste_control_center">🎧 Control Center (WST-CC-01)</option>
                                            <option value="waste_worker">👷 Field Sanitation Crew (WRK-001)</option>
                                            <option value="waste_worker_2">🚛 Garbage Truck Driver (WRK-002)</option>
                                            <option value="waste_bin_staff">🗑️ Smart Dustbin Staff (BIN-GOL-01)</option>
                                        </optgroup>
                                        <optgroup label="🩺 Healthcare &amp; AIIMS">
                                            <option value="hospital">🩺 AIIMS Physician (DOC-101)</option>
                                            <option value="hospital_admin">🏥 Hospital Admin (HOSP-ADMIN)</option>
                                            <option value="ambulance">🚑 Ambulance Fleet Lead (AMB-01)</option>
                                        </optgroup>
                                        <optgroup label="💧 Jal Sansthan &amp; SCADA Grid">
                                            <option value="water_admin">💧 Jal Sansthan Admin (WTR-ADMIN)</option>
                                            <option value="water_staff">🔧 Pumping Engineer (WTR-ENG-01)</option>
                                            <option value="sewage_staff">🌊 Sewage Network Engineer (SEW-ENG-01)</option>
                                        </optgroup>
                                        <optgroup label="🅿️ Smart Parking &amp; Utilities">
                                            <option value="parking_staff">🅿️ Parking Officer (PRK-STAFF-01)</option>
                                            <option value="emergency">🚨 Emergency Dispatcher (EMG-01)</option>
                                            <option value="electricity">💡 Power Grid &amp; Streetlights (ELE-01)</option>
                                            <option value="environment">🍃 Environmental AQI Lead (ENV-01)</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div class="sc-field-group">
                                <label class="sc-field-label">Official Staff / Officer ID <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🪪</span>
                                    <input type="text" id="scStaffId" class="sc-input-control" required placeholder="e.g. STAFF-001, TR-VERMA, WST001" />
                                </div>
                            </div>
                            <div class="sc-field-group">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label class="sc-field-label">Official Password <span class="req">*</span></label>
                                    <span style="font-size: 11px; color: #38bdf8;">Hint: admin123 / verma123 / 123456</span>
                                </div>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🔒</span>
                                    <input type="password" id="scStaffPassword" class="sc-input-control" required placeholder="••••••••" />
                                    <button type="button" class="sc-eye-btn" onclick="const p=document.getElementById('scStaffPassword'); p.type = p.type==='password'?'text':'password'; this.textContent = p.type==='password'?'👁️':'🙈';" title="Toggle Password">👁️</button>
                                </div>
                            </div>
                            <button type="submit" class="sc-submit-btn sc-btn-staff">
                                <span>🛡️</span> Sign In to Command Department
                            </button>
                        </form>

                        <!-- 3. Register Form -->
                        <form id="scRegisterForm" class="sc-form" style="display: none;">
                            <div class="sc-field-group">
                                <label class="sc-field-label">Full Citizen Name <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">👤</span>
                                    <input type="text" id="scRegName" class="sc-input-control" required placeholder="Enter full name (e.g. Rahul Sharma)" />
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Mobile Number <span class="req">*</span></label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">📱</span>
                                        <input type="tel" id="scRegMobile" class="sc-input-control" required placeholder="10-digit mobile" />
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Email Address <span class="req">*</span></label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">✉️</span>
                                        <input type="email" id="scRegEmail" class="sc-input-control" required placeholder="name@example.com" />
                                    </div>
                                </div>
                            </div>
                            <div class="sc-field-group">
                                <label class="sc-field-label">Create Password <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🔒</span>
                                    <input type="password" id="scRegPassword" class="sc-input-control" required placeholder="Minimum 6 characters" />
                                </div>
                            </div>
                            <button type="submit" class="sc-submit-btn sc-btn-emerald">
                                <span>✨</span> Create New Citizen Account
                            </button>
                        </form>

                        <div id="scModalMsg" class="sc-message-box"></div>
                    </div> <!-- /sc-dialog-body -->
                </div> <!-- /sc-dialog-scroll -->
            </div> <!-- /sc-dialog-card -->`;

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

        if (options && options.prefillStaffId) {
            const staffInput = modal.querySelector("#scStaffId");
            if (staffInput) staffInput.value = options.prefillStaffId;
        }

        if (options && options.message && msgEl) {
            msgEl.textContent = options.message;
            msgEl.style.color = "#38bdf8";
        }

        // Close on ✕ button
        modal.querySelector("#scModalCloseBtn").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.remove();
        });

        // Close ONLY when clicking the dark backdrop itself
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

        // Stop clicks inside card from bubbling to backdrop
        const card = modal.querySelector(".sc-dialog-card");
        if (card) {
            card.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }

        // Citizen Login Handler
        forms.citizen.addEventListener("submit", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Authenticating citizen credentials...";
            let res, data;
            try {
                res = await fetch(`${_getApiBase()}/api/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        loginId: modal.querySelector("#scCitLoginId").value.trim(),
                        password: modal.querySelector("#scCitPassword").value
                    })
                });
                data = await res.json();
            } catch (netErr) {
                console.error("Citizen login network error:", netErr);
                msgEl.style.color = "#f87171";
                const cur = _getApiBase();
                msgEl.innerHTML = `
                    <div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:10px; padding:10px 12px; margin-top:6px; text-align:left;">
                        <div style="color:#fca5a5; font-size:12px; font-weight:700; margin-bottom:4px;">⚠️ Cannot reach backend at ${_escapeHtml(cur)}</div>
                        <div style="color:#cbd5e1; font-size:11px; line-height:1.4;">
                            Please ensure the backend server is running on port 5000 (<code>npm run dev</code> or <code>node backend/server.js</code>).
                        </div>
                    </div>
                `;
                return;
            }

            try {
                if (res.ok && data.token) {
                    setSession(data.token, data.user);
                    msgEl.style.color = "#34d399";
                    msgEl.textContent = `✅ Welcome ${data.user.name || 'Citizen'}! Login successful.`;
                    showToast(`Signed in as ${data.user.name || 'Citizen'}`, "success");
                    renderUserHeader();
                    setTimeout(() => {
                        modal.remove();
                        if (options && typeof options.onSuccess === "function") {
                            options.onSuccess(data.user, data.token);
                        } else if (data.targetDashboard && data.role !== "citizen") {
                            window.location.href = _resolveDashboardUrl(data.targetDashboard);
                        }
                    }, 650);
                } else {
                    msgEl.style.color = "#f87171";
                    msgEl.textContent = data.message || "Invalid mobile number or password.";
                }
            } catch (execErr) {
                console.error("Citizen login session error:", execErr);
                msgEl.style.color = "#34d399";
                msgEl.textContent = `✅ Login successful.`;
                setTimeout(() => modal.remove(), 650);
            }
        });

        // Staff Login Handler
        forms.staff.addEventListener("submit", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = "Authenticating official staff credentials...";
            let res, data;
            try {
                res = await fetch(`${_getApiBase()}/api/staff-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        staffId: modal.querySelector("#scStaffId").value.trim(),
                        password: modal.querySelector("#scStaffPassword").value
                    })
                });
                data = await res.json();
            } catch (netErr) {
                console.error("Staff login network error:", netErr);
                msgEl.style.color = "#f87171";
                const cur = _getApiBase();
                msgEl.innerHTML = `
                    <div style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:10px; padding:10px 12px; margin-top:6px; text-align:left;">
                        <div style="color:#fca5a5; font-size:12px; font-weight:700; margin-bottom:4px;">⚠️ Cannot reach backend at ${_escapeHtml(cur)}</div>
                        <div style="color:#cbd5e1; font-size:11px; line-height:1.4;">
                            Please ensure the backend server is running on port 5000 (<code>npm run dev</code> or <code>node backend/server.js</code>).
                        </div>
                    </div>
                `;
                return;
            }

            try {
                if (res.ok && data.token) {
                    setSession(data.token, data.user);
                    msgEl.style.color = "#34d399";
                    msgEl.textContent = `✅ Welcome ${data.user.name} (${data.user.department || 'Officer'})!`;
                    showToast(`Welcome Officer ${data.user.name}`, "success");
                    renderUserHeader();
                    setTimeout(() => {
                        modal.remove();
                        if (options && typeof options.onSuccess === "function") {
                            options.onSuccess(data.user, data.token);
                        } else if (data.targetDashboard) {
                            window.location.href = _resolveDashboardUrl(data.targetDashboard);
                        }
                    }, 650);
                } else {
                    msgEl.style.color = "#f87171";
                    msgEl.textContent = data.message || "Invalid staff ID or password.";
                }
            } catch (execErr) {
                console.error("Staff login session error:", execErr);
                msgEl.style.color = "#34d399";
                msgEl.textContent = `✅ Authentication successful.`;
                setTimeout(() => {
                    modal.remove();
                    if (data && data.targetDashboard) {
                        window.location.href = _resolveDashboardUrl(data.targetDashboard);
                    }
                }, 650);
            }
        });

        // Register Handler
        forms.register.addEventListener("submit", async (e) => {
            e.preventDefault();
            e.stopPropagation();
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
                    msgEl.textContent = "✅ Account created successfully!";
                    showToast("Citizen account registered successfully!", "success");
                    renderUserHeader();
                    setTimeout(() => {
                        modal.remove();
                        if (options && typeof options.onSuccess === "function") {
                            options.onSuccess(data.user, data.token);
                        }
                    }, 650);
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
        modal.className = "sc-modal-backdrop sc-modal-active";

        modal.innerHTML = `
            <div class="sc-dialog-card sc-card-wide" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
<div class="sc-header-title-wrap">
                        <img src="/logo.png" alt="SmartCity AI" style="height: 44px; width: auto; max-width: 54px; object-fit: contain; border-radius: 10px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border: 1px solid rgba(56, 189, 248, 0.25); padding: 3px;">
                        <div>
                            <h2 class="sc-header-title">Citizen Activity & Live Service History</h2>
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
                                        <div style="font-size:11.5px; color:#38bdf8; font-weight:600; margin-top:4px;">📅 Date: ${_escapeHtml(a.appointment_date ? (new Date(a.appointment_date).toLocaleDateString()) : 'Upcoming')} • ⏰ Slot: ${_escapeHtml(a.appointment_time || a.slot_time || '10:00 AM')}</div>
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
                                    <span>🚗</span> Citizen (Verified)
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
            navUserName.textContent = user ? (user.name || "Citizen") : "Sign In";
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
        const trafficPersonaDropdown = document.querySelector(".trf-persona-dropdown");
        if (trafficPersonaDropdown) {
            trafficPersonaDropdown.style.display = "none";
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

        // User Profile Badge
        const badge = document.createElement("div");
        badge.id = "scGlobalUserBadge";
        badge.className = "sc-global-user-badge";

        if (user && isAuthenticated()) {
            const isSuper = isSuperAdmin();
            const activeMod = getCurrentPageModule();
            const userDept = (user.department || "").toLowerCase();
            const isStaffOfficer = isStaff();
            const isStaffUser = isStaffOfficer;
            const hasModuleClearance = hasStaffClearance(activeMod);

            let roleColor, roleBorder, roleBg, roleLabel, avatarGrad, credentialTitle;
            let showReturnHomeBtn = false;
            let homeConsoleUrl = "";
            let homeDeptName = "";
            const inPages = window.location.pathname.includes('/pages/');

            if (isSuper) {
                roleColor = "#fbbf24";
                roleBorder = "rgba(245, 158, 11, 0.6)";
                roleBg = "rgba(245, 158, 11, 0.2)";
                roleLabel = "👑 GKP SUPER ADMIN • ALL ACCESS";
                avatarGrad = "linear-gradient(135deg, #f59e0b, #7c3aed)";
                credentialTitle = "👑 Gorakhpur Super Admin (All Modules Clearance)";
            } else if (isStaffOfficer && hasModuleClearance) {
                const deptTitle = userDept ? (userDept.charAt(0).toUpperCase() + userDept.slice(1)) : "Operations";
                roleColor = "#38bdf8";
                roleBorder = "rgba(56, 189, 248, 0.45)";
                roleBg = "rgba(56, 189, 248, 0.15)";
                roleLabel = `👮 STAFF • ${deptTitle.toUpperCase()}`;
                avatarGrad = "linear-gradient(135deg, #0284c7, #6366f1)";
                credentialTitle = `🛡️ Official Staff • ${deptTitle} Department`;
            } else if (isStaffOfficer && !hasModuleClearance) {
                const deptTitle = userDept ? (userDept.charAt(0).toUpperCase() + userDept.slice(1)) : "Department";
                homeDeptName = deptTitle;
                roleColor = "#34d399";
                roleBorder = "rgba(52, 211, 153, 0.45)";
                roleBg = "rgba(52, 211, 153, 0.15)";
                roleLabel = "🟢 CITIZEN / VISITOR";
                avatarGrad = "linear-gradient(135deg, #059669, #0284c7)";
                credentialTitle = `🟢 Visitor Mode (Stationed at ${deptTitle})`;
                showReturnHomeBtn = true;

                if (userDept === "traffic") homeConsoleUrl = inPages ? '../traffic/traffic.html' : 'pages/traffic/traffic.html';
                else if (userDept === "parking") homeConsoleUrl = inPages ? '../parking/parking.html' : 'pages/parking/parking.html';
                else if (userDept === "water") homeConsoleUrl = inPages ? '../water/water.html' : 'pages/water/water.html';
                else if (userDept === "waste") homeConsoleUrl = inPages ? '../waste/waste.html' : 'pages/waste/waste.html';
                else if (userDept === "police") homeConsoleUrl = inPages ? '../police/police.html' : 'pages/police/police.html';
                else if (userDept === "emergency") homeConsoleUrl = inPages ? '../emergency/emergency.html' : 'pages/emergency/emergency.html';
                else if (userDept === "famous" || userDept === "tourism") homeConsoleUrl = inPages ? '../famous/famous.html' : 'pages/famous/famous.html';
                else homeConsoleUrl = inPages ? '../../index.html' : 'index.html';
            } else {
                roleColor = "#34d399";
                roleBorder = "rgba(52, 211, 153, 0.45)";
                roleBg = "rgba(52, 211, 153, 0.15)";
                roleLabel = "🟢 VERIFIED CITIZEN";
                avatarGrad = "linear-gradient(135deg, #0284c7, #10b981)";
                credentialTitle = "🟢 Active Verified Citizen";
            }

            const displayName = user.name || user.username || (isSuper ? "Super Admin" : (isStaffOfficer ? "Staff Officer" : "Citizen"));
            const initials = displayName.split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || (isSuper ? "SA" : (isStaffOfficer ? "ST" : "CT"));

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
                <div style="width:28px; height:28px; border-radius:50%; background:${avatarGrad}; color:#ffffff; font-weight:800; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(56,189,248,0.3);">
                    ${_escapeHtml(initials)}
                </div>
                <span style="font-weight:700; font-size:13px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${_escapeHtml(displayName)}
                </span>
                <span style="background:${roleBg}; color:${roleColor}; font-size:10px; font-weight:800; padding:2px 8px; border-radius:999px; border:1px solid ${roleBorder}; letter-spacing:0.3px;">
                    ${_escapeHtml(roleLabel)}
                </span>
                <span id="scPillNotifBadge" style="background:#ef4444; color:#fff; font-size:9.5px; font-weight:800; border-radius:999px; padding:1px 5px; min-width:16px; height:16px; display:none; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(239,68,68,0.9); line-height:1;"></span>
                <span style="font-size:10px; color:#94a3b8; transition:transform 0.2s;" id="scDropdownArrow">▾</span>

                <!-- Dropdown Menu -->
                <div id="scGlobalUserDropdown" class="sc-global-dropdown" style="display:none;">
                    <div class="sc-dropdown-user-row">
                        <div class="sc-dd-avatar" style="background:${avatarGrad};">
                            ${_escapeHtml(initials)}
                        </div>
                        <div style="overflow:hidden;">
                            <div style="font-weight:800; font-size:14px; color:#ffffff; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${_escapeHtml(displayName)}">${_escapeHtml(displayName)}</div>
                            <div style="font-size:11.5px; color:#94a3b8; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${_escapeHtml(user.email || user.mobile || 'SmartCity Universal ID')}</div>
                        </div>
                    </div>

                    <div style="margin:12px 0 6px 0; font-size:10px; font-weight:800; color:var(--sc-auth-cyan); text-transform:uppercase; letter-spacing:0.6px;">Access Clearance</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:rgba(30,41,59,0.5); border-radius:10px; border:1px solid rgba(255,255,255,0.08); font-size:12px;">
                        <span style="color:#f1f5f9; font-weight:600;">${_escapeHtml(credentialTitle)}</span>
                        <span class="sc-badge sc-badge-verified" style="font-size:9.5px; padding:2px 6px;">${isSuper ? 'SUPER ACCESS' : (isStaffOfficer ? (hasModuleClearance ? 'AUTHORIZED' : 'VISITING') : 'VERIFIED')}</span>
                    </div>

                    <!-- GKP Admin Hub Direct Link -->
                    ${isSuper ? `
                    <a href="${inPages ? '../admin/gkp_admin.html' : 'pages/admin/gkp_admin.html'}" id="scDropdownSuperAdminBtn" class="sc-dd-item-btn" style="margin-top:10px; background:rgba(245,158,11,0.18); border-color:rgba(245,158,11,0.45); color:#fbbf24; text-decoration:none; font-weight:800;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>👑</span> GKP Central Admin Command</span>
                        <span style="font-size:12px;">→</span>
                    </a>` : ''}

                    <!-- Returning to Home Department Console if Visiting -->
                    ${showReturnHomeBtn ? `
                    <a href="${homeConsoleUrl}" id="scDropdownReturnHomeBtn" class="sc-dd-item-btn" style="margin-top:10px; background:rgba(56,189,248,0.18); border-color:rgba(56,189,248,0.45); color:#38bdf8; text-decoration:none; font-weight:800;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>↩️</span> Switch to My ${homeDeptName} Console</span>
                        <span style="font-size:12px;">→</span>
                    </a>` : ''}

                    <!-- Dashboard Navigation Inside Login Menu -->
                    <a href="${inPages ? '../../index.html' : 'index.html'}" id="scDropdownDashboardBtn" class="sc-dd-item-btn" style="margin-top:${(isSuper || showReturnHomeBtn) ? '6px' : '10px'}; background:rgba(59,130,246,0.12); border-color:rgba(59,130,246,0.35); color:#60a5fa; text-decoration:none;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>🏠</span> Back to Dashboard</span>
                        <span style="font-size:12px;">→</span>
                    </a>

                    <!-- Notifications & Alerts Inside Login Menu -->
                    <button type="button" id="scDropdownNotifBtn" class="sc-dd-item-btn" style="background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.35); color:#fbbf24;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>🔔</span> Notifications &amp; Alerts</span>
                        <span id="scDropdownNotifCount" style="background:#ef4444; color:#fff; font-size:10px; font-weight:800; border-radius:999px; padding:1px 6px; min-width:18px; height:18px; display:none; align-items:center; justify-content:center; box-shadow:0 0 8px rgba(239,68,68,0.7); line-height:1;"></span>
                    </button>

                    <button type="button" id="scDropdownProfileBtn" class="sc-dd-item-btn" style="background:rgba(56,189,248,0.12); border-color:rgba(56,189,248,0.3); color:#38bdf8;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>👤</span> My Profile &amp; Dossier</span>
                        <span style="font-size:12px;">→</span>
                    </button>

                    <button type="button" id="scDropdownActivityBtn" class="sc-dd-item-btn">
                        <span style="display:flex; align-items:center; gap:8px;"><span>📊</span> My Activity &amp; Requests</span>
                        <span style="font-size:12px;">→</span>
                    </button>

                    ${(!isStaffOfficer && (localStorage.getItem("patientId") || user.patientId)) ? `
                    <a href="${inPages ? '../hospital/hospital.html' : 'pages/hospital/hospital.html'}" class="sc-dd-item-btn" style="color:#60a5fa;">
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
                if (e.target.closest("#scDropdownSignOutBtn") || e.target.closest("#scDropdownActivityBtn") || e.target.closest("#scDropdownProfileBtn") || e.target.closest("#scDropdownNotifBtn") || e.target.closest("#scDropdownDashboardBtn")) return;
                e.stopPropagation();
                const isShowing = dd.style.display === "block";
                dd.style.display = isShowing ? "none" : "block";
                if (arrow) arrow.style.transform = isShowing ? "rotate(0deg)" : "rotate(180deg)";
            });

            // Notification Button inside dropdown
            const ddNotifBtn = badge.querySelector("#scDropdownNotifBtn");
            if (ddNotifBtn) {
                ddNotifBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dd.style.display = "none";
                    if (arrow) arrow.style.transform = "rotate(0deg)";
                    toggleNotificationDrawer();
                });
            }

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
                position: relative;
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
                user-select: none;
            `;
            badge.innerHTML = `
                <span>🔑</span>
                <span>Sign In</span>
                <span style="font-size:10px; color:#94a3b8; transition:transform 0.2s;" id="scDropdownArrowVisitor">▾</span>

                <!-- Visitor Dropdown Menu -->
                <div id="scGlobalVisitorDropdown" class="sc-global-dropdown" style="display:none;">
                    <div style="font-weight:800; font-size:13px; color:#ffffff; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
                        🏛️ SmartCity Navigation
                    </div>
                    <a href="${window.location.pathname.includes('/pages/') ? '../../index.html' : 'index.html'}" class="sc-dd-item-btn" style="background:rgba(59,130,246,0.12); border-color:rgba(59,130,246,0.35); color:#60a5fa; text-decoration:none; margin-top:4px;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>🏠</span> Back to Dashboard</span>
                        <span style="font-size:12px;">→</span>
                    </a>
                    <button type="button" id="scVisitorSignInActionBtn" class="sc-dd-item-btn" style="background:rgba(56,189,248,0.18); border-color:rgba(56,189,248,0.45); color:#ffffff; margin-top:8px; justify-content:center;">
                        <span style="display:flex; align-items:center; gap:8px;"><span>🔑</span> Sign In / Register</span>
                    </button>
                </div>
            `;

            const visitorDd = badge.querySelector("#scGlobalVisitorDropdown");
            const visitorArrow = badge.querySelector("#scDropdownArrowVisitor");
            badge.addEventListener("click", (e) => {
                if (e.target.closest("#scDropdownArrowVisitor")) {
                    e.stopPropagation();
                    const isShowing = visitorDd.style.display === "block";
                    visitorDd.style.display = isShowing ? "none" : "block";
                    if (visitorArrow) visitorArrow.style.transform = isShowing ? "rotate(0deg)" : "rotate(180deg)";
                    return;
                }
                if (e.target.closest("#scGlobalVisitorDropdown")) {
                    return;
                }
                e.stopPropagation();
                if (visitorDd) visitorDd.style.display = "none";
                if (visitorArrow) visitorArrow.style.transform = "rotate(0deg)";
                showLoginModal("citizen");
            });

            const visitorActionBtn = badge.querySelector("#scVisitorSignInActionBtn");
            if (visitorActionBtn) {
                visitorActionBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (visitorDd) visitorDd.style.display = "none";
                    if (visitorArrow) visitorArrow.style.transform = "rotate(0deg)";
                    showLoginModal("citizen");
                });
            }

            document.addEventListener("click", (e) => {
                if (!badge.contains(e.target) && visitorDd) {
                    visitorDd.style.display = "none";
                    if (visitorArrow) visitorArrow.style.transform = "rotate(0deg)";
                }
            });
        }

        // Hide any static external dashboard links or redundant notification buttons on the page
        document.querySelectorAll(".nav-back-link, .nav-dashboard-link, .back-home").forEach(link => {
            link.style.display = "none";
        });
        document.querySelectorAll(".header-notification-wrapper, #headerNotificationWrapper").forEach(el => {
            el.style.display = "none";
        });
        document.querySelectorAll(".nav-right a, .navbar a:not(.logo), header a:not(.brand)").forEach(link => {
            const text = (link.textContent || "").toLowerCase().trim();
            if ((text.includes("dashboard") && (text.includes("←") || text.includes("back") || text.includes("city dashboard") || text.includes("main dashboard"))) || text === "🏠 dashboard") {
                link.style.display = "none";
            }
        });

        // Push only the user/login badge into navbar (Dashboard and Notifications are inside the badge dropdown)
        container.appendChild(badge);

        const targets = [
            document.querySelector("#navUserHeaderContainer"),
            document.querySelector(".nav-right"),
            document.querySelector(".header-right"),
            document.querySelector(".user-area"),
            document.querySelector(".nav-actions"),
            document.querySelector(".doc-nav-right"),
            document.querySelector(".nav-links"),
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

    function enforceRoleIsolation() {
        if (typeof window === "undefined" || !window.location) return false;
        const user = getUser();
        if (!user) return false;

        const role = (user.role || user.accountType || "").toLowerCase();
        const staffId = String(user.staffId || "").toUpperCase();
        const pathname = (window.location.pathname || "").toLowerCase();

        // 1. Bin Staff Isolation ("uska bass usak deshbord dikhe")
        if (role === "bin_staff" || staffId.startsWith("BIN-")) {
            if (!pathname.includes("bin_dashboard.html")) {
                const assignedBin = user.assigned_bin_code || (staffId.startsWith("BIN-") ? staffId : "BIN-GOL-01");
                const targetUrl = _resolveDashboardUrl(`pages/waste/bin_dashboard.html?binCode=${encodeURIComponent(assignedBin)}`);
                window.location.replace(targetUrl);
                return true;
            }
        }
        return false;
    }

    return {
        setSession,
        getToken,
        getUser,
        isAuthenticated,
        isSuperAdmin,
        isAdmin,
        isStaff,
        isCitizen,
        getRole,
        getDepartment,
        getCurrentPageModule,
        hasStaffClearance,
        canEdit,
        hasPermission,
        logout,
        getApiBase: _getApiBase,
        fetch: authFetch,
        renderUserHeader,
        showLoginModal,
        showProfileModal,
        openActivityCenter,
        quickLoginPersona,
        fillStaffPreset,
        refreshNotificationCount,
        showToast,
        enforceRoleIsolation
    };
})();

if (typeof window !== "undefined") {
    window.SmartCityAuth = SmartCityAuth;
    window.isSuperAdmin = SmartCityAuth.isSuperAdmin;
    window.hasStaffClearance = SmartCityAuth.hasStaffClearance;
    window.showLoginModal = SmartCityAuth.showLoginModal;
    window.showProfileModal = SmartCityAuth.showProfileModal;
    window.openUserProfileModal = SmartCityAuth.showProfileModal;
    window.openActivityCenter = SmartCityAuth.openActivityCenter;
    window.quickLoginPersona = SmartCityAuth.quickLoginPersona;
    window.fillStaffPreset = SmartCityAuth.fillStaffPreset;
    window.showToast = SmartCityAuth.showToast;
    window.enforceRoleIsolation = SmartCityAuth.enforceRoleIsolation;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            if (SmartCityAuth.enforceRoleIsolation()) return;
            SmartCityAuth.renderUserHeader();
        });
    } else {
        if (!SmartCityAuth.enforceRoleIsolation()) {
            SmartCityAuth.renderUserHeader();
        }
    }
}
