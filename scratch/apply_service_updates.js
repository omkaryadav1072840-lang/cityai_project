const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '..', 'backend', 'services', 'clinical_care_assistant_service.js');
let code = fs.readFileSync(servicePath, 'utf8');

console.log("Original file length:", code.length);

// 1. Add getOtcMedicine, recordClinicalLearning, recordClinicalFeedback, lookupClinicalKnowledge, isReportQuery, analyzeLabReportQuery methods before module.exports
const helperMethods = `
    // =========================================================
    // 10. AI CONTINUOUS LEARNING & KNOWLEDGE MEMORY ENGINE
    // =========================================================

    getOtcMedicine(key) {
        const registry = {
            fever: {
                name: "Paracetamol 650mg (Dolo 650)",
                dosage: "1 गोली भोजन के बाद (After Food)",
                frequency: "दिन में 2 से 3 बार (कम से कम 6 घंटे के अंतराल पर)",
                safeDuration: "अधिकतम 3 दिन",
                precautions: "खाली पेट न लें। 24 घंटे में 3000mg से अधिक न लें। शराब के साथ न लें।",
                pharmacyItem: "Paracetamol 650mg (Dolo 650)",
                price: "₹32.50",
                timing: "After food"
            },
            dengue: {
                name: "Paracetamol 650mg + ORS Electral",
                dosage: "1 गोली तेज बुखार होने पर; 1 पाउच ORS 1 लीटर पानी में",
                frequency: "ORS दिनभर घूंट-घूंट; Paracetamol आवश्यकता पड़ने पर",
                safeDuration: "डॉक्टर की निगरानी में",
                precautions: "Aspirin, Brufen या Combiflam भूलकर भी न लें (रक्तस्राव का गंभीर खतरा)।",
                pharmacyItem: "Paracetamol 650mg (Dolo 650)",
                price: "₹32.50",
                timing: "After food"
            },
            typhoid: {
                name: "Paracetamol 650mg + ORS Sachet",
                dosage: "1 गोली बुखार में; एंटीबायोटिक केवल डॉक्टर के पर्चे पर",
                frequency: "दिन में 2 बार",
                safeDuration: "डॉक्टर से रक्त जांच (Widal / CBC) कराएं",
                precautions: "बिना डॉक्टर जांच के खुद से एंटीबायोटिक्स शुरू या बंद न करें।",
                pharmacyItem: "ORS Oral Rehydration Salt Sachet",
                price: "₹22.00",
                timing: "After food"
            },
            acidity: {
                name: "Pantoprazole 40mg (Pan 40) / Digene Syrup",
                dosage: "1 गोली सुबह खाली पेट (नाश्ते से 30 मिनट पहले) या Digene 2 चम्मच",
                frequency: "दिन में 1 बार (सुबह) या Digene भोजन के बाद",
                safeDuration: "3 से 5 दिन",
                precautions: "खाली पेट चाय, कॉफी, सिगरेट न लें। भोजन के तुरंत बाद न लेटें।",
                pharmacyItem: "Pantoprazole 40mg",
                price: "₹85.00",
                timing: "Before food"
            },
            diarrhea: {
                name: "ORS Electral Sachet + Zinc 20mg",
                dosage: "1 लीटर उबले-ठंडे पानी में 1 पाउच ORS घोलकर पिएं; Zinc 20mg 1 गोली",
                frequency: "हर बार दस्त के बाद 1 गिलास घूंट-घूंट पिएं",
                safeDuration: "2 से 3 दिन",
                precautions: "दूध, पनीर, घी और भारी खाना बंद रखें। पानी की कमी (डिहाइड्रेशन) न होने दें।",
                pharmacyItem: "ORS Oral Rehydration Salt Sachet",
                price: "₹22.00",
                timing: "Throughout the day"
            },
            vomiting: {
                name: "Ondansetron 4mg (Emeset) / Domperidone 10mg",
                dosage: "1 गोली पानी पीने या भोजन से 30 मिनट पहले",
                frequency: "दिन में 1-2 बार आवश्यकता पड़ने पर",
                safeDuration: "1 से 2 दिन",
                precautions: "उल्टी के तुरंत बाद खाना या पानी न लें, 15 मिनट रुककर घूंट-घूंट पानी लें।",
                pharmacyItem: "Domperidone 10mg",
                price: "₹38.00",
                timing: "Before food"
            },
            headache: {
                name: "Paracetamol 650mg (Dolo 650) / Balm",
                dosage: "1 गोली भोजन के बाद पानी के साथ; माथे पर बाम से हल्की मालिश",
                frequency: "दिन में 1-2 बार जरूरत पड़ने पर",
                safeDuration: "2 दिन",
                precautions: "अंधेरे शांत कमरे में विश्राम करें। मोबाइल/लैपटॉप स्क्रीन से दूरी बनाएं।",
                pharmacyItem: "Paracetamol 650mg (Dolo 650)",
                price: "₹32.50",
                timing: "After food"
            },
            cough_cold: {
                name: "Cetirizine 10mg (जुकाम/छींक) / Dextromethorphan (खांसी)",
                dosage: "Cetirizine 1 गोली रात को सोते समय; खांसी में 2 चम्मच सिरप गुनगुने पानी बाद",
                frequency: "दिन में 1 बार (रात को)",
                safeDuration: "3 से 5 दिन",
                precautions: "दवा लेने के बाद वाहन न चलाएं (हल्की सुस्ती संभव)। ठंडा पानी व आइसक्रीम न लें।",
                pharmacyItem: "Cetirizine 10mg",
                price: "₹28.00",
                timing: "At bedtime"
            },
            hypertension: {
                name: "Amlodipine 5mg / Telmisartan 40mg (डॉक्टर द्वारा निर्धारित)",
                dosage: "1 गोली सुबह नाश्ते के बाद नियत समय पर",
                frequency: "दिन में 1 बार",
                safeDuration: "नियमित चिकित्सकीय निगरानी में",
                precautions: "नमक की मात्रा भोजन में 1 चम्मच (< 3g) तक सीमित करें। बिना डॉक्टर पूछे दवा न छोड़ें।",
                pharmacyItem: "Amlodipine 5mg",
                price: "₹55.00",
                timing: "After breakfast"
            },
            diabetes: {
                name: "Metformin 500mg (डॉक्टर द्वारा निर्धारित)",
                dosage: "1 गोली मुख्य भोजन के साथ या तुरंत बाद",
                frequency: "पर्चे अनुसार (दिन में 1-2 बार)",
                safeDuration: "नियमित",
                precautions: "समय पर भोजन करें ताकि शुगर अत्यधिक कम (Hypoglycemia) न हो जाए।",
                pharmacyItem: "Metformin 500mg",
                price: "₹45.00",
                timing: "With food"
            },
            kidney_stone: {
                name: "Disodium Hydrogen Citrate सिरप (Cital 100ml)",
                dosage: "2 चम्मच सिरप 1 गिलास पानी में मिलाकर पिएं",
                frequency: "दिन में 2 से 3 बार भोजन के बाद",
                safeDuration: "3 से 5 दिन",
                precautions: "दिनभर में 3.5 से 4 लीटर पानी पिएं। टमाटर, पालक, बीज वाली चीजें व ज्यादा नमक न लें।",
                pharmacyItem: "Cital Syrup 100ml",
                price: "₹95.00",
                timing: "After food"
            },
            back_pain: {
                name: "Paracetamol 650mg + Diclofenac Gel",
                dosage: "1 गोली भोजन बाद (हल्के गर्म पानी से); दर्द वाली जगह पर जेल हल्के हाथ से लगाएं",
                frequency: "दिन में 2 बार",
                safeDuration: "2 से 3 दिन",
                precautions: "भारी वजन न उठाएं। आगे की ओर झुकने से बचें। गर्म पानी की थैली से सिकाई करें।",
                pharmacyItem: "Paracetamol 650mg (Dolo 650)",
                price: "₹32.50",
                timing: "After food"
            },
            jaundice: {
                name: "Liv 52 DS Syrup / Silymarin (डॉक्टर सलाह पर) + ORS",
                dosage: "2 चम्मच सिरप दिन में 2 बार भोजन के बाद",
                frequency: "दिन में 2 बार",
                safeDuration: "डॉक्टर की निगरानी में",
                precautions: "घी, तेल, हल्दी और गरिष्ठ भोजन पूरी तरह वर्जित रखें। केवल उबला ठंडा पानी पिएं।",
                pharmacyItem: "Liv 52 DS Syrup",
                price: "₹160.00",
                timing: "After food"
            },
            skin_allergy: {
                name: "Cetirizine 10mg + Calamine Lotion",
                dosage: "1 गोली रात को; खुजली वाली त्वचा पर कैलामाइन लोशन लगाएं",
                frequency: "दिन में 1 बार (रात में)",
                safeDuration: "3 दिन",
                precautions: "नाखूनों से खुजली न करें। सूती और ढीले कपड़े पहनें। धूप और धूल से बचें।",
                pharmacyItem: "Cetirizine 10mg",
                price: "₹28.00",
                timing: "At night"
            },
            weakness: {
                name: "Multivitamin + Iron Folic Acid (Becadexamin / Orofer)",
                dosage: "1 कैप्सूल दोपहर के भोजन के बाद पानी के साथ",
                frequency: "दिन में 1 बार",
                safeDuration: "1 माह",
                precautions: "दवा लेने के तुरंत बाद चाय या दूध न पिएं। भरपूर नींद व पौष्टिक आहार लें।",
                pharmacyItem: "Multivitamin Capsule",
                price: "₹48.00",
                timing: "After lunch"
            },
            general: {
                name: "Paracetamol 650mg (दर्द/हल्के बुखार हेतु) या ORS",
                dosage: "1 गोली आवश्यकता पड़ने पर भोजन के बाद",
                frequency: "जरूरत पड़ने पर",
                safeDuration: "अधिकतम 2 दिन",
                precautions: "खाली पेट कोई भी दर्द निवारक न लें। लक्षण बने रहने पर डॉक्टर से परामर्श लें।",
                pharmacyItem: "Paracetamol 650mg (Dolo 650)",
                price: "₹32.50",
                timing: "After food"
            }
        };
        return registry[key] || registry.general;
    }

    async recordClinicalLearning({ queryText, symptomCategory, detectedDisease, suggestedMedicine, dosage, precautions, dietGuidance, redFlags, responseSummary, patientId }) {
        try {
            if (!queryText || !detectedDisease) return;

            const [existing] = await pool.query(
                \`SELECT id, frequency_count, confidence_score FROM cca_ai_knowledge_memory 
                 WHERE detected_disease = ? OR (symptom_category = ? AND query_text = ?) LIMIT 1\`,
                [detectedDisease, symptomCategory, queryText.slice(0, 200)]
            );

            if (existing && existing.length > 0) {
                await pool.query(
                    \`UPDATE cca_ai_knowledge_memory 
                     SET frequency_count = frequency_count + 1, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?\`,
                    [existing[0].id]
                );
            } else {
                await pool.query(
                    \`INSERT INTO cca_ai_knowledge_memory 
                     (patient_id, query_text, symptom_category, detected_disease, suggested_medicine, medicine_dosage, precautions, diet_guidance, red_flags, response_summary, confidence_score) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.90)\`,
                    [
                        patientId || null,
                        queryText.slice(0, 300),
                        symptomCategory || "GENERAL",
                        detectedDisease,
                        suggestedMedicine || null,
                        dosage || null,
                        precautions || null,
                        dietGuidance || null,
                        redFlags || null,
                        responseSummary ? responseSummary.slice(0, 300) : null
                    ]
                );
            }
        } catch (err) {
            console.warn("[ClinicalCare] recordClinicalLearning non-blocking warning:", err.message);
        }
    }

    async recordClinicalFeedback({ memoryId, queryText, feedbackRating, notes }) {
        try {
            const isHelpful = feedbackRating === "HELPFUL";
            const isUnhelpful = feedbackRating === "UNHELPFUL";

            if (memoryId) {
                await pool.query(
                    \`UPDATE cca_ai_knowledge_memory 
                     SET feedback_count_positive = feedback_count_positive + ?,
                         feedback_count_negative = feedback_count_negative + ?,
                         confidence_score = LEAST(0.99, GREATEST(0.50, confidence_score + ?)),
                         feedback_rating = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?\`,
                    [
                        isHelpful ? 1 : 0,
                        isUnhelpful ? 1 : 0,
                        isHelpful ? 0.02 : -0.05,
                        feedbackRating,
                        memoryId
                    ]
                );
                return { success: true, message: "Feedback recorded successfully" };
            }

            if (queryText) {
                const [rows] = await pool.query(
                    \`SELECT id FROM cca_ai_knowledge_memory WHERE query_text LIKE ? LIMIT 1\`,
                    [\`%\${queryText.trim().slice(0, 50)}%\`]
                );
                if (rows && rows.length > 0) {
                    return await this.recordClinicalFeedback({
                        memoryId: rows[0].id,
                        feedbackRating,
                        notes
                    });
                }
            }

            return { success: true, message: "Feedback noted" };
        } catch (err) {
            console.error("[ClinicalCare] recordClinicalFeedback error:", err);
            return { success: false, message: err.message };
        }
    }

    async lookupClinicalKnowledge(queryText) {
        try {
            const q = String(queryText || "").toLowerCase().trim();
            const [rows] = await pool.query(
                \`SELECT * FROM cca_ai_knowledge_memory 
                 WHERE confidence_score >= 0.85 
                 ORDER BY feedback_count_positive DESC, frequency_count DESC 
                 LIMIT 20\`
            );

            for (const r of rows) {
                if (r.query_text && q.includes(r.query_text.toLowerCase())) {
                    return r;
                }
            }
            return null;
        } catch (err) {
            console.warn("[ClinicalCare] lookupClinicalKnowledge warning:", err.message);
            return null;
        }
    }

    isReportQuery(queryText) {
        const q = String(queryText || "").toLowerCase();
        return (
            q.includes("report") || q.includes("रिपोर्ट") ||
            q.includes("hemoglobin") || q.includes("hb") || q.includes("hemo") ||
            q.includes("platelet") || q.includes("प्लेटलेट") ||
            q.includes("sugar") || q.includes("glucose") || q.includes("शुगर") || q.includes("hba1c") ||
            q.includes("uric acid") || q.includes("यूरिक") ||
            q.includes("bp") || q.includes("blood pressure") || q.includes("रक्तचाप") ||
            q.includes("creatinine") || q.includes("wbc") || q.includes("cbc") ||
            q.includes("cholesterol") || q.includes("bilirubin") || q.includes("sgot") || q.includes("sgpt")
        );
    }

    analyzeLabReportQuery(queryText, isHindi = true) {
        const q = String(queryText || "").toLowerCase();

        // 1. Hemoglobin / Hb
        if (q.includes("hemoglobin") || q.includes("hb") || q.includes("hemo") || q.includes("खून की कमी") || q.includes("anemia")) {
            return {
                conditionName: "हीमोग्लोबिन स्तर व रक्त परीक्षण मूल्यांकन (Hemoglobin / CBC)",
                potentialCauses: "रिपोर्ट में हीमोग्लोबिन की कमी आयरन, विटामिन B12 या फोलिक एसिड की कमी के कारण हो सकती है (हल्का एनीमिया)। सामान्य स्तर: 12.0 - 15.5 g/dL.",
                medicine: {
                    name: "Iron + Folic Acid (Orofer XT / Autrin)",
                    dosage: "1 गोली दोपहर के भोजन के बाद पानी के साथ",
                    frequency: "दिन में 1 बार",
                    safeDuration: "1 से 2 माह (डॉक्टर परामर्श अनुसार)",
                    precautions: "दवा लेने के 1 घंटे पहले और बाद चाय या कॉफी न पिएं।",
                    pharmacyItem: "Orofer XT Tablet",
                    price: "₹145.00"
                },
                dietToEat: [
                    "पालक, मेथी, सरसों जैसी हरी पत्तेदार सब्जियां",
                    "अनार, सेब, चुकंदर और काले अंगूर",
                    "गुड़ और भुने चने, खजूर, मुनक्का",
                    "विटामिन सी युक्त आंवला व नींबू (आयरन अवशोषण बढ़ाता है)"
                ],
                dietToAvoid: [
                    "खाने के तुरंत बाद तेज चाय या कॉफी (आयरन ब्लॉक करती है)",
                    "जंक फूड, मैदा और पैकेज्ड स्नैक्स"
                ],
                redFlags: "यदि हीमोग्लोबिन 8.0 g/dL से कम हो, अत्यधिक चक्कर आएं या सांस फूले तो तुरंत फिजीशियन से मिलें।"
            };
        }

        // 2. Platelets
        if (q.includes("platelet") || q.includes("प्लेटलेट")) {
            return {
                conditionName: "प्लेटलेट्स काउंट व वायरल संक्रमण मूल्यांकन (Platelet Count)",
                potentialCauses: "प्लेटलेट्स की संख्या घटना आमतौर पर वायरल बुखार, डेंगू या मलेरिया के बाद होता है। सामान्य स्तर: 1.5 लाख से 4.5 लाख प्रति माइक्रोलिटर।",
                medicine: {
                    name: "ORS Electral + पपीता पत्ता अर्क (Caripill / Platimax)",
                    dosage: "ORS 1 लीटर पानी में दिनभर; पपीता सत्त सिरप/गोली डॉक्टर सलाह अनुसार",
                    frequency: "दिन में 2 बार",
                    safeDuration: "3 से 5 दिन",
                    precautions: "एस्पिरिन या ब्रूफेन दर्द की दवा कतई न लें (रक्तस्राव का गंभीर खतरा)।",
                    pharmacyItem: "ORS Oral Rehydration Salt Sachet",
                    price: "₹22.00"
                },
                dietToEat: [
                    "नारियल पानी (दिन में 2-3 बार हाइड्रेशन हेतु)",
                    "कीवी (Kiwi) फल और अनार का ताज़ा रस",
                    "पपीते के पत्ते का सीमित रस या गिलोय का हल्का काढ़ा",
                    "पतली मूंग दाल और हल्का सुपाच्य दलिया"
                ],
                dietToAvoid: [
                    "Aspirin / Brufen / Combiflam जैसी कोई भी दर्दनिवारक गोली",
                    "कठोर या नुकीला भोजन जिससे मसूड़ों में चोट लगे"
                ],
                redFlags: "यदि प्लेटलेट्स 50,000 से कम हों, मसूड़ों या नाक से खून आए या त्वचा पर लाल चकत्ते दिखें तो तुरंत अस्पताल इमरजेंसी जाएं।"
            };
        }

        // 3. Blood Sugar / Glucose / Diabetes / HbA1c
        if (q.includes("sugar") || q.includes("glucose") || q.includes("शुगर") || q.includes("hba1c") || q.includes("fasting") || q.includes("pp")) {
            return {
                conditionName: "ब्लड शुगर रिपोर्ट व ग्लूकोज नियंत्रण (Blood Sugar / Diabetes Evaluation)",
                potentialCauses: "फास्टिंग शुगर > 100 mg/dL या भोजन बाद (PP) > 140 mg/dL होना प्रीडायबिटीज या डायबिटीज का संकेत है। इंसुलिन प्रतिरोध या असंतुलित खानपान इसका मुख्य कारण है।",
                medicine: {
                    name: "Metformin 500mg (डॉक्टर द्वारा निर्धारित होने पर)",
                    dosage: "1 गोली भोजन के तुरंत बाद",
                    frequency: "डॉक्टर के पर्चे अनुसार (दिन में 1-2 बार)",
                    safeDuration: "नियमित चिकित्सकीय निगरानी में",
                    precautions: "दवा खाली पेट न लें। भोजन का समय नियत रखें ताकि अचानक लो शुगर (Hypoglycemia) न हो।",
                    pharmacyItem: "Metformin 500mg",
                    price: "₹45.00"
                },
                dietToEat: [
                    "मेथी दाना पानी (रात को भिगोकर सुबह पिएं)",
                    "करेला, जामुन, खीरा, टमाटर और हरी सब्जियां",
                    "जौ, चना और मल्टीग्रेन रोटी",
                    "दालचीनी की चाय (बिना चीनी)"
                ],
                dietToAvoid: [
                    "सफेद चीनी, गुड़, मिठाई, कोल्ड ड्रिंक्स और फलों के पैकेटबंद जूस",
                    "मैदा, सफेद चावल, समोसे, पिज्जा व तला हुआ खाना",
                    "आलू, अरबी और शकरकंद अधिक मात्रा में"
                ],
                redFlags: "यदि फास्टिंग शुगर > 250 mg/dL हो, अत्यधिक पेशाब, घबराहट या बेहोशी जैसे लक्षण हों तो तुरंत फिजीशियन से मिलें।"
            };
        }

        // 4. Uric Acid
        if (q.includes("uric acid") || q.includes("यूरिक") || q.includes("gout") || q.includes("गठिया")) {
            return {
                conditionName: "यूरिक एसिड व जोड़ों की सूजन मूल्यांकन (Uric Acid / Hyperuricemia)",
                potentialCauses: "रक्त में यूरिक एसिड (> 7.0 mg/dL) बढ़ने से जोड़ों में प्यूरीन क्रिस्टल जमा होने लगते हैं, जिससे पैर के अंगूठे, टखने और घुटनों में तेज दर्द व सूजन होती है।",
                medicine: {
                    name: "Febuxostat 40mg (चिकित्सक परामर्श पर) / Paracetamol (दर्द हेतु)",
                    dosage: "1 गोली भोजन के बाद",
                    frequency: "दिन में 1 बार",
                    safeDuration: "डॉक्टर के पर्चे अनुसार",
                    precautions: "दिनभर में कम से कम 3 से 4 लीटर पानी जरूर पिएं ताकि यूरिक एसिड पेशाब से बाहर निकल सके।",
                    pharmacyItem: "Paracetamol 650mg (Dolo 650)",
                    price: "₹32.50"
                },
                dietToEat: [
                    "भरपूर पानी, नींबू पानी (विटामिन सी यूरिक एसिड घटाने में मदद करता है)",
                    "सेब, चेरी, ककड़ी और लौकी का सूप",
                    "पतली छाछ और उबली हरी सब्जियां"
                ],
                dietToAvoid: [
                    "राजमा, छोले, चना, उड़द की दाल और अरहर की दाल का अधिक सेवन",
                    "लाल मांस (Red meat), सीफूड और शराब/बीयर (पूरी तरह बंद करें)",
                    "फूलगोभी, पालक, मशरूम और टमाटर के बीज"
                ],
                redFlags: "यदि जोड़ों में तेज लाली, अत्यधिक सूजन और चलने में असमर्थता हो तो तुरंत ऑर्थोपेडिक या जनरल फिजिशियन से मिलें।"
            };
        }

        // 5. Blood Pressure / BP
        if (q.includes("bp") || q.includes("blood pressure") || q.includes("रक्तचाप") || q.includes("hyperten")) {
            return {
                conditionName: "रक्तचाप (Blood Pressure) रिपोर्ट मूल्यांकन",
                potentialCauses: "सामान्य बीपी 120/80 mmHg होता है। 140/90 mmHg से अधिक सिस्टोलिक/डायस्टोलिक स्तर उच्च रक्तचाप (Hypertension) का संकेत है, जो तनाव, अधिक नमक या रक्तवाहिकाओं में खिंचाव से होता है।",
                medicine: {
                    name: "Amlodipine 5mg / Telmisartan 40mg (डॉक्टर द्वारा निर्धारित)",
                    dosage: "1 गोली सुबह नाश्ते के बाद नियत समय पर",
                    frequency: "दिन में 1 बार",
                    safeDuration: "नियमित चिकित्सकीय निगरानी में",
                    precautions: "नमक की मात्रा भोजन में 1 चम्मच (< 3g) तक सीमित करें। बिना डॉक्टर पूछे दवा बंद न करें।",
                    pharmacyItem: "Amlodipine 5mg",
                    price: "₹55.00"
                },
                dietToEat: [
                    "लहसुन की 1 कली सुबह खाली पेट",
                    "पोटेशियम युक्त भोजन जैसे केला, नारियल पानी और हरी सब्जियां",
                    "अलसी के बीज (Flaxseeds) और ओट्स",
                    "दिन में 30 मिनट हल्की सैर और गहरी सांस लेने का व्यायाम"
                ],
                dietToAvoid: [
                    "अचार, पापड़, नमकीन, चिप्स और ऊपर से छिड़का जाने वाला नमक",
                    "अत्यधिक चाय, कॉफी, एनर्जी ड्रिंक्स और सिगरेट/शराब",
                    "तले हुए पकौड़े और भारी गरिष्ठ भोजन"
                ],
                redFlags: "यदि बीपी 180/110 से अधिक हो, सिर में असहनीय दर्द, धुंधला दिखाई दे या सीने में भारीपन हो तो तुरंत 108 या इमरजेंसी में जाएं।"
            };
        }

        // Default Report Evaluation
        return {
            conditionName: "प्रयोगशाला जांच रिपोर्ट का सामान्य मूल्यांकन (Diagnostic Lab Evaluation)",
            potentialCauses: "जांच रिपोर्ट के मानों को मरीज के मौजूदा लक्षणों और मेडिकल हिस्ट्री के साथ मिलाकर समझना आवश्यक है। किसी भी अकेले टेस्ट नंबर से अंतिम निष्कर्ष नहीं निकाला जा सकता।",
            medicine: {
                name: "मल्टीविटामिन / सुरक्षित प्राथमिक परामर्श",
                dosage: "डॉक्टर द्वारा रिपोर्ट सत्यापन के बाद",
                frequency: "पर्चे अनुसार",
                safeDuration: "आवश्यकतानुसार",
                precautions: "बिना डॉक्टर के पर्चे के कोई भी एंटीबायोटिक या स्टेरॉयड दवा न लें।",
                pharmacyItem: "Multivitamin Capsule",
                price: "₹48.00"
            },
            dietToEat: [
                "संतुलित घर का बना भोजन और मौसमी फल",
                "दिन में 2.5-3 लीटर स्वच्छ उबला पानी",
                "ताज़ी दालें और हल्की सब्जियां"
            ],
            dietToAvoid: [
                "बाजार का खुला खाना, तेल-मसाले और डिब्बाबंद उत्पाद",
                "बिना डॉक्टर सलाह के अतिरिक्त सप्लीमेंट्स"
            ],
            redFlags: "यदि रिपोर्ट में कोई पैरामीटर अत्यधिक असामान्य हो (Critical Value) या कोई शारीरिक तकलीफ बढ़ रही हो तो तुरंत संबंधित विशेषज्ञ को रिपोर्ट दिखाएं।"
        };
    }
`;

// Insert helperMethods right before closing brace of ClinicalCareAssistantService
const lastBraceIndex = code.lastIndexOf('}');
code = code.slice(0, lastBraceIndex) + "\n" + helperMethods + "\n}\n" + code.slice(lastBraceIndex + 1);

// 2. In getKnowledgeForProblem, attach medicine: this.getOtcMedicine(...) to each condition
code = code.replace(
    'conditionName: "बुखार एवं मौसमी संक्रमण (Fever / Acute Viral Illness)",',
    'conditionName: "बुखार एवं मौसमी संक्रमण (Fever / Acute Viral Illness)",\n                medicine: this.getOtcMedicine("fever"),'
);
code = code.replace(
    'conditionName: "संभावित डेंगू संक्रमण (Suspected Dengue Viral Infection)",',
    'conditionName: "संभावित डेंगू संक्रमण (Suspected Dengue Viral Infection)",\n                medicine: this.getOtcMedicine("dengue"),'
);
code = code.replace(
    'conditionName: "टायफाइड ज्वर (Typhoid / Enteric Bacterial Fever)",',
    'conditionName: "टायफाइड ज्वर (Typhoid / Enteric Bacterial Fever)",\n                medicine: this.getOtcMedicine("typhoid"),'
);
code = code.replace(
    'conditionName: "पेट दर्द, गैस व एसिडिटी (Gastritis / Dyspepsia / Acid Reflux)",',
    'conditionName: "पेट दर्द, गैस व एसिडिटी (Gastritis / Dyspepsia / Acid Reflux)",\n                medicine: this.getOtcMedicine("acidity"),'
);
code = code.replace(
    'conditionName: "दस्त, लूज मोशन व आंतों का संक्रमण (Acute Diarrhea / Gastroenteritis)",',
    'conditionName: "दस्त, लूज मोशन व आंतों का संक्रमण (Acute Diarrhea / Gastroenteritis)",\n                medicine: this.getOtcMedicine("diarrhea"),'
);
code = code.replace(
    'conditionName: "उल्टी व मतली (Acute Emesis / Gastric Distress)",',
    'conditionName: "उल्टी व मतली (Acute Emesis / Gastric Distress)",\n                medicine: this.getOtcMedicine("vomiting"),'
);
code = code.replace(
    'conditionName: "सिरदर्द व माइग्रेन (Cephalea / Migraine / Tension Headache)",',
    'conditionName: "सिरदर्द व माइग्रेन (Cephalea / Migraine / Tension Headache)",\n                medicine: this.getOtcMedicine("headache"),'
);
code = code.replace(
    'conditionName: "खांसी, जुकाम व गले में संक्रमण (Upper Respiratory Tract Infection / Flu)",',
    'conditionName: "खांसी, जुकाम व गले में संक्रमण (Upper Respiratory Tract Infection / Flu)",\n                medicine: this.getOtcMedicine("cough_cold"),'
);
code = code.replace(
    'conditionName: "उच्च रक्तचाप (High Blood Pressure / Hypertension)",',
    'conditionName: "उच्च रक्तचाप (High Blood Pressure / Hypertension)",\n                medicine: this.getOtcMedicine("hypertension"),'
);
code = code.replace(
    'conditionName: "मधुमेह / हाई ब्लड शुगर (Diabetes Mellitus)",',
    'conditionName: "मधुमेह / हाई ब्लड शुगर (Diabetes Mellitus)",\n                medicine: this.getOtcMedicine("diabetes"),'
);
code = code.replace(
    'conditionName: "किडनी स्टोन व मूत्रमार्ग संक्रमण (Renal Calculi / Urinary Tract Infection)",',
    'conditionName: "किडनी स्टोन व मूत्रमार्ग संक्रमण (Renal Calculi / Urinary Tract Infection)",\n                medicine: this.getOtcMedicine("kidney_stone"),'
);
code = code.replace(
    'conditionName: "कमर व जोड़ों का दर्द और मांसपेशियों में अकड़न (Back Pain / Musculoskeletal Strain / Lumbar Stiffness)",',
    'conditionName: "कमर व जोड़ों का दर्द और मांसपेशियों में अकड़न (Back Pain / Musculoskeletal Strain / Lumbar Stiffness)",\n                medicine: this.getOtcMedicine("back_pain"),'
);
code = code.replace(
    'conditionName: "पीलिया एवं लिवर संक्रमण (Jaundice / Acute Viral Hepatitis / Liver Dysfunction)",',
    'conditionName: "पीलिया एवं लिवर संक्रमण (Jaundice / Acute Viral Hepatitis / Liver Dysfunction)",\n                medicine: this.getOtcMedicine("jaundice"),'
);
code = code.replace(
    'conditionName: "त्वचा एलर्जी, खुजली व संक्रमण (Dermatitis / Urticaria / Fungal Infection)",',
    'conditionName: "त्वचा एलर्जी, खुजली व संक्रमण (Dermatitis / Urticaria / Fungal Infection)",\n                medicine: this.getOtcMedicine("skin_allergy"),'
);
code = code.replace(
    'conditionName: "शारीरिक कमजोरी, थकान व खून की कमी (General Debility / Anemia / Micronutrient Deficiency)",',
    'conditionName: "शारीरिक कमजोरी, थकान व खून की कमी (General Debility / Anemia / Micronutrient Deficiency)",\n                medicine: this.getOtcMedicine("weakness"),'
);
code = code.replace(
    'conditionName: "स्वास्थ्य समस्या एवं लक्षण मूल्यांकन (Clinical Symptom Assessment)",',
    'conditionName: "स्वास्थ्य समस्या एवं लक्षण मूल्यांकन (Clinical Symptom Assessment)",\n                medicine: this.getOtcMedicine("general"),'
);

// 3. Update the symptom inquiry response generation to be concise and authentic with medicine card
const oldSymptomTarget = `            let hospitalsHindi = hospitals.map(h => 
                \`• **\${h.hospital_name}** (\${h.address || 'गोरखपुर'})\\n  - 📞 फोन: \\\`\${h.phone || '0551-2205555'}\\\` | आपातकाल: \\\`\${h.emergency_number || '108'}\\\`\\n  - 🏥 उपलब्ध बेड: \${h.total_beds || '200+'} (ICU: \${h.icu_beds || '40+'})\\n  - ⏰ ओपीडी समय: प्रातः 09:00 AM से 02:00 PM\`
            ).join("\\n\\n");

            let hospitalsEng = hospitals.map(h => 
                \`• **\${h.hospital_name}** (\${h.address || 'Gorakhpur'})\\n  - 📞 Phone: \\\`\${h.phone || '0551-2205555'}\\\` | Emergency: \\\`\${h.emergency_number || '108'}\\\`\\n  - 🏥 Total Beds: \${h.total_beds || '200+'} (ICU Beds: \${h.icu_beds || '40+'})\\n  - ⏰ OPD Hours: 09:00 AM to 02:00 PM\`
            ).join("\\n\\n");`;

const newSymptomReplacement = `            const isLabReport = this.isReportQuery(queryText);
            const reportData = isLabReport ? this.analyzeLabReportQuery(queryText, isHindi) : null;
            const activeKb = reportData || kb;

            const medicineInfo = activeKb.medicine || this.getOtcMedicine("general");
            const causesShort = (activeKb.potentialCauses || "").split(/।|\\./)[0];
            const avoidsShort = (activeKb.dietToAvoid || []).slice(0, 2);
            const eatsShort = (activeKb.dietToEat || []).slice(0, 2);`;

code = code.replace(oldSymptomTarget, newSymptomReplacement);

// Replace the verbose Hindi message
const oldHindiMsgTarget = `            if (isHindi) {
                responsePayload.message = \`🩺 **\${kb.conditionName} - संपूर्ण नैदानिक मार्गदर्शन**

---
### 1. 🔍 वास्तव में क्या समस्या हो सकती है (Potential Causes):
\${kb.potentialCauses}

---
### 2. 🍲 क्या खाना चाहिए (Recommended Diet & Fluids):
\${kb.dietToEat.map(d => \`• \${d}\`).join("\\n")}

---
### 3. 🚫 क्या परहेज करना चाहिए (What to Avoid):
\${kb.dietToAvoid.map(d => \`• \${d}\`).join("\\n")}
• **एलर्जी जांच (Allergy Check):** आपके रिकॉर्ड में दर्ज एलर्जी: *\${allergies}*

---
### 4. 🏠 घर पर बिगड़ने से कैसे रोकें (Home Care Guidance):
\${kb.homeCare.map(h => \`• \${h}\`).join("\\n")}
• **अनुकूली प्रश्न (Adaptive Questions):** लक्षण कब शुरू हुए? दर्द या बुखार की गंभीरता कितनी है? क्या उल्टी या चक्कर आ रहे हैं?

🔴 **गंभीर लक्षण (Red Flags / तुरंत अस्पताल जाएं):**
\${kb.redFlags}

---
### 5. 🩺 किस डॉक्टर / विभाग को दिखाना चाहिए (Specialist Category):
• **विभाग:** **\${kb.specialistCategory}**

---
### 6. 🏥 गोरखपुर के किन अस्पतालों में यह सुविधा उपलब्ध है:
\${hospitalsHindi}

---
### 7. 📊 लक्षण व आहार ट्रैकिंग:
आप नीचे दिए गए **'📊 Track This Symptom & Diet'** बटन पर क्लिक करके अपने इस लक्षण और खानपान को अपनी स्वास्थ्य डायरी में सुरक्षित कर सकते हैं।\`;
            } else {
                responsePayload.message = \`🩺 **\${kb.conditionName} - Clinical Decision Support**

---
### 1. 🔍 What Might Really Be the Problem (Potential Causes):
\${kb.potentialCauses}

---
### 2. 🍲 What to Eat (Recommended Diet & Hydration):
\${kb.dietToEat.map(d => \`• \${d}\`).join("\\n")}

---
### 3. 🚫 What to Avoid (Dietary & Lifestyle Precautions):
\${kb.dietToAvoid.map(d => \`• \${d}\`).join("\\n")}
• **Allergy Cross-Check:** Documented patient allergy profile: *\${allergies}*.

---
### 4. 🏠 How to Prevent Worsening at Home (Home Self-Care):
\${kb.homeCare.map(h => \`• \${h}\`).join("\\n")}
• **Adaptive Diagnostic Questions:** When did it start? How severe on scale 1-10? Any vomiting, bleeding, or shortness of breath?

🔴 **Red-Flag Warning Signs (Seek Immediate Medical Review):**
\${kb.redFlags}

---
### 5. 🩺 Specialist Doctor Category:
• **Clinical Specialty:** **\${kb.specialistCategory}**

---
### 6. 🏥 Available Hospitals in Gorakhpur (Verified Database):
\${hospitalsEng}

---
### 7. 📊 Symptom & Diet Tracking:
Click the **'📊 Track This Symptom & Diet'** action button below to automatically record this episode into your health dossier.\`;
            }`;

const newConciseMsgReplacement = `            if (isHindi) {
                responsePayload.message = \`🩺 **\${activeKb.conditionName}**

नमस्ते, मैंने आपकी समस्या समझी। \${causesShort ? causesShort + '।' : ''}

💊 **राहत हेतु सुरक्षित दवा (Recommended First-Line Care):**
• **दवा:** **\${medicineInfo.name}**
• **खुराक:** \${medicineInfo.dosage}
• **समय व नियम:** \${medicineInfo.frequency} (\${medicineInfo.safeDuration})
• ⚠️ **सावधानी:** \${medicineInfo.precautions}

🥗 **परहेज व देखभाल (Diet & Precautions):**
\${avoidsShort.map(a => \`• 🚫 **परहेज:** \${a}\`).join("\\n")}
\${eatsShort.map(e => \`• 🍲 **खानपान:** \${e}\`).join("\\n")}

⚠️ **डॉक्टर को कब दिखाएं:**
\${activeKb.redFlags}\`;
            } else {
                responsePayload.message = \`🩺 **\${activeKb.conditionName}**

Hello, I understand your concern. \${causesShort ? causesShort + '.' : ''}

💊 **Recommended Safe First-Line / OTC Care:**
• **Medicine:** **\${medicineInfo.name}**
• **Dosage:** \${medicineInfo.dosage}
• **Schedule:** \${medicineInfo.frequency} (\${medicineInfo.safeDuration})
• ⚠️ **Precaution:** \${medicineInfo.precautions}

🥗 **Diet & Precautions:**
\${avoidsShort.map(a => \`• 🚫 **Avoid:** \${a}\`).join("\\n")}
\${eatsShort.map(e => \`• 🍲 **Diet:** \${e}\`).join("\\n")}

⚠️ **When to Seek Immediate Medical Care:**
\${activeKb.redFlags}\`;
            }

            responsePayload.medicine_card = {
                medicine_name: medicineInfo.name,
                dosage: medicineInfo.dosage,
                frequency: medicineInfo.frequency,
                safe_duration: medicineInfo.safeDuration,
                precautions: medicineInfo.precautions,
                pharmacy_item: medicineInfo.pharmacyItem || medicineInfo.name,
                price: medicineInfo.price || "₹32.50",
                in_stock: true
            };

            // Non-blocking self-learning loop
            this.recordClinicalLearning({
                queryText,
                symptomCategory: triage.entity || intent,
                detectedDisease: activeKb.conditionName,
                suggestedMedicine: medicineInfo.name,
                dosage: medicineInfo.dosage,
                precautions: medicineInfo.precautions,
                dietGuidance: eatsShort.join(", "),
                redFlags: activeKb.redFlags,
                responseSummary: responsePayload.message.slice(0, 250),
                patientId: patientContext?.patient?.patient_id || null
            }).catch(e => console.warn("[LearningMemory] Non-blocking:", e.message));`;

code = code.replace(oldHindiMsgTarget, newConciseMsgReplacement);

// 4. Update REPORT_EXPLANATION to handle inline report queries when no uploaded reports exist
const oldReportExplanation = `            const reports = patientContext?.reports || [];
            if (reports.length === 0) {
                const reqId = patientContext?.requestedId || patientContext?.patient?.patient_id || "इस खाते";
                responsePayload.sources_used = ["Hospital Laboratory Information System"];
                responsePayload.why_this_answer = "No laboratory diagnostic reports found in MySQL for this UHID.";

                responsePayload.message = isHindi
                    ? \`माफ़ कीजिए (Sorry), इस आईडी (\${reqId}) से कोई पैथोलॉजी या रेडियोलॉजी जांच रिपोर्ट सिस्टम में दर्ज नहीं मिली है। अस्पताल द्वारा जांच रिपोर्ट अपलोड होते ही आप इसे यहां समझ सकते हैं।\`
                    : \`Sorry (माफ़ कीजिए), no laboratory diagnostic reports are logged for ID: \${reqId} in the hospital registry.\`;
            }`;

const newReportExplanation = `            const reports = patientContext?.reports || [];
            const isParamQuery = this.isReportQuery(queryText);

            if (reports.length === 0 && isParamQuery && (
                /\\d+/.test(queryText) || 
                queryText.toLowerCase().includes("sugar") || 
                queryText.toLowerCase().includes("hemoglobin") || 
                queryText.toLowerCase().includes("hb") || 
                queryText.toLowerCase().includes("platelet") || 
                queryText.toLowerCase().includes("uric") || 
                queryText.toLowerCase().includes("bp")
            )) {
                const repAnalysis = this.analyzeLabReportQuery(queryText, isHindi);
                responsePayload.classification_tag = "Lab Diagnostic Guidance";
                responsePayload.safety_badge = "Verified Medical Reference";
                responsePayload.sources_used = ["Standard Biological Reference Range Registry", "SmartCity Clinical Pharmacology"];
                responsePayload.why_this_answer = "Clinical interpretation of user-provided lab report parameters with OTC & dietary guidance.";

                const med = repAnalysis.medicine;
                if (isHindi) {
                    responsePayload.message = \`📋 **\${repAnalysis.conditionName}**

\${repAnalysis.potentialCauses}

💊 **संबंधित परामर्श व दवा (Recommended Care):**
• **दवा:** **\${med.name}**
• **खुराक:** \${med.dosage} (\${med.frequency})
• ⚠️ **सावधानी:** \${med.precautions}

🥗 **खानपान व परहेज (Diet & Precautions):**
\${repAnalysis.dietToEat.slice(0, 2).map(d => \`• 🍲 **खानपान:** \${d}\`).join("\\n")}
\${repAnalysis.dietToAvoid.slice(0, 2).map(d => \`• 🚫 **परहेज:** \${d}\`).join("\\n")}

⚠️ **डॉक्टर को कब दिखाएं:**
\${repAnalysis.redFlags}\`;
                } else {
                    responsePayload.message = \`📋 **\${repAnalysis.conditionName}**

\${repAnalysis.potentialCauses}

💊 **Recommended Care & Medicine:**
• **Medicine:** **\${med.name}**
• **Dosage:** \${med.dosage} (\${med.frequency})
• ⚠️ **Precaution:** \${med.precautions}

🥗 **Diet & Precautions:**
\${repAnalysis.dietToEat.slice(0, 2).map(d => \`• 🍲 **Recommended:** \${d}\`).join("\\n")}
\${repAnalysis.dietToAvoid.slice(0, 2).map(d => \`• 🚫 **Avoid:** \${d}\`).join("\\n")}

⚠️ **When to Consult Doctor:**
\${repAnalysis.redFlags}\`;
                }

                responsePayload.medicine_card = {
                    medicine_name: med.name,
                    dosage: med.dosage,
                    frequency: med.frequency,
                    safe_duration: med.safeDuration,
                    precautions: med.precautions,
                    pharmacy_item: med.pharmacyItem || med.name,
                    price: med.price || "₹32.50",
                    in_stock: true
                };

                this.recordClinicalLearning({
                    queryText,
                    symptomCategory: "LAB_REPORT",
                    detectedDisease: repAnalysis.conditionName,
                    suggestedMedicine: med.name,
                    dosage: med.dosage,
                    precautions: med.precautions,
                    dietGuidance: repAnalysis.dietToEat.slice(0, 2).join(", "),
                    redFlags: repAnalysis.redFlags,
                    responseSummary: responsePayload.message.slice(0, 250),
                    patientId: patientContext?.patient?.patient_id || null
                }).catch(e => console.warn("[LearningMemory] Non-blocking:", e.message));

            } else if (reports.length === 0) {
                const reqId = patientContext?.requestedId || patientContext?.patient?.patient_id || "इस खाते";
                responsePayload.sources_used = ["Hospital Laboratory Information System"];
                responsePayload.why_this_answer = "No laboratory diagnostic reports found in MySQL for this UHID.";

                responsePayload.message = isHindi
                    ? \`माफ़ कीजिए (Sorry), इस आईडी (\${reqId}) से कोई जांच रिपोर्ट सिस्टम में नहीं मिली है। आप अपनी रिपोर्ट का नाम और मान (जैसे "Hemoglobin 9.5" या "Sugar 160") सीधे लिखकर भी मार्गदर्शन प्राप्त कर सकते हैं।\`
                    : \`Sorry (माफ़ कीजिए), no lab reports found for ID: \${reqId}. You can type your test name & values (e.g. "Hemoglobin 9.5" or "Sugar 160") directly for guidance.\`;
            }`;

code = code.replace(oldReportExplanation, newReportExplanation);

fs.writeFileSync(servicePath, code, 'utf8');
console.log("Updated file written. New length:", code.length);
