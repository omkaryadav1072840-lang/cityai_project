const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'frontend', 'pages', 'waste', 'waste.css');
let css = fs.readFileSync(cssPath, 'utf8');

const dustbinTerminalStyles = `

/* =========================================================
   SMART DUSTBIN TERMINAL & IOT TELEMETRY STYLES
========================================================= */

@keyframes pulseGlow {
    0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        border-color: #ef4444;
    }
    70% {
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
        border-color: #dc2626;
    }
    100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        border-color: #ef4444;
    }
}

.dustbin-terminal-card {
    transition: all 0.3s ease;
}

.dustbin-terminal-card:hover {
    box-shadow: 0 8px 30px rgba(16, 185, 129, 0.12);
}

.smart-bin-map-icon {
    background: transparent;
    border: none;
}
`;

if (!css.includes('SMART DUSTBIN TERMINAL & IOT TELEMETRY STYLES')) {
    css += dustbinTerminalStyles.replace(/\n/g, '\r\n');
    fs.writeFileSync(cssPath, css, 'utf8');
    console.log("✅ Appended dustbin terminal styles to waste.css");
} else {
    console.log("Already exists.");
}

