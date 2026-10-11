const fetch = global.fetch || require("node-fetch");

async function testAllQueries() {
    console.log("🏥 Running Multi-Disease Clinical Reasoning Suite...\n");

    const queries = [
        { q: "mujhe pet me dard ho raha hai aur ulti lag rahi hai kya khaye aur kya parhez kare", lang: "hi" },
        { q: "mujhe typhoid ho gaya hai kis doctor ko dikhaye aur kaun sa hospital accha h", lang: "hi" },
        { q: "sugar badh gayi hai kya karna chahiye aur kya nahi khana h", lang: "hi" },
        { q: "mujhe dengue hai platelets kam ho gaye h kya khaye", lang: "hi" },
        { q: "sar dard ho raha h subah se kya dikkat ho sakti h", lang: "hi" },
        { q: "high blood pressure h kya nahi khana chahiye aur ghr pe kaise control kare", lang: "hi" },
        { q: "kidney me pathri h kaun se hospital jaye gorakhpur me", lang: "hi" }
    ];

    let allPassed = true;

    for (let i = 0; i < queries.length; i++) {
        const item = queries[i];
        const res = await fetch("http://localhost:5000/api/ai/clinical-care/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: item.q, patientId: "SC-2026-318028", language: item.lang })
        });
        const d = await res.json();

        const hasCauses = d.message.includes("Potential Causes") || d.message.includes("संभावित कारण");
        const hasEat = d.message.includes("क्या खाना चाहिए") || d.message.includes("What to Eat");
        const hasAvoid = d.message.includes("क्या परहेज करना चाहिए") || d.message.includes("What to Avoid");
        const hasHome = d.message.includes("घर पर बिगड़ने से कैसे रोकें") || d.message.includes("Home Self-Care") || d.message.includes("Home Care Guidance");
        const hasSpecialist = d.message.includes("किस डॉक्टर") || d.message.includes("Specialist Doctor");
        const hasHospitals = d.message.includes("गोरखपुर के किन अस्पतालों") || d.message.includes("Hospitals in Gorakhpur");
        const hasTracking = d.message.includes("लक्षण व आहार ट्रैकिंग") || d.message.includes("Tracking");

        const isGood = hasCauses && hasEat && hasAvoid && hasHome && hasSpecialist && hasHospitals && hasTracking;

        console.log(`[TEST ${i+1}] Query: "${item.q}"`);
        console.log(`  Condition: ${d.structured_data?.condition}`);
        console.log(`  Specialist: ${d.structured_data?.specialist}`);
        console.log(`  Hospitals: ${d.structured_data?.hospitals?.map(h => h.name).join(", ")}`);
        console.log(`  Causes: ${hasCauses ? "✅" : "❌"} | Eat: ${hasEat ? "✅" : "❌"} | Avoid: ${hasAvoid ? "✅" : "❌"} | Home: ${hasHome ? "✅" : "❌"}`);
        console.log(`  Specialist: ${hasSpecialist ? "✅" : "❌"} | Hospitals: ${hasHospitals ? "✅" : "❌"} | Tracking: ${hasTracking ? "✅" : "❌"}`);
        console.log(`  Result: ${isGood ? "PASSED" : "FAILED"}\n`);

        if (!isGood) allPassed = false;
    }

    if (allPassed) {
        console.log("🎉 ALL MULTI-DISEASE CLINICAL QUERIES PASSED WITH 100% 7-PART COVERAGE!");
        process.exit(0);
    } else {
        console.error("❌ Some queries failed 7-part coverage.");
        process.exit(1);
    }
}

testAllQueries().catch(e => { console.error("Test error:", e); process.exit(1); });
