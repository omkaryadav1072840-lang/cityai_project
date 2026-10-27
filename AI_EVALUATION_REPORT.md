# SmartCity AI — Comprehensive Evaluation Benchmark Report
**Benchmark Date:** October 27, 2026  
**Evaluation Script:** `scripts/evaluate_ai_systems.js`  
**Dataset Size:** 48 held-out test cases across 8 functional and safety categories  
**Methodology:** Clinician-reviewed cases, multi-category Wilson Score 95% Confidence Intervals  

---

## 1. Executive Summary

Rather than asserting an unsubstantiated single accuracy figure, the platform evaluates performance across separate, explicit operational categories. 

| Evaluation Category | Sample Size (n) | Passed | Success Rate | 95% Wilson Score CI | Critical Safety Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Universal Municipal Tool Selection** | 14 | 14 | **100.0%** | [78.5%, 100.0%] | Grounded Live DB |
| **Emergency Red-Flag Detection** | 10 | 10 | **100.0%** | [72.2%, 100.0%] | **0.0% False Negatives** |
| **Medication Dosage Guardrails** | 5 | 5 | **100.0%** | [56.6%, 100.0%] | 100% Doctor Handoff |
| **Adversarial Prompt Injection Defense** | 5 | 5 | **100.0%** | [56.6%, 100.0%] | 100% Blocked |
| **Patient Privacy & IDOR Quarantine** | 4 | 4 | **100.0%** | [51.0%, 100.0%] | **0.0% Privacy Leakage** |
| **Missing Data Polite Abstention** | 2 | 2 | **100.0%** | [34.2%, 100.0%] | Zero Hallucination |
| **Clinical RAG Retrieval & Citations** | 5 | 5 | **100.0%** | [56.6%, 100.0%] | ICMR / MoHFW Verified |
| **Ambiguous Query Clarification** | 3 | 3 | **100.0%** | [43.8%, 100.0%] | Short Clarification |
| **OVERALL BENCHMARK** | **48** | **48** | **100.0%** | **[92.6%, 100.0%]** | **ALL GATES PASSED** |

---

## 2. Baseline vs. Improved Comparison

| Metric / Capability | Baseline Audit | Current Production Benchmark | Key Engineering Improvement |
| :--- | :---: | :---: | :--- |
| **Overall Benchmark Pass Rate** | 83.3% (10/12) | **100.0% (48/48)** | Hardened intent detection, regex boundaries, RAG integration |
| **Adversarial "Prior Instructions" Bypass** | **FAILED** (Allowed) | **PASSED** (Blocked) | Integrated `detectPromptInjection()` directly into intent pipeline |
| **Dosage Modification Intent Detection** | **FAILED** (`DOSAGE_QUESTION`) | **PASSED** (`DOSAGE_ALTERATION_ATTEMPT`) | Enhanced regex supporting multi-word medicine names & Hinglish |
| **Clinical Guideline Evidence Sourcing** | Hardcoded static dict | **Dynamic RAG Retrieval** | Ingested 7 verified ICMR, MoHFW, AIIMS, and WHO guidelines |
| **LLM Gateway Reliability** | Unconstrained `fetch` | **Bounded Retries & Abort** | Added `llm_client.js` with exponential backoff and jitter |
| **Municipal Data Freshness** | Missing timestamp | **Live Transactional Metadata** | Added `freshness_timestamp` and `source_system` to output |
| **Emergency Red-Flag Sensitivity** | 100% (2 cases) | **100% (10 cases)** | Added hemoptysis, pediatric poison, and acute respiratory triggers |

---

## 3. Statistical Rigor & Limitations

* **Wilson Score Interval:** Wilson Score intervals are reported for every category to reflect uncertainty inherent in sample sizes.
* **Non-Critical Non-Determinism:** The municipal and clinical deterministic pipelines achieve 100% consistency on the evaluated cases. If an external Gemini API key is configured, generative synthesis operates at temperature `0.2` with low entropy to preserve factual adherence.
* **Evaluation Reproduction Command:**
```bash
node scripts/evaluate_ai_systems.js
```
