# Clinical RAG Knowledge Sources & Attribution Manifest
**Registry Version:** 1.0.0  
**Governance:** SmartCity AI Clinical Review Board  
**Target Module:** Hospital Clinical Care Decision-Support Assistant  

---

## 1. Overview & Sourcing Principles

All medical guidelines in the SmartCity AI clinical decision support layer are derived from official, open-access, government and apex medical research bodies.

**Strict Governance Principles:**
1. **Tier 1 Apex Sources Only:** Prioritising Indian Council of Medical Research (ICMR), Ministry of Health & Family Welfare (MoHFW), All India Institute of Medical Sciences (AIIMS New Delhi), and World Health Organization (WHO).
2. **Attribution & Transparency:** No guideline is cited in a patient response unless it is physically ingested in the versioned corpus with an active checksum.
3. **Clinical Context Chunking:** Documents are chunked by clinical topic (Indications, Dosing Principles, Contraindications, Red Flag Warnings, Home Care) rather than arbitrary byte boundaries.
4. **Data Isolation:** Private patient medical records (`prescriptions`, `patient_records`) are **NEVER** indexed into the public guidelines corpus.

---

## 2. Ingested Guidelines Register

| Source ID | Organization | Title | Year | Category | SHA256 Fingerprint |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **ICMR-AFI-2024** | Indian Council of Medical Research (ICMR) | National Guidelines on Acute Febrile Illness and Antipyretic Safety | 2024 | Infectious & Febrile Illness | `ed8708352aa90d6e...` |
| **MOHFW-DENGUE-2024** | MoHFW / NCVBDC, Govt of India | National Clinical Management Protocol for Dengue and Platelet Monitoring | 2024 | Vector-Borne Diseases | `08d7242a712f6b96...` |
| **ICMR-IHCI-2024** | ICMR, MoHFW, WHO India | India Hypertension Control Initiative (IHCI) Standard Clinical Protocol | 2024 | Cardiovascular Medicine | `deae3574346e2c41...` |
| **ICMR-T2D-2024** | Indian Council of Medical Research (ICMR) | Guidelines for Management of Type 2 Diabetes Mellitus in India | 2024 | Metabolic Disorders | `d53d1531bb1ec8c2...` |
| **ICMR-AMR-2024** | ICMR Antimicrobial Stewardship Network | Treatment Guidelines for Antimicrobial Use in Common Syndromes | 2024 | Antibiotic Stewardship | `449b3de0602e28de...` |
| **AIIMS-PATIENT-2024** | AIIMS New Delhi | Patient Home Care & Chronic Disease Management Manual | 2024 | Patient Home Care | `0903cba9b39739fa...` |
| **WHO-MATERNAL-2023** | World Health Organization (WHO) | Model List of Essential Medicines & Pediatric Prescribing Safety Guidelines | 2023 | Maternal & Child Health | `06092c2b32278541...` |

---

## 3. Ingestion & Validation Workflow

The knowledge base can be audited or re-indexed at any time using:

```bash
node scripts/ingest_clinical_guidelines.js
```

### Ingestion Validation Gates:
1. Manifest version and schema validation.
2. SHA256 checksum computation against disk contents.
3. Required fields verification (`id`, `title`, `organization`, `year`, `category`, `chunks`, `contraindications`, `warnings`, `citation`).
4. Re-indexing into [backend/services/clinical_rag_service.js](file:///d:/cityai_project%20-%20Copy/backend/services/clinical_rag_service.js) in-memory hybrid search index.
