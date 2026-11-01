/**
 * SmartCity AI - Mobile & PWA Device Connection Helper
 * Detects local network interfaces and displays mobile presentation links.
 */

const os = require('os');

function getLanIps() {
    const ifaces = os.networkInterfaces();
    const ips = [];
    for (const name in ifaces) {
        for (const details of ifaces[name]) {
            if (details.family === 'IPv4' && !details.internal) {
                ips.push({ interface: name, address: details.address });
            }
        }
    }
    return ips;
}

const lanIps = getLanIps();
const primaryIp = lanIps.length > 0 ? lanIps[0].address : 'localhost';
const PORT = process.env.PORT || 5000;

console.log('\n' + '='.repeat(68));
console.log('  📱 SMARTCITY AI (GORAKHPUR) — MOBILE & PWA CONNECTION HUB');
console.log('='.repeat(68));

console.log('\n🌐 [LOCAL WI-FI / HOTSPOT IP DETECTED]:');
if (lanIps.length === 0) {
    console.log('   No external network interface detected. Connect to Wi-Fi or phone hotspot.');
} else {
    lanIps.forEach(ip => {
        console.log(`   • Interface: ${ip.interface.padEnd(16)} -> http://${ip.address}:${PORT}`);
    });
}

console.log('\n🚀 [PRIMARY MOBILE DEMO LINKS — OPEN ON PHONE]:');
console.log(`   1. 🏛️ Citizen Super-Portal:      http://${primaryIp}:${PORT}/`);
console.log(`   2. 🩸 Blood Bank & Emergency:    http://${primaryIp}:${PORT}/pages/hospital/blood_bank.html`);
console.log(`   3. 🚛 Waste Worker Dashboard:    http://${primaryIp}:${PORT}/pages/waste/worker_dashboard.html`);
console.log(`   4. 🗑️ Smart Dustbin Terminal:    http://${primaryIp}:${PORT}/pages/waste/bin_dashboard.html`);
console.log(`   5. 🚑 Emergency SOS Dispatch:    http://${primaryIp}:${PORT}/pages/emergency/emergency.html`);
console.log(`   6. 🚦 Live Traffic & Navigation: http://${primaryIp}:${PORT}/pages/traffic/traffic.html`);

console.log('\n📲 [HOW TO INSTALL ON MOBILE (1-TAP PWA)]');
console.log('   Android (Google Chrome):');
console.log('     1. Open the Citizen Portal link above in Chrome.');
console.log('     2. Tap the blue "📲 Install App" banner at the bottom');
console.log('        (or tap Chrome Menu [⋮] -> "Add to Home screen" / "Install app").');
console.log('     3. SmartCity AI icon appears on home screen with full-screen native UI!');
console.log('\n   Apple iOS (Safari):');
console.log('     1. Open the Citizen Portal link above in Safari.');
console.log('     2. Tap Share button [⬆] -> scroll down -> tap "Add to Home Screen".');
console.log('     3. Launches as a full-screen iOS Web App without Safari address bar!');

console.log('\n🤖 [NATIVE ANDROID APK OPTIONS]');
console.log('   Option A - Android Studio (1-Click):');
console.log('     Run: npm run mobile:open');
console.log('     In Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)');
console.log('\n   Option B - Cloud Auto-Builder (GitHub Actions):');
console.log('     Push to GitHub: .github/workflows/build-apk.yml builds the APK in the cloud');
console.log('     and gives you a direct download link under GitHub Actions Artifacts!');
console.log('='.repeat(68) + '\n');

