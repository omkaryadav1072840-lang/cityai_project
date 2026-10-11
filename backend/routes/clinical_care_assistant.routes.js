/**
 * SMARTCITY AI - CLINICAL CARE ASSISTANT ROUTES
 * =============================================
 * Grounded Clinical Decision-Support & Doctor Review Routes
 */

const express = require("express");
const router = express.Router();
const ClinicalCareAssistantController = require("../controllers/clinical_care_assistant_controller");
const { optionalToken, authenticateToken, requireRole } = require("../middleware/auth.middleware");

// 1. Primary AI Clinical Care Assistant Conversation Endpoint
router.post(
    "/api/ai/clinical-care/chat",
    optionalToken,
    ClinicalCareAssistantController.chat
);

// 2. Active Patient Context (Authorized Demographics, Prescriptions, Appointments)
router.get(
    "/api/ai/clinical-care/patient-context",
    optionalToken,
    ClinicalCareAssistantController.getPatientContext
);

// 3. Today's Medication Schedule (Morning, Afternoon, Evening, Night)
router.get(
    "/api/ai/clinical-care/medication-schedule",
    optionalToken,
    ClinicalCareAssistantController.getMedicationSchedule
);

// 4. Mark Medication as Taken / Update Adherence Status
router.post(
    "/api/ai/clinical-care/mark-medication",
    optionalToken,
    ClinicalCareAssistantController.markMedication
);

// 5. Doctor Clinical Review Dossier & Queue
router.get(
    "/api/ai/clinical-care/doctor-dossier",
    optionalToken,
    ClinicalCareAssistantController.getDoctorDossier
);

// 6. Doctor Action (Acknowledge, Review, Add Clinical Note)
router.post(
    "/api/ai/clinical-care/doctor-action",
    optionalToken,
    ClinicalCareAssistantController.doctorAction
);

// 7. Hospital Admin Aggregated Statistics & Safety Metrics
router.get(
    "/api/ai/clinical-care/admin-stats",
    optionalToken,
    ClinicalCareAssistantController.getAdminStats
);

// 8. Patient Symptom & Diet Tracking Endpoint
router.post(
    "/api/ai/clinical-care/track-health",
    optionalToken,
    ClinicalCareAssistantController.trackHealth
);

// 9. Get Tracked Health History
router.get(
    "/api/ai/clinical-care/tracked-health",
    optionalToken,
    ClinicalCareAssistantController.getTrackedHealth
);

// 10. Patient-Approved Memories ("Saved for Me")
router.get(
    "/api/ai/clinical-care/memories",
    optionalToken,
    ClinicalCareAssistantController.getMemories
);

router.post(
    "/api/ai/clinical-care/save-memory",
    optionalToken,
    ClinicalCareAssistantController.saveMemory
);

router.post(
    "/api/ai/clinical-care/delete-memory",
    optionalToken,
    ClinicalCareAssistantController.deleteMemory
);

// 11. Patient Scheduled Reminders
router.get(
    "/api/ai/clinical-care/reminders",
    optionalToken,
    ClinicalCareAssistantController.getReminders
);

router.post(
    "/api/ai/clinical-care/reminders",
    optionalToken,
    ClinicalCareAssistantController.createReminder
);

router.post(
    "/api/ai/clinical-care/delete-reminder",
    optionalToken,
    ClinicalCareAssistantController.deleteReminder
);

// 12. Personal Health Summary
router.get(
    "/api/ai/clinical-care/health-summary",
    optionalToken,
    ClinicalCareAssistantController.getHealthSummary
);

// 13. Smart Action Dispatcher
router.post(
    "/api/ai/clinical-care/execute-action",
    optionalToken,
    ClinicalCareAssistantController.executeAction
);

// 14. Patient Continuous Learning Feedback Loop
router.post(
    "/api/ai/clinical-care/feedback",
    optionalToken,
    ClinicalCareAssistantController.submitFeedback
);

module.exports = router;
