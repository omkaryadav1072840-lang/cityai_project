# SMARTCITY AI — SECURITY & PRIVACY SPECIFICATION
**Platform**: Gorakhpur Smart City Management Platform  
**Compliance Standard**: Municipal Zero-Trust & Indian DISHA / Personal Data Protection Framework  

---

## 1. Authentication & Role-Based Access Control (RBAC)

The platform enforces strict role separation using JSON Web Tokens (JWT) signed with HMAC-SHA256:

| Role | Permitted Access Scope | Prohibited Actions |
|---|---|---|
| **`citizen`** | View public dashboards, chat with AI assistant, submit grievances, search parking/hospitals, report emergencies. | Cannot view internal staff queues, clinical medical charts, raw ANPR camera streams, or trigger signal overrides. |
| **`staff`** | Review citizen grievances, verify staged ANPR traffic violations, update municipal bin schedules. | Cannot alter global system configuration or decrypt executive keys. |
| **`doctor`** / **`hospital_staff`** | Access clinical patient records via encrypted QR scan, manage ward bed allocations, dispatch ambulances. | Cannot access police or traffic violation enforcement tools. |
| **`admin`** | Executive AI Command Center, What-If simulation engine, model drift monitoring, user role management. | All actions logged in `ai_reviews` and `ai_tool_logs` for non-repudiation. |

---

## 2. Clinical Medical Privacy & QR Code Access Guard

Under the healthcare AI module (`healthcare_ai_service.js`):
1. **No Public Patient Charts**: Medical records are never exposed via unauthenticated endpoints.
2. **Strict Identity Verification**: Accessing a patient chart requires both a valid `qr_token` and an authenticated token carrying a verified medical role (`DOCTOR`, `HOSPITAL_STAFF`, `STAFF`, `ADMIN`).
3. **Automated Access Audit**: Every successful or rejected access attempt is stamped with:
   - Requesting username and ID
   - Exact timestamp (ISO-8601)
   - Status code (`ACCESS_GRANTED` or `FORBIDDEN`)

---

## 3. SQL Injection & Input Sanitization

- **100% Parameterized Queries**: All MySQL queries across `ai.routes.js`, `traffic_ai_service.js`, and `grounded_tools.js` utilize prepared statements via `mysql2/promise` with placeholder parameters (`?`).
- **Literal Sanitization**: String concatenation into SQL queries is strictly prohibited. Automated tests (`test_phases_12_13.js`) explicitly verify that SQL injection payloads such as `' OR '1'='1' --` are neutralized.

---

## 4. High-Consequence Human-in-the-Loop Safeguards

1. **Automated E-Challan Staging**: Computer vision algorithms identify speed and red-light infractions, but classify them exclusively as `AI_FLAGGED`.
2. **Mandatory Officer Verification**: The official e-challan referral only occurs when a traffic officer reviews the evidence image, checks license plate validity, and enters an authorized approval signature (`/api/cv/violations/:id/verify`).
