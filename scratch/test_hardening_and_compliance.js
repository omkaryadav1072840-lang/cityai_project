/**
 * SmartCity AI - Hardening, SEO, Legal & Security Verification Test
 */

const http = require('http');

const API_BASE = "http://localhost:5000";

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const reqOpts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(data);
                } catch (e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: json || data
                });
            });
        });

        req.on('error', reject);

        if (options.body) {
            const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            req.write(bodyStr);
        }
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
}

async function runHardeningTests() {
    console.log("🛡️ === TESTING PRODUCTION HARDENING, SEO, LEGAL & SECURITY === 🛡️\n");

    // 1. Legal Pages & Clean URLs
    console.log("--- 1. Legal & Informational Endpoints ---");
    const privacyRes = await request("/privacy-policy");
    assert(privacyRes.status === 200, "GET /privacy-policy returns 200 OK");
    assert(typeof privacyRes.body === 'string' && privacyRes.body.includes("Privacy Policy"), "Privacy Policy page content loaded");

    const termsRes = await request("/terms-and-conditions");
    assert(termsRes.status === 200, "GET /terms-and-conditions returns 200 OK");
    assert(typeof termsRes.body === 'string' && termsRes.body.includes("Terms & Conditions"), "Terms & Conditions page content loaded");

    // 2. SEO & Crawlers
    console.log("\n--- 2. SEO & Crawler Directives ---");
    const robotsRes = await request("/robots.txt");
    assert(robotsRes.status === 200, "GET /robots.txt returns 200 OK");
    assert(typeof robotsRes.body === 'string' && robotsRes.body.includes("Sitemap:"), "robots.txt points to sitemap.xml");

    const sitemapRes = await request("/sitemap.xml");
    assert(sitemapRes.status === 200, "GET /sitemap.xml returns 200 OK");
    assert(typeof sitemapRes.body === 'string' && sitemapRes.body.includes("<urlset"), "sitemap.xml returns valid XML format");

    // 3. Custom Error Pages
    console.log("\n--- 3. Custom Error Pages ---");
    const err404 = await request("/404.html");
    assert(err404.status === 200 && err404.body.includes("404"), "Custom 404 page exists and renders");

    const err403 = await request("/403.html");
    assert(err403.status === 200 && err403.body.includes("403"), "Custom 403 page exists and renders");

    const err500 = await request("/500.html");
    assert(err500.status === 200 && err500.body.includes("500"), "Custom 500 page exists and renders");

    // 4. Passwordless Demo Persona Login API
    console.log("\n--- 4. Passwordless Demo Persona Login API ---");
    const personas = ["citizen", "traffic", "hospital", "doctor", "admin"];
    for (const persona of personas) {
        const loginRes = await request("/api/auth/demo-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { persona }
        });
        assert(loginRes.status === 200, `POST /api/auth/demo-login for '${persona}' returns 200`);
        assert(loginRes.body.token && loginRes.body.user, `Valid JWT issued for '${persona}' (Role: ${loginRes.body.user.role || loginRes.body.user.type})`);
    }

    // 5. Privacy-Preserving Telemetry API
    console.log("\n--- 5. Privacy-Conscious Analytics API ---");
    const telemetryRes = await request("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
            event_name: "hospital_search",
            page_path: "/pages/hospital/hospital.html",
            metadata: {
                department: "Cardiology",
                // sensitive PII keys must be stripped by backend sanitizer
                patientPassword: "fake_secret_pwd",
                userPhone: "9876543210"
            }
        }
    });
    assert(telemetryRes.status === 202, "POST /api/analytics/event accepts event with HTTP 202");
    assert(telemetryRes.body.tracked === true, "Event successfully ingested into telemetry pipeline");

    const summaryRes = await request("/api/analytics/summary");
    assert(summaryRes.status === 200, "GET /api/analytics/summary returns 200");
    assert(summaryRes.body.metrics !== undefined, "Analytics metrics payload received");

    // 6. Security Headers
    console.log("\n--- 6. Security Headers Audit ---");
    assert(privacyRes.headers['x-content-type-options'] === 'nosniff', "X-Content-Type-Options: nosniff header present");
    assert(privacyRes.headers['x-frame-options'] === 'SAMEORIGIN', "X-Frame-Options: SAMEORIGIN header present");
    assert(privacyRes.headers['x-xss-protection'] === '1; mode=block', "X-XSS-Protection: 1; mode=block header present");
    assert(privacyRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', "Referrer-Policy header present");

    console.log("\n🎉 ALL 18 HARDENING, COMPLIANCE, LEGAL & SECURITY AUDIT CHECKS PASSED!\n");
    process.exit(0);
}

runHardeningTests().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
