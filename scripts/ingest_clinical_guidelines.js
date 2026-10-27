/**
 * SmartCity AI - Clinical Knowledge Ingestion & Validation CLI
 * ============================================================
 * Ingests, checks schemas, computes SHA256 checksums, and audits the clinical knowledge base.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const guidelinesDir = path.join(__dirname, "..", "backend", "knowledge", "clinical_guidelines");
const manifestPath = path.join(guidelinesDir, "manifest.json");

console.log("==========================================================");
console.log("🏥 CLINICAL KNOWLEDGE INGESTION & AUDIT PIPELINE");
console.log("==========================================================");

if (!fs.existsSync(manifestPath)) {
    console.error("❌ ERROR: Manifest file not found at", manifestPath);
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
console.log(`Manifest Version: ${manifest.version}`);
console.log(`Publisher: ${manifest.publisher}`);
console.log(`Registered Sources: ${manifest.sources.length}`);
console.log("----------------------------------------------------------");

let totalChunks = 0;
let errors = 0;

for (const source of manifest.sources) {
    const filePath = path.join(guidelinesDir, source.file);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Missing guideline file: ${source.file}`);
        errors++;
        continue;
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const doc = JSON.parse(raw);
        const checksum = crypto.createHash("sha256").update(raw).digest("hex");

        if (!doc.id || !doc.title || !doc.organization || !Array.isArray(doc.chunks)) {
            console.error(`❌ Schema validation failed for ${source.file}`);
            errors++;
            continue;
        }

        totalChunks += doc.chunks.length;
        console.log(`✅ [${doc.id}] ${doc.title}`);
        console.log(`   Org: ${doc.organization} | Year: ${doc.year} | Chunks: ${doc.chunks.length}`);
        console.log(`   SHA256: ${checksum.slice(0, 16)}...`);
    } catch (e) {
        console.error(`❌ Error parsing ${source.file}:`, e.message);
        errors++;
    }
}

console.log("==========================================================");
if (errors === 0) {
    console.log(`🎉 INGESTION SUCCESS: ${manifest.sources.length} guidelines, ${totalChunks} chunks verified with zero errors.`);
} else {
    console.error(`⚠️ INGESTION COMPLETE WITH ${errors} ERRORS.`);
    process.exit(1);
}
