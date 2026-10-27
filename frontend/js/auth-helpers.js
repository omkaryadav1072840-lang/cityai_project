/**
 * SmartCity AI - Centralized Authentication Helpers
 * Eliminates duplicate auth logic across module pages
 */

(function () {
    "use strict";

    const TOKEN_KEY = "smartCityJWT";
    const USER_KEY = "smartCityCurrentUser";

    // =========================================================
    // TOKEN & USER ACCESSORS
    // =========================================================

    function getAuthToken() {
        return localStorage.getItem(TOKEN_KEY) ||
               localStorage.getItem("smartcity_token") ||
               localStorage.getItem("smartcity_auth_token") ||
               (window.SmartCityAuth && typeof SmartCityAuth.getToken === "function" && SmartCityAuth.getToken());
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(USER_KEY) ||
                        localStorage.getItem("smartcity_user") ||
                        localStorage.getItem("user");
            if (raw) return JSON.parse(raw);
        } catch { }
        return (window.SmartCityAuth && typeof SmartCityAuth.getUser === "function" && SmartCityAuth.getUser()) || null;
    }

    function isAuthenticated() {
        return !!getAuthToken();
    }

    // =========================================================
    // ROLE CHECKS
    // =========================================================

    function getUserRole() {
        const user = getCurrentUser();
        if (!user) return "guest";
        return String(user.role || user.type || "").toLowerCase().trim();
    }

    function getUserDepartment() {
        const user = getCurrentUser();
        if (!user) return "";
        return String(user.department || "").toLowerCase().trim();
    }

    function getUserEditable() {
        const user = getCurrentUser();
        if (!user || !Array.isArray(user.editable)) return [];
        return user.editable.map(e => String(e).toLowerCase().trim());
    }

    function hasRole(...roles) {
        const role = getUserRole();
        return roles.map(r => r.toLowerCase()).includes(role);
    }

    function hasDepartment(dept) {
        const department = getUserDepartment();
        return department === String(dept).toLowerCase().trim();
    }

    function hasEditable(module) {
        return getUserEditable().includes(String(module).toLowerCase().trim());
    }

    function isStaffUser(module) {
        const role = getUserRole();
        if (role === "admin" || role === "super_admin" || role === "superadmin") return true;
        if (role !== "staff") return false;
        if (!module) return true;
        return hasDepartment(module) || hasEditable(module);
    }

    function isAdminUser() {
        const role = getUserRole();
        return role === "admin" || role === "super_admin" || role === "superadmin";
    }

    function isSuperAdmin() {
        const role = getUserRole();
        return role === "super_admin" || role === "superadmin";
    }

    // =========================================================
    // AUTH HEADERS FOR API REQUESTS
    // =========================================================

    function getAuthHeaders(extraHeaders = {}) {
        const user = getCurrentUser();
        const token = getAuthToken();
        const role = getUserRole();
        const name = user ? (user.name || user.fullName || "Citizen") : "Citizen";

        const headers = {
            "Content-Type": "application/json",
            "x-user-role": role,
            "x-user-name": name,
            ...extraHeaders
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    // =========================================================
    // AUTH FETCH WRAPPER
    // =========================================================

    async function authFetch(url, options = {}) {
        const token = getAuthToken();
        const headers = { ...options.headers };
        if (token && !headers["Authorization"]) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return fetch(url, { ...options, headers });
    }

    // =========================================================
    // UI HELPERS
    // =========================================================

    function updateUserBadge() {
        const user = getCurrentUser();
        const token = getAuthToken();
        const isAuth = !!token && !!user;

        const elements = {
            name: document.getElementById("navUserName"),
            status: document.getElementById("navUserStatus"),
            avatar: document.getElementById("userAvatarCircle"),
            ddName: document.getElementById("ddUserFullName"),
            ddContact: document.getElementById("ddUserContact")
        };

        if (isAuth) {
            const role = getUserRole();
            const dept = getUserDepartment();
            const isStaff = isStaffUser();
            const initials = (user.name || "CT").split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase() || "CT";

            if (elements.name) elements.name.textContent = user.name || "Citizen";
            if (elements.ddName) elements.ddName.textContent = user.name || "Citizen";
            if (elements.avatar) elements.avatar.textContent = initials;

            if (role === "admin" || role === "super_admin") {
                if (elements.status) elements.status.textContent = "🛡️ System Admin";
                if (elements.ddContact) elements.ddContact.textContent = "Administrator • ICCC";
            } else if (isStaff && dept) {
                const label = dept.charAt(0).toUpperCase() + dept.slice(1);
                if (elements.status) elements.status.textContent = `👮 ${label} Staff`;
                if (elements.ddContact) elements.ddContact.textContent = `${label} Officer • Gorakhpur`;
            } else {
                if (elements.status) elements.status.textContent = "🟢 Active Citizen";
                if (elements.ddContact) elements.ddContact.textContent = `${user.mobile || user.email || "Citizen"} • Gorakhpur`;
            }
        } else {
            if (elements.name) elements.name.textContent = "Sign In";
            if (elements.ddName) elements.ddName.textContent = "Guest Visitor";
            if (elements.status) elements.status.textContent = "Visitor";
            if (elements.ddContact) elements.ddContact.textContent = "Sign in to access controls";
            if (elements.avatar) elements.avatar.textContent = "GV";
        }
    }

    // =========================================================
    // TOAST NOTIFICATIONS
    // =========================================================

    function showToast(message, isError = false) {
        const existing = document.querySelector(".toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            z-index: 100000;
            animation: slideIn 0.3s ease;
            max-width: 360px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        `;
        if (isError) {
            toast.style.background = "#991b1b";
            toast.style.border = "1px solid #f87171";
            toast.style.color = "#fecaca";
        } else {
            toast.style.background = "#064e3b";
            toast.style.border = "1px solid #34d399";
            toast.style.color = "#a7f3d0";
        }
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = "opacity 0.3s, transform 0.3s";
            toast.style.opacity = "0";
            toast.style.transform = "translateX(20px)";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // =========================================================
    // EXPORT
    // =========================================================

    window.SmartCityAuthHelpers = {
        getAuthToken,
        getCurrentUser,
        isAuthenticated,
        getUserRole,
        getUserDepartment,
        getUserEditable,
        hasRole,
        hasDepartment,
        hasEditable,
        isStaffUser,
        isAdminUser,
        isSuperAdmin,
        getAuthHeaders,
        authFetch,
        updateUserBadge,
        showToast
    };

    // Auto-update badge on auth change
    window.addEventListener("smartcity:auth-changed", () => {
        updateUserBadge();
    });

    // Initial update
    if (document.readyState !== "loading") {
        updateUserBadge();
    } else {
        document.addEventListener("DOMContentLoaded", updateUserBadge);
    }
})();