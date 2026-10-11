/**
 * SmartCity Gorakhpur - AI Clinical Care Assistant Migration
 * =========================================================
 * Sets up relational schema for:
 * 1. patient_medication_adherence (Daily schedule tracking: Morning, Afternoon, Evening, Night)
 * 2. ai_clinical_audit_logs (Clinical decision support audit trail & doctor review queue)
 */

const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runClinicalCareMigration() {
    console.log("🏥 Running AI Clinical Care Assistant Database Migration...");

    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "omkar",
        database: process.env.DB_NAME || "smartcity"
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // 1. Create patient_medication_adherence table
        console.log("  🔄 Ensuring patient_medication_adherence table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`patient_medication_adherence\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) NOT NULL,
                \`prescription_id\` INT DEFAULT NULL,
                \`medicine_name\` VARCHAR(150) NOT NULL,
                \`dosage\` VARCHAR(100) DEFAULT NULL,
                \`schedule_time_slot\` ENUM('Morning', 'Afternoon', 'Evening', 'Night') NOT NULL,
                \`scheduled_time\` VARCHAR(20) DEFAULT NULL,
                \`food_instruction\` VARCHAR(100) DEFAULT 'After food',
                \`status\` ENUM('Upcoming', 'Due Now', 'Taken', 'Missed') DEFAULT 'Upcoming',
                \`taken_at\` TIMESTAMP NULL DEFAULT NULL,
                \`adherence_date\` DATE NOT NULL,
                \`notes\` TEXT DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX \`idx_adh_patient_date\` (\`patient_id\`, \`adherence_date\`),
                INDEX \`idx_adh_status\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ patient_medication_adherence table ready.");

        // 2. Create ai_clinical_audit_logs table
        console.log("  🔄 Ensuring ai_clinical_audit_logs table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`ai_clinical_audit_logs\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) DEFAULT NULL,
                \`user_id\` VARCHAR(50) DEFAULT NULL,
                \`user_role\` VARCHAR(50) DEFAULT 'patient',
                \`session_id\` VARCHAR(100) DEFAULT NULL,
                \`intent\` VARCHAR(100) NOT NULL,
                \`patient_message\` TEXT NULL,
                \`ai_summary\` TEXT NULL,
                \`action_taken\` VARCHAR(100) NOT NULL,
                \`data_sources_used\` TEXT DEFAULT NULL,
                \`emergency_flag\` TINYINT(1) DEFAULT 0,
                \`doctor_handoff_flag\` TINYINT(1) DEFAULT 0,
                \`doctor_id\` VARCHAR(50) DEFAULT NULL,
                \`review_status\` ENUM('PENDING', 'ACKNOWLEDGED', 'REVIEWED') DEFAULT 'PENDING',
                \`doctor_notes\` TEXT DEFAULT NULL,
                \`reviewed_by\` VARCHAR(100) DEFAULT NULL,
                \`reviewed_at\` TIMESTAMP NULL DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_audit_patient\` (\`patient_id\`),
                INDEX \`idx_audit_intent\` (\`intent\`),
                INDEX \`idx_audit_emergency\` (\`emergency_flag\`),
                INDEX \`idx_audit_review\` (\`review_status\`),
                INDEX \`idx_audit_created\` (\`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ ai_clinical_audit_logs table ready.");

        // 3. Create patient_symptom_diet_tracker table
        console.log("  🔄 Ensuring patient_symptom_diet_tracker table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`patient_symptom_diet_tracker\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) NOT NULL,
                \`symptom_name\` VARCHAR(150) NOT NULL,
                \`severity\` VARCHAR(50) DEFAULT 'Moderate',
                \`diet_consumed\` TEXT DEFAULT NULL,
                \`foods_avoided\` TEXT DEFAULT NULL,
                \`home_care_actions\` TEXT DEFAULT NULL,
                \`notes\` TEXT DEFAULT NULL,
                \`status\` VARCHAR(50) DEFAULT 'Active',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_psdt_patient\` (\`patient_id\`),
                INDEX \`idx_psdt_created\` (\`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ patient_symptom_diet_tracker table ready.");

        // 4. Create patient_ai_memories table (Patient-approved notes & preferences with consent)
        console.log("  🔄 Ensuring patient_ai_memories table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`patient_ai_memories\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) NOT NULL,
                \`user_id\` VARCHAR(50) DEFAULT NULL,
                \`content\` TEXT NOT NULL,
                \`category\` VARCHAR(50) DEFAULT 'health_note',
                \`consent\` TINYINT(1) DEFAULT 1,
                \`status\` ENUM('ACTIVE', 'DELETED') DEFAULT 'ACTIVE',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX \`idx_mem_patient\` (\`patient_id\`),
                INDEX \`idx_mem_status\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ patient_ai_memories table ready.");

        // 5. Create patient_reminders table (Scheduled notifications & reminders)
        console.log("  🔄 Ensuring patient_reminders table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`patient_reminders\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) NOT NULL,
                \`user_id\` VARCHAR(50) DEFAULT NULL,
                \`reminder_type\` VARCHAR(50) NOT NULL,
                \`title\` VARCHAR(255) NOT NULL,
                \`scheduled_time\` VARCHAR(100) NOT NULL,
                \`frequency\` VARCHAR(50) DEFAULT 'ONCE',
                \`status\` ENUM('ACTIVE', 'COMPLETED', 'SNOOZED', 'CANCELLED') DEFAULT 'ACTIVE',
                \`notes\` TEXT DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX \`idx_rem_patient\` (\`patient_id\`),
                INDEX \`idx_rem_status\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ patient_reminders table ready.");

        // 6. Create ai_conversation_sessions table
        console.log("  🔄 Ensuring ai_conversation_sessions table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`ai_conversation_sessions\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`session_id\` VARCHAR(100) NOT NULL UNIQUE,
                \`patient_id\` VARCHAR(50) DEFAULT NULL,
                \`user_id\` VARCHAR(50) DEFAULT NULL,
                \`language\` VARCHAR(20) DEFAULT 'en',
                \`context_state\` JSON DEFAULT NULL,
                \`status\` VARCHAR(50) DEFAULT 'ACTIVE',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX \`idx_cs_session\` (\`session_id\`),
                INDEX \`idx_cs_patient\` (\`patient_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ ai_conversation_sessions table ready.");

        // 7. Create ai_conversation_messages table
        console.log("  🔄 Ensuring ai_conversation_messages table exists...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`ai_conversation_messages\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`session_id\` VARCHAR(100) NOT NULL,
                \`patient_id\` VARCHAR(50) DEFAULT NULL,
                \`sender\` ENUM('user', 'assistant', 'system') NOT NULL,
                \`message\` TEXT NOT NULL,
                \`intent\` VARCHAR(100) DEFAULT NULL,
                \`confidence\` VARCHAR(50) DEFAULT 'VERIFIED',
                \`safety_badge\` VARCHAR(100) DEFAULT NULL,
                \`sources_used\` TEXT DEFAULT NULL,
                \`is_emergency\` TINYINT(1) DEFAULT 0,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_cm_session\` (\`session_id\`),
                INDEX \`idx_cm_patient\` (\`patient_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("  ✅ ai_conversation_messages table ready.");

        // Enrich verified prescriptions with structured JSON
        console.log("  🔄 Synchronizing verified prescription details...");
        const rx1Meds = JSON.stringify([
            {
                name: "Telmisartan 40mg",
                dosage: "40 mg",
                frequency: "Once daily",
                timing: "Morning 08:00 AM",
                food_instruction: "After light breakfast",
                duration: "30 days",
                instructions: "Take with water every morning for blood pressure control. Do not skip doses."
            },
            {
                name: "Amlodipine 5mg",
                dosage: "5 mg",
                frequency: "Once daily",
                timing: "Evening 06:30 PM",
                food_instruction: "After food",
                duration: "30 days",
                instructions: "Take in the evening after meals."
            }
        ]);
        await connection.query(
            "UPDATE prescriptions SET medications_json = ?, diagnosis = 'Essential Hypertension Stage 1', advice = 'Low salt diet, 30 min daily walking, monitor BP weekly.' WHERE id = 1",
            [rx1Meds]
        );

        const rx2Meds = JSON.stringify([
            {
                name: "Budesonide Rotahaler 200mcg",
                dosage: "1 rotacap inhalation (200 mcg)",
                frequency: "2 times daily",
                timing: "Morning 09:00 AM, Night 09:30 PM",
                food_instruction: "Rinse mouth with water after use",
                duration: "15 days",
                instructions: "Inhale through rotahaler as instructed. Always rinse mouth thoroughly with plain water after inhalation to prevent oral thrush."
            }
        ]);
        await connection.query(
            "UPDATE prescriptions SET medications_json = ?, diagnosis = 'Bronchial Asthma / Reactive Airway', advice = 'Avoid dust, pollen, cold drinks. Use Rotahaler regularly.' WHERE id = 2",
            [rx2Meds]
        );

        const rx3Meds = JSON.stringify([
            {
                name: "Metformin 500mg",
                dosage: "500 mg",
                frequency: "2 times daily",
                timing: "Morning 08:30 AM, Night 09:00 PM",
                food_instruction: "With or immediately after meals",
                duration: "30 days",
                instructions: "Take with meals to minimize stomach upset. Do not skip meals."
            },
            {
                name: "Glimepiride 1mg",
                dosage: "1 mg",
                frequency: "Once daily",
                timing: "Morning 08:30 AM",
                food_instruction: "Before breakfast",
                duration: "30 days",
                instructions: "Take 15-30 minutes before breakfast. Keep glucose candy handy in case of dizziness."
            },
            {
                name: "Paracetamol 500mg",
                dosage: "500 mg",
                frequency: "3 times daily",
                timing: "As needed / every 8 hours",
                food_instruction: "After food",
                duration: "3 days",
                instructions: "Take after meals for fever or body ache. Maximum 3 times daily. Do not exceed."
            }
        ]);
        await connection.query(
            "UPDATE prescriptions SET medications_json = ?, diagnosis = 'Type 2 Diabetes Mellitus with Acute Febrile Illness', advice = 'Strict diabetic diet, avoid refined sugar, stay well hydrated.' WHERE id = 3",
            [rx3Meds]
        );

        // Update emergency info / allergies for test patients
        await connection.query(
            "UPDATE patients SET emergency_info = 'Ibuprofen & NSAID sensitivity' WHERE patient_id = 'PAT-5931984821'"
        );
        await connection.query(
            "UPDATE patients SET emergency_info = 'Dust allergy, No known drug allergies' WHERE patient_id = 'SC-2026-318028'"
        );
        console.log("  ✅ Prescription and patient records enriched.");

        // 8. Seed initial schedule for active patient prescriptions if empty for today
        const todayStr = new Date().toISOString().slice(0, 10);
        const [existingCount] = await connection.query(
            "SELECT COUNT(*) AS cnt FROM patient_medication_adherence WHERE adherence_date = ?",
            [todayStr]
        );

        if (existingCount[0].cnt === 0) {
            console.log("  🔄 Seeding today's medication adherence records for active prescriptions...");
            const sampleSchedule = [
                // Patient SC-2026-318028
                {
                    patient_id: "SC-2026-318028",
                    prescription_id: 3,
                    medicine_name: "Metformin 500mg",
                    dosage: "1 tablet (500mg)",
                    schedule_time_slot: "Morning",
                    scheduled_time: "08:30 AM",
                    food_instruction: "With or immediately after breakfast",
                    status: "Taken",
                    taken_at: new Date(Date.now() - 4 * 3600000),
                    adherence_date: todayStr
                },
                {
                    patient_id: "SC-2026-318028",
                    prescription_id: 3,
                    medicine_name: "Glimepiride 1mg",
                    dosage: "1 tablet (1mg)",
                    schedule_time_slot: "Morning",
                    scheduled_time: "08:30 AM",
                    food_instruction: "Before breakfast",
                    status: "Taken",
                    taken_at: new Date(Date.now() - 4 * 3600000),
                    adherence_date: todayStr
                },
                {
                    patient_id: "SC-2026-318028",
                    prescription_id: 3,
                    medicine_name: "Paracetamol 500mg",
                    dosage: "1 tablet (500mg)",
                    schedule_time_slot: "Afternoon",
                    scheduled_time: "02:00 PM",
                    food_instruction: "After food",
                    status: "Taken",
                    taken_at: new Date(Date.now() - 2 * 3600000),
                    adherence_date: todayStr
                },
                {
                    patient_id: "SC-2026-318028",
                    prescription_id: 3,
                    medicine_name: "Metformin 500mg",
                    dosage: "1 tablet (500mg)",
                    schedule_time_slot: "Night",
                    scheduled_time: "09:00 PM",
                    food_instruction: "After dinner",
                    status: "Upcoming",
                    taken_at: null,
                    adherence_date: todayStr
                },
                // Patient PAT-5931984821
                {
                    patient_id: "PAT-5931984821",
                    prescription_id: 1,
                    medicine_name: "Telmisartan 40mg",
                    dosage: "1 tablet (40mg)",
                    schedule_time_slot: "Morning",
                    scheduled_time: "08:00 AM",
                    food_instruction: "After light breakfast",
                    status: "Taken",
                    taken_at: new Date(Date.now() - 5 * 3600000),
                    adherence_date: todayStr
                },
                {
                    patient_id: "PAT-5931984821",
                    prescription_id: 1,
                    medicine_name: "Amlodipine 5mg",
                    dosage: "1 tablet (5mg)",
                    schedule_time_slot: "Evening",
                    scheduled_time: "06:30 PM",
                    food_instruction: "After food",
                    status: "Due Now",
                    taken_at: null,
                    adherence_date: todayStr
                },
                {
                    patient_id: "PAT-5931984821",
                    prescription_id: 2,
                    medicine_name: "Budesonide Rotahaler 200mcg",
                    dosage: "1 rotacap inhalation",
                    schedule_time_slot: "Morning",
                    scheduled_time: "09:00 AM",
                    food_instruction: "Rinse mouth with water after use",
                    status: "Taken",
                    taken_at: new Date(Date.now() - 4 * 3600000),
                    adherence_date: todayStr
                },
                {
                    patient_id: "PAT-5931984821",
                    prescription_id: 2,
                    medicine_name: "Budesonide Rotahaler 200mcg",
                    dosage: "1 rotacap inhalation",
                    schedule_time_slot: "Night",
                    scheduled_time: "09:30 PM",
                    food_instruction: "Rinse mouth with water after use",
                    status: "Upcoming",
                    taken_at: null,
                    adherence_date: todayStr
                },
                // Patient PAT-VERIFY-5695
                {
                    patient_id: "PAT-VERIFY-5695",
                    prescription_id: 4,
                    medicine_name: "Aspirin 75mg",
                    dosage: "1 tablet (75mg)",
                    schedule_time_slot: "Night",
                    scheduled_time: "09:00 PM",
                    food_instruction: "After dinner (never on empty stomach)",
                    status: "Upcoming",
                    taken_at: null,
                    adherence_date: todayStr
                },
                {
                    patient_id: "PAT-VERIFY-5695",
                    prescription_id: 4,
                    medicine_name: "Atorvastatin 40mg",
                    dosage: "1 tablet (40mg)",
                    schedule_time_slot: "Night",
                    scheduled_time: "10:00 PM",
                    food_instruction: "At bedtime",
                    status: "Upcoming",
                    taken_at: null,
                    adherence_date: todayStr
                }
            ];

            for (const item of sampleSchedule) {
                await connection.query(
                    `INSERT INTO patient_medication_adherence 
                     (patient_id, prescription_id, medicine_name, dosage, schedule_time_slot, scheduled_time, food_instruction, status, taken_at, adherence_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        item.patient_id,
                        item.prescription_id,
                        item.medicine_name,
                        item.dosage,
                        item.schedule_time_slot,
                        item.scheduled_time,
                        item.food_instruction,
                        item.status,
                        item.taken_at,
                        item.adherence_date
                    ]
                );
            }
            console.log(`  ✅ Seeded ${sampleSchedule.length} medication adherence entries.`);
        }

        // Seed initial sample memory and reminder if empty
        const [memCount] = await connection.query("SELECT COUNT(*) AS cnt FROM patient_ai_memories");
        if (memCount[0].cnt === 0) {
            await connection.query(`
                INSERT INTO patient_ai_memories
                (patient_id, user_id, content, category, consent, status)
                VALUES
                ('SC-2026-318028', '1', 'Patient experiences mild acidity when taking Metformin on an empty stomach; prefers having it with full lunch.', 'health_note', 1, 'ACTIVE')
            `);
            console.log("  ✅ Initial patient AI memory seeded.");
        }

        const [remCount] = await connection.query("SELECT COUNT(*) AS cnt FROM patient_reminders");
        if (remCount[0].cnt === 0) {
            await connection.query(`
                INSERT INTO patient_reminders
                (patient_id, user_id, reminder_type, title, scheduled_time, frequency, status, notes)
                VALUES
                ('SC-2026-318028', '1', 'MEDICINE', 'Night Metformin Dose', '09:00 PM', 'DAILY', 'ACTIVE', 'Take after dinner with warm water.')
            `);
            console.log("  ✅ Initial patient reminder seeded.");
        }

        // Seed a sample AI clinical audit log for demonstration
        const [auditCount] = await connection.query("SELECT COUNT(*) AS cnt FROM ai_clinical_audit_logs");
        if (auditCount[0].cnt === 0) {
            await connection.query(`
                INSERT INTO ai_clinical_audit_logs
                (patient_id, user_id, user_role, intent, patient_message, ai_summary, action_taken, data_sources_used, emergency_flag, doctor_handoff_flag, doctor_id, review_status)
                VALUES
                ('PAT-5931984821', '1', 'citizen', 'PRESCRIPTION_EXPLANATION', 'Explain my prescription', 'Provided dosage, food instructions, and precaution guidance for Telmisartan and Budesonide based on verified doctor records.', 'PRESCRIPTION_GUIDANCE_SERVED', 'MySQL: prescriptions, patient_records, hospitals', 0, 0, 'DOC002', 'ACKNOWLEDGED'),
                ('SC-2026-318028', '2', 'citizen', 'MEDICATION_ADHERENCE', 'Mark Metformin as taken', 'Recorded morning dose adherence in database.', 'ADHERENCE_RECORDED', 'MySQL: patient_medication_adherence', 0, 0, 'DOC004', 'REVIEWED')
            `);
            console.log("  ✅ Initial AI clinical audit logs seeded.");
        }

        console.log("🎉 AI Clinical Care Assistant database migration complete!\n");
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    } finally {
        if (connection) await connection.end();
    }
}

if (require.main === module) {
    runClinicalCareMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runClinicalCareMigration;
