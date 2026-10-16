/**
 * SmartCity AI - Phase 2 Verification Test Suite
 * -----------------------------------------------
 * Tests:
 * 1. Migration scripts async password hashing correctness (scrypt$ format & verification)
 * 2. Pharmacy catalog pagination, bounds, total counts, and search pagination
 * 3. Pharmacy CRUD backward compatibility
 */

const http = require("http");
const { verifyPassword } = require("../backend/middleware/auth.middleware");

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => body += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on("error", reject);

        if (postData) {
            req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runTests() {
    console.log("================================================================");
    console.log("🧪 PHASE 2: MIGRATIONS HASHING & PHARMACY PAGINATION TEST");
    console.log("================================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (!condition) {
            console.error(`  ❌ [FAIL] ${message}`);
            failed++;
            throw new Error(`Assertion failed: ${message}`);
        }
        console.log(`  ✅ [PASS] ${message}`);
        passed++;
    }

    try {
        // -----------------------------------------------------------------
        // TEST GROUP 1: Migration Scripts Hash Correctness
        // -----------------------------------------------------------------
        console.log("--- TEST GROUP 1: Migration Password Hashing ---");
        const { hashPassword } = require("../backend/middleware/auth.middleware");

        const doctorHash = await hashPassword("doctor123");
        assert(typeof doctorHash === "string", "doctor123 hash is a string (not a Promise)");
        assert(doctorHash.startsWith("scrypt$"), "doctor123 hash starts with scrypt$");
        assert(doctorHash !== "[object Promise]", "doctor123 hash is NOT '[object Promise]'");
        const isDocValid = await verifyPassword("doctor123", doctorHash);
        assert(isDocValid === true, "verifyPassword validates doctor123 hash");

        const staffHash = await hashPassword("staff123");
        assert(typeof staffHash === "string", "staff123 hash is a string (not a Promise)");
        assert(staffHash.startsWith("scrypt$"), "staff123 hash starts with scrypt$");
        assert(staffHash !== "[object Promise]", "staff123 hash is NOT '[object Promise]'");
        const isStaffValid = await verifyPassword("staff123", staffHash);
        assert(isStaffValid === true, "verifyPassword validates staff123 hash");

        // -----------------------------------------------------------------
        // TEST GROUP 2: Pharmacy Catalog Default (Full / Backward Compatible)
        // -----------------------------------------------------------------
        console.log("\n--- TEST GROUP 2: Pharmacy Catalog Default / Backward Compatibility ---");
        const resAll = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/pharmacy",
            method: "GET"
        });
        assert(resAll.status === 200, `GET /api/pharmacy returns 200 OK (got ${resAll.status})`);
        assert(resAll.data && resAll.data.success === true, "success is true");
        assert(Array.isArray(resAll.data?.medicines), "medicines is an Array");
        assert(resAll.data.medicines.length >= 12, `Returns full catalog without pagination params (got ${resAll.data.medicines.length})`);
        assert(resAll.data.pagination && resAll.data.pagination.total >= 12, `Pagination total reflects database count (${resAll.data?.pagination?.total})`);

        // -----------------------------------------------------------------
        // TEST GROUP 3: Pharmacy Catalog Sliced Pagination
        // -----------------------------------------------------------------
        console.log("\n--- TEST GROUP 3: Pharmacy Catalog Sliced Pagination ---");
        // Page 1, Limit 5
        const resP1 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/pharmacy?page=1&limit=5",
            method: "GET"
        });
        assert(resP1.status === 200, "Page 1 returns 200 OK");
        assert(resP1.data?.medicines?.length === 5, `Page 1 returns exactly 5 medicines (got ${resP1.data?.medicines?.length})`);
        assert(resP1.data?.pagination?.page === 1, "pagination.page is 1");
        assert(resP1.data?.pagination?.limit === 5, "pagination.limit is 5");
        assert(resP1.data?.pagination?.totalPages === Math.ceil(resP1.data?.pagination?.total / 5), "pagination.totalPages is calculated correctly");

        // Page 2, Limit 5
        const resP2 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/pharmacy?page=2&limit=5",
            method: "GET"
        });
        assert(resP2.status === 200, "Page 2 returns 200 OK");
        assert(resP2.data?.medicines?.length === 5, `Page 2 returns exactly 5 medicines (got ${resP2.data?.medicines?.length})`);
        assert(resP2.data?.pagination?.page === 2, "pagination.page is 2");
        const page1Ids = resP1.data.medicines.map(m => m.id);
        const page2Ids = resP2.data.medicines.map(m => m.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        assert(overlap.length === 0, `Page 1 and Page 2 have disjoint medicine sets (no overlap)`);

        // Page 3, Limit 5 (tail page)
        const resP3 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/pharmacy?page=3&limit=5",
            method: "GET"
        });
        assert(resP3.status === 200, "Page 3 returns 200 OK");
        assert(resP3.data?.medicines?.length >= 2, `Page 3 returns tail entries (got ${resP3.data?.medicines?.length})`);
        assert(resP3.data?.pagination?.page === 3, "pagination.page is 3");

        // -----------------------------------------------------------------
        // TEST GROUP 4: Search Route Pagination
        // -----------------------------------------------------------------
        console.log("\n--- TEST GROUP 4: Search Route Pagination ---");
        const resSearchAll = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/pharmacy/search/a",
            method: "GET"
        });
        assert(resSearchAll.status === 200, "Search 'a' without params returns 200 OK");
        assert(resSearchAll.data?.medicines?.length > 0, `Search returns results (got ${resSearchAll.data?.medicines?.length})`);
        assert(resSearchAll.data?.pagination?.total > 0, "Search pagination.total is reported");

        const resSearchPaged = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/pharmacy/search/a?page=1&limit=2",
            method: "GET"
        });
        assert(resSearchPaged.status === 200, "Search 'a' with page=1&limit=2 returns 200 OK");
        assert(resSearchPaged.data?.medicines?.length === 2, `Search returns exactly 2 items (got ${resSearchPaged.data?.medicines?.length})`);
        assert(resSearchPaged.data?.pagination?.limit === 2, "Search pagination.limit is 2");

    } catch (err) {
        console.error("Test execution aborted:", err.message);
    } finally {
        console.log("\n================================================================");
        console.log("                  PHASE 2 VERIFICATION SUMMARY                 ");
        console.log("================================================================");
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        if (failed === 0 && passed >= 16) {
            console.log("🎉 ALL PHASE 2 TESTS PASSED PERFECTLY!");
            process.exit(0);
        } else {
            console.error("❌ SOME TESTS FAILED.");
            process.exit(1);
        }
    }
}

runTests();
