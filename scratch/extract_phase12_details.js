const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
    input: fs.createReadStream("C:/Users/Omkar/.gemini/antigravity-ide/brain/c06db7a5-f35d-4f40-be05-5927b01b90c3/.system_generated/logs/transcript_full.jsonl"),
    crlfDelay: Infinity
});

rl.on("line", (line) => {
    try {
        const obj = JSON.parse(line);
        if (obj.step_index === 332 && obj.type === "USER_INPUT") {
            const content = obj.content;
            const startIdx = content.indexOf("20. EXPLAINABLE AI");
            const endIdx = content.indexOf("24. RBAC");
            if (startIdx !== -1 && endIdx !== -1) {
                console.log(content.substring(startIdx, endIdx));
            }
            const s34 = content.indexOf("34. AI DASHBOARD");
            const e36 = content.indexOf("36. DEVELOPMENT MODE");
            if (s34 !== -1 && e36 !== -1) {
                console.log(content.substring(s34, e36));
            }
        }
    } catch(e) {}
});
