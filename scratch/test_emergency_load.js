const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('./frontend/pages/emergency/emergency.html', 'utf8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const knownIds = new Set(idMatches);
const elements = {};

function getOrCreateElement(id) {
    if (!elements[id]) {
        elements[id] = {
            id, style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
            innerHTML: '', textContent: '', value: '',
            setAttribute(){}, getAttribute(){}, appendChild(){}, addEventListener(){},
            querySelector(){ return getOrCreateElement('sub'); }, querySelectorAll(){ return []; }
        };
    }
    return elements[id];
}

const windowMock = {
    location: { origin: 'http://localhost:5000', port: '5000', protocol: 'http:' },
    addEventListener(event, fn) { if (event === 'DOMContentLoaded') setTimeout(fn, 10); },
    localStorage: { getItem() { return null; }, setItem() {} },
    setInterval() {}, clearInterval() {}, setTimeout(fn) { fn(); },
    L: { map: () => ({ setView: () => {}, on: () => {} }), tileLayer: () => ({ addTo: () => {} }), icon: () => {}, marker: () => ({ addTo: () => ({ bindPopup: () => {} }) }) },
    io: () => ({ on: () => {}, emit: () => {} }),
    SmartCityRealtime: { init: () => {}, onAmbulanceStatus: () => {}, onEmergencyAlert: () => {}, onIncidentUpdate: () => {} }
};

const docMock = {
    getElementById(id) { if (knownIds.has(id)) return getOrCreateElement(id); return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(event, fn) { if (event === 'DOMContentLoaded') setTimeout(fn, 10); },
    createElement(tag) { return getOrCreateElement('temp-' + tag); }
};

const context = vm.createContext({
    window: windowMock, document: docMock, localStorage: windowMock.localStorage,
    L: windowMock.L, io: windowMock.io, SmartCityRealtime: windowMock.SmartCityRealtime,
    console: console, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
});

try {
    const code = fs.readFileSync('./frontend/pages/emergency/emergency.js', 'utf8');
    vm.runInContext(code, context);
    console.log('✅ EMERGENCY.JS LOADED AND EXECUTED WITH ZERO RUNTIME ERRORS!');
} catch (e) {
    console.error('❌ Crash on emergency.js:', e);
    process.exit(1);
}
