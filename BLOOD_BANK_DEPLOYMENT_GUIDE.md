# BLOOD BANK & EMERGENCY BLOOD MANAGEMENT SYSTEM: DEPLOYMENT GUIDE
**SmartCity AI – Gorakhpur Municipal Healthcare Ecosystem**

---

## 1. System Requirements
- **Node.js:** v18.x or v20.x LTS (compatible with v24.x)
- **Database:** MySQL 8.0+ or MariaDB 10.5+ (InnoDB engine strictly enabled)
- **Web Browser:** Modern standards-compliant browser (Chrome, Edge, Firefox, Safari)

---

## 2. Database Migration Steps
1. Ensure MySQL server is running on configured host (`localhost:3306` by default).
2. Execute the migration script:
   ```bash
   node backend/migrations/blood_bank_migration.js
   ```
   This creates all 10 `blood_*` tables and seeds baseline verified inventory across:
   - AIIMS Gorakhpur (`HOSP-001`)
   - BRD Medical College (`HOSP-002`)
   - District Hospital Sadar (`HOSP-003`)

---

## 3. Starting the Platform
```bash
# Production server start
npm start

# Development with watchers
npm run dev
```

---

## 4. Mobile / Android Asset Synchronization
Whenever frontend files in `frontend/pages/hospital/` are modified, sync them to Android Capacitor:
```bash
npx cap copy android
# Or using PowerShell
Copy-Item -Path "frontend\pages\hospital\*" -Destination "android\app\src\main\assets\public\pages\hospital\" -Recurse -Force
```

---

## 5. Rollback Procedure
If emergency rollback of the blood bank module is required:
1. **Unmount Route in Server:**
   In `backend/server.js`, comment out or delete:
   ```javascript
   // const bloodBankRoutes = require("./routes/blood_bank.routes");
   // app.use(bloodBankRoutes);
   ```
2. **Restore Entry Card in `hospital.html`:**
   Restore Card 12 markup to the legacy prescription upload snippet.
3. **Database Drop (Optional):**
   ```sql
   DROP TABLE IF EXISTS blood_stock_reservations, blood_inventory_movements, blood_inventory_units, blood_request_status_history, blood_requests, blood_donor_consents, blood_donors, blood_donation_records, blood_bank_audit_logs, blood_bank_facilities;
   ```
   *Note: Dropping blood bank tables has ZERO impact on existing appointments, patients, beds, pharmacy, or doctors.*

