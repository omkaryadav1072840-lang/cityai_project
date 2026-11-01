const fs = require('fs');

console.log('=== test_phase3_and_waste_security.js ===');
if (fs.existsSync('backend/test_phase3_and_waste_security.js')) {
  console.log(fs.readFileSync('backend/test_phase3_and_waste_security.js', 'utf8').substring(0, 1000));
}

console.log('\n=== scratch/test_waste_module.js ===');
if (fs.existsSync('scratch/test_waste_module.js')) {
  console.log(fs.readFileSync('scratch/test_waste_module.js', 'utf8').substring(0, 1000));
}

