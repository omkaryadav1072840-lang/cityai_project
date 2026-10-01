# SMARTCITY AI — Database Schema & Data Dictionary

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**Database Engine**: MySQL 8.0+  
**Connection Pool**: `mysql2/promise` (Max 20 concurrent connections)  
**Character Set**: `utf8mb4` (Collation: `utf8mb4_unicode_ci`)  
**Total Tables**: 101 Active Relational & Audit Tables  

---

## 1. Domain Grouping & Master Table Index

The 101 relational tables are organized into 12 functional operational domains:

| # | Operational Domain | Table Count | Key Tables | Description |
|---|:---|:---:|:---|:---|
| **1** | **Identity & Auth** | 4 | `users`, `staff`, `auth_sessions`, `audit_logs` | Citizen & staff profiles, JWT session validation, and security audit trail. |
| **2** | **Citizen Grievances & SLA** | 4 | `service_requests`, `citizen_feedback`, `notifications`, `analytics_events` | SLA-tracked municipal complaints (2h–72h), push notices, and civic analytics. |
| **3** | **Traffic & Transit Grid** | 13 | `traffic_junctions`, `traffic_signals`, `traffic_cameras`, `traffic_violations`, `traffic_predictions`, `signal_optimizations`, `cv_detections` | Signal phasing, CCTV telemetry, ANPR violations, and Webster IRC:93 signal cycles. |
| **4** | **Emergency Services** | 4 | `ambulances`, `ambulance_green_waves`, `emergency_departments`, `emergency_incidents`, `ambulance_waypoints` | Real-time ambulance GPS waypoints, signal preemption records, and 1-tap SOS logs. |
| **5** | **IoT Smart Parking** | 9 | `parking_lots`, `parking_slots`, `parking_bookings`, `parking_entries`, `parking_predictions` | Bay occupancy (A/B/C bays), ANPR barrier check-in/out, reservations, and surge pricing. |
| **6** | **Healthcare & Bed Triage** | 17 | `hospitals`, `hospital_beds`, `hospital_ward_beds`, `hospital_bed_categories`, `doctors`, `appointments`, `hospital_predictions` | Live bed availability across 14 hospitals, 57 bed categories, OPD queues, and surge forecasts. |
| **7** | **Patient EMR & Ayushman QR** | 10 | `patients`, `patient_records`, `patient_reports`, `prescriptions`, `patient_audit_logs`, `pharmacy`, `diagnostic_tests` | Privacy-preserving Ayushman QR tokens, clinical dossiers, lab diagnostics, and pharmacy catalog. |
| **8** | **Smart Waste Management** | 7 | `waste_bins`, `waste_bin_requests`, `waste_routes`, `waste_vehicles`, `waste_workers`, `waste_predictions` | Ultrasonic bin fill telemetry, photo reporting, compactor truck dispatch, and TSP routing. |
| **9** | **SCADA Water Supply** | 8 | `water_tanks`, `water_pipelines`, `water_anomalies`, `water_supply_schedules`, `water_tanker_bookings` | Overhead reservoir levels, pipeline pressure telemetry, leak detection, and tanker dispatch. |
| **10** | **Police & Public Safety** | 3 | `police_stations`, `police_complaints`, `police_stats`, `police_patrol_units` | Thana directory, jurisdiction boundaries, community grievances, and e-FIR intake. |
| **11** | **Tourism & Environmental Sensors** | 7 | `famous_places`, `place_reviews`, `city_atms`, `city_environmental_sensors`, `events`, `environment_predictions` | Gorakhpur heritage POIs, ratings, ambient AQI sensor readings, and flood risk projections. |
| **12** | **AI Governance & Ledgers** | 15 | `ai_models`, `ai_predictions`, `ai_feedback`, `ai_tool_logs`, `ai_chat_messages`, `ai_model_metrics`, `ai_reviews`, `ai_jobs`, `ai_data_sources` | Allowlisted tool invocation logs, model accuracy metrics, XAI review ledger, and drift trackers. |

---

## 2. Core Relational Schemas & Constraints

### 2.1 Identity, Access Control & Sessions

#### `users`
Citizen registration credentials, contact information, and residence metadata.
```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    ward VARCHAR(50) DEFAULT 'Ward 1 - Golghar',
    vehicle_number VARCHAR(30),
    blood_group VARCHAR(10),
    emergency_contact VARCHAR(15),
    role VARCHAR(20) DEFAULT 'citizen',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_mobile (mobile),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `staff`
Departmental officers and field staff with departmental isolation.
```sql
CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    mobile VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    department ENUM('traffic', 'healthcare', 'parking', 'waste', 'water', 'emergency', 'police', 'admin') NOT NULL,
    role VARCHAR(30) DEFAULT 'staff',
    permissions JSON,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_staff_dept (department),
    INDEX idx_staff_id (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `audit_logs`
Immutable system-wide security and mutation log.
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    staff_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.2 Patient Records & Ayushman Privacy QR Pass

#### `patients`
Centralized patient registration with unique QR token for Ayushman health pass.
```sql
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(32) UNIQUE NOT NULL,
    user_id INT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    age INT,
    gender ENUM('Male', 'Female', 'Other'),
    blood_group VARCHAR(10),
    address TEXT,
    emergency_contact VARCHAR(15),
    qr_token VARCHAR(64) UNIQUE NOT NULL,
    abha_status ENUM('Linked', 'Not Linked') DEFAULT 'Not Linked',
    abha_id VARCHAR(50),
    status ENUM('Active', 'Discharged', 'Transferred') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient_id (patient_id),
    INDEX idx_patient_qr (qr_token),
    INDEX idx_patient_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `patient_records` & `patient_reports`
Clinical records and diagnostic attachments linked to `patients(patient_id)`.
- Access strictly gated by `patient_audit_logs`:
```sql
CREATE TABLE IF NOT EXISTS patient_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(32) NOT NULL,
    performed_by_id VARCHAR(64) NOT NULL,
    role VARCHAR(30) NOT NULL,
    action ENUM('QR_SCAN', 'RECORD_VIEW', 'RECORD_CREATE', 'REPORT_DOWNLOAD') NOT NULL,
    status ENUM('ACCESS_GRANTED', 'FORBIDDEN') NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pt_audit (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.3 Municipal Grievance Redressal (`service_requests`)

Tracks citizen civic complaints with automated SLA countdowns:
```sql
CREATE TABLE IF NOT EXISTS service_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_code VARCHAR(32) UNIQUE NOT NULL,
    tracking_id VARCHAR(32) UNIQUE NOT NULL,
    user_id INT,
    citizen_name VARCHAR(100),
    citizen_mobile VARCHAR(15),
    department ENUM('waste', 'traffic', 'water', 'street_lights', 'healthcare', 'emergency', 'police') NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200),
    landmark VARCHAR(150),
    evidence_photo VARCHAR(255),
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    sla_hours INT DEFAULT 24,
    sla_deadline DATETIME NOT NULL,
    sla_breached TINYINT(1) DEFAULT 0,
    status ENUM('Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened') DEFAULT 'Pending',
    assigned_worker_name VARCHAR(100),
    assigned_vehicle_number VARCHAR(30),
    resolution_notes TEXT,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_req_tracking (tracking_id),
    INDEX idx_req_dept (department),
    INDEX idx_req_status (status),
    INDEX idx_req_sla (sla_breached, sla_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.4 Traffic Phasing, Cameras & Emergency Preemption

#### `traffic_junctions` & `traffic_signals`
Represents the 42 Gorakhpur junctions with real-time signal phase timing.
```sql
CREATE TABLE IF NOT EXISTS traffic_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    junction_id VARCHAR(50) NOT NULL,
    current_phase ENUM('RED', 'YELLOW', 'GREEN') DEFAULT 'RED',
    phase_name VARCHAR(50) DEFAULT 'North-South Approach',
    webster_cycle_length INT DEFAULT 60,
    green_seconds INT DEFAULT 30,
    yellow_seconds INT DEFAULT 4,
    red_seconds INT DEFAULT 26,
    manual_override TINYINT(1) DEFAULT 0,
    override_reason VARCHAR(255),
    last_phase_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sig_jnc (junction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ambulance_green_waves`
Audit log of 600m arterial preemption corridors engaged for emergency ambulances.
```sql
CREATE TABLE IF NOT EXISTS ambulance_green_waves (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ambulance_id VARCHAR(50) NOT NULL,
    junction_id VARCHAR(50) NOT NULL,
    distance_meters INT NOT NULL,
    corridor_status ENUM('GREEN_WAVE_ENGAGED', 'DISENGAGED', 'INTERRUPTED') DEFAULT 'GREEN_WAVE_ENGAGED',
    approach_bearing VARCHAR(20),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    INDEX idx_gw_amb (ambulance_id),
    INDEX idx_gw_jnc (junction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `cv_detections` & `traffic_violations`
Computer vision ANPR detections with staged `AI_FLAGGED` state before officer referral.
```sql
CREATE TABLE IF NOT EXISTS traffic_violations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    violation_id VARCHAR(50) UNIQUE NOT NULL,
    junction_id VARCHAR(50) NOT NULL,
    camera_id VARCHAR(50),
    vehicle_number VARCHAR(30) NOT NULL,
    violation_type ENUM('RED_LIGHT_JUMP', 'SPEED_VIOLATION', 'NO_HELMET', 'WRONG_SIDE', 'ILLEGAL_PARKING') NOT NULL,
    snapshot_url VARCHAR(255),
    fine_amount DECIMAL(10,2) DEFAULT 1000.00,
    confidence_score DECIMAL(5,4),
    status ENUM('AI_FLAGGED', 'VERIFIED_CHALLAN_REFERRED', 'REJECTED_DISMISSED', 'PAID') DEFAULT 'AI_FLAGGED',
    verified_by VARCHAR(50),
    verified_at TIMESTAMP NULL,
    review_notes TEXT,
    payment_receipt VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_viol_plate (vehicle_number),
    INDEX idx_viol_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.5 AI Model Governance & Prediction Ledgers

#### `ai_predictions` (Master Governance Ledger)
Audit ledger for every prediction or analytical inference generated by the platform.
```sql
CREATE TABLE IF NOT EXISTS ai_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prediction_id VARCHAR(64) UNIQUE,
    model_name VARCHAR(100),
    model_identifier VARCHAR(100),
    model_version VARCHAR(50) DEFAULT '1.0.0',
    input_data JSON,
    output_data JSON,
    module VARCHAR(50) NOT NULL,
    entity_reference VARCHAR(100),
    input_snapshot JSON,
    prediction_output JSON,
    confidence_score DECIMAL(5,4),
    reason TEXT,
    location VARCHAR(150),
    user_id VARCHAR(64),
    staff_id VARCHAR(64),
    actual_result JSON,
    was_correct TINYINT(1),
    human_override TINYINT(1) DEFAULT 0,
    override_reason TEXT,
    data_source ENUM('REAL', 'SIMULATED', 'PREDICTED') DEFAULT 'PREDICTED',
    processing_time INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    review_status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED') DEFAULT 'PENDING',
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pred_module (module),
    INDEX idx_pred_model (model_name),
    INDEX idx_pred_created (created_at),
    INDEX idx_pred_loc (location),
    INDEX idx_pred_id (prediction_id),
    INDEX idx_pred_review (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ai_feedback`
Stores ground-truth verification outcomes submitted by municipal inspectors or citizens to track precision, recall, and detect model drift.
```sql
CREATE TABLE IF NOT EXISTS ai_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prediction_id VARCHAR(64) NOT NULL,
    module VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    predicted_value VARCHAR(255),
    actual_value VARCHAR(255),
    accuracy_score DECIMAL(5,4),
    feedback_type ENUM('AUTOMATED_OBSERVATION', 'STAFF_REVIEW', 'CITIZEN_RATING') DEFAULT 'STAFF_REVIEW',
    submitted_by VARCHAR(64),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fb_pred (prediction_id),
    INDEX idx_fb_mod (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `ai_tool_logs`
Logs every execution of the 17 grounded municipal tools to ensure tamper-proof tool tracking.
```sql
CREATE TABLE IF NOT EXISTS ai_tool_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tool_call_id VARCHAR(64) UNIQUE NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    parameters JSON,
    result_summary TEXT,
    user_id VARCHAR(64),
    session_id VARCHAR(100),
    latency_ms INT DEFAULT 0,
    success TINYINT(1) DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tool_name (tool_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Domain Prediction Tables
- **`traffic_predictions`**: Multi-horizon forecasts (15m, 30m, 60m) per junction.
- **`signal_optimizations`**: Webster cycle length allocations ($C_0$, $g_A$, $g_B$).
- **`waste_predictions`**: Smart bin fill-level depletion regressions.
- **`water_anomalies`**: Pressure drop and SCADA pipe burst alerts.
- **`hospital_predictions`**: Bed surge projections and OPD wait times.
- **`parking_predictions`**: Multi-horizon slot occupancy forecasts and surge pricing records.
- **`environment_predictions`**: 3-hour AQI trends and hotspot warnings.
- **`disaster_predictions`**: Monsoon waterlogging runoff and drainage surcharge projections.

---

## 3. Entity-Relationship Overview

```
[ users ]
   │
   ├──< [ auth_sessions ]
   ├──< [ audit_logs ]
   ├──< [ service_requests ]
   ├──< [ parking_bookings ] ──> [ parking_lots ] ──< [ parking_slots ]
   ├──< [ appointments ] ──> [ doctors ] ──> [ hospitals ] ──< [ hospital_ward_beds ]
   └──< [ patients ] ──< [ patient_records ]
                      ──< [ patient_reports ]
                      ──< [ patient_audit_logs ]

[ traffic_junctions ]
   ├──< [ traffic_signals ] ──< [ signal_optimizations ]
   ├──< [ traffic_cameras ] ──< [ cv_detections ] ──< [ traffic_violations ]
   └──< [ ambulance_green_waves ] ──> [ ambulances ]

[ waste_bins ]
   └──< [ waste_bin_requests ]
   └──< [ waste_predictions ]

[ water_tanks ] & [ water_pipelines ]
   └──< [ water_anomalies ]
   └──< [ water_tanker_bookings ]

[ ai_models ]
   └──< [ ai_predictions ] ──< [ ai_feedback ]
   └──< [ ai_model_metrics ]
```

---

## 4. Database Safety, Collation & Migration Rules

1. **Character Set & Collation Consistency**: All tables and string columns use `utf8mb4` with collation `utf8mb4_unicode_ci`. Never mix with `utf8mb4_general_ci` to prevent `ER_CANT_AGGREGATE_NCOLLATIONS` during table `UNION` queries.
2. **100% Parameterized Queries**: Every database query must use prepared statements with placeholder `?` parameters via `db.promise().query(sql, params)`. String concatenation into SQL queries is strictly prohibited.
3. **Data Length Constraints**: Ensure frontend form validations enforce MySQL column limits (e.g. `blood_group` <= 10 characters, `mobile` <= 15 characters).
4. **Soft Deletion & Foreign Key Integrity**: Master records (`hospitals`, `traffic_junctions`, `parking_lots`) use soft deletion (`active = 0` or `status = 'Deactivated'`) to maintain referential integrity with historical telemetry and bookings.
5. **Idempotent Migrations**: All migration scripts check table and index existence (`IF NOT EXISTS`) to prevent data loss or duplicate constraint errors:
   ```powershell
   node backend/database/run_phase1_migration.js
   node backend/database/run_phase2_to_6_migration.js
   node backend/database/run_phase7_to_11_migration.js
   ```
