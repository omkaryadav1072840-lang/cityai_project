const fs = require('fs');
const xml = fs.readFileSync('scratch/synopsis_work/word/document.xml', 'utf8');
const pageBreaks = (xml.match(/<w:br w:type="page"\/>/g) || []).length;
console.log('Total explicit page breaks:', pageBreaks);
console.log('Total document pages (breaks + 1):', pageBreaks + 1);

// Verify all image tags
const images = (xml.match(/r:embed="rId\d+"/g) || []);
console.log('Total embedded images in document:', images.length, images);

// Verify tables
const tables = (xml.match(/<w:tbl>/g) || []).length;
console.log('Total tables in document:', tables);

