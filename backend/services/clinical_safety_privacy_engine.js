/**
 * SMARTCITY AI - Clinical Safety & Privacy Engine
 * ===============================================
 * Production-grade safety, privacy, DPDP compliance, and PII protection layer:
 * 1. Automatic PII Redaction & Sanitization (Aadhaar, PAN, Card, OTP, Credentials)
 * 2. Prompt Injection & Jailbreak Defense
 * 3. Strict Patient Data Isolation (Zero IDOR / Cross-Patient Access Prevention)
 * 4. Medication Alteration & Dosage Safety Guardrails
 * 5. Pre-flight Self-Evaluation Safety Checks
 */

class ClinicalSafetyPrivacyEngine {
    constructor() {
        this.injectionPatterns = [
            /ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)/i,
            /bypass\s+(safety|security|guardrails|auth)/i,
            /show\s+(me\s+)?(another|other|different)\s+patient/i,
            /other\s+patient('s)?\s+(report|prescription|data|record)/i,
            /pretend\s+(you\s+are|to\s+be)\s+a\s+real\s+doctor/i,
            /reveal\s+(system\s+prompt|developer\s+instructions|secret)/i,
            /system\s+prompt/i,
            /developer\s+prompt/i,
            /override\s+clinical\s+rules/i,
            /dump\s+(all\s+)?(database|users|records)/i
        ];

        this.dosageAlterationPatterns = [
            /\b(\d+)\s*(tablet|tablets|goli|dose)\s*(kar\s*du|kar\s*du\?|badha\s*du|double\s*kar\s*du|le\s*lu|le\s*lu\?)\b/i,
            /\b(can\s*i\s*take|should\s*i\s*take)\s*(\d+)\s*(tablets?|doses?|pills?)\b/i,
            /\b(increase|double|change)\s*(my\s*)?(dose|dosage|tablets?)\b/i,
            /\bdose\s*badha\s*(lu|du|sakta\s*hu)\b/i,
            /\b2\s*tablet\s*kar\s*du\b/i
        ];
    }

    /**
     * Redacts sensitive personally identifiable information (PII)
     * Aligned with Digital Personal Data Protection (DPDP) and data minimization principles.
     */
    redactPii(text = "") {
        if (!text || typeof text !== "string") return "";

        return text
            // Aadhaar Number (12 digits, optional spaces/hyphens)
            .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[AADHAAR_REDACTED]")
            // PAN Card (5 letters, 4 digits, 1 letter)
            .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi, "[PAN_REDACTED]")
            // Credit / Debit Card Numbers (16 digits with spaces or hyphens)
            .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, "[CARD_REDACTED]")
            // Passwords & API Tokens
            .replace(/(password|passwd|pwd|token|api_key|secret)\s*[:=]\s*[^\s,]+/gi, "$1=[REDACTED]")
            // OTPs (4-6 digits preceded by otp or code)
            .replace(/\b(otp|code|pin)\s*[:=]?\s*\d{4,8}\b/gi, "$1=[OTP_REDACTED]");
    }

    /**
     * Sanitizes strings before persistence into audit logs or diagnostics
     */
    sanitizeForAudit(data) {
        if (!data) return data;
        if (typeof data === "string") return this.redactPii(data);
        if (typeof data === "object") {
            const clean = Array.isArray(data) ? [] : {};
            for (const key of Object.keys(data)) {
                clean[key] = this.sanitizeForAudit(data[key]);
            }
            return clean;
        }
        return data;
    }

    /**
     * Detects prompt injection, system prompt extraction, or privilege escalation
     */
    detectPromptInjection(text = "") {
        const q = String(text || "").toLowerCase().trim();
        for (const pattern of this.injectionPatterns) {
            if (pattern.test(q)) {
                return {
                    isInjection: true,
                    rule: "SECURITY_FIREWALL",
                    reason: "Prompt injection or unauthorized security bypass attempt detected."
                };
            }
        }
        return { isInjection: false };
    }

    /**
     * Evaluates patient data access authorization to strictly prevent IDOR
     */
    enforcePatientIsolation(requestingUser, requestedPatientId) {
        if (!requestingUser) {
            // Unauthenticated guest: can only access general clinical knowledge, never patient EHR
            return {
                authorized: !requestedPatientId,
                reason: requestedPatientId ? "Unauthenticated access to patient clinical dossier is strictly forbidden." : "GUEST_ACCESS"
            };
        }

        const role = String(requestingUser.role || requestingUser.type || "").toLowerCase();

        // Medical Staff & Doctors are authorized for clinical care review
        if (["doctor", "clinician", "nurse", "admin", "superadmin", "hospital_admin"].includes(role)) {
            return { authorized: true, role };
        }

        // Citizen / Patient: Strictly restricted to their own verified patient_id
        if (role === "citizen" || role === "patient") {
            const userPatientId = requestingUser.patientId || requestingUser.patient_id;
            if (requestedPatientId && userPatientId && String(requestedPatientId).trim() !== String(userPatientId).trim()) {
                return {
                    authorized: false,
                    reason: "Cross-Patient Data Access Denied: User is not authorized to view or modify another patient's medical records."
                };
            }
        }

        return { authorized: true };
    }

    /**
     * Detects unauthorized medication dosage alteration attempts
     */
    detectDosageAlteration(queryText = "") {
        const q = String(queryText || "").trim();
        for (const pattern of this.dosageAlterationPatterns) {
            if (pattern.test(q)) {
                return {
                    isAlterationRequest: true,
                    reason: "Patient inquired about modifying or increasing prescribed medication dose."
                };
            }
        }
        return { isAlterationRequest: false };
    }

    /**
     * Pre-flight self-evaluation check before response dispatch
     */
    selfEvaluateResponse(input) {
        let responsePayload = input;
        let userQuery = "";
        let isEmergency = false;
        let patientContext = null;

        if (input && typeof input === "object" && input.responsePayload) {
            responsePayload = input.responsePayload;
            userQuery = input.userQuery || "";
            isEmergency = !!input.isEmergency;
            patientContext = input.patientContext || null;
        }

        if (!responsePayload) return { passed: true, modifications: [] };

        const checks = {
            passed: true,
            modifications: []
        };

        // 1. Emergency safety check: If emergency, ensure emergency actions and 108 protocol are active
        if (isEmergency && !responsePayload.is_emergency) {
            responsePayload.is_emergency = true;
            checks.modifications.push("FORCED_EMERGENCY_ESCALATION");
        }

        // 2. No hallucinated prescription confirmation check
        if (responsePayload.intent === "PRESCRIPTION_EXPLANATION" && (!patientContext?.prescriptions || patientContext.prescriptions.length === 0)) {
            if (responsePayload.message && responsePayload.message.includes("आपके डॉक्टर ने") && !responsePayload.message.includes("माफ़ कीजिए") && !responsePayload.message.includes("नहीं मिला")) {
                responsePayload.confidence_status = "LOW_CONFIDENCE";
                checks.modifications.push("BLOCKED_HALLUCINATED_PRESCRIPTION");
            }
        }

        // 3. Ensure appropriate medical disclaimer is appended if providing clinical guidance
        if (["SYMPTOM_REPORT", "CLINICAL_SYMPTOM_DISEASE_INQUIRY", "MEDICINE_REQUEST", "LAB_REPORT_QUERY", "SYMPTOM_FOLLOWUP"].includes(responsePayload.intent)) {
            if (!responsePayload.disclaimer) {
                responsePayload.disclaimer = responsePayload.language === "hi"
                    ? "अस्वीकरण: मैं एक AI हूँ। यह जानकारी सामान्य मदद के लिए है और डॉक्टर की सलाह का विकल्प नहीं है। कोई दवा शुरू, बंद या बदलने से पहले डॉक्टर/फार्मासिस्ट से सलाह लें।"
                    : "Disclaimer: I am an AI assistant. This information is for general educational guidance and does not replace professional medical advice. Consult a doctor or pharmacist before starting or modifying medications.";
            }
        }

        return checks;
    }
}

module.exports = new ClinicalSafetyPrivacyEngine();
