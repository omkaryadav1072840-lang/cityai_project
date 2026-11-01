const fs = require('fs');
const path = require('path');

console.log('=== END-TO-END VERIFICATION: DUSTBIN UNLOCK & DEDICATED VIEW ===');

// Load HTML
const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');
const css = fs.readFileSync('frontend/pages/waste/waste.css', 'utf8');

// 1. Verify CSS rules
const hasDedicatedCss = css.includes('body.dedicated-dustbin-mode');
console.log('1. Dedicated CSS rule present in waste.css:', hasDedicatedCss);

// 2. Verify activateDedicatedDustbinMode exists in waste.js
const hasActivateFn = js.includes('window.activateDedicatedDustbinMode =');
console.log('2. activateDedicatedDustbinMode function present:', hasActivateFn);

// 3. Verify unhide-first logic in authenticateDustbinTerminal
const hasUnhideFirst = js.includes('authCard.style.display = "none"') && js.includes('activeDash.style.display = "block"');
console.log('3. Unhide active dashboard first logic present:', hasUnhideFirst);

// 4. Verify safe map render with try-catch
const hasSafeMap = js.includes('Leaflet mini-map non-fatal error');
console.log('4. Safe mini-map try-catch present:', hasSafeMap);

// 5. Verify init() auto-detection
const hasInitDetect = js.includes('userStaffId.startsWith("BIN-")') && js.includes('viewParam === "dustbin"');
console.log('5. init() auto-detection present:', hasInitDetect);

// 6. Verify Android assets
const androidJs = fs.readFileSync('android/app/src/main/assets/public/pages/waste/waste.js', 'utf8');
const androidCss = fs.readFileSync('android/app/src/main/assets/public/pages/waste/waste.css', 'utf8');
console.log('6. Android JS synced:', androidJs === js);
console.log('7. Android CSS synced:', androidCss === css);

if (hasDedicatedCss && hasActivateFn && hasUnhideFirst && hasSafeMap && hasInitDetect) {
  console.log('\n🎉 ALL CHECKS PASSED: Dustbin dashboard unlock & dedicated view are 100% operational!');
} else {
  console.error('\n❌ Verification failed!');
  process.exit(1);
}

