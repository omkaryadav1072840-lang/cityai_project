/**
 * SmartCity Gorakhpur - Shared Authentication Helper
 * ---------------------------------------------------
 * Provides JWT token storage, session management, and an
 * automatic Authorization-header fetch wrapper for all pages.
 *
 * Usage:
 *   SmartCityAuth.setSession(token, user)   - called after login
 *   SmartCityAuth.getToken()                - retrieve stored JWT
 *   SmartCityAuth.getUser()                 - retrieve stored user object
 *   SmartCityAuth.isAuthenticated()         - true if a valid token exists
 *   SmartCityAuth.isStaff()                 - true if logged-in user is staff/admin
 *   SmartCityAuth.logout()                  - clears session
 *   SmartCityAuth.fetch(url, options)       - fetch wrapper with Bearer token
 */

const SmartCityAuth = (() => {
    const TOKEN_KEY = "smartCityJWT";
    const USER_KEY  = "smartCityCurrentUser";

    // -------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------

    /**
     * Decode the JWT payload without verifying the signature.
     * Verification happens server-side; this is only for reading claims.
     */
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
        // Add a 10-second buffer to account for clock skew
        return Date.now() / 1000 > payload.exp - 10;
    }

    // -------------------------------------------------------
    // PUBLIC API
    // -------------------------------------------------------

    /**
     * Persist both the JWT token and the user object to localStorage.
     * @param {string} token  - JWT string returned from the server
     * @param {object} user   - User object returned from the server
     */
    function setSession(token, user) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (user)  localStorage.setItem(USER_KEY,  JSON.stringify(user));
    }

    /**
     * Return the stored JWT token, or null if absent / expired.
     */
    function getToken() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        if (_isTokenExpired(token)) {
            // Auto-clear stale token
            logout();
            return null;
        }
        return token;
    }

    /**
     * Return the stored user object, or null if not logged in.
     */
    function getUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * Returns true if there is a valid (non-expired) token in storage.
     */
    function isAuthenticated() {
        return getToken() !== null;
    }

    /**
     * Returns true if the current user is staff or admin.
     */
    function isStaff() {
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "staff" || role === "admin";
    }

    /**
     * Returns true if the current user is a citizen.
     */
    function isCitizen() {
        const user = getUser();
        if (!user) return false;
        const role = (user.role || user.type || "").toLowerCase();
        return role === "citizen";
    }

    /**
     * Clear all stored session data.
     */
    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    /**
     * Drop-in replacement for `fetch()` that automatically injects
     * the Authorization: Bearer <token> header when a token exists.
     *
     * @param {string}  url      - Request URL
     * @param {object}  options  - Standard fetch options (method, headers, body, …)
     * @returns {Promise<Response>}
     */
    async function authFetch(url, options = {}) {
        const token = getToken();

        const headers = Object.assign({}, options.headers || {});
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return fetch(url, Object.assign({}, options, { headers }));
    }

    function _escapeHtml(str) {
        if (!str) return "";
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[m]);
    }

    /**
     * Renders a lightweight, high-visibility user badge in the header/nav bar.
     * Displays logged-in status, user name, role badge, and quick logout.
     */
    function renderUserHeader() {
        if (typeof document === "undefined") return;
        const user = getUser();
        const existing = document.getElementById("scGlobalUserBadge");
        if (existing) existing.remove();

        const badge = document.createElement("div");
        badge.id = "scGlobalUserBadge";
        badge.className = "sc-global-user-badge";

        if (user && isAuthenticated()) {
            const isStaffUser = isStaff();
            const roleColor = isStaffUser ? "#38bdf8" : "#34d399";
            const roleBorder = isStaffUser ? "rgba(56, 189, 248, 0.4)" : "rgba(52, 211, 153, 0.4)";
            const roleBg = isStaffUser ? "rgba(56, 189, 248, 0.12)" : "rgba(52, 211, 153, 0.12)";
            const displayName = user.name || user.username || user.email || (isStaffUser ? "Staff Officer" : "Citizen");
            const roleLabel = (user.role || (isStaffUser ? "STAFF" : "CITIZEN")).toUpperCase();

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

            setTimeout(() => {
                const btn = badge.querySelector("#scGlobalLogoutBtn");
                if (btn) {
                    btn.addEventListener("click", (e) => {
                        e.preventDefault();
                        logout();
                        window.location.reload();
                    });
                }
            }, 0);
        } else {
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                padding: 4px 10px;
                border-radius: 9999px;
                background: rgba(255, 255, 255, 0.06);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #94a3b8;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;
            badge.innerHTML = `
                <span style="width:7px; height:7px; border-radius:50%; background:#94a3b8; display:inline-block;"></span>
                <span>Citizen Guest</span>
            `;
        }

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
                target.appendChild(badge);
                break;
            }
        }
    }

    // -------------------------------------------------------
    // Expose public surface
    // -------------------------------------------------------
    return {
        setSession,
        getToken,
        getUser,
        isAuthenticated,
        isStaff,
        isCitizen,
        logout,
        fetch: authFetch,
        renderUserHeader
    };
})();

// Make it globally accessible so other scripts can use it
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

