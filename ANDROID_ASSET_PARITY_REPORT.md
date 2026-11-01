# Android WebView Asset Parity & Mobile Hardening Report
**Target Platform:** Android (Capacitor WebView / APK Container)  
**Verification Date:** October 31, 2026  
**Auditor:** Mobile Platform & Cryptographic Integrity Verification Suite  
**Status:** **13 / 13 ASSETS SYNCHRONIZED (100% PARITY)**

---

## 1. Mobile WebView Architecture

The SmartCity AI Gorakhpur Android application bundles the municipal frontend as local offline-capable assets within:
`android/app/src/main/assets/public/`

The Android container utilizes Capacitor's local bridge to serve files via an internal origin (`http://localhost` or `capacitor://localhost`), isolating the application sandbox from direct external tampering and enabling low-latency field operations for municipal sanitation workers.

To guarantee zero behavioral discrepancy between browser testing and Android mobile deployment, all 13 core HTML, JavaScript, and CSS files must maintain **exact SHA-256 cryptographic hash parity**.

---

## 2. Cryptographic Hash Parity Table (SHA-256)

Every file was hashed using SHA-256. The source in `frontend/` was compared against the mirrored asset in `android/app/src/main/assets/public/`:

| # | Asset Relative Path | Source File Size | SHA-256 Cryptographic Hash | Parity Status |
| :-: | :--- | :---: | :--- | :---: |
| **1** | `pages/waste/waste.html` | 136,552 B | `4F25926C24500BD3035A19B89ED6B5EE564A9AB66BEB3B0F99259BCDC0EF2CF4` | **MATCH (100%)** |
| **2** | `pages/waste/waste.js` | 131,241 B | `4139F99B32CD6A57080CE26C4A6CE62CAB9883C4C33C0A3AFE01816CE49B6318` | **MATCH (100%)** |
| **3** | `pages/waste/waste.css` | 27,872 B | `310DCE37AAC3AA7B2EC3786AB8BFDAA695C9BDBBF0FC48B59E30094A9D7C665F` | **MATCH (100%)** |
| **4** | `pages/waste/bin_dashboard.html` | 10,883 B | `E78BEE90E77EC42C3266F9ADF9533BB05F3F000C98F0B657DB040A78766BB745` | **MATCH (100%)** |
| **5** | `pages/waste/bin_dashboard.js` | 18,298 B | `1CC8EEF04F2ED59336FEB85F21A1EA187992736C645A153E8F357E72FB56A9B1` | **MATCH (100%)** |
| **6** | `pages/waste/bin_dashboard.css` | 10,323 B | `CFDCDA7C25FE37695320A324F61D6BF384D75CDE8EB68E70F689C490AA6EE77D` | **MATCH (100%)** |
| **7** | `pages/waste/control_center.html` | 17,998 B | `A1483CF649C29E612517E69C0FA25EC123E6CD161F5064FE2286892EFF947468` | **MATCH (100%)** |
| **8** | `pages/waste/control_center.js` | 28,095 B | `FEBE501F42B8764FD2625C42092BA9EB70575541ECDE1BAA8DD4660215721E1F` | **MATCH (100%)** |
| **9** | `pages/waste/control_center.css` | 11,263 B | `3C5AC01CF19B56627DD41F735BB1A167456D97821E1B0D1740CECCC416B38940` | **MATCH (100%)** |
| **10** | `pages/waste/worker_dashboard.html` | 12,279 B | `390C3D25FAF714E4EC8362D77B1BAE0E8D57253C0E34400B960CE0DA7173D214` | **MATCH (100%)** |
| **11** | `pages/waste/worker_dashboard.js` | 20,950 B | `0DFE39BAE4455969D904D3585EACA05B2A79DEC642BF1D16586A53B681FF9969` | **MATCH (100%)** |
| **12** | `pages/waste/worker_dashboard.css` | 9,997 B | `2D1ED74D81881F75E4D40BD23ECC12CB750FE310EFE740C37A679B1359B8F8A4` | **MATCH (100%)** |
| **13** | `auth.js` | 134,809 B | `B3AB077F108E948F4D2E2697550462332FAA8C025B8A04A3287E88241AC427E1` | **MATCH (100%)** |

---

## 3. WebView Specific Behavioral Safeguards

1. **Smart API Endpoint Resolution:**  
   In Android WebView environments, `window.location.origin` resolves to `http://localhost` or `capacitor://localhost`. All client scripts (`auth.js`, `waste.js`, `bin_dashboard.js`) automatically route municipal API requests to the authoritative backend server (`http://localhost:5000` or configured remote staging URL) to avoid loopback drops.
2. **Local Session Isolation:**  
   Session tokens and active dustbin credentials stored in Android `localStorage` are sandbox-isolated within the application package (`com.getcapacitor.myapp`), preventing cross-app snooping on Android devices.
3. **Role Boundary Enforcement on Mobile:**  
   When a field worker or bin operator logs in via the Android WebView, `auth.js` role isolation executes identically to desktop browsers:
   - Operators logging in as `BIN_STAFF` are confined strictly to `bin_dashboard.html`.
   - Field collection drivers are routed to `worker_dashboard.html`.
   - Any deep-link tampering to citizen forms or administrative tools triggers immediate redirection to the assigned terminal.

---

## 4. Verification Conclusion

**ASSET INTEGRITY VERIFIED (13/13).**  
Android assets match frontend sources byte-for-byte with zero drift. Mobile staging can proceed with confidence in code uniformity.

