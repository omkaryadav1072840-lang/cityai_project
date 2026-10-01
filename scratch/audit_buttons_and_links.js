/**
 * SMARTCITY AI - INTERACTIVE BUTTONS & DEAD-LINK AUDIT (STEP 6)
 * Scans all frontend templates for broken buttons, placeholder onclicks, and dead links.
 */

const fs = require("fs");
const path = require("path");

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (file.endsWith(".html") || file.endsWith(".js")) {
            results.push(fullPath);
        }
    }
    return results;
}

let passed = 0;
let warnings = 0;

console.log("========================================================");
console.log("  🖱️ INTERACTIVE BUTTON & LINK AUDIT (STEP 6)");
console.log("========================================================");

const files = walkDir("./frontend");

for (const f of files) {
    if (!f.endsWith(".html")) continue;
    const content = fs.readFileSync(f, "utf-8");
    const basename = path.basename(f);

    // 1. Check for empty onclick attributes
    const emptyOnclick = content.match(/onclick=["']\s*["']/gi);
    if (emptyOnclick) {
        console.warn(`  ⚠️ [WARN] ${basename} has empty onclick attributes: count = ${emptyOnclick.length}`);
        warnings++;
    } else {
        passed++;
    }

    // 2. Check for href="#" with no onclick or data attribute
    const deadLinks = content.match(/<a\s+[^>]*href=["']#["'][^>]*>/gi) || [];
    const unhandledDeadLinks = deadLinks.filter(l => !l.includes("onclick") && !l.includes("data-") && !l.includes("id="));
    if (unhandledDeadLinks.length > 0) {
        console.warn(`  ⚠️ [WARN] ${basename} has unhandled href="#" links: ${unhandledDeadLinks.length}`);
        warnings++;
    } else {
        passed++;
    }

    // 3. Check for buttons without id, class, or onclick
    const rawButtons = content.match(/<button(?:\s+[^>]*)?>/gi) || [];
    let bareButtons = 0;
    for (const b of rawButtons) {
        if (!b.includes("id=") && !b.includes("class=") && !b.includes("onclick=") && !b.includes("type=\"submit\"") && !b.includes("type='submit'")) {
            bareButtons++;
        }
    }
    if (bareButtons > 0) {
        console.warn(`  ⚠️ [WARN] ${basename} has bare unstyled unhandled buttons: ${bareButtons}`);
        warnings++;
    } else {
        passed++;
    }
}

console.log("\n========================================================");
console.log(`  BUTTON AUDIT: ${passed} VALID CHECKS | ${warnings} POTENTIAL PLACEHOLDERS`);
console.log("========================================================");
