const fs = require('fs');
const path = require('path');

const jsPath = path.join('frontend', 'pages', 'waste', 'waste.js');
let js = fs.readFileSync(jsPath, 'utf8');

// Target snippet in switchWasteLayer:
const targetSwitch = `        if (layer === "staff" && staff) {
            loadAIWastePredictionsTable();
        }

        // Invalidate map dimensions for responsive Leaflet rendering
        setTimeout(() => {
            if (wasteMap) wasteMap.invalidateSize();
        }, 100);
    }
    window.switchWasteLayer = switchWasteLayer;`;

const replacementSwitch = `        if (layer === "staff" && staff) {
            loadAIWastePredictionsTable();
        }

        // Contextual Shared Map Display:
        // Citizen layer keeps the primary live map visible.
        // Staff and Admin layers hide it by default so dashboard & dustbin terminal start immediately at top.
        const sharedMap = document.getElementById("sharedMapSection");
        const btnStaffMap = document.getElementById("btnStaffToggleMap");
        if (sharedMap) {
            if (layer === "citizen") {
                sharedMap.style.display = "block";
            } else {
                sharedMap.style.display = "none";
                if (btnStaffMap) btnStaffMap.textContent = "🗺️ Show City GIS Map";
            }
        }

        // Invalidate map dimensions for responsive Leaflet rendering
        setTimeout(() => {
            if (wasteMap) wasteMap.invalidateSize();
            if (dustbinMiniMap) dustbinMiniMap.invalidateSize();
        }, 150);
    }
    window.switchWasteLayer = switchWasteLayer;

    // Staff City GIS Map Toggle
    window.toggleStaffCityMap = function () {
        const sharedMap = document.getElementById("sharedMapSection");
        const btnStaffMap = document.getElementById("btnStaffToggleMap");
        if (!sharedMap) return;

        if (sharedMap.style.display === "none" || sharedMap.style.display === "") {
            sharedMap.style.display = "block";
            if (btnStaffMap) btnStaffMap.textContent = "🗺️ Hide City GIS Map";
            setTimeout(() => {
                if (wasteMap) wasteMap.invalidateSize();
            }, 150);
            sharedMap.scrollIntoView({ behavior: "smooth" });
        } else {
            sharedMap.style.display = "none";
            if (btnStaffMap) btnStaffMap.textContent = "🗺️ Show City GIS Map";
        }
    };

    // Hardware Suite Minimize / Expand
    window.toggleHardwareSuiteCollapse = function () {
        const body = document.getElementById("dtHardwareSuiteBody");
        const btn = document.getElementById("btnToggleHwSuite");
        if (!body) return;

        if (body.style.display === "none") {
            body.style.display = "block";
            if (btn) btn.textContent = "Minimize ⏶";
        } else {
            body.style.display = "none";
            if (btn) btn.textContent = "Expand ⏷";
        }
    };`;

if (!js.includes(targetSwitch)) {
    console.error('Target snippet not found in waste.js!');
    process.exit(1);
}

js = js.replace(targetSwitch, replacementSwitch);
fs.writeFileSync(jsPath, js, 'utf8');
console.log('✅ Successfully updated frontend/pages/waste/waste.js');

// Sync to Android
const androidJsPath = path.join('android', 'app', 'src', 'main', 'assets', 'public', 'pages', 'waste', 'waste.js');
if (fs.existsSync(androidJsPath)) {
    fs.writeFileSync(androidJsPath, js, 'utf8');
    console.log('✅ Successfully synced to android/app/src/main/assets/public/pages/waste/waste.js');
}

