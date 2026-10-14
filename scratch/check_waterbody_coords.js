const PROTECTED_WATER_BODIES = [
    {
        name: 'Ramgarh Tal Lake',
        type: 'LAKE',
        polygon: [
            { lat: 26.7475, lng: 83.3940 },
            { lat: 26.7485, lng: 83.4050 },
            { lat: 26.7460, lng: 83.4160 },
            { lat: 26.7410, lng: 83.4210 },
            { lat: 26.7335, lng: 83.4225 },
            { lat: 26.7300, lng: 83.4140 },
            { lat: 26.7315, lng: 83.4020 },
            { lat: 26.7370, lng: 83.3920 },
            { lat: 26.7430, lng: 83.3910 }
        ]
    },
    {
        name: 'Rapti River Active Riverbed',
        type: 'RIVER',
        polygon: [
            { lat: 26.7720, lng: 83.3380 },
            { lat: 26.7650, lng: 83.3440 },
            { lat: 26.7550, lng: 83.3480 },
            { lat: 26.7430, lng: 83.3450 },
            { lat: 26.7320, lng: 83.3550 },
            { lat: 26.7200, lng: 83.3650 },
            { lat: 26.7150, lng: 83.3600 },
            { lat: 26.7280, lng: 83.3480 },
            { lat: 26.7420, lng: 83.3380 },
            { lat: 26.7560, lng: 83.3350 },
            { lat: 26.7680, lng: 83.3300 }
        ]
    }
];

function isPointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;
        const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Proposed updated road 7: Deoria Bypass
const road7 = [
    { lat: 26.7450, lng: 83.3850 },
    { lat: 26.7290, lng: 83.3860 },
    { lat: 26.7250, lng: 83.4150 },
    { lat: 26.7230, lng: 83.4420 }
];

// Proposed updated road 8: Transport Nagar Logistics Corridor
const road8 = [
    { lat: 26.7520, lng: 83.3680 },
    { lat: 26.7450, lng: 83.3640 },
    { lat: 26.7380, lng: 83.3620 }
];

console.log("Road 7 in Tal:", road7.filter(p => isPointInPolygon(p.lat, p.lng, PROTECTED_WATER_BODIES[0].polygon)));
console.log("Road 7 in River:", road7.filter(p => isPointInPolygon(p.lat, p.lng, PROTECTED_WATER_BODIES[1].polygon)));
console.log("Road 8 in River:", road8.filter(p => isPointInPolygon(p.lat, p.lng, PROTECTED_WATER_BODIES[1].polygon)));
