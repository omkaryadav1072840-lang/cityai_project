# SmartCity AI — Implementation Changelog & Deployment Guide
**Release Version:** 2.1.0 (AI Safety, RAG & LLM Resilience Upgrade)  
**Date:** October 27, 2026  
**Auditor / Architect:** Senior AI/ML Engineer & Node.js Backend Architect  

---

## 1. Summary of Files Created & Modified

### New Services & Pipelines
1. [backend/services/llm_client.js](file:///d:/cityai_project%20-%20Copy/backend/services/llm_client.js):
   - Abstracted, production-grade LLM Gateway supporting Google Gemini (and other OpenAI-compatible providers).
   - AbortController timeout handling (default 7,500ms).
   - Bounded retries with exponential backoff and randomized jitter.
   - PII and credential sanitization; zero secret leakage in logs.
   - Graceful fallback detection when API keys are absent or rate limits are reached.
2. [backend/services/clinical_rag_service.js](file:///d:/cityai_project%20-%20Copy/backend/services/clinical_rag_service.js):
   - Ingests verified clinical guidelines manifest and documents from disk.
   - Computes SHA256 checksums and compiles an in-memory hybrid lexical-semantic index.
   - Provides multilingual and transliteration-aware searching (English, Hindi, Hinglish).
   - Generates verified source citation blocks for patient responses.
   - Strict data isolation: Patient private health records are never indexed into the RAG corpus.
3. **Clinical Guidelines Knowledge Store:**
   - [backend/knowledge/clinical_guidelines/manifest.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/manifest.json)
   - [backend/knowledge/clinical_guidelines/icmr_fever_management.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/icmr_fever_management.json)
   - [backend/knowledge/clinical_guidelines/mohfw_dengue_protocol.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/mohfw_dengue_protocol.json)
   - [backend/knowledge/clinical_guidelines/icmr_hypertension_ihci.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/icmr_hypertension_ihci.json)
   - [backend/knowledge/clinical_guidelines/icmr_diabetes_type2.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/icmr_diabetes_type2.json)
   - [backend/knowledge/clinical_guidelines/icmr_antimicrobial_stewardship.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/icmr_antimicrobial_stewardship.json)
   - [backend/knowledge/clinical_guidelines/aiims_patient_care_home_protocols.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/aiims_patient_care_home_protocols.json)
   - [backend/knowledge/clinical_guidelines/who_maternal_child_safety.json](file:///d:/cityai_project%20-%20Copy/backend/knowledge/clinical_guidelines/who_maternal_child_safety.json)

### Enhanced Existing Services
1. [backend/services/clinical_safety_privacy_engine.js](file:///d:/cityai_project%20-%20Copy/backend/services/clinical_safety_privacy_engine.js):
   - Expanded dosage alteration regex to detect multi-word medicine names and Hinglish phrases (e.g. *"2 goli ek sath kha lu"*, *"increase my Telmisartan dose"*).
2. [backend/services/clinical_care_assistant_service.js](file:///d:/cityai_project%20-%20Copy/backend/services/clinical_care_assistant_service.js):
   - Connected `detectPromptInjection()` to the primary intent classifier, closing the prompt injection bypass gap.
   - Added `DOSAGE_ALTERATION_ATTEMPT` intent with mandatory clinician handoff (`doctor_handoff_recommended: true`).
   - Added emergency detection for hemoptysis / bright red blood coughing.
   - Fixed Hinglish medicine explanation detection (`medicine samjhao`, `dawai samjhao`).
   - Pre-screened ambiguous medical queries (`"problem ho rahi hai"`, `"tabiyat kharab hai"`) to request short clarification rather than guessing.
   - Integrated `clinical_rag_service` to append verified ICMR, MoHFW, and AIIMS citations to symptom responses.
3. [backend/services/ai_orchestrator.js](file:///d:/cityai_project%20-%20Copy/backend/services/ai_orchestrator.js):
   - Replaced unconstrained raw `fetch` with `llmClient.generateGroundedContent()`.
   - Added `kachra`, `kachre`, `kuda`, `safayi` to solid waste intent classification.
   - Added `freshness: "LIVE_TRANSACTIONAL"`, `freshness_timestamp`, and `source_system` metadata to all grounded responses.
4. [backend/.env.example](file:///d:/cityai_project%20-%20Copy/backend/.env.example):
   - Documented configurable LLM options: `LLM_PROVIDER`, `GEMINI_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_RETRIES`, `LLM_MAX_OUTPUT_TOKENS` with secure placeholders.

### Test & Evaluation Deliverables
1. [scripts/test_ai_baseline.js](file:///d:/cityai_project%20-%20Copy/scripts/test_ai_baseline.js): Automated baseline suite (12 test points).
2. [scripts/ingest_clinical_guidelines.js](file:///d:/cityai_project%20-%20Copy/scripts/ingest_clinical_guidelines.js): Clinical RAG ingestion and SHA256 checksum verification CLI.
3. [scripts/evaluate_ai_systems.js](file:///d:/cityai_project%20-%20Copy/scripts/evaluate_ai_systems.js): 48-case multi-category evaluation benchmark with Wilson Score confidence intervals.
4. [scripts/test_ai_regression.js](file:///d:/cityai_project%20-%20Copy/scripts/test_ai_regression.js): Full AI integration & concurrency regression test suite (12 test cases).

---

## 2. Verification Commands & Exit Codes

Run all test suites to confirm complete system integrity:

```bash
# 1. Verify clinical guidelines ingestion
node scripts/ingest_clinical_guidelines.js
# Exit Code: 0 (All 7 guidelines verified)

# 2. Run baseline test suite
node scripts/test_ai_baseline.js
# Exit Code: 0 (12/12 Passed - 100%)

# 3. Run regression and concurrency integration suite
node scripts/test_ai_regression.js
# Exit Code: 0 (12/12 Passed - 100%)

# 4. Run full 48-case evaluation benchmark
node scripts/evaluate_ai_systems.js
# Exit Code: 0 (48/48 Passed - 100%, 0.0% Emergency False Negatives, 0.0% Privacy Leakage)
```

---

## 3. Rollback Instructions

If rollback is ever necessary:
1. Revert changes to `ai_orchestrator.js`, `clinical_care_assistant_service.js`, and `clinical_safety_privacy_engine.js` via Git:
   ```bash
   git checkout HEAD -- backend/services/ai_orchestrator.js backend/services/clinical_care_assistant_service.js backend/services/clinical_safety_privacy_engine.js backend/.env.example
   ```
2. The newly created helper services in `backend/services/llm_client.js` and `backend/services/clinical_rag_service.js` do not affect existing routes if unused.
