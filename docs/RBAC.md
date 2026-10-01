# SMARTCITY AI — Role-Based Access Control (RBAC) & Security Specification

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**Permission Model**: Role + Municipal Department + Action = Granted Privilege  
**Authentication Standard**: JWT (HMAC-SHA256) Bearer Tokens  
**Compliance**: Municipal Zero-Trust & Indian Personal Data Protection Principles  

---

## 1. Access Level Hierarchy

```
                            ┌────────────────────────┐
                            │  Administrator (admin) │  <-- Global Municipal Authority
                            └───────────┬────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        ┌───────────────────────┐               ┌───────────────────────┐
        │ Departmental Staff    │               │  Visitor / Citizen    │
        │ (Module-Scoped RBAC)  │               │  (Civic Services)     │
        └───────────────────────┘               └───────────────────────┘
```

The system strictly divides users into three primary access tiers:
1. **Visitor / Citizen (`citizen`)**:
   - Public view of city telemetry (traffic signals, parking availability, hospital beds, water supply, AQI, tourism spots).
   - Authenticated actions for personal profile management, parking reservations, civic grievances, doctor appointments, and personal Ayushman health pass.
2. **Departmental Staff (`staff`, `doctor`, `hospital_staff`)**:
   - Operational authority strictly scoped to the staff member's assigned municipal department.
   - Cross-department access operates with citizen privileges unless elevated.
3. **Administrator (`admin`)**:
   - Unrestricted global authority across all municipal modules, user management, staff provisioning, What-If simulation engines, and immutable audit logs.

---

## 2. Departmental Staff Isolation Matrix

Staff permissions are **strictly module-specific**. A staff officer in one department does **not** inherit edit privileges in any other department.

| Persona / Department | Traffic Module | Parking Module | Healthcare Module | Waste Module | Water Module | Emergency Module | ICCC Command Desk |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Citizen / Visitor** | ⚪ View Only | 🟡 Reserve Slot | 🟡 Book OPD | 🟡 File Report | 🟡 Book Tanker | 🟢 Trigger SOS | 🔴 Forbidden |
| **Traffic Staff** (`TR-*`) | 🟢 Full Edit | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ View Only |
| **Parking Staff** (`PKG-*`) | ⚪ Citizen View | 🟢 Gate & Bays | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ View Only |
| **Doctor / Hospital Staff** | ⚪ Citizen View | ⚪ Citizen View | 🟢 EHR & Beds | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ View Only |
| **Waste Staff** (`WST-*`) | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | 🟢 Route & Bins | ⚪ Citizen View | ⚪ Citizen View | ⚪ View Only |
| **Water Staff** (`WTR-*`) | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | 🟢 SCADA Valve | ⚪ Citizen View | ⚪ View Only |
| **Emergency Staff** (`EMG-*`) | 🟡 Signal Wave | ⚪ Citizen View | 🟡 Triage Alert | ⚪ Citizen View | ⚪ Citizen View | 🟢 Full Dispatch | ⚪ View Only |
| **Police Staff** (`POL-*`) | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | ⚪ Citizen View | 🟡 Incident Sync | ⚪ View Only |
| **Administrator** (`admin`) | 🟢 Full Edit | 🟢 Full Edit | 🟢 Full Edit | 🟢 Full Edit | 🟢 Full Edit | 🟢 Full Edit | 🟢 Global Control |

---

## 3. Action-Level Permissions (`module.action`)

### 3.1 Traffic Department
- `traffic.view`: Public junction congestion and e-Challan search.
- `traffic.override`: Manual signal phase overrides and emergency flash mode.
- `traffic.cameras`: CCTV optical stream viewing and ANPR violation approvals.
- `traffic.preemption`: Authorize ambulance emergency green waves.

### 3.2 Healthcare & Hospital Department
- `healthcare.view`: Hospital bed counts, doctor schedules, OPD timings.
- `healthcare.appointments`: Book personal doctor consultations.
- `healthcare.patients`: Read/write patient clinical records, prescriptions, and lab diagnostics.
- `healthcare.beds`: Bed allocation, ward transfers, and patient discharge.
- `healthcare.qr_scan`: Scan patient Ayushman QR pass to unlock EHR.

### 3.3 Smart Parking Department
- `parking.view`: Public bay occupancy and parking lot directory.
- `parking.book`: Create slot reservations and generate parking passes.
- `parking.gate`: Barrier entry/exit check-in via ANPR or QR scanner.
- `parking.manage`: Manual bay status overrides and tariff configuration.

### 3.4 Waste Management Department
- `waste.view`: Public smart dustbin map and fill percentages.
- `waste.report`: Citizen overflowing bin and illegal dumping reports.
- `waste.dispatch`: Route assignment and compactor vehicle dispatch.
- `waste.resolve`: Transition grievance status to `Resolved`.

### 3.5 Water Supply Department
- `water.view`: Overhead tank levels and supply schedules.
- `water.anomalies`: SCADA low pressure, leak, and pipe burst alarms.
- `water.tanker`: Citizen emergency tanker booking dispatch.
- `water.valves`: Feeder valve isolation and pressure controls.

---

## 4. High-Consequence Controls & Privacy Guards

### 4.1 Ayushman Patient QR Privacy Guard
The platform enforces medical privacy at both API and UI levels:
- **Unauthenticated Visitor or Unrelated Citizen**:
  - Scanning a patient QR pass returns only a masked privacy confirmation:
    ```json
    {
      "authorized": false,
      "verification": {
        "isValid": true,
        "patientId": "P-2026-000001",
        "maskedName": "R**** V****",
        "status": "Active"
      }
    }
    ```
- **Authorized Medical Staff / Doctor / Admin / Patient Owner**:
  - Unlocks full clinical dossier, diagnoses, prescriptions, and diagnostic lab reports.
  - Every access is stamped into `patient_audit_logs` (requester ID, timestamp, IP address).

### 4.2 Computer Vision Staging & Mandatory Officer Verification
- Automatic computer vision algorithms (ANPR, speed cameras) identify infractions, but classify them exclusively as `AI_FLAGGED`.
- Autonomous fine deduction is strictly forbidden.
- The official e-challan referral occurs only after an authorized traffic officer reviews the evidence photograph, confirms the license plate, and inputs their verified credential sign-off (`/api/cv/violations/:id/verify`).

### 4.3 Grounded AI Tool Execution Allowlist
- The AI assistant cannot execute arbitrary SQL queries.
- Tool invocations are strictly bounded to the 17 allowlisted functions in `backend/services/grounded_tools.js`.
- All tool executions are recorded in `ai_tool_logs`.

### 4.4 Parameterized Query Immunization
- 100% of SQL queries across the platform use parameterized placeholders (`?`) with `mysql2/promise`.
- SQL injection payloads (e.g. `' OR '1'='1' --`) are neutralized at the database driver boundary.

---

## 5. Technical Enforcement Pipeline

### 5.1 Frontend UI Guard (`frontend/auth.js`)
```javascript
// Module-level edit check
if (SmartCityAuth.canEdit("traffic")) {
    document.getElementById("trafficOverrideControls").style.display = "block";
} else {
    document.getElementById("trafficOverrideControls").style.display = "none";
}

// Action-level permission check
if (SmartCityAuth.hasPermission("healthcare", "patients")) {
    renderDoctorClinicalForm();
}
```

### 5.2 Server Middleware Guard (`backend/middleware/auth.middleware.js`)
```javascript
// Departmental Middleware Guard
const requireDepartment = (allowedDepartments) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }
        if (req.user.role === "admin") return next();
        
        const userDept = (req.user.department || "").toLowerCase();
        if (allowedDepartments.map(d => d.toLowerCase()).includes(userDept)) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Access denied. Requires departmental clearance: ${allowedDepartments.join(", ")}`
        });
    };
};
```
