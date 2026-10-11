/**
 * SMARTCITY AI - Clinical Learning & Knowledge Memory Migration
 * ==============================================================
 * Sets up MySQL table for storing clinical learning interactions,
 * symptom-to-medicine efficacy, and patient feedback loops.
 */

const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runClinicalLearningMigration() {
    console.log("🧠 Setting up AI Clinical Learning & Knowledge Memory Schema...");

    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "omkar",
        database: process.env.DB_NAME || "smartcity"
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to MySQL database:", dbConfig.database);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`cca_ai_knowledge_memory\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) DEFAULT NULL,
                \`query_text\` TEXT NOT NULL,
                \`symptom_category\` VARCHAR(100) DEFAULT NULL,
                \`detected_disease\` VARCHAR(150) DEFAULT NULL,
                \`suggested_medicine\` VARCHAR(255) DEFAULT NULL,
                \`medicine_dosage\` VARCHAR(150) DEFAULT NULL,
                \`precautions\` TEXT DEFAULT NULL,
                \`diet_guidance\` TEXT DEFAULT NULL,
                \`red_flags\` TEXT DEFAULT NULL,
                \`response_summary\` TEXT DEFAULT NULL,
                \`feedback_rating\` ENUM('HELPFUL', 'UNHELPFUL', 'NEUTRAL') DEFAULT 'NEUTRAL',
                \`feedback_count_positive\` INT DEFAULT 0,
                \`feedback_count_negative\` INT DEFAULT 0,
                \`frequency_count\` INT DEFAULT 1,
                \`confidence_score\` DECIMAL(4,2) DEFAULT 0.85,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX \`idx_cca_km_cat\` (\`symptom_category\`),
                INDEX \`idx_cca_km_disease\` (\`detected_disease\`),
                INDEX \`idx_cca_km_score\` (\`confidence_score\`),
                INDEX \`idx_cca_km_patient\` (\`patient_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Table `cca_ai_knowledge_memory` created or confirmed.");

        // Also check if any initial baseline common knowledge needs seeding
        const [rows] = await connection.query(`SELECT COUNT(*) AS cnt FROM \`cca_ai_knowledge_memory\``);
        if (rows[0].cnt === 0) {
            console.log("🌱 Seeding verified baseline OTC conditions...");
            const seeds = [
                {
                    query_text: "bukhar aur badan dard hai kya le",
                    symptom_category: "FEVER",
                    detected_disease: "सामान्य वायरल बुखार व बदन दर्द",
                    suggested_medicine: "Paracetamol 650mg (Dolo 650)",
                    medicine_dosage: "1 गोली भोजन के बाद (दिन में अधिकतम 3 बार, 6 घंटे के अंतराल पर)",
                    precautions: "खाली पेट न लें। 2.5-3 लीटर गुनगुना पानी पिएं। ठंडा व बासी खाना न खाएं।",
                    diet_guidance: "पतली मूंग दाल खिचड़ी, सेब, सूप, उबला पानी।",
                    red_flags: "यदि बुखार 102°F से अधिक हो या 3 दिन से ज्यादा रहे तो तुरंत डॉक्टर से मिलें।",
                    response_summary: "Paracetamol 650mg, hydration, and light warm food recommended.",
                    confidence_score: 0.98
                },
                {
                    query_text: "pet me gas aur jalan hai",
                    symptom_category: "ACIDITY",
                    detected_disease: "एसिडिटी व पेट में जलन (Gastritis / Reflux)",
                    suggested_medicine: "Pantoprazole 40mg (Pan 40) / Digene Syrup",
                    medicine_dosage: "Pantoprazole 40mg सुबह खाली पेट 1 गोली या Digene 2 चम्मच भोजन के बाद",
                    precautions: "खाली पेट चाय/कॉफी न पिएं। अत्यधिक मिर्च-मसाले व तला भोजन बंद करें।",
                    diet_guidance: "ठंडा दूध, नारियल पानी, केला, छाछ (भुना जीरा युक्त)।",
                    red_flags: "यदि सीने में तेज चुभन या बाएं हाथ में दर्द हो तो तुरंत ईसीजी कराएं।",
                    response_summary: "Pantoprazole/Digene, cold milk, and low-spice diet advised.",
                    confidence_score: 0.98
                },
                {
                    query_text: "loose motion dast lag gaye hain",
                    symptom_category: "DIARRHEA",
                    detected_disease: "दस्त व निर्जलीकरण (Loose Motion / Diarrhea)",
                    suggested_medicine: "ORS Electral Sachet + Zinc 20mg",
                    medicine_dosage: "1 लीटर उबले पानी में 1 पाउच ORS घोलकर घूंट-घूंट पिएं; Zinc 20mg दिन में 1 बार",
                    precautions: "दूध, पनीर, भारी व बासी भोजन न लें। बाहर का पानी या कटे फल न खाएं।",
                    diet_guidance: "केला, उबले आलू, दही-चावल, साबूदाना खिचड़ी, नारियल पानी।",
                    red_flags: "यदि मल में खून आए या अत्यधिक कमजोरी/चक्कर आए तो तुरंत अस्पताल जाएं।",
                    response_summary: "ORS electrolyte rehydration, zinc, and bland diet advised.",
                    confidence_score: 0.98
                },
                {
                    query_text: "zukham gale me kharash aur naak beh rahi",
                    symptom_category: "COLD_COUGH",
                    detected_disease: "सामान्य जुकाम व गले में खराश (Viral Coryza / Sore Throat)",
                    suggested_medicine: "Cetirizine 10mg + नमक के पानी का गरारा",
                    medicine_dosage: "Cetirizine 10mg रात को सोने से पहले 1 गोली; दिन में 2-3 बार गुनगुने नमक के पानी से गरारे",
                    precautions: "ठंडे पेय, आइसक्रीम व धूल-धुएं से बचें। दवा के बाद गाड़ी न चलाएं (हल्की सुस्ती संभव)।",
                    diet_guidance: "अदरक-तुलसी की चाय, गर्म सूप, हल्दी वाला गुनगुना दूध।",
                    red_flags: "यदि सांस लेने में तकलीफ या सीने में सीटी की आवाज आए तो डॉक्टर को दिखाएं।",
                    response_summary: "Cetirizine 10mg at night, warm salt gargles, steam inhalation.",
                    confidence_score: 0.98
                },
                {
                    query_text: "sar me tez dard hai migraine",
                    symptom_category: "HEADACHE",
                    detected_disease: "सिरदर्द व तनाव (Tension Headache / Migraine)",
                    suggested_medicine: "Paracetamol 650mg / Balm Massage",
                    medicine_dosage: "Paracetamol 650mg भोजन के बाद 1 गोली (जरूरत पड़ने पर)",
                    precautions: "अंधेरे शांत कमरे में 30 मिनट विश्राम करें। तेज स्क्रीन रोशनी व तेज आवाज से दूर रहें।",
                    diet_guidance: "भरपूर पानी पिएं, खाली पेट न रहें, पुदीने की चाय लें।",
                    red_flags: "यदि उल्टी के साथ अचानक अत्यधिक तेज सिरदर्द (Thunderclap) हो तो तुरंत न्यूरोलॉजिस्ट से मिलें।",
                    response_summary: "Paracetamol 650mg, hydration, quiet rest advised.",
                    confidence_score: 0.98
                }
            ];

            for (const s of seeds) {
                await connection.query(`
                    INSERT INTO \`cca_ai_knowledge_memory\` 
                    (query_text, symptom_category, detected_disease, suggested_medicine, medicine_dosage, precautions, diet_guidance, red_flags, response_summary, confidence_score, feedback_count_positive)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5)
                `, [s.query_text, s.symptom_category, s.detected_disease, s.suggested_medicine, s.medicine_dosage, s.precautions, s.diet_guidance, s.red_flags, s.response_summary, s.confidence_score]);
            }
            console.log(`✅ Seeded ${seeds.length} verified clinical learning patterns.`);
        }

        console.log("🎉 Migration completed successfully.");
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    } finally {
        if (connection) await connection.end();
    }
}

if (require.main === module) {
    runClinicalLearningMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runClinicalLearningMigration;
