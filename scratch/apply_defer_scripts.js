const fs = require('fs');
const path = 'frontend/index.html';
let content = fs.readFileSync(path, 'utf8');

const target = `<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script src="components/cookie_consent.js"></script>
<script src="components/analytics.js"></script>
<script src="components/ui_components.js"></script>
<script src="components/smartcity_map.js"></script>
<script src="js/mobile-app.js"></script>
<script src="api/client.js"></script>
<script src="api/auth.api.js"></script>
<script src="api/traffic.api.js"></script>
<script src="api/parking.api.js"></script>
<script src="api/hospital.api.js"></script>
<script src="api/waste.api.js"></script>
<script src="api/water.api.js"></script>
<script src="api/emergency.api.js"></script>
<script src="api/police.api.js"></script>
<script src="api/ai.api.js"></script>
<script src="api/index.js"></script>
<script src="components/ai_widget.js?v=3.5"></script>
<script src="auth.js?v=3.5"></script>
<script src="realtime.js?v=3.5"></script>
<script src="components/pwa_manager.js?v=3.5"></script>
<script src="script.js?v=3.5"></script>`;

const replacement = `<script defer src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script defer src="components/cookie_consent.js"></script>
<script defer src="components/analytics.js"></script>
<script defer src="components/ui_components.js"></script>
<script defer src="components/smartcity_map.js"></script>
<script defer src="js/mobile-app.js"></script>
<script defer src="api/client.js"></script>
<script defer src="api/auth.api.js"></script>
<script defer src="api/traffic.api.js"></script>
<script defer src="api/parking.api.js"></script>
<script defer src="api/hospital.api.js"></script>
<script defer src="api/waste.api.js"></script>
<script defer src="api/water.api.js"></script>
<script defer src="api/emergency.api.js"></script>
<script defer src="api/police.api.js"></script>
<script defer src="api/ai.api.js"></script>
<script defer src="api/index.js"></script>
<script defer src="components/ai_widget.js?v=3.5"></script>
<script defer src="auth.js?v=3.5"></script>
<script defer src="realtime.js?v=3.5"></script>
<script defer src="components/pwa_manager.js?v=3.5"></script>
<script defer src="script.js?v=3.5"></script>`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    const updated = normalizedContent.replace(normalizedTarget, replacement);
    fs.writeFileSync(path, updated, 'utf8');
    console.log('Successfully added defer to scripts in index.html');
} else {
    console.error('Target not found in index.html');
}

