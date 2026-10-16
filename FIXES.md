# SmartCity AI — Technical Fixes & Code Modifications Log

**Log Date**: October 16, 2026  
**Repository**: `D:\cityai_project - Copy`  

---

## 1. Summary of Modified Codebase Files

The following files were updated during this comprehensive repair and audit cycle:

| File Path | Nature of Fix | Lines Affected |
| :--- | :--- | :---: |
| [`backend/server.js`](file:///d:/cityai_project%20-%20Copy/backend/server.js) | Dynamic local dev CORS origin allowlist & safe non-error rejection | Lines 89–130 |
| [`frontend/auth.js`](file:///d:/cityai_project%20-%20Copy/frontend/auth.js) | `_getApiBase()` dynamic dev port routing; visitor badge direct modal trigger | Lines 14–26, 2890–2910 |
| [`frontend/script.js`](file:///d:/cityai_project%20-%20Copy/frontend/script.js) | `BACKEND_URL` fallback for multi-port local environments | Lines 27–35 |
| [`frontend/pages/hospital/hospital_dashboard.js`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/hospital_dashboard.js) | `API_BASE` localhost multi-port fallback | Lines 7–16 |
| [`frontend/pages/hospital/superadmin_hospital.js`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/superadmin_hospital.js) | `API_BASE` localhost multi-port fallback | Lines 7–16 |
| [`frontend/pages/water/water.js`](file:///d:/cityai_project%20-%20Copy/frontend/pages/water/water.js) | `API_BASE` localhost multi-port fallback | Lines 16–25 |
| [`frontend/pages/hospital/hospital.js`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/hospital.js) | Implemented and exported `openRecordsModal` mapping to `openPatientFile` | Lines 5021–5028, 9250 |
| [`frontend/pages/traffic/traffic.js`](file:///d:/cityai_project%20-%20Copy/frontend/pages/traffic/traffic.js) | Implemented `loadAdminCamerasTable`, `startAddCameraOnMap`, `startMoveCameraOnMap`, and `openIncidentModal` alias | Lines 305–310, 5045–5200 |
| [`backend/routes/pharmacy.routes.js`](file:///d:/cityai_project%20-%20Copy/backend/routes/pharmacy.routes.js) | Eliminated silent truncation when `all=true` is requested in pharmacy catalog | Lines 53–57 |

---

## 2. Detailed Code Diffs & Implementation Details

### Fix 1: Cross-Origin Resource Sharing (CORS) in `backend/server.js`

```diff
 // Explicit CORS Origin Allowlists
 const defaultAllowedOrigins = [
     "http://localhost:3000",
     "http://localhost:5000",
     "http://127.0.0.1:3000",
     "http://127.0.0.1:5000",
+    "http://localhost:5500",
+    "http://127.0.0.1:5500",
+    "http://localhost:5501",
+    "http://127.0.0.1:5501",
+    "http://localhost:8080",
+    "http://127.0.0.1:8080",
+    "http://localhost:8000",
+    "http://127.0.0.1:8000",
     "capacitor://localhost"
 ];
 
 const customOrigins = (CORS_ORIGINS || CORS_ORIGIN || "")
     .split(",")
     .map(o => o.trim())
     .filter(Boolean);
 
 const allowedOrigins = customOrigins.length > 0 ? customOrigins : defaultAllowedOrigins;
 
+const isLocalDevOrigin = (origin) => {
+    return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
+};
+
 const corsOptions = {
     origin: function (origin, callback) {
         if (!origin) return callback(null, true);
-        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
+        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*") || (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin))) {
             return callback(null, true);
         }
-        return callback(new Error(`CORS policy violation: origin '${origin}' is not allowed`), false);
+        return callback(null, false);
     },
     credentials: true,
     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
     allowedHeaders: ["Content-Type", "Authorization", "X-Access-Token", "X-Requested-With"]
 };
```

---

### Fix 2: Dynamic API Base URL Resolution in `frontend/auth.js`

```diff
     // Dynamic API Base URL resolution
     function _getApiBase() {
         if (typeof window !== "undefined" && window.API_BASE_URL) return window.API_BASE_URL;
-        if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http")) {
-            return window.location.port === "5000" ? window.location.origin : (window.location.protocol === "file:" ? "http://localhost:5000" : "");
+        if (typeof window !== "undefined" && window.location) {
+            const loc = window.location;
+            if (loc.protocol === "file:") return "http://localhost:5000";
+            if (loc.port === "5000") return loc.origin;
+            if (loc.port === "3000") return loc.origin; // Proxied by serve_frontend.js
+            if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
+                return `http://${loc.hostname}:5000`;
+            }
+            return loc.origin ? loc.origin : "";
         }
         return "http://localhost:5000";
     }
```

---

### Fix 3: Direct Visitor Login Modal Trigger in `frontend/auth.js`

```diff
             badge.addEventListener("click", (e) => {
-                if (e.target.closest("#scVisitorSignInActionBtn")) return;
-                e.stopPropagation();
-                const isShowing = visitorDd.style.display === "block";
-                visitorDd.style.display = isShowing ? "none" : "block";
-                if (visitorArrow) visitorArrow.style.transform = isShowing ? "rotate(0deg)" : "rotate(180deg)";
+                if (e.target.closest("#scDropdownArrowVisitor")) {
+                    e.stopPropagation();
+                    const isShowing = visitorDd.style.display === "block";
+                    visitorDd.style.display = isShowing ? "none" : "block";
+                    if (visitorArrow) visitorArrow.style.transform = isShowing ? "rotate(0deg)" : "rotate(180deg)";
+                    return;
+                }
+                if (e.target.closest("#scGlobalVisitorDropdown")) {
+                    return;
+                }
+                e.stopPropagation();
+                if (visitorDd) visitorDd.style.display = "none";
+                if (visitorArrow) visitorArrow.style.transform = "rotate(0deg)";
+                showLoginModal("citizen");
             });
```

---

### Fix 4: Traffic Admin Camera Table & GIS Relocation in `frontend/pages/traffic/traffic.js`

- Implemented `loadAdminCamerasTable()` fetching `/api/traffic/cameras` and rendering dynamic inventory rows into `#admin-cameras-tbody`.
- Implemented `startAddCameraOnMap()` allowing clicking GIS map coordinates to prefill and pop up the Add Camera modal.
- Implemented `startMoveCameraOnMap(presetCamId)` invoking Leaflet coordinate picking and calling `PUT /api/traffic/cameras/:id/location`.
- Bound `window.openIncidentModal = openReportIncidentModal;` to resolve inline HTML event handler.

---

### Fix 5: Complete Pharmacy Catalog Fetching in `backend/routes/pharmacy.routes.js`

```diff
         const safeLimit = hasExplicitPagination
             ? Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit))
-            : (req.query.all === "true" ? Math.min(100, Math.max(total, 50)) : 50);
-        const offset = (safePage - 1) * safeLimit;
+            : (req.query.all === "true" ? Math.max(total, 1) : 50);
+        const offset = req.query.all === "true" && !hasExplicitPagination ? 0 : (safePage - 1) * safeLimit;
```

---

### Fix 6: Resolve `ReferenceError: isStaffUser is not defined` & Fix Redirection in `frontend/auth.js`

- **Declaration Fix**: Added `const isStaffUser = isStaffOfficer;` in `renderUserHeader()` so patient ID checks on line 2821 do not throw an unhandled reference exception during `setSession()`.
- **Dynamic URL Resolver**: Added `_resolveDashboardUrl(target)` to dynamically check if the window path contains `/frontend/` (e.g. VS Code Live Server on port 5500) and preserve path prefixes, avoiding 404 navigation errors.
- **Error Boundary Separation**: Separated network fetch errors (`catch (netErr)`) from session storage errors (`catch (execErr)`) in both `forms.citizen` and `forms.staff` submit handlers, preventing successful logins from falsely triggering `"Unable to connect to staff login server."`.
- **Cross-Tab Redirection**: Staff/officer users who log in using their credentials on the default Citizen tab are now automatically routed to their department dashboard rather than staying on `index.html`.

---

### Fix 7: Department Navigation Dropdown Sign-In Link in `traffic.html` and `parking.html`

- Added direct, clickable `Sign In / Official Login` option at the top of the visitor dropdown menu in [`frontend/pages/traffic/traffic.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/traffic/traffic.html) and [`frontend/pages/parking/parking.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/parking/parking.html).
- Replaced non-existent `/pages/login.html` redirect in `frontend/api/auth.api.js` with `SmartCityAuth.logout()`.

