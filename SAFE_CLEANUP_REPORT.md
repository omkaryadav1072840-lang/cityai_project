# Safe, Evidence-Based Cleanup Audit Report

**Project**: SmartCity AI (Gorakhpur Municipal Corporation Multi-Department Platform)  
**Date**: October 27, 2026  
**Auditor**: Senior Software Engineer (AI Pair Programmer)  
**Repository Root**: `d:\cityai_project - Copy`  
**Current Git Branch**: `audit-checkpoint-20261025`  
**Execution Policy**: Read-Only Safety Baseline & Evidence-Based Audit  

---

## 1. Executive Summary & Safety Gate Status

In strict accordance with the **Safety Baseline Protocol**:
1. **Repository & Branch Confirmation**: The active repository root is `d:\cityai_project - Copy` on branch `audit-checkpoint-20261025`.
2. **Working Tree State**: The working tree is **DIRTY** with **60 modified files** and **47 untracked files** (total 107 changed items) representing ongoing work in AI healthcare microservices, clinical RAG pipelines, hospital management, authentication hardening, and UI modules.
3. **Safety Directive Enforced**:
   > *"Create a cleanup branch only after confirming a safe starting state. If the working tree is dirty, stop before destructive changes and report the issue."*
   > *"Never overwrite or discard the user's changes."*
   > *"If no candidate can be proven safe, delete nothing."*
4. **Action Taken**: **Zero destructive deletions were performed**. All user work, modified files, untracked clinical pipelines, models, and test suites have been preserved intact without loss.

---

## 2. Baseline Test & Application Health Scorecard

Prior to any analysis, complete test suites across both Node.js/Express and Python/FastAPI were executed to establish an empirical health baseline:

### 2.1 Node.js / Express Master Test Suites (`node scripts/run_all_tests.js`)
- **Total Test Suites Executed**: 25
- **Passed**: 25 / 25 (100%)
- **Failed**: 0
- **Duration**: ~14 seconds

| Status | Test Suite Name | File Location | Execution Time |
| :---: | :--- | :--- | :---: |
| ✅ PASS | Master Backend Routes Suite | `scratch/test_master_backend_routes.js` | 0.5s |
| ✅ PASS | Bug Fixes & Security Verification | `scratch/verify_bug_fixes.js` | 0.3s |
| ✅ PASS | Traffic Enhancements & Webster Optimization | `backend/test_all_traffic_enhancements.js` | 0.4s |
| ✅ PASS | Ambulance Corridors & Real Parking Integration | `backend/test_ambulance_and_parking_integration.js` | 0.2s |
| ✅ PASS | Signal Location Modification & Heatmap Assets | `backend/test_signal_location_and_heatmap.js` | 1.7s |
| ✅ PASS | Staff Auth Enforcement & Camera Congestion | `backend/test_staff_auth_and_camera_congestion.js` | 1.6s |
| ✅ PASS | Traffic API Full System Integration | `backend/test_traffic_api.js` | 0.3s |
| ✅ PASS | AI Intelligence Layer Integration | `scratch/test_ai_intelligence_integration.js` | 0.3s |
| ✅ PASS | SmartCity Phases 2 to 6 Suite | `scratch/test_phases_2_to_6.js` | 0.2s |
| ✅ PASS | SmartCity Phases 7 to 11 Suite | `scratch/test_phases_7_to_11.js` | 0.3s |
| ✅ PASS | SmartCity Phases 12 and 13 Suite | `scratch/test_phases_12_13.js` | 0.3s |
| ✅ PASS | Hospital Upgrade & Multi-Tenant Diagnostics | `scratch/test_hospital_upgrade.js` | 0.3s |
| ✅ PASS | Doctor Authentication & UI Verification | `scratch/test_doctor_login.js` | 0.1s |
| ✅ PASS | Doctor Clinical Portal & Consultation EHR | `scratch/test_doctor_portal.js` | 0.1s |
| ✅ PASS | Waste Management & Staff RBAC | `scratch/test_waste_module.js` | 0.4s |
| ✅ PASS | Citizen & Staff Auth & Profiles | `scratch/test_auth_system.js` | 0.1s |
| ✅ PASS | Production Hardening, SEO & Legal Compliance | `scratch/test_hardening_and_compliance.js` | 0.1s |
| ✅ PASS | AI Clinical Care Assistant Suite (28 Tests) | `scripts/test_clinical_care_assistant.js` | 0.4s |
| ✅ PASS | Multi-Disease Clinical Decision-Support | `scripts/test_diverse_clinical_queries.js` | 0.2s |
| ✅ PASS | Water Intelligence, 3D Explorer & Wastewater Safety Interlock | `scratch/test_water_intelligence_suite.js` | 0.3s |
| ✅ PASS | Sewage Network Planner & 3D Route Designer Suite | `scratch/test_sewage_planner_backend.js` | 0.2s |
| ✅ PASS | Water & Sewage Command Center Integration Suite | `scratch/test_water_command_center.js` | 0.5s |
| ✅ PASS | Water Management Upgrade & Multi-View Verification | `scratch/verify_water_management_upgrade.js` | 0.5s |
| ✅ PASS | Water 3D Digital Twin, Licensed glTF & 3-Layer Role Suite | `scratch/test_water_3d_digital_twin.js` | 0.4s |
| ✅ PASS | Traffic Role Jurisdiction, Camera AI & Admin GIS Suite | `backend/test_traffic_jurisdiction_and_ai.js` | 0.4s |

### 2.2 Python / FastAPI Health & AI Tests (`python -m pytest ai_service/tests`)
- **Total Test Cases**: 13
- **Passed**: 13 / 13 (100%)
- **Failed**: 0
- **Duration**: 3.32s

---

## 3. File Usage & Cryptographic Deduplication Audit

A SHA-256 hash scan across all 884 non-ignored project files identified 11 duplicate groups:

### 3.1 Duplicate Analysis & Classifications

| Hash (Prefix) | Files Involved | Classification | Audit Evidence & Decision |
| :--- | :--- | :---: | :--- |
| `e06cab96` | • `SMARTCITY_AI_PROJECT_SYNOPSIS.docx`<br>• `docs/SMARTCITY_AI_PROJECT_SYNOPSIS.docx` | **REVIEW** | Identical 2.5 MB Word document in root vs `docs/`. Root copy can eventually be safely removed once confirmed by user, retaining canonical copy in `docs/`. Left untouched per dirty-tree freeze. |
| `6beb83fd` | • `frontend/apple-touch-icon.png`<br>• `frontend/favicon.ico`<br>• `frontend/favicon.png`<br>• `frontend/ChatGPT_Image_Aug_11__2026__11_27_44_PM-removebg-preview.png` | **KEEP** | **Critical Asset**: While identical bytes, `ChatGPT_Image...` is explicitly referenced in 20+ HTML templates, `auth.js`, `manifest.json`, and service workers as the main branding logo. `favicon.ico` and `apple-touch-icon.png` satisfy standard browser PWA discovery. Removal of any would cause 404 image errors. |
| `3b1ad59d` | • `backend/test_logo.png`<br>• `backend/uploads/hospital_logos/logo-hosp-001-1792917532096.png` | **REVIEW** | `test_logo.png` is an untracked scratch upload artifact (69 bytes). Left untouched during freeze. |
| `6b7fa434`<br>`6d0ed1c5`<br>`75a5127d`<br>`fc4681ad` | Multiple files in `backend/uploads/hospital_logos/` and `backend/uploads/prescriptions/` | **KEEP** | Runtime uploaded assets referenced by database tables (`hospitals.logo_url`, `prescriptions.prescription_url`). User-uploaded files must never be pruned without a DB tombstone check. |
| `c83240ea`<br>`0e7aaba2`<br>`7d9de7a1`<br>`24f1aeb7` | Multiple files in `backend/uploads/patients/` and `backend/uploads/reports/` | **KEEP** | Database-referenced media assets for patient profiles, medical diagnostic scans, and clinical test reports. |

---

## 4. Critical Dependencies in Non-Standard Folders (Do NOT Delete)

An audit of the repository identified critical runtime and test dependencies residing in directories commonly mistaken for scratch pads:

1. **`scratch/` Directory**:
   - Contains 396 files, but **17 active test suites** are directly executed by `scripts/run_all_tests.js`.
   - Root `package.json` line 11: `"test": "node scratch/test_master_backend_routes.js"`.
   - Any naive bulk deletion of `scratch/` would immediately break `npm test` and the CI/master test pipeline.
2. **AI & Clinical Care Knowledge Assets (`backend/knowledge/clinical_guidelines/`)**:
   - Contains 7 ICMR, AIIMS, and MoHFW clinical guideline JSON documents loaded dynamically by `backend/services/clinical_rag_service.js` for patient safety and drug interaction checks.
3. **AI Model Artifacts (`ai_service/artifacts/models/`)**:
   - Contains `clinical_intent_classifier.joblib` and metadata required for local intent triage in FastAPI.

---

## 5. Candidate Classification Matrix

| File / Directory | Size | Classification | Evidence & Rationale |
| :--- | :--- | :---: | :--- |
| `server.log`, `server.err.log` | ~1 KB | **SAFE-TO-REMOVE** (via .gitignore) | Temporary local process runtime logs. Already matched by `.gitignore` (`*.log`). Not tracked in git. |
| `SMARTCITY_AI_PROJECT_SYNOPSIS.docx` (root) | 2.5 MB | **SAFE-TO-REMOVE** (Pending User Approval) | Exact duplicate of `docs/SMARTCITY_AI_PROJECT_SYNOPSIS.docx`. Root copy is redundant. |
| `backend/test_logo.png`, `test_logo2.png` | 69 B | **REVIEW** | Untracked test files from upload verification tests. Safe to clean once committed/approved. |
| `backend/check_password.js` | 335 B | **REVIEW** | Untracked one-off debug script. Safe to archive or remove once confirmed by user. |
| `backend/test_hospital_admin.js` | 540 B | **REVIEW** | Untracked diagnostic helper script. |
| Protected Hospital Pages & APIs | - | **KEEP (PROTECTED)** | Explicit protection rule; zero modifications or moves. |
| AI models, datasets & RAG files | - | **KEEP (PROTECTED)** | Active clinical AI pipeline artifacts. |

---

## 6. Recommended Next Steps for Safe Execution

To proceed with safe deletion once you approve:
1. **Commit Current Working Tree**:
   ```bash
   git add -A
   git commit -m "checkpoint: preserve active clinical AI, RAG, and UI updates prior to cleanup"
   ```
2. **Create Dedicated Cleanup Branch**:
   ```bash
   git checkout -b chore/safe-evidence-cleanup
   ```
3. **Execute Pruning of Verified Safe Candidates**:
   - Remove root duplicate `SMARTCITY_AI_PROJECT_SYNOPSIS.docx` (retaining `docs/` copy).
   - Clean ephemeral `.log` files.
   - Archive untracked scratch test files (`backend/test_logo*.png`, `backend/check_password.js`).
4. **Re-run Automated Verification**:
   ```bash
   npm run test:all
   npm run test:py
   ```
5. **Merge or Rollback cleanly**:
   ```bash
   git checkout audit-checkpoint-20261025
   ```
