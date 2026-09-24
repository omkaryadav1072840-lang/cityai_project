const fs = require('fs');
const vm = require('vm');

console.log("=== SIMULATING PARKING PAGE ENVIRONMENT ===");

// 1. Parse HTML to extract all IDs
const html = fs.readFileSync('./frontend/pages/parking/parking.html', 'utf8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
const knownIds = new Set(idMatches);

const elements = {};
function getOrCreateElement(id) {
    if (!elements[id]) {
        elements[id] = {
            id,
            style: {},
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                toggle(c, force) {
                    if (force === undefined) {
                        if (this.classes.has(c)) this.classes.delete(c);
                        else this.classes.add(c);
                    } else if (force) {
                        this.classes.add(c);
                    } else {
                        this.classes.delete(c);
                    }
                },
                contains(c) { return this.classes.has(c); }
            },
            innerHTML: '',
            textContent: '',
            value: '',
            setAttribute(k, v) { this[k] = v; },
            getAttribute(k) { return this[k]; },
            appendChild(child) {},
            addEventListener(ev, fn) {},
            removeEventListener(ev, fn) {},
            focus() {},
            scrollIntoView() {},
            reset() {},
            querySelector(sel) { return getOrCreateElement('mock-sub'); },
            querySelectorAll(sel) { return []; }
        };
    }
    return elements[id];
}

// Pre-create all known elements from HTML
for (const id of knownIds) {
    getOrCreateElement(id);
}

const storage = {};
const context = {
    setInterval: () => {},
    clearInterval: () => {},
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    console: {
        log: (...args) => console.log("[BROWSER LOG]", ...args),
        warn: (...args) => console.warn("[BROWSER WARN]", ...args),
        error: (...args) => console.error("[BROWSER ERROR]", ...args)
    },
    URLSearchParams: global.URLSearchParams,
    window: {
        addEventListener: (ev, fn) => {},
        removeEventListener: (ev, fn) => {},
        print: () => {},
        location: { search: '?lot=PARK-001' }
    },
    document: {
        getElementById: (id) => {
            if (!knownIds.has(id)) {
                console.warn(`⚠️ getElementById called for UNKNOWN ID: "${id}"`);
            }
            return getOrCreateElement(id);
        },
        querySelector: (sel) => getOrCreateElement('mock-query'),
        querySelectorAll: (sel) => [],
        createElement: (tag) => getOrCreateElement('mock-' + tag),
        addEventListener: (ev, fn) => {
            if (ev === 'DOMContentLoaded') setTimeout(fn, 10);
        }
    },
    localStorage: {
        getItem: (k) => storage[k] || null,
        setItem: (k, v) => { storage[k] = String(v); },
        removeItem: (k) => { delete storage[k]; }
    },
    sessionStorage: {
        getItem: (k) => storage['sess_' + k] || null,
        setItem: (k, v) => { storage['sess_' + k] = String(v); },
        removeItem: (k) => { delete storage['sess_' + k]; }
    },
    navigator: {
        mediaDevices: {
            getUserMedia: async () => ({
                getTracks: () => [{ stop() {} }]
            })
        }
    },
    fetch: async (url, opts = {}) => {
        console.log(`[SIM FETCH] ${opts.method || 'GET'} ${url}`);
        return {
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                slots: [
                    { id: 1, slotNumber: 'A-01', slotType: 'car', floor: 'Level 1', status: 'Available' },
                    { id: 2, slotNumber: 'A-02', slotType: 'ev', floor: 'Level 1', status: 'Occupied' }
                ],
                data: {
                    lot: { id: 'PARK-001', name: 'City Center Parking', rate: 20 },
                    slots: [
                        { id: 1, slotNumber: 'A-01', slotType: 'car', floor: 'Level 1', status: 'Available' }
                    ]
                },
                bookings: []
            })
        };
    },
    L: {
        map: () => ({
            setView: function() { return this; },
            on: function() { return this; },
            removeLayer: function() { return this; },
            invalidateSize: function() { return this; }
        }),
        tileLayer: () => ({
            addTo: function() { return this; },
            on: function() { return this; }
        }),
        marker: () => ({
            addTo: function() { return this; },
            bindPopup: function() { return this; },
            on: function() { return this; }
        }),
        circleMarker: () => ({
            addTo: function() { return this; },
            bindPopup: function() { return this; }
        }),
        polyline: () => ({
            addTo: function() { return this; }
        }),
        divIcon: (opts) => opts,
        layerGroup: () => ({
            addTo: function() { return this; },
            clearLayers: function() { return this; }
        })
    },
    io: () => ({
        on: function() { return this; },
        emit: function() { return this; }
    }),
    Html5Qrcode: class {
        constructor(id) {}
        async start() {}
        async stop() {}
        async clear() {}
    },
    getCurrentUser: () => ({ id: 'usr_1', name: 'Omkar Test', phone: '9988776655', role: 'citizen' }),
    showToast: (msg) => console.log(`[TOAST] ${msg}`)
};

context.window = context;
context.location = { search: '?lot=PARK-001' };
context.addEventListener = (ev, fn) => {};
context.removeEventListener = (ev, fn) => {};

const code = fs.readFileSync('./frontend/pages/parking/parking.js', 'utf8');

try {
    vm.createContext(context);
    vm.runInContext(code, context);
    console.log("✓ parking.js parsed and executed in context successfully!");

    // Test calling openCitizenBookingModalByNumber
    console.log("\nTesting openCitizenBookingModalByNumber('A-01')...");
    context.openCitizenBookingModalByNumber('A-01');
    const modal = context.document.getElementById('slotBookingModal');
    console.log("slotBookingModal active?:", modal.classList.contains('active'), "display:", modal.style.display);

    // Test closing
    context.closeSlotModal('slotBookingModal');
    console.log("slotBookingModal after close active?:", modal.classList.contains('active'), "display:", modal.style.display);

    // Test switchActivityTab
    console.log("\nTesting switchActivityTab('history')...");
    context.switchActivityTab('history');
    console.log("History tab switched successfully!");

    // Test filterHistoryStatus
    console.log("\nTesting filterHistoryStatus('completed')...");
    context.filterHistoryStatus('completed');
    console.log("Filter history status executed successfully!");

    // Test staff scanner modal
    console.log("\nTesting openStaffQrScannerModal()...");
    context.openStaffQrScannerModal();
    console.log("Staff scanner modal opened successfully!");

    context.closeStaffQrScannerModal();
    console.log("Staff scanner modal closed successfully!");

    console.log("\n✓ ALL CORE USER INTERACTIONS PASSED RUNTIME VERIFICATION!");
} catch (e) {
    console.error("❌ RUNTIME ERROR IN PARKING.JS:", e);
    process.exit(1);
}
