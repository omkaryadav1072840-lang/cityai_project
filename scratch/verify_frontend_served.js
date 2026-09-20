const http = require('http');

http.get('http://localhost:5000', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('HTTP Status:', res.statusCode);
        console.log('Has Grievance Modal:', body.includes('id="scGrievanceModal"'));
        console.log('Has Command Center Modal:', body.includes('id="scCommandCenterModal"'));
        console.log('Has Voice Mic Button:', body.includes('id="aiVoiceBtn"'));
        console.log('Has Voice Speaker Button:', body.includes('id="aiSpeakerBtn"'));
        console.log('Has Street Lights Filter:', body.includes("showFeature('lights', this)"));
        console.log('Has AQI Filter:', body.includes("showFeature('aqi', this)"));
        console.log('Has Grievance Nav Link:', body.includes("openGrievanceModal()"));
        console.log('Has Command Center Nav Link:', body.includes("openCommandCenterModal()"));
    });
}).on('error', (err) => {
    console.error('Fetch error:', err.message);
});
