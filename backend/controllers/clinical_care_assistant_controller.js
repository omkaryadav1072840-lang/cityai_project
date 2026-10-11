/**
 * SMARTCITY AI - CLINICAL CARE ASSISTANT CONTROLLER
 * =================================================
 * HTTP Request Handler for AI Clinical Care Assistant:
 * - Patient authorization & RBAC checks
 * - Multi-turn clinical reasoning chat
 * - Prescription explanation & medication adherence
 * - Doctor clinical dossier & hospital admin statistics
 */

const clinicalCareService = require("../services/clinical_care_assistant_service");

class ClinicalCareAssistantController {
    /**
     * POST /api/ai/clinical-care/chat
     * Primary conversation endpoint for patient health queries
     */
    static async chat(req, res) {
        try {
            const { message, language = "en", patientId, sessionId, history } = req.body;

            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid question or symptom description."
                });
            }

            // Determine authorized patient identifier
            let targetPatientId = patientId;

            // If user is authenticated as citizen/patient, verify patient ownership
            if (req.user) {
                const userRole = (req.user.role || req.user.type || "").toLowerCase();
                if (userRole === "citizen" || userRole === "patient") {
                    if (patientId && req.user.patientId && String(patientId).trim() !== String(req.user.patientId).trim()) {
                        return res.status(403).json({
                            success: false,
                            intent: "UNAUTHORIZED_ACCESS",
                            classification_tag: "Security Alert",
                            safety_badge: "Cross-Patient Access Blocked",
                            message: "You're not authorized to access this patient information.",
                            why_this_answer: "Strict Patient Data Isolation protocol enforced. Cross-patient data access is strictly forbidden.",
                            sources_used: ["Hospital Security & RBAC Isolation Firewall"]
                        });
                    }
                    targetPatientId = req.user.patientId || targetPatientId;
                }
            }

            // Load verified hospital and patient context
            const patientContext = await clinicalCareService.getPatientContext({
                patientId: targetPatientId,
                userId: req.user ? (req.user.id || req.user.userId) : null,
                mobile: req.user ? req.user.mobile : null,
                requestingUser: req.user
            });

            // Strict Data Isolation Firewall: Block unauthorized cross-patient access
            if (patientContext && patientContext.forbidden) {
                return res.status(403).json({
                    success: false,
                    intent: "UNAUTHORIZED_ACCESS",
                    classification_tag: "Security Alert",
                    safety_badge: "Cross-Patient Access Blocked",
                    message: "You're not authorized to access this patient information.",
                    why_this_answer: "Strict Patient Data Isolation protocol enforced. Cross-patient data access is strictly forbidden.",
                    sources_used: ["Hospital Security & RBAC Isolation Firewall"]
                });
            }

            // Generate grounded clinical decision support response
            const clinicalResult = await clinicalCareService.generateClinicalResponse({
                message: message.trim(),
                patientContext,
                language,
                sessionContext: { history, sessionId }
            });

            // Asynchronously log audit trail in database
            clinicalCareService.logClinicalAction({
                patientId: patientContext?.patient?.patient_id || targetPatientId || "GUEST",
                userId: req.user ? (req.user.id || req.user.userId) : null,
                userRole: req.user ? (req.user.role || req.user.type || "citizen") : "patient",
                sessionId: sessionId || "WEB-SESSION-" + Date.now(),
                intent: clinicalResult.intent,
                patientMessage: message.trim(),
                aiSummary: clinicalResult.message.slice(0, 300),
                actionTaken: clinicalResult.is_emergency 
                    ? "EMERGENCY_ESCALATION" 
                    : (clinicalResult.doctor_handoff_recommended ? "DOCTOR_HANDOFF_SUGGESTED" : "CLINICAL_GUIDANCE_PROVIDED"),
                dataSourcesUsed: "MySQL: patients, prescriptions, patient_records, appointments",
                emergencyFlag: clinicalResult.is_emergency,
                doctorHandoffFlag: clinicalResult.doctor_handoff_recommended,
                doctorId: patientContext?.prescriptions?.[0]?.doctor_id || null
            }).catch(e => console.warn("[AuditLog] Non-blocking warning:", e.message));

            return res.json({
                success: true,
                ...clinicalResult,
                patient: (patientContext && patientContext.patient) ? {
                    patient_id: patientContext.patient.patient_id,
                    name: patientContext.patient.name,
                    age: patientContext.patient.age,
                    allergies: patientContext.patient.allergies,
                    hospital: patientContext.patient.hospital
                } : null,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error("ClinicalCareAssistantController.chat error:", err);
            return res.status(500).json({
                success: false,
                message: "An internal error occurred while processing clinical assistance. Please consult hospital reception.",
                error: err.message
            });
        }
    }

    /**
     * GET /api/ai/clinical-care/patient-context
     * Retrieves active patient context for the dashboard display
     */
    static async getPatientContext(req, res) {
        try {
            const requestedId = req.query.patientId || req.query.patient_id;
            let targetPatientId = (req.user && req.user.patientId) ? req.user.patientId : requestedId;

            if (req.user) {
                const userRole = (req.user.role || req.user.type || "").toLowerCase();
                if (userRole === "citizen" || userRole === "patient") {
                    if (requestedId && req.user.patientId && String(requestedId).trim() !== String(req.user.patientId).trim()) {
                        return res.status(403).json({
                            success: false,
                            message: "You're not authorized to access this patient information."
                        });
                    }
                }
            }

            const context = await clinicalCareService.getPatientContext({
                patientId: targetPatientId,
                userId: req.user ? (req.user.id || req.user.userId) : null,
                mobile: req.user ? req.user.mobile : null,
                requestingUser: req.user
            });

            if (context && context.forbidden) {
                return res.status(403).json({
                    success: false,
                    message: "You're not authorized to access this patient information."
                });
            }

            if (!context) {
                return res.status(404).json({
                    success: false,
                    message: "No patient records located. Please log in or verify Patient UHID."
                });
            }

            return res.json({
                success: true,
                ...context
            });
        } catch (err) {
            console.error("ClinicalCareAssistantController.getPatientContext error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to load patient clinical dossier."
            });
        }
    }

    /**
     * GET /api/ai/clinical-care/medication-schedule
     * Returns today's medication schedule and adherence status
     */
    static async getMedicationSchedule(req, res) {
        try {
            const patientId = req.query.patientId || req.query.patient_id || (req.user && req.user.patientId) || "SC-2026-318028";
            const date = req.query.date || null;

            const schedule = await clinicalCareService.getMedicationSchedule(patientId, date);
            return res.json(schedule);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getMedicationSchedule error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to load medication schedule."
            });
        }
    }

    /**
     * POST /api/ai/clinical-care/mark-medication
     * Marks a medication as 'Taken' or updates adherence note
     */
    static async markMedication(req, res) {
        try {
            const { adherenceId, patientId, status = "Taken", notes = "" } = req.body;

            if (!adherenceId) {
                return res.status(400).json({
                    success: false,
                    message: "Adherence entry ID is required."
                });
            }

            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.markMedicationTaken({
                adherenceId,
                patientId: targetPatientId,
                status,
                notes
            });

            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.markMedication error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to update medication adherence record."
            });
        }
    }

    /**
     * GET /api/ai/clinical-care/doctor-dossier
     * Doctor review queue for red-flag triggers & patient inquiries
     */
    static async getDoctorDossier(req, res) {
        try {
            const doctorId = req.query.doctorId || (req.user && req.user.doctorId) || null;
            const hospitalId = req.query.hospitalId || (req.user && req.user.hospital_id) || null;
            const limit = req.query.limit || 20;

            const dossier = await clinicalCareService.getDoctorClinicalDossier({
                doctorId,
                hospitalId,
                limit
            });

            return res.json(dossier);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getDoctorDossier error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to load doctor clinical dossier."
            });
        }
    }

    /**
     * POST /api/ai/clinical-care/doctor-action
     * Submits doctor acknowledgment / clinical review note
     */
    static async doctorAction(req, res) {
        try {
            const { auditLogId, action = "REVIEWED", doctorNotes } = req.body;

            if (!auditLogId) {
                return res.status(400).json({
                    success: false,
                    message: "Audit log ID is required."
                });
            }

            const docName = (req.user && req.user.name) ? req.user.name : "Attending Doctor";
            const result = await clinicalCareService.updateDoctorReview({
                auditLogId,
                doctorName: docName,
                action,
                doctorNotes
            });

            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.doctorAction error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to record doctor review action."
            });
        }
    }

    /**
     * GET /api/ai/clinical-care/admin-stats
     * Aggregated statistics for hospital administrators
     */
    static async getAdminStats(req, res) {
        try {
            const hospitalId = req.query.hospitalId || (req.user && req.user.hospital_id) || null;
            const stats = await clinicalCareService.getHospitalAdminStats({ hospitalId });
            return res.json(stats);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getAdminStats error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to retrieve aggregated hospital AI statistics."
            });
        }
    }

    /**
     * POST /api/ai/clinical-care/track-health
     * Logs patient symptom, severity, and diet consumption into tracker
     */
    static async trackHealth(req, res) {
        try {
            const {
                patientId,
                symptomName,
                severity = "Moderate",
                dietConsumed,
                foodsAvoided,
                homeCareActions,
                notes
            } = req.body;

            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.trackHealthLog({
                patientId: targetPatientId,
                symptomName: symptomName || "General Symptom Log",
                severity,
                dietConsumed,
                foodsAvoided,
                homeCareActions,
                notes
            });

            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.trackHealth error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to record health tracking log."
            });
        }
    }

    /**
     * GET /api/ai/clinical-care/tracked-health
     * Retrieves recent patient symptom & diet tracking history
     */
    static async getTrackedHealth(req, res) {
        try {
            const patientId = req.query.patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const limit = req.query.limit || 10;
            const history = await clinicalCareService.getTrackedHealthLogs(patientId, limit);
            return res.json(history);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getTrackedHealth error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to load tracked health history."
            });
        }
    }

    /**
     * GET /api/ai/clinical-care/memories
     * Retrieves patient-approved memories
     */
    static async getMemories(req, res) {
        try {
            const patientId = req.query.patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.getSavedMemories(patientId);
            return res.json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getMemories error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * POST /api/ai/clinical-care/save-memory
     * Stores consented patient note
     */
    static async saveMemory(req, res) {
        try {
            const { content, category = "health_note", patientId } = req.body;
            if (!content || !content.trim()) {
                return res.status(400).json({ success: false, message: "Memory content is required." });
            }
            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const userId = req.user ? (req.user.id || req.user.userId) : 1;
            const result = await clinicalCareService.savePatientMemory({
                patientId: targetPatientId,
                userId,
                content: content.trim(),
                category,
                consent: 1
            });
            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.saveMemory error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * POST /api/ai/clinical-care/delete-memory
     * Soft-deletes a patient memory
     */
    static async deleteMemory(req, res) {
        try {
            const { memoryId, patientId } = req.body;
            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.deletePatientMemory({
                memoryId,
                patientId: targetPatientId
            });
            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.deleteMemory error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * GET /api/ai/clinical-care/reminders
     * Retrieves active patient reminders
     */
    static async getReminders(req, res) {
        try {
            const patientId = req.query.patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.getReminders(patientId);
            return res.json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getReminders error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * POST /api/ai/clinical-care/reminders
     * Creates a scheduled reminder
     */
    static async createReminder(req, res) {
        try {
            const { reminderType = "MEDICINE", title, scheduledTime, frequency = "DAILY", notes = null, patientId } = req.body;
            if (!title) {
                return res.status(400).json({ success: false, message: "Reminder title is required." });
            }
            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const userId = req.user ? (req.user.id || req.user.userId) : 1;
            const result = await clinicalCareService.createReminder({
                patientId: targetPatientId,
                userId,
                reminderType,
                title,
                scheduledTime,
                frequency,
                notes
            });
            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.createReminder error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * POST /api/ai/clinical-care/delete-reminder
     * Cancels a scheduled reminder
     */
    static async deleteReminder(req, res) {
        try {
            const { reminderId, patientId } = req.body;
            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.deleteReminder({
                reminderId,
                patientId: targetPatientId
            });
            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.deleteReminder error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * GET /api/ai/clinical-care/health-summary
     * Personal health summary for the patient
     */
    static async getHealthSummary(req, res) {
        try {
            const patientId = req.query.patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const result = await clinicalCareService.getHealthSummary(patientId);
            return res.json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.getHealthSummary error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * POST /api/ai/clinical-care/execute-action
     * Dispatches smart action (CONFIRM_MEMORY, CONFIRM_REMINDER, etc.)
     */
    static async executeAction(req, res) {
        try {
            const { actionType, payload = {}, patientId } = req.body;
            if (!actionType) {
                return res.status(400).json({ success: false, message: "actionType is required." });
            }
            const targetPatientId = patientId || (req.user && req.user.patientId) || "SC-2026-318028";
            const userId = req.user ? (req.user.id || req.user.userId) : 1;
            const result = await clinicalCareService.executeAction({
                actionType,
                patientId: targetPatientId,
                userId,
                payload
            });
            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.executeAction error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
    /**
     * POST /api/ai/clinical-care/feedback
     * Patient feedback loop for continuous self-learning
     */
    static async submitFeedback(req, res) {
        try {
            const { memoryId, queryText, feedbackRating, notes } = req.body;
            if (!feedbackRating) {
                return res.status(400).json({ success: false, message: "feedbackRating is required ('HELPFUL' or 'UNHELPFUL')." });
            }
            const result = await clinicalCareService.recordClinicalFeedback({
                memoryId,
                queryText,
                feedbackRating,
                notes
            });
            return res.json(result);
        } catch (err) {
            console.error("ClinicalCareAssistantController.submitFeedback error:", err);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = ClinicalCareAssistantController;
