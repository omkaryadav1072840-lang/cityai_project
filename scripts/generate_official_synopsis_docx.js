/**
 * SmartCity AI - Official B.Tech Major Project Synopsis Generator
 * Generates an academically rigorous, AKTU & Buddha Institute of Technology compliant .docx synopsis.
 * Adheres strictly to page limits, margins, line spacing, font sizes, table/figure captions, and OpenXML standards.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- INITIALIZING OFFICIAL AKTU SYNOPSIS GENERATOR ---');

const BUILD_DIR = path.join(__dirname, '..', 'build_synopsis_temp');
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

fs.mkdirSync(path.join(BUILD_DIR, '_rels'), { recursive: true });
fs.mkdirSync(path.join(BUILD_DIR, 'word', '_rels'), { recursive: true });
fs.mkdirSync(path.join(BUILD_DIR, 'word', 'media'), { recursive: true });

// Copy media images
const mediaFiles = [
  { src: 'docs/synopsis_images/college_logo.png', dest: 'image1.png', id: 'rId10', rId: 'rId10' },
  { src: 'docs/synopsis_images/dashboard.png', dest: 'image2.png', id: 'rId11', rId: 'rId11' }
];

mediaFiles.forEach(m => {
  if (fs.existsSync(m.src)) {
    fs.copyFileSync(m.src, path.join(BUILD_DIR, 'word', 'media', m.dest));
    console.log(`Copied media: ${m.src} -> word/media/${m.dest}`);
  }
});

// 1. [Content_Types].xml
const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`;
fs.writeFileSync(path.join(BUILD_DIR, '[Content_Types].xml'), contentTypesXml, 'utf8');

// 2. _rels/.rels
const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
fs.writeFileSync(path.join(BUILD_DIR, '_rels', '.rels'), rootRelsXml, 'utf8');

// 3. word/_rels/document.xml.rels
const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
  <Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.png"/>
</Relationships>`;
fs.writeFileSync(path.join(BUILD_DIR, 'word', '_rels', 'document.xml.rels'), docRelsXml, 'utf8');

// 4. word/settings.xml
const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;
fs.writeFileSync(path.join(BUILD_DIR, 'word', 'settings.xml'), settingsXml, 'utf8');

// 5. word/fontTable.xml
const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fontTable xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman">
    <w:panose1 w:val="02020603050405020304"/>
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fontTable>`;
fs.writeFileSync(path.join(BUILD_DIR, 'word', 'fontTable.xml'), fontTableXml, 'utf8');

// 6. word/styles.xml
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="en-GB"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:after="120" w:before="0"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>
</w:styles>`;
fs.writeFileSync(path.join(BUILD_DIR, 'word', 'styles.xml'), stylesXml, 'utf8');

console.log('OpenXML scaffolding initialized successfully.');

