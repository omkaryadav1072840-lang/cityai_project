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
            const startIdx = content.indexOf("30. SECURITY");
            const endIdx = content.indexOf("34. AI DASHBOARD");
            if (startIdx !== -1 && endIdx !== -1) {
                console.log(content.substring(startIdx, endIdx));
            }
            const s39 = content.indexOf("39. TESTING");
            const e44 = content.indexOf("44. IMPLEMENTATION PHASES");
            if (s39 !== -1 && e44 !== -1) {
                console.log(content.substring(s39, e44));
            }
        }
    } catch(e) {}
});
