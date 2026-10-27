const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const findings = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'scratch', 'comprehensive_audit_findings.json'), 'utf8'));

// Filter missingDomElements
// Only keep if the JS file belongs to that HTML page
// And check if the line performs an unguarded operation like .addEventListener, .value, .innerHTML, .style
const criticalDomIssues = [];

for (const item of findings.missingDomElements) {
    const snippet = item.lineSnippet;
    // Check if element is accessed directly without null-checking
    const isDangerous = /(\.addEventListener|\.innerHTML|\.innerText|\.textContent|\.style\.|\.value|\.classList|\.focus\(\)|\.click\(\))/.test(snippet);
    if (isDangerous) {
        criticalDomIssues.push(item);
    }
}

console.log(`Dangerous unguarded DOM accesses found: ${criticalDomIssues.length}`);

// Group by file
const grouped = {};
for (const c of criticalDomIssues) {
    const key = `${c.htmlFile} -> ${c.scriptFile}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ id: c.elementId, line: c.lineNumber, snippet: c.lineSnippet });
}

for (const [k, v] of Object.entries(grouped)) {
    console.log(`\n📄 ${k}: (${v.length} potential null pointer accesses)`);
    for (const item of v.slice(0, 5)) {
        console.log(`   - Line ${item.line} [#${item.id}]: ${item.snippet}`);
    }
    if (v.length > 5) console.log(`   ... and ${v.length - 5} more`);
}

fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'dangerous_dom_accesses.json'), JSON.stringify(grouped, null, 2));
