# BLOOD BANK & EMERGENCY BLOOD MANAGEMENT SYSTEM: API DOCUMENTATION
**SmartCity AI – Gorakhpur Municipal Healthcare Ecosystem**
*Base URL: `/api/hospital/blood-bank`*
*Authentication: Bearer JWT (`Authorization: Bearer <token>`)*

---

## 1. Overview & Authentication Model
The Blood Bank API adheres to RESTful conventions, returning JSON responses formatted with `{ success: boolean, message?: string, data?: any }`.
Identity, role, and hospital scoping are derived strictly server-side from verified JWT claims (`req.user`).

---

## 2. Citizen Endpoints

### 2.1 Get Verified Hospitals
- **Endpoint:** `GET /api/hospital/blood-bank/hospitals`
- **Auth:** Public / Optional
- **Description:** Returns all verified hospital blood centers in Gorakhpur with helplines, addresses, and license credentials.
- **Response `200 OK`:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "hospital_id": "HOSP-001",
      "hospital_name": "AIIMS Gorakhpur Blood Transfusion Services & Regional Center",
      "license_number": "LIC-UP-GKP-2024-BB01",
      "helpline_number": "0551-2207701",
      "location_address": "Kunraghat, Gorakhpur, UP 273008",
      "storage_capacity_units": 800
    }
  ]
}
```

---

### 2.2 Live Verified Blood Availability
- **Endpoint:** `GET /api/hospital/blood-bank/availability`
- **Auth:** Public / Optional
- **Query Params:**
  - `blood_group`: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`
  - `component`: `Whole Blood`, `PRBC`, `Platelets`, `FFP`, `Cryoprecipitate`
  - `hospital_id`: `HOSP-001`, `HOSP-002`, `HOSP-003`
- **Description:** Aggregates real-time available stock strictly excluding expired, quarantined, or reserved units.
- **Response `200 OK`:**
```json
{
  "success": true,
  "total_groups": 8,
  "timestamp": "2026-10-31T16:45:00.000Z",
  "data": [
    {
      "hospital_id": "HOSP-001",
      "hospital_name": "AIIMS Gorakhpur Regional Blood Center",
      "location": "Kunraghat, Gorakhpur",
      "blood_group": "O+",
      "component_type": "PRBC",
      "available_units": 12,
      "last_verified_time": "2026-10-31T16:30:00.000Z"
    }
  ]
}
```

---

### 2.3 Submit Blood Request (Routine / Emergency)
- **Endpoint:** `POST /api/hospital/blood-bank/requests`
- **Auth:** Optional / Authenticated Citizen
- **Payload:**
```json
{
  "hospital_id": "HOSP-001",
  "patient_name": "Ramesh Gupta",
  "patient_age": 48,
  "patient_gender": "Male",
  "blood_group": "B+",
  "component_type": "PRBC",
  "requested_units": 2,
  "priority": "Emergency",
  "treating_department": "Emergency Trauma",
  "treating_doctor": "Dr. A. K. Verma",
  "required_at": "2026-10-31T20:00:00.000Z",
  "contact_person": "Suman Gupta",
  "contact_phone": "9876543210",
  "relationship_to_patient": "Spouse",
  "additional_notes": "Immediate transfusion required for surgical bypass",
  "idempotency_key": "IDEM-REQ-98741-XYZ"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Blood request submitted successfully. Our blood bank staff is reviewing availability.",
  "data": {
    "id": 1,
    "request_reference": "REQ-BLD-948123-5502",
    "status": "SUBMITTED",
    "hospital_name": "AIIMS Gorakhpur",
    "hospital_helpline": "0551-2207701"
  }
}
```

---

### 2.4 My Blood Requests
- **Endpoint:** `GET /api/hospital/blood-bank/requests/my`
- **Auth:** `citizen` (`authenticateToken`)
- **Description:** Returns all blood requests submitted by the logged-in citizen.

---

### 2.5 Track Request Details
- **Endpoint:** `GET /api/hospital/blood-bank/requests/:id`
- **Auth:** Optional / Token
- **Param:** Numeric ID or reference string (e.g. `REQ-BLD-948123-5502`)
- **Description:** Returns full request details, hospital contact, status history timeline, and reserved unit barcodes.

---

### 2.6 Voluntary Donor Registration
- **Endpoint:** `POST /api/hospital/blood-bank/donors/register`
- **Auth:** Optional / Authenticated Citizen
- **Payload:**
```json
{
  "full_name": "Rahul Sharma",
  "age": 29,
  "gender": "Male",
  "blood_group": "B+",
  "phone": "9876543210",
  "city": "Gorakhpur",
  "locality": "Golghar",
  "preferred_contact_method": "Call",
  "availability_preference": "Emergency Only",
  "consent_to_contact": true
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Thank you for registering as a voluntary blood donor.",
  "data": {
    "donor_id": 1,
    "donor_code": "DNR-GKP-2026-881",
    "donor_status": "PENDING_VERIFICATION"
  }
}
```

---

### 2.7 Donor Profile & Consent Management
- **Endpoint:** `GET /api/hospital/blood-bank/donors/me`
- **Endpoint:** `PATCH /api/hospital/blood-bank/donors/me`
- **Auth:** Authenticated User
- **Description:** Retrieve own donor status or withdraw consent (`{ "withdraw_consent": true }`).

---

## 3. Hospital Staff & Administrative Endpoints

### 3.1 Staff Request Queue
- **Endpoint:** `GET /api/hospital/blood-bank/staff/requests`
- **Auth:** `staff`, `admin`, `super_admin` (`authenticateToken`)
- **Scoping:** Staff restricted to assigned `hospital_id`.

---

### 3.2 Concurrency-Safe Unit Reservation (FEFO Algorithm)
- **Endpoint:** `POST /api/hospital/blood-bank/staff/requests/:id/reserve`
- **Auth:** Staff / Admin of target hospital
- **Behavior:** Executes `SELECT ... FOR UPDATE` with First-Expired, First-Out (FEFO) ordering. Locks units and transitions request to `RESERVED`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Successfully reserved 2 unit(s) for request REQ-BLD-XXXX.",
  "data": {
    "request_id": 1,
    "status": "RESERVED",
    "reserved_units": [
      { "id": 10, "code": "BG-AIIMS-B-POS-1001", "expiry": "2026-11-20" },
      { "id": 11, "code": "BG-AIIMS-B-POS-1002", "expiry": "2026-11-25" }
    ]
  }
}
```
- **Response `409 Conflict`:** Returned if stock is insufficient under concurrent load.

---

### 3.3 Fulfill Request & Dispense Blood
- **Endpoint:** `POST /api/hospital/blood-bank/staff/requests/:id/fulfill`
- **Auth:** Staff / Admin
- **Behavior:** Marks request as `FULFILLED` and transitions reserved units to `ISSUED`.

---

### 3.4 Unit Accession & Status Modification
- **Endpoint:** `GET /api/hospital/blood-bank/staff/inventory`
- **Endpoint:** `POST /api/hospital/blood-bank/staff/inventory`
- **Endpoint:** `PATCH /api/hospital/blood-bank/staff/inventory/:id` (Requires mandatory clinical reason in payload)

---

### 3.5 Administrative Dashboard, Reports & Transfusion Audits
- **Endpoint:** `GET /api/hospital/blood-bank/admin/dashboard`
- **Endpoint:** `GET /api/hospital/blood-bank/admin/reports`
- **Endpoint:** `GET /api/hospital/blood-bank/admin/donors`
- **Endpoint:** `PATCH /api/hospital/blood-bank/admin/donors/:id`
- **Endpoint:** `GET /api/hospital/blood-bank/admin/audit-logs`

