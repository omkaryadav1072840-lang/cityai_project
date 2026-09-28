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
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("====")) {
                    console.log(lines[i-1] || "", lines[i], lines[i+1] || "");
                }
            }
        }
    } catch(e) {}
});
