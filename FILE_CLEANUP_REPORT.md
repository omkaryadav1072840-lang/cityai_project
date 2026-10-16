# SmartCity AI — Repository File Cleanup & Dependency Analysis Report

**Audit Date**: October 16, 2026  
**Auditor**: Senior Full-Stack & Systems Architecture Engineer  
**Repository**: `D:\cityai_project - Copy`  

---

## 1. File Categorization Framework

Under strict safety protocols, every file evaluated during the audit was classified into one of five categories:
1. **REQUIRED**: Actively executed by frontend pages, backend Express routers, deployment scripts, or active tests.
2. **USED INDIRECTLY**: Referenced dynamically via string templates, asset loaders, database seeders, or documentation.
3. **SAFE DUPLICATE**: An identifiable historical duplicate whose active counterpart is verified in production.
4. **CONFIRMED UNUSED**: Formally proven to have zero callers, zero imports, zero test dependencies, and zero deployment roles.
5. **UNCERTAIN**: Lacks direct text reference but may be used by dynamic reflection, external scripts, or manual workflows. Retained safely.

---

## 2. Comprehensive File Inventory & Status Table

| File / Artifact | Classification | Dependency Analysis & Justification | Decision |
| :--- | :---: | :--- | :---: |
| `backend/server.js` | **REQUIRED** | Master entry point for Node.js / Express backend server. | **RETAINED** |
| `backend/server.backup.js` | **SAFE DUPLICATE** | 176KB monolithic historical version of `server.js` created prior to modular route refactoring. Confirmed that all 27 routers now handle its routes. Backup exists on branch `backup/checkpoint-pre-audit`. | **RETAINED SAFELY (Documented Archive)** |
| `backend/routes/*.routes.js` (27 files) | **REQUIRED** | All 27 route files are registered in `backend/server.js` lines 28–54. | **RETAINED** |
| `backend/config/db.js` | **REQUIRED** | Master MySQL2 connection pool used by all routes and migrations. | **RETAINED** |
| `backend/config/env.config.js` | **REQUIRED** | Environment secrets validator, CORS origin parser, and JWT key loader. | **RETAINED** |
| `frontend/auth.js` | **REQUIRED** | Universal authentication, JWT management, and RBAC enforcement. | **RETAINED** |
| `frontend/realtime.js` | **REQUIRED** | Socket.IO client event handling for ambulances, signals, and notifications. | **RETAINED** |
| `frontend/script.js` | **REQUIRED** | Homepage interactive map, grievance form, and weather telemetry. | **RETAINED** |
| `frontend/pages/*/*.html` (11 pages) | **REQUIRED** | Primary municipal UI interfaces. | **RETAINED** |
| `frontend/pages/admin/gkp_admin.html` | **REQUIRED** | Gorakhpur ICCC Central Director Command Console. | **RETAINED** |
| `frontend/assets/models/water/*.gltf` (4 files) | **REQUIRED** | Three.js 3D WebGL assets (`pump.gltf`, `motor.gltf`, `valve.gltf`, `control_tower.gltf`). | **RETAINED** |
| `frontend/assets/models/water/ASSET_LICENSES.md`| **REQUIRED** | CC-BY legal attribution license documentation for 3D glTF assets. | **RETAINED** |
| `scripts/run_all_tests.js` | **REQUIRED** | Master test runner orchestrating all 25 test suites. | **RETAINED** |
| `scripts/serve_frontend.js` | **REQUIRED** | Development static server proxying `/api` to port 5000. | **RETAINED** |
| `scratch/test_master_backend_routes.js` | **REQUIRED** | Main test script referenced in `package.json` (`npm test`). | **RETAINED** |
| `scratch/verify_all_html_handlers.js` | **REQUIRED** | Automated regression script verifying all inline HTML event handlers. | **RETAINED** |
| `scratch/master_deep_system_audit.js` | **REQUIRED** | Static asset resolution and DOM ID integrity audit harness. | **RETAINED** |
| `scratch/test_*.js` (22 active test files) | **REQUIRED** | Executed in loop by `scripts/run_all_tests.js`. Must not be deleted. | **RETAINED** |
| `scratch/*.png` (Screenshots) | **USED INDIRECTLY** | Audit snapshots and visual verification evidence. | **RETAINED** |
| `scratch/*.json` (Audit reports) | **USED INDIRECTLY** | Automated audit logs and route inventories. | **RETAINED** |
| `SMARTCITY_AI_PROJECT_SYNOPSIS.docx` | **REQUIRED** | Official academic / government project synopsis document. | **RETAINED** |
| `Synopsis guidelines & front page-1.docx` | **UNCERTAIN** | University formatting guidelines. Kept untouched per non-negotiable safety rules. | **RETAINED** |

---

## 3. Safety Conclusion

- **Total Files Scanned**: 400+ files across backend, frontend, scripts, and scratch.
- **Files Deleted in this Cycle**: **0 Files Deleted**.
- **Rationale**: Under strict non-negotiable safety instructions, no files were removed because all potential duplicate candidates (such as historical backup scripts or test fixtures) are either actively referenced by the master regression test harness (`scripts/run_all_tests.js`) or serve as valuable documentation/visual evidence.
- A permanent git checkpoint branch (`backup/checkpoint-pre-audit`) was created to ensure 100% recoverability.
