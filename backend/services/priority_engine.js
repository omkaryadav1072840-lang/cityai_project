/**
 * SmartCity AI - Intelligent Rule-Based Priority & SLA Engine
 * Evaluates department, category, incident severity, keywords, and affected population
 * to assign deterministic, transparent priority and SLA deadlines.
 */

const SLA_HOURS = {
    CRITICAL: 2,   // 2 hours SLA
    HIGH: 6,       // 6 hours SLA
    MEDIUM: 24,    // 24 hours SLA
    LOW: 72        // 72 hours SLA
};

const CRITICAL_KEYWORDS = [
    "fire", "blast", "explosion", "accident", "casualty", "cardiac", "heart attack",
    "stroke", "bleeding", "severe", "life threatening", "collapse", "gas leak",
    "electrocution", "transformer spark", "drowning", "riot", "stampede", "gridlock", "armed"
];

const HIGH_KEYWORDS = [
    "overflow", "choked", "blocked", "sewage", "contaminated", "dirty water", "no water",
    "dark street", "blackout", "signal dead", "signal failure", "signal stuck",
    "dead animal", "theft", "assault", "urgent", "broken pipe", "fallen tree", "wire snap"
];

const MEDIUM_KEYWORDS = [
    "pothole", "pavement", "dim light", "garbage pile", "delay", "noise", "parking issue",
    "encroachment", "drain clean", "foul smell", "stray dog", "traffic slow"
];

/**
 * Calculates priority, SLA duration, and SLA deadline for a service request.
 * @param {Object} data - { department, category, description, urgency }
 * @returns {Object} - { priority, slaHours, slaDeadline, reason }
 */
function calculatePriorityAndSLA({ department = "general", category = "", description = "", urgency = "" }) {
    const text = `${category} ${description} ${urgency}`.toLowerCase();
    const dept = (department || "").toLowerCase();

    let priority = "MEDIUM";
    let reason = "Standard departmental service priority.";

    // 1. Emergency Department is automatically CRITICAL or HIGH
    if (dept === "emergency") {
        priority = "CRITICAL";
        reason = "Emergency services dispatched with top city SLA.";
    } 
    // 2. Critical keywords check across all departments
    else if (CRITICAL_KEYWORDS.some(kw => text.includes(kw)) || urgency.toLowerCase() === "critical") {
        priority = "CRITICAL";
        reason = "Life-safety, fire, or severe infrastructure hazard detected.";
    } 
    // 3. High keywords check
    else if (HIGH_KEYWORDS.some(kw => text.includes(kw)) || urgency.toLowerCase() === "high") {
        priority = "HIGH";
        reason = "Public health, sanitation, or traffic safety escalation.";
    } 
    // 4. Medium keywords check
    else if (MEDIUM_KEYWORDS.some(kw => text.includes(kw)) || urgency.toLowerCase() === "medium") {
        priority = "MEDIUM";
        reason = "Standard civic maintenance or urban service grievance.";
    } 
    // 5. Low urgency
    else if (urgency.toLowerCase() === "low" || text.includes("inquiry") || text.includes("suggestion")) {
        priority = "LOW";
        reason = "Routine non-urgent civic query or routine maintenance.";
    }

    const slaHours = SLA_HOURS[priority] || 24;
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + slaHours * 3600 * 1000);

    return {
        priority,
        slaHours,
        slaDeadline,
        reason
    };
}

module.exports = {
    calculatePriorityAndSLA,
    SLA_HOURS
};
