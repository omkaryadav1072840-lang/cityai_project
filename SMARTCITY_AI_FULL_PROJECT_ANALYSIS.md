# SMARTCITY AI — संपूर्ण प्रोजेक्ट कोड, एल्गोरिदम एवं आर्किटेक्चर विश्लेषण रिपोर्ट (Master Technical Audit)

**प्लेटफ़ॉर्म**: गोरखपुर स्मार्ट सिटी मैनेजमेंट एवं इंटीग्रेटेड कमांड एंड कंट्रोल सेंटर (ICCC)  
**वर्जन**: 2.5.0 Enterprise Edition  
**लोकेशन**: गोरखपुर, उत्तर प्रदेश, भारत  
**तकनीकी वातावरण**: Node.js (Express 5.2) • Python 3.13 (FastAPI) • MySQL 8.0 • Leaflet GIS & OpenLayers • Socket.IO WebSockets • ESP32 IoT Firmware  
**तैयार किया गया डॉक्युमेंट**: `SMARTCITY_AI_FULL_PROJECT_ANALYSIS.pdf` (Workspace Root में उपलब्ध)

---

## 1. सिस्टम आर्किटेक्चर एवं टोपोलॉजी (System Topology)

```
                            [ Citizen / Staff / Admin Web & Mobile PWA ]
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
    [ Static Assets & Nginx Reverse Proxy ]                     [ Express 5 Master Gateway (Port 5000) ]
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 │
                                 [ Security & Gateway Pipeline ]
                   ┌─────────────────────────────┼─────────────────────────────┐
                   ▼                             ▼                             ▼
         [ Security Headers ]           [ Rate Limiters ]            [ JWT & RBAC Auth Guard ]
        (XSS, HSTS, Sniff, CSP)         (Auth, SOS, AI, API)         (In-memory Revocation List)
                   │                             │                             │
                   └─────────────────────────────┼─────────────────────────────┘
                                                 │
                                   [ 29 Modular REST Route APIs ]
                                                 │
     ┌───────────────┬───────────────┬───────────┴───┬───────────────┬───────────────┐
     ▼               ▼               ▼               ▼               ▼               ▼
[ Traffic/ATCS ] [ Healthcare ]  [ Smart Parking ] [ Water SCADA ] [ Smart Waste ] [ Grounded AI ]
     │               │               │               │               │               │
     └───────────────┴───────────────┼───────────────┴───────────────┴───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
     [ MySQL 8.0 Enterprise ]                [ Socket.IO Real-Time Engine ]
       • 117 Active Tables                     • 6 Active Telemetry Rooms
       • Connection Pool (Max 20 conns)        • 1s Traffic Phasing Countdown
       • Dedicated AI Prediction Ledgers       • 2s Ambulance GPS Radar Stream
                 │                             • 60s SLA Escalation Ticker
                 ▼
     [ Python FastAPI AI Microservice ] (Port 8000)
       • Scikit-Learn Random Forest Traffic Model (traffic_model.joblib)
       • Gradient Boosting Waste Priority Classifier (waste_model.joblib)
       • Clinical Care TF-IDF Logistic Regression (clinical_intent_classifier.joblib)
       • OpenCV & Tesseract OCR ANPR Vision Pipeline
```

---

## 2. मास्टर एल्गोरिदम कैटलॉग (Algorithms Used, Formulas & Code Locations)

प्रोजेक्ट में उपयोग किए गए सभी 12 मुख्य एल्गोरिदम, उनका गणितीय फॉर्मूला, लॉजिक और कोड लोकेशन:

### 2.1 Webster Signal Optimization Algorithm (IRC:93 Standard)
- **उपयोग का स्थान (Location)**: 
  - `backend/services/traffic_engine.js` (`recalculateJunctionCongestionFromCameras()`, `tickSignalCycles()`)
  - `backend/services/traffic_ai_service.js` (`optimizeSignalWebster()`)
  - `backend/services/signal_safety_service.js`
- **गणितीय सूत्र (Mathematical Formula)**:
  $$C_0 = \frac{1.5L + 5}{1 - Y}$$
  जहाँ:
  - $C_0$ = इष्टतम चक्र समय (Optimum Cycle Length in seconds, बाउंडेड: $45 \le C_0 \le 150$ सेकंड).
  - $L$ = कुल लॉस्ट टाइम प्रति चक्र ($L = 2 \times 4 + 4 = 12$ सेकंड).
  - $Y$ = सभी फेजों के क्रिटिकल फ्लो रेशियो का योग ($Y = \sum y_i = \sum \frac{q_i}{s_i}$).
  - $q_i$ = अप्रोच फ्लो रेट (Vehicles Per Hour - VPH).
  - $s_i$ = सैचुरेशन फ्लो रेट ($1800$ VPH प्रति लेन).
  - इफेक्टिव ग्रीन टाइम स्प्लिट: $g_i = \frac{y_i}{Y} \times (C_0 - L)$.
- **सुरक्षा सीमाएं (Safety Bounds)**:
  - न्यूनतम ग्रीन टाइम = 15 सेकंड
  - अधिकतम ग्रीन टाइम = 120 सेकंड
  - एम्बर (Yellow) इंटरवल = 4 सेकंड
  - ऑल-रेड क्लीयरेंस = 2 सेकंड
  - पैदल यात्री (Pedestrian) फेज = 18 सेकंड
  - व्हीकल स्टार्वेशन प्रिवेंशन थ्रेशोल्ड = 180 सेकंड

---

### 2.2 Dijkstra's Shortest Path & Dynamic Route Bypass Algorithm
- **उपयोग का स्थान (Location)**: `backend/services/gorakhpur_road_graph.js` (`calculateThreeRoutes()`, `_dijkstra()`)
- **डेटा स्ट्रक्चर**: टोपोलॉजिकल रोड नेटवर्क ग्राफ $G = (V, E)$, जिसमें गोरखपुर के 17 वास्तविक नोड्स (Golghar, Railway Station, AIIMS, BRD Medical, Gorakhnath Mandir, Kunraghat, Nausarh, etc.) और 18 दिशात्मक लिंक्स शामिल हैं।
- **तीन गणना किए गए रूट्स (Three Calculated Routes)**:
  1. **Fastest Arterial Route (लाइव ट्रैफिक वेटेड)**:
     $$\text{Cost} = T = \frac{\text{Distance}}{v_{\text{eff}}}$$
     जहाँ $v_{\text{eff}} = v_{\text{limit}} \times \max\left(0.25, 1 - \frac{\text{Congestion}}{100} \times 0.70\right)$.
  2. **Low-Traffic Smart Bypass (क्वाड्रैटिक कंजेशन पेनल्टी)**:
     $$\text{Cost} = T_{\text{base}} \times \left(1 + \left(\frac{\max(0, \text{Congestion} - 30)}{15}\right)^{2.2}\right)$$
  3. **Minimum-Junctions Highway Route (ट्रैफिक सिग्नल इंटरसेक्शन पेनल्टी)**:
     $$\text{Cost} = T_{\text{base}} + \text{Penalty}_{\text{junction}} \quad (\text{यदि नोड सिग्नल चौराहा है तो } +4.5\text{ मिनट})$$

---

### 2.3 Haversine Geodesic Distance & Emergency 600m Green Wave Preemption
- **उपयोग का स्थान (Location)**: 
  - `backend/services/traffic_ai_service.js` (`processAmbulanceApproaching()`)
  - `backend/services/ambulance_corridor_service.js`
  - `backend/services/ambulance_simulator.js`
  - `backend/services/water_intelligence_service.js` (`haversineMeters()`)
- **गणितीय सूत्र (Mathematical Formula)**:
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
  $$\text{Distance } d = R \cdot c \quad (R = 6,371,000 \text{ मीटर})$$
- **ग्रीन वेव प्रीमेम्प्शन लॉजिक**:
  - जब एम्बुलेंस का टारगेट जंक्शन से फासला $d \le 600$ मीटर होता है:
  - इंटरलॉकिंग सिस्टम क्रॉस-स्ट्रीट्स को तुरंत `Force Red` में लॉक करता है।
  - एम्बुलेंस की अप्रोच लेन को 180 सेकंड के लिए `Force Green` प्रदान किया जाता है।
  - रियल-टाइम ब्रॉडकास्ट: `traffic:ambulance_green_wave`।

---

### 2.4 Traveling Salesperson Problem (TSP) / Nearest-Neighbor Heuristic (Smart Waste)
- **उपयोग का स्थान (Location)**: 
  - `backend/services/waste_ai_service.js` (`optimizeCollectionRoute()`)
  - `backend/controllers/waste.controller.js`
- **एल्गोरिदम लॉजिक**:
  - फिल्टरिंग: केवल वे डस्टबिन चुने जाते हैं जिनका भराव स्तर $\ge 70\%$ हो।
  - ग्रीडी नियरेस्ट-नेबर (Greedy Nearest-Neighbor) क्रम में डस्टबिन्स को सॉर्ट किया जाता है ताकि कॉम्पेक्टर ट्रक का ईंधन और यात्रा समय न्यूनतम हो।
  - रूट अवधि गणना:
    $$\text{Total Duration} = \sum (\text{Stops} \times 8\text{ मिनट}) + (\text{Route Distance in KM} \times 3.5\text{ मिनट})$$

---

### 2.5 SCADA Pipeline Hydraulic Anomaly & Leak Detection Algorithm
- **उपयोग का स्थान (Location)**: 
  - `backend/services/water_ai_service.js` (`detectPipeAnomalies()`)
  - `backend/services/water_intelligence_service.js`
- **लॉजिक एवं थ्रेशोल्ड्स**:
  - पाइपलाइन इनफ्लो ($Q_{\text{in}}$ L/s), आउटफ्लो ($Q_{\text{out}}$ L/s), और प्रेशर ($P$ bar) का तुलनात्मक मूल्यांकन।
  $$\text{Loss Rate Pct } = \frac{Q_{\text{in}} - Q_{\text{out}}}{Q_{\text{in}}} \times 100$$
  - **Catastrophic Pipe Burst**: यदि $P < 1.6 \text{ bar} \land \text{Loss} > 22\% \implies$ Anomaly Score: 0.94 (गंभीरता: CRITICAL, ऑटो-वाल्व शटडाउन निर्देश)।
  - **Pressure Drop**: यदि $P < 2.0 \text{ bar} \land \text{Loss} > 15\% \implies$ Anomaly Score: 0.78 (एकॉस्टिक लीक डिटेक्शन टीम अलर्ट)।
  - **Unexplained Conveyance Loss**: यदि $\text{Loss} > 18\% \implies$ Anomaly Score: 0.65 (गैर-राजस्व जल चोरी की जांच)।

---

### 2.6 Multi-Criteria Priority Scoring & SLA Escalation Ladder
- **उपयोग का स्थान (Location)**: 
  - `backend/services/priority_engine.js` (`calculatePriorityAndSLA()`)
  - `backend/services/sla_engine.js` (`checkEscalations()`)
- **निर्धारक मैट्रिक्स (Deterministic Matrix)**:
  - **CRITICAL (2 घंटे SLA)**: Fire, blast, explosion, cardiac, life-threatening, gas leak, building collapse.
  - **HIGH (6 घंटे SLA)**: Sewage overflow, pipe burst, dead animal, power blackout, broken traffic signal.
  - **MEDIUM (24 घंटे SLA)**: Pothole, garbage pile, dim street light, stray dog, traffic slow.
  - **LOW (72 घंटे SLA)**: सामान्य पूछताछ, रूटीन मेंटेनेंस सुझाव।
- **ऑटो-एस्केलेशन डेमन (Auto-Escalation Daemon)**:
  - हर 60 सेकंड में `service_requests` टेबल को स्कैन करता है।
  - यदि `sla_deadline < NOW()` और स्टेटस क्लोज नहीं है, तो तुरंत स्टेटस को `Escalated` करता है और सुपरवाइजर को `request:escalated` एवं `notification:new` भेजता है।

---

### 2.7 Clinical RAG (Retrieval-Augmented Generation) Hybrid Semantic Search
- **उपयोग का स्थान (Location)**: 
  - `backend/services/clinical_rag_service.js` (`searchGuidelines()`, `_tokenize()`)
  - `backend/services/clinical_care_assistant_service.js`
- **एल्गोरिदम चरण**:
  1. **मल्टीलिंगुअल टोकेनाइजेशन**: टेक्स्ट को क्लीन करके 3-कैरेक्टर n-gram शिंगल्स बनाता है (हिंग्लिश की स्पेलिंग गलतियों और बोलचाल को मैच करने हेतु)।
  2. **हाइब्रिड स्कोरिंग**:
     - डायरेक्ट वर्ड ओवरलैप (वेट: 2.5)
     - मेडिकल कीवर्ड मैच (बूस्ट: +6.0)
     - टॉपिक और टाइटल मैच (बूस्ट: +8.0)
  3. **नॉर्मलाइजेशन व थ्रेशोल्डिंग**: स्कोर $\ge 0.15$ वाले डाक्यूमेंट्स का चयन।
  4. **SHA-256 चेकसम वेरिफिकेशन**: आईसीएमआर (ICMR), एम्स (AIIMS) और डब्ल्यूएचओ (WHO) के क्लीनिकल कॉर्पस की अखंडता की पुष्टि।

---

### 2.8 Computer Vision & License Plate Recognition (ANPR / OCR)
- **उपयोग का स्थान (Location)**: 
  - `backend/services/cv_anpr_service.js` (`analyzeFrame()`, `processPlateAndViolation()`)
  - `ai_service/camera_vision.py`
- **पाइपलाइन**:
  - OpenCV कॉन्टूर एवं मॉर्फोलॉजिकल ट्रांसफॉर्म्स द्वारा नंबर प्लेट रीजन लोकलाइजेशन।
  - Tesseract OCR + रेगुलर एक्सप्रेशन पैटर्न सत्यापन: `^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$` (उदा. `UP53BZ4821`)।
  - **ह्यूमन-इन-द-लूप (Human-in-the-Loop)**: चालान को पहले `AI_FLAGGED` स्टेज में रखा जाता है। जब तक ट्रैफिक पुलिसकर्मी वीडियो फुटेज देखकर डिजिटल साइन नहीं करता, चालान कानूनी रूप से इशू नहीं होता।

---

### 2.9 Machine Learning Predictive Pipelines (Scikit-Learn Models)
- **उपयोग का स्थान (Location)**: 
  - `ai_service/artifacts/models/*.joblib`
  - `ai_service/training/*.py`
  - `ai_service/app/services/*.py`
- **मॉडेल्स का विवरण**:
  1. **Traffic Congestion Predictor (`traffic_model.joblib`)**:
     - एल्गोरिदम: `RandomForestRegressor`
     - वैलिडेशन: `TimeSeriesSplit` (फ्यूचर डेटा लीकेज रोकने के लिए)।
     - फीचर्स: `hour`, `day_of_week`, `is_weekend`, `is_peak_hour`, `aqi`, `active_incidents`।
  2. **Waste Collection Priority Classifier (`waste_model.joblib`)**:
     - एल्गोरिदम: `GradientBoostingClassifier`
     - 4 क्लासेस: `NORMAL`, `MEDIUM`, `HIGH`, `IMMEDIATE_DISPATCH`।
  3. **Clinical Intent Classifier (`clinical_intent_classifier.joblib`)**:
     - एल्गोरिदम: `TfidfVectorizer` + `CalibratedClassifierCV(LogisticRegression)`
     - 10 क्लीनिकल क्लासेस, जिसमें इमरजेंसी फॉल्स-नेगेटिव की दर $0.0\%$ सुनिश्चित की गई है।

---

### 2.10 Air Quality Index (AQI) Calculation (CPCB National Standard)
- **उपयोग का स्थान (Location)**: 
  - `backend/services/environment_disaster_ai_service.js` (`forecastAQI()`)
  - `backend/ai/predictions/aqi/aqi_predictor.js`
- **गणितीय सूत्र (Piecewise Linear Interpolation)**:
  $$I_p = \frac{I_{\text{hi}} - I_{\text{lo}}}{B_{\text{hi}} - B_{\text{lo}}} (C_p - B_{\text{lo}}) + I_{\text{lo}}$$
  जहाँ $C_p$ प्रदूषक ($PM_{2.5}, PM_{10}, NO_2$) की मापी गई सांद्रता है।

---

### 2.11 IoT Hardware Ultrasonic Physics Formula
- **उपयोग का स्थान (Location)**: `iot_hardware/esp32_smart_dustbin.ino`
- **गणितीय सूत्र**:
  $$\text{Distance (cm)} = \frac{\text{Echo Pulse Duration (\mu s)} \times 0.0343}{2}$$
  $$\text{Fill Percentage (\%)} = \left(\frac{\text{Bin Depth (120cm)} - \text{Distance}}{\text{Bin Depth}}\right) \times 100$$
- **PIR मोशन इंटरप्ट**: `IRAM_ATTR onPersonApproached()` हार्डवेयर इंटरप्ट द्वारा कचरा डालने आए नागरिकों का फुटफॉल काउंट।

---

### 2.12 Cryptographic Security & DPDP Privacy Protection
- **उपयोग का स्थान (Location)**: 
  - `backend/middleware/auth.middleware.js`
  - `backend/services/clinical_safety_privacy_engine.js` (`redactPii()`, `detectPromptInjection()`)
  - `backend/services/otp_service.js`
- **लॉजिक**:
  - आधार कार्ड (12 अंक), पैन कार्ड (10 अल्फान्यूमेरिक), क्रेडिट कार्ड (16 अंक) और पासवर्ड्स का ऑटोमैटिक Regex रेडैक्शन।
  - JWT इन-मेमोरी टोकन रिवोकेशन लिस्ट (लॉगआउट और पासवर्ड बदलने पर तत्काल सत्र समाप्ति)।
  - 6-अंकों का टाइम-बाउंड क्रिप्टोग्राफिक OTP जनरेशन (SHA-256 हैशिंग के साथ)।

---

## 3. कोर मॉड्यूल्स एवं फंक्शन्स की सूची (Key Files & Functions Breakdown)

| फ़ाइल पाथ (File Path) | प्रमुख फ़ंक्शन्स (Functions) | उद्देश्य व कार्यप्रणाली (Purpose & Description) |
| :--- | :--- | :--- |
| `backend/server.js` | `server.listen()`, `app.use()`, `gracefulShutdown()` | मास्टर एक्सप्रेस 5 गेटवे, zlib कम्प्रेशन, सॉकेट इनिशियलाइजेशन, ग्रेसफुल शटडाउन। |
| `backend/services/traffic_engine.js` | `start()`, `tickSignalCycles()`, `updateSimulatedTelemetry()`, `recalculateJunctionCongestionFromCameras()`, `dispatchEmergencyCorridor()`, `deactivateEmergencyCorridor()` | सिग्नल टाइमर, कैमरा जेनरेशन, कंजेशन स्कोरिंग, इमरजेंसी ग्रीन कॉरिडोर एग्जीक्यूशन। |
| `backend/services/gorakhpur_road_graph.js` | `findNearestNode()`, `calculateThreeRoutes()`, `_dijkstra()`, `_formatRouteOutput()` | गोरखपुर रोड नेटवर्क का ग्राफ विश्लेषण, 3 अलग-अलग अल्टरनेटिव पाथ्स की गणना। |
| `backend/services/ambulance_simulator.js` | `startSimulation()`, `stopSimulation()`, `moveAmbulancesTick()`, `getStatus()` | 6 लाइव एम्बुलेंसों का 2 सेकंड के अंतराल पर रियल-टाइम GPS मूवमेंट और ग्रीन वेव इंटिग्रेशन। |
| `backend/services/traffic_ai_service.js` | `predictMultiHorizon()`, `optimizeSignalWebster()`, `coordinateCorridor()`, `processAmbulanceApproaching()` | 15/30/60 मिनट का ट्रैफिक प्रेडिक्शन, वेबस्टर कैलकुलेशन, 600m एम्बुलेंस प्रीमेम्प्शन। |
| `backend/services/waste_ai_service.js` | `predictBinFillLevel()`, `optimizeCollectionRoute()`, `forecastWardWaste()`, `classifyWasteImage()` | डस्टबिन भरने का समय, 8 प्रमुख स्टॉप्स का TSP रूट ऑप्टिमाइज़ेशन, वार्ड-स्तरीय कचरा अनुमान। |
| `backend/services/water_ai_service.js` | `detectPipeAnomalies()`, `forecastDemand()` | पाइप फटने (Burst) और अचानक प्रेशर गिरने का डिटेक्शन, 24 घंटे की पानी की मांग का प्रेडिक्शन। |
| `backend/services/water_intelligence_service.js` | `haversineMeters()`, `distToSegmentMeters()`, `verifyWaterQualityAgainstRegulations()`, `auditLog()` | 3D/2D पाइपलाइन डिजिटल ट्विन, CPCB मानकों के तहत सीवेज ट्रीटमेंट प्लांट (STP) पानी का परीक्षण। |
| `backend/services/healthcare_ai_service.js` | `forecastBedSurge()`, `recommendOptimalBed()` | गोरखपुर के अस्पतालों (AIIMS, BRD) में बेड सर्ज और आईसीयू ऑक्यूपेंसी का प्रेडिक्शन। |
| `backend/services/clinical_care_assistant_service.js` | `detectLanguage()`, `extractMedicineFromQuery()`, `triageEmergency()`, `generateClinicalResponse()` | हिंग्लिश/हिंदी एनएलपी भाषा पहचान, इमरजेंसी ट्राइएज, प्रमाणित 7-पार्ट क्लीनिकल गाइडेंस। |
| `backend/services/clinical_rag_service.js` | `ingestCorpus()`, `_tokenize()`, `searchGuidelines()`, `buildCitationBlock()` | ICMR/AIIMS गाइडलाइंस की हाइब्रिड लेक्सिकल-सेमेंटिक सर्च और साइटेशन जनरेशन। |
| `backend/services/clinical_safety_privacy_engine.js` | `redactPii()`, `sanitizeForAudit()`, `detectPromptInjection()`, `enforcePatientIsolation()` | आधार/पैन रेडैक्शन, प्रॉम्प्ट इंजेक्शन से बचाव, मरीज डेटा आइसोलेशन (IDOR प्रिवेंशन)। |
| `backend/services/cv_anpr_service.js` | `analyzeFrame()`, `processPlateAndViolation()` | कैमरा इमेज से वाहनों की गिनती, ANPR नंबर प्लेट डिटेक्शन और ई-चालान स्टेजिंग। |
| `backend/services/priority_engine.js` | `calculatePriorityAndSLA()` | कीवर्ड और विभाग के आधार पर 2h, 6h, 24h, 72h की SLA डेडलाइन निर्धारित करना। |
| `backend/services/sla_engine.js` | `checkEscalations()`, `start()`, `stop()` | 60 सेकंड के इंटरवल पर ब्रीच हुई शिकायतों को सुपरवाइजर को ऑटो-एस्केलेट करना। |
| `backend/services/grounded_tools.js` | `find_hospitals()`, `find_hospital_beds()`, `find_doctors()`, `find_parking()`, `get_traffic_status()`, `what_if_simulation()`... (25 Tools) | MySQL डेटाबेस से सीधे कनेक्ट होकर बिना हॉलीसिनेशन (Zero-Hallucination) जवाब देना। |
| `backend/services/ai_orchestrator.js` | `classifyIntent()`, `executeGroundedTool()`, `processUserQuery()` | यूजर के प्रश्न के अनुसार 25 टूल्स में से सही टूल चुनना और जेमिनी या लोकल हीयूरिस्टिक को पास करना। |
| `backend/sockets/index.js` | `initSockets()`, `emitAmbulanceLocation()`, `emitEmergencyAlert()`, `emitParkingUpdate()` | सॉकेट कनेक्शन हैंकिंग, रूम मैनेजमेंट, और रियल-टाइम टेलीमेट्री ब्रॉडकास्टिंग। |
| `iot_hardware/esp32_smart_dustbin.ino` | `setup()`, `loop()`, `measureUltrasonicDistanceCM()`, `onPersonApproached()` | ESP32 अल्ट्रासोनिक दूरी मापन, फुटफॉल इंटरप्ट, और HTTP REST API टेलीमेट्री सेंड। |

---

## 4. टेक्नोलॉजी स्टैक एवं उपयोग की गई लाइब्रेरीज़ (Tech Stack & APIs)

### 4.1 Frontend Layer
- **HTML5 & CSS3 Glassmorphism**: टोकन-बेस्ड आधुनिक डार्क/लाइट UI, ग्लास-इफेक्ट मॉड्यूलर कार्ड्स।
- **Vanilla ES6+ JavaScript**: बिना भारी फ्रेमवर्क (React/Angular) के सुपरफास्ट 60fps परफॉर्मेंस।
- **Leaflet GIS (v1.9.4)**: इंटरएक्टिव स्ट्रीट मैप्स, कस्टम मार्कर आइकन्स, पॉलीलाइन्स, और वेपॉइंट्स।
- **OpenLayers (v9.2.4)**: एडवांस ट्रैफिक मैप और वेक्टर टाइल रेंडरिंग।
- **Socket.IO Client (v4.8.1)**: लो-लेटेंसी रियल-टाइम वेबसॉकेट कम्युनिकेशन।
- **Three.js & WebGL**: वाटर मैनेजमेंट 3D डिजिटल ट्विन एक्सप्लोरर (`water_3d_explorer.js`)।
- **QRCode.js**: आयुष्मान भारत डिजिटल हेल्थ पास और स्मार्ट पार्किंग बारकोड जनरेशन।
- **Capacitor 8.5**: एंड्रॉइड नेटिव एपीके (Android APK) जनरेशन (`build_apk.bat`, `open_android.bat`)।
- **Service Worker (`sw.js`)**: प्रोग्रेसिव वेब ऐप (PWA) ऑफलाइन सपोर्ट और इंटेलिजेंट एसेट कैशिंग।

### 4.2 Backend Layer
- **Node.js (v20+) & Express 5.2.1**: कोर API गेटवे।
- **`mysql2/promise`**: प्रॉमिस-बेस्ड MySQL कनेक्शन पूल (20 पैरेलल कनेक्शन्स)।
- **Socket.IO (v4.8.3)**: पब-सब (Pub/Sub) मॉडल पर आधारित रियल-टाइम टेलीमेट्री।
- **`jsonwebtoken` (v9.0.3)**: स्टेटलेस HMAC-SHA256 ऑथेंटिकेशन।
- **`zlib`**: नेटिव HTTP कम्प्रेशन (Gzip & Deflate), जो डेटा पेलोड को $70\text{--}85\%$ तक कम कर देता है।
- **`multer` (v2.2.0)**: मेडिकल प्रिस्क्रिप्शन और पुलिस शिकायत फोटो अपलोड्स के लिए।
- **`nodemailer` (v10.1.7)**: पासवर्ड रीसेट और इमरजेंसी अलर्ट्स के लिए।

### 4.3 Python & Machine Learning Layer
- **Python 3.10 – 3.13**: हाई-परफॉर्मेंस बैकएंड ML एनवायरनमेंट।
- **FastAPI & Uvicorn**: एसिंक्रोनस REST API माइक्रोलिंक (Port `8000`)।
- **Scikit-learn**:
  - `RandomForestRegressor`
  - `GradientBoostingClassifier`
  - `LogisticRegression`
  - `TfidfVectorizer`
  - `CalibratedClassifierCV`
  - `TimeSeriesSplit`
- **OpenCV (`cv2`) & Tesseract OCR**: CCTV कैमरा फुटेज प्रोसेसिंग और नंबर प्लेट डिटेक्शन।
- **Pandas & NumPy**: न्यूमेरिकल एवं टाइम-सीरीज डेटा ट्रांसफॉर्मेशन।
- **Joblib**: ट्रेन्ड मॉडल्स का डिस्क पर सीरियलाइजेशन और फास्ट लोडिंग।
- **Google Gemini 1.5 Flash API**: जेनेरेटिव रीजनिंग के लिए (की कन्फिगर होने पर)।

### 4.4 IoT Hardware & Embedded Firmware
- **ESP32 Microcontroller (32-bit Dual Core Tensilica Xtensa)**
- **HC-SR04 / JSN-SR04T Ultrasonic Sensor**: $2\text{cm} - 400\text{cm}$ दूरी मापन।
- **PIR Motion Sensor (HC-SR501)**: इन्फ्रारेड मोशन डिटेक्शन।
- **ArduinoJson Library (v6/v7)**: JSON पेलोड सीरियलाइजेशन।
- **WiFiClient & HTTPClient**: वाई-फाई के जरिए सर्वर को सीधे REST POST टेलीमेट्री भेजना।

---

## 5. रियल-टाइम सॉकेट चैनल्स एवं इवेंट्स (Socket.IO Real-Time Channels)

### 5.1 सॉकेट रूम्स (Socket Rooms)
1. `ambulance-tracking`: एम्बुलेंसों की लाइव जीपीएस ट्रैकिंग सुनने के लिए।
2. `parking-updates`: पार्किंग स्लॉट खाली या भरने की सूचना के लिए।
3. `emergency-alerts`: 1-टैप SOS और गंभीर दुर्घटनाओं के ब्रॉडकास्ट के लिए।
4. `water-updates`: पानी की टंकी लेवल और पाइपलाइन प्रेशर अपडेट्स के लिए।
5. `waste-updates`: डस्टबिन भराव और गार्बेज ट्रक जीपीएस लोकेशन के लिए।
6. `city-updates`: सामान्य नागरिक अपडेट्स, हॉस्पिटल बेड्स और AQI अलर्ट्स के लिए।

### 5.2 मुख्य सॉकेट इवेंट्स (Socket Events Catalog)
- **ट्रैफिक एवं सिग्नल्स**:
  - `traffic:signal_update`: हर 1 सेकंड में सिग्नल का काउंटडाउन और फेज (Green/Yellow/Red) बदलना।
  - `traffic:telemetry_tick`: हर 4 सेकंड में कैमरों द्वारा गिने गए वाहनों और गति का टेलीमेट्री टिक।
  - `traffic:congestion_updated`: जंक्शन के कंजेशन स्कोर का अपडेट।
  - `traffic:ambulance_green_wave`: जब एम्बुलेंस 600m के दायरे में आती है तो ग्रीन कॉरिडोर लगना।
  - `traffic:emergency_corridor_active`: इमरजेंसी ग्रीन कॉरिडोर सक्रिय होने का अलर्ट।
  - `traffic:emergency_corridor_cleared`: इमरजेंसी कॉरिडोर समाप्त होने का अलर्ट।
- **एम्बुलेंस टेलीमेट्री**:
  - `ambulance:location-updated`: एम्बुलेंस के लाइव GPS कोर्डिनेट्स (lat, lng, speed, bearing)।
  - `ambulance:status-updated`: एम्बुलेंस का स्टेटस (Available, On Duty, Responding)।
- **नागरिक सेवाएं एवं SLA**:
  - `emergency:new-sos`: नागरिक द्वारा 1-टैप SOS दबाने पर कंट्रोल रूम में हाई-प्रायोरिटी अलर्ट।
  - `request:escalated`: 60 सेकंड के SLA डेमन द्वारा समयावधि पार शिकायतों का एस्केलेशन।
  - `parking:slot-updated`: पार्किंग स्लॉट बुक या खाली होने पर लाइव अपडेट।
  - `hospital:bed-updated`: वार्ड में बेड खाली या बुक होने पर तुरंत हॉस्पिटल डैशबोर्ड सिंक।
  - `waste:bin-updated`: ESP32 डस्टबिन का भराव स्तर बढ़ने पर लाइव अपडेट।

---

## 6. रेस्ट एपीआई डायरेक्टरी (REST API Endpoints Catalog - 29 Modules)

| मॉड्यूल (Module) | रूट पाथ (Route Path) | मेथड (Method) | सुरक्षा / रोल (Auth / Role) | विवरण (Description) |
| :--- | :--- | :---: | :---: | :--- |
| **Auth** | `/api/register` | POST | Public | नागरिक नया खाता पंजीकरण। |
| **Auth** | `/api/login` | POST | Public | नागरिक लॉगिन एवं JWT जारी करना। |
| **Auth** | `/api/staff-login` | POST | Public | नगर निगम कर्मचारी एवं डॉक्टर लॉगिन। |
| **Auth** | `/api/auth/otp/send` | POST | Public | मोबाइल/ईमेल पर 6-अंकीय OTP भेजना। |
| **Auth** | `/api/auth/otp/verify` | POST | Public | OTP सत्यापन। |
| **Auth** | `/api/auth/me` | GET | Authenticated | यूजर प्रोफाइल की जानकारी प्राप्त करना। |
| **Traffic** | `/api/traffic/junctions` | GET | Public | 42 चौराहों की वर्तमान स्थिति व कंजेशन। |
| **Traffic** | `/api/traffic/signals` | GET | Public | सिग्नल्स का लाइव फेज व काउंटडाउन। |
| **Traffic** | `/api/traffic/optimize-signal` | POST | Traffic Staff | वेबस्टर IRC:93 द्वारा सिग्नल टाइमिंग ऑप्टिमाइज़ेशन। |
| **Traffic** | `/api/traffic/signals/override` | POST | Traffic Staff | मैनुअल सिग्नल ओवरराइड (Force Green/Red)। |
| **Traffic** | `/api/traffic/alternative-routes`| GET | Public | 3 अल्टरनेटिव रूट्स की गणना (Dijkstra)। |
| **Traffic** | `/api/traffic/cameras` | GET | Traffic Staff | CCTV ANPR कैमरों की लाइव स्थिति। |
| **Traffic** | `/api/traffic/violations/search` | GET | Public | गाड़ी नंबर द्वारा ई-चालान खोजना। |
| **Traffic** | `/api/traffic/violations/:id/dispute` | POST | Citizen | ई-चालान पर ऑनलाइन आपत्ति (Dispute) दर्ज करना। |
| **Emergency** | `/api/emergency/sos` | POST | Public | जीपीएस लोकेशन के साथ 1-टैप SOS अलर्ट। |
| **Ambulance** | `/api/ambulances` | GET | Public | 6 लाइव एम्बुलेंसों की लिस्ट व कोर्डिनेट्स। |
| **Ambulance** | `/api/traffic/ambulance-preemption`| POST | Emergency | एम्बुलेंस के लिए 600m ग्रीन वेव सक्रिय करना। |
| **Hospital** | `/api/hospitals` | GET | Public | एम्स व बीआरडी सहित अस्पतालों की डायरेक्टरी। |
| **Hospital** | `/api/hospital/beds` | GET | Public | 57 श्रेणियों में लाइव बेड्स उपलब्धता। |
| **Hospital** | `/api/hospital/bed-surge` | GET | Hospital Staff | AI द्वारा बेड्स सर्ज प्रेडिक्शन। |
| **Doctor** | `/api/appointments/book-strict` | POST | Citizen | बिना क्लैश के सख्त डॉक्टर OPD स्लॉट बुकिंग। |
| **Doctor** | `/api/doctor/consultation` | POST | Doctor | डॉक्टर कंसल्टेशन एवं डिजिटल पर्चा जारी करना। |
| **Patient** | `/api/patients/:id/qr` | GET | Patient/Doctor | आयुष्मान भारत डिजिटल हेल्थ पास QR कोड। |
| **Patient** | `/api/patients/verify-qr` | POST | Doctor/Hospital | स्कैन किए गए हेल्थ पास का क्रिप्टोग्राफिक सत्यापन। |
| **Parking** | `/api/parking/lots` | GET | Public | पार्किंग लॉट्स व बे (Bay A, B, C) स्टेटस। |
| **Parking** | `/api/parking/book` | POST | Citizen | अग्रिम क्यूआर कोड पार्किंग पास बुकिंग। |
| **Parking** | `/api/parking/entry` | POST | Parking Staff | बैरियर गेट ANPR चेक-इन। |
| **Parking** | `/api/parking/exit` | POST | Parking Staff | चेक-आउट एवं डिजिटल बिलिंग। |
| **Waste** | `/api/waste/bins` | GET | Public | स्मार्ट डस्टबिन्स व उनका भराव स्तर। |
| **Waste** | `/api/waste/prediction` | POST | Waste Staff | डस्टबिन के ओवरफ्लो होने का समय प्रेडिक्शन। |
| **Waste** | `/api/waste/optimize-route` | POST | Waste Staff | कॉम्पेक्टर ट्रक्स के लिए TSP रूट ऑप्टिमाइज़ेशन। |
| **Waste** | `/api/waste/report` | POST | Citizen | फोटो सबूत के साथ कचरा शिकायत दर्ज करना। |
| **Waste** | `/api/waste/dustbin-terminal/sensor-data` | POST | IoT Hardware | ESP32 अल्ट्रासोनिक सेंसर टेलीमेट्री इनजेस्ट। |
| **Water** | `/api/water/tanks` | GET | Public | जलाशयों का जलस्तर व पंप स्थिति। |
| **Water** | `/api/water/pipelines` | GET | Public | SCADA पाइपलाइन प्रेशर एवं फ्लो टेलीमेट्री। |
| **Water** | `/api/water/anomalies` | GET | Water Staff | AI द्वारा डिटेक्ट किए गए पाइप बर्स्ट व लीक्स। |
| **Water** | `/api/water/tanker-bookings` | POST | Citizen | घर-घर पीने के पानी के टैंकर की बुकिंग। |
| **AI** | `/api/ai/chat` | POST | Public | 25 ग्राउंडेड टूल्स युक्त म्यूनिसिपल एआई चैटबॉट। |
| **AI** | `/api/ai/clinical-care/chat` | POST | Public | 7-पार्ट क्लीनिकल केयर असिस्टेंट एवं ट्राइएज। |
| **Police** | `/api/police/stations` | GET | Public | गोरखपुर थाना डायरेक्टरी व बीट पेट्रोलिंग मैप। |
| **Police** | `/api/police/complaints` | POST | Citizen | ऑनलाइन ई-एफआईआर / शिकायत पंजीकरण। |
| **Famous Places**| `/api/famous-places` | GET | Public | रामगढ़ ताल, गोरखनाथ मंदिर आदि का ऑडियो गाइड। |
| **Admin** | `/api/admin/command-center` | GET | Admin | ICCC मास्टर म्यूनिसिपल एक्जीक्यूटिव ओवरव्यू। |
| **Admin** | `/api/admin/what-if-simulation`| POST | Admin | व्हाट-इफ शहरी आपदा एवं ट्रैफिक सिम्युलेशन। |

---

## 7. डेटाबेस डिज़ाइन एवं लेजर्स (MySQL Database Design)

- **कुल टेबल्स**: 117 एक्टिव टेबल्स।
- **मुख्य डोमेन टेबल्स**:
  - `users`, `staff`, `doctors`, `patients`, `auth_sessions`, `audit_logs`
  - `traffic_junctions`, `traffic_signals`, `traffic_cameras`, `traffic_violations`, `traffic_corridors`, `ambulance_green_waves`
  - `hospitals`, `hospital_beds`, `hospital_ward_beds`, `appointments`, `patient_records`, `patient_reports`
  - `parking_lots`, `parking_slots`, `parking_bookings`, `parking_entries`
  - `waste_bins`, `waste_routes`, `waste_vehicles`, `waste_workers`, `service_requests`
  - `water_tanks`, `water_pipelines`, `water_anomalies`, `water_tanker_bookings`
  - `police_stations`, `police_complaints`, `famous_places`, `place_reviews`
- **स्पेशलाइज्ड AI प्रेडिक्शन लेजर्स**:
  - `ai_predictions`: AI द्वारा लिए गए सभी निर्णयों का ऑडिट रिकॉर्ड।
  - `ai_tool_logs`: कॉल किए गए डेटाबेस टूल्स का इनपुट, आउटपुट और लेटेंसी।
  - `traffic_predictions`: 15, 30, 60 मिनट के ट्रैफिक कंजेशन पूर्वानुमान।
  - `signal_optimizations`: वेबस्टर फॉर्मूले से ऑप्टिमाइज़ किए गए साइकिल टाइम्स।
  - `hospital_predictions`: बेड ऑक्यूपेंसी व सर्ज कैपेसिटी पूर्वानुमान।
  - `waste_bin_predictions`: डस्टबिन भरने के घंटों का पूर्वानुमान।
  - `water_anomalies`: पाइप लीकेज व प्रेशर ड्रॉप का रियल-टाइम रिकॉर्ड।
  - `environment_predictions`: AQI व प्रदूषण हॉटस्पॉट चेतावनी लेजर।

---

## 8. निष्कर्ष (Executive Conclusion)

**SMARTCITY AI** कोई साधारण डमी प्रोजेक्ट नहीं है, बल्कि यह एक एंटरप्राइज-ग्रेड, प्रोडक्शन-रेडी स्मार्ट सिटी ऑपरेटिंग सिस्टम है जो:
1. **सुरक्षा एवं मानकों (Standards Compliance)**: भारतीय सड़क कांग्रेस (IRC:93), CPCB जल व वायु गुणवत्ता मानकों, और डिजिटल पर्सनल डेटा प्रोटेक्शन (DPDP) एक्ट का पूर्ण पालन करता है।
2. **सख्त ऑथेंटिकेशन व प्राइवेसी**: 0% IDOR, ऑटोमैटिक PII रेडैक्शन, और ह्यूमन-इन-द-लूप ई-चालान वर्कफ़्लो प्रदान करता है।
3. **रियल-टाइम परफॉर्मेंस**: वेबसॉकेट्स और हार्डवेयर इंटरप्ट्स द्वारा 1-सेकंड से कम लेटेंसी पर आपातकालीन एम्बुलेंस ग्रीन वेव और आपदा प्रबंधन संभव बनाता है।
4. **डाउनलोड करने योग्य मास्टर पीडीएफ (PDF Document)**: आपके प्रोजेक्ट रूट में `SMARTCITY_AI_FULL_PROJECT_ANALYSIS.pdf` नाम से संपूर्ण तकनीकी रिपोर्ट उपलब्ध करा दी गई है।

