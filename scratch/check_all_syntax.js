const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let checkedCount = 0;

function checkDir(dir) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (f === "node_modules" || f === ".git") continue;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            checkDir(full);
        } else if (f.endsWith(".js")) {
            try {
                execSync(`node --check "${full}"`);
                checkedCount++;
            } catch (e) {
                console.error(`❌ Syntax error in: ${full}`);
                process.exit(1);
            }
        }
    }
}

checkDir("backend");
checkDir("frontend");
console.log(`✅ Success: All ${checkedCount} JavaScript files in backend and frontend passed syntax verification with 0 errors!`);
