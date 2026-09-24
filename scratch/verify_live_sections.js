const http = require('http');

http.get('http://localhost:5000/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status code:', res.statusCode);
        const sections = [
            { id: 'traffic', name: 'Smart Traffic & Transit' },
            { id: 'waste', name: 'Smart Sanitation & Waste' },
            { id: 'water', name: 'Urban Water & SCADA' },
            { id: 'emergency', name: 'Integrated Emergency & SOS' },
            { id: 'parking', name: 'Smart Multi-Level Parking' },
            { id: 'healthcare', name: 'Smart Healthcare' },
            { id: 'police', name: 'District Police & Public Safety' },
            { id: 'famous', name: 'Heritage & Smart Tourism' }
        ];

        let allFound = true;
        sections.forEach(s => {
            const hasId = data.includes(`id="${s.id}"`);
            const hasNav = data.includes(`href="#${s.id}"`);
            console.log(`[${s.name}] Section id="${s.id}": ${hasId ? '✅' : '❌'} | Nav href="#${s.id}": ${hasNav ? '✅' : '❌'}`);
            if (!hasId || !hasNav) allFound = false;
        });

        console.log('Result:', allFound ? '🎉 ALL 8 DEPARTMENT SHOWCASE SECTIONS VERIFIED LIVE!' : '⚠️ Some sections missing');
        process.exit(allFound ? 0 : 1);
    });
}).on('error', err => {
    console.error('Error:', err.message);
    process.exit(1);
});
