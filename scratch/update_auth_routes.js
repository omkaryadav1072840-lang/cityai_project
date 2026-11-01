const fs = require('fs');
const path = require('path');

const authPath = path.join('backend', 'routes', 'auth.routes.js');
let authCode = fs.readFileSync(authPath, 'utf8');

// Target 1: handleOfflineDemoStaffAuth Waste section
const oldWasteAuth = `    // 1. Waste Management Staff / Sanitation Supervisor / Dustbin Operator
    if (id === "WST001" || id === "WST-001" || id === "WASTE" || id === "WASTE-STAFF" || id.startsWith("BIN-")) {
        const validPass = (
            pass === "123456" ||
            pass === "admin" ||
            pass === "BIN@2026" ||
            pass === "dustbin123" ||
            pass === "waste123" ||
            pass === "password123" ||
            pass.length >= 4
        );
        if (!validPass) return null;

        const staffData = {
            id: 101,
            userId: 101,
            name: id.startsWith("BIN-") ? \`Waste Operator (\${id})\` : "Ramesh Chandra (Waste Supervisor)",
            staffId: id.startsWith("BIN-") ? id : "WST001",
            email: "waste.ops@smartcity.gorakhpur.gov.in",
            department: "waste",
            accountType: "STAFF",
            role: "staff",
            type: "staff",
            editable: ["waste"],
            targetDashboard: id.startsWith("BIN-")
                ? \`pages/waste/waste.html?view=dustbin&binCode=\${id}\`
                : "pages/waste/waste.html?view=staff"
        };
        const token = generateToken(staffData, "staff");
        return {
            success: true,
            message: id.startsWith("BIN-")
                ? \`Authenticated as Waste Operator for \${id}. Clearance granted.\`
                : "Waste Operations Staff authenticated successfully.",
            accountType: "STAFF",
            role: "staff",
            user: staffData,
            token,
            targetDashboard: staffData.targetDashboard
        };
    }`;

const newWasteAuth = `    // 1.1 Waste Control Center Staff (City GIS, Triage, AI Assignment)
    if (id === "WST-CC-01" || id === "WST-CC-02" || id === "CONTROL_CENTER" || id === "WST_CC" || id === "WST-CC") {
        const validPass = (pass === "admin123" || pass === "admin" || pass === "123456" || pass === "password123");
        if (!validPass) return null;

        const staffData = {
            id: id === "WST-CC-02" ? 103 : 102,
            userId: id === "WST-CC-02" ? 103 : 102,
            name: id === "WST-CC-02" ? "Pooja Verma (Triage Dispatcher)" : "Amitabh Sen (Control Center Supervisor)",
            staffId: id.startsWith("WST-CC") ? id : "WST-CC-01",
            email: "controlcenter.waste@smartcity.gorakhpur.gov.in",
            department: "waste",
            accountType: "CONTROL_CENTER",
            role: "control_center",
            type: "staff",
            permissions: ["control_center", "triage", "ai_assignment", "proof_verification"],
            editable: ["waste"],
            targetDashboard: "pages/waste/control_center.html"
        };
        const token = generateToken(staffData, "control_center");
        return {
            success: true,
            message: \`Authenticated as Waste Control Center Staff: \${staffData.name}.\`,
            accountType: "CONTROL_CENTER",
            role: "control_center",
            user: staffData,
            token,
            targetDashboard: staffData.targetDashboard
        };
    }

    // 1.2 Working Staff / Field Collection Worker (Tasks, Road Navigation, Proof Submission)
    if (id === "WRK-001" || id === "WRK-002" || id === "WRK-003" || id === "WST001" || id === "WST-001" || id === "WORKING_STAFF") {
        const validPass = (pass === "worker123" || pass === "123456" || pass === "admin" || pass === "password123");
        if (!validPass) return null;

        const workerId = (id === "WRK-002") ? 2 : (id === "WRK-003" ? 3 : 1);
        const workerName = (id === "WRK-002")
            ? "Suresh Kumar (Collection Driver)"
            : (id === "WRK-003" ? "Rajesh Singh (Hazardous Waste Specialist)" : "Ramesh Chandra (Sanitation Worker)");

        const staffData = {
            id: 200 + workerId,
            userId: 200 + workerId,
            worker_id: workerId,
            name: workerName,
            staffId: id.startsWith("WRK-") ? id : "WRK-001",
            email: "worker.waste@smartcity.gorakhpur.gov.in",
            department: "waste",
            accountType: "WORKING_STAFF",
            role: "working_staff",
            type: "staff",
            assigned_route_id: workerId,
            assigned_area: (workerId === 2) ? "Civil Lines & Ward 07" : (workerId === 3 ? "Medical College & Ward 22" : "Golghar & Ward 14"),
            editable: ["waste"],
            targetDashboard: "pages/waste/worker_dashboard.html"
        };
        const token = generateToken(staffData, "working_staff");
        return {
            success: true,
            message: \`Authenticated as Working Staff: \${staffData.name}.\`,
            accountType: "WORKING_STAFF",
            role: "working_staff",
            user: staffData,
            token,
            targetDashboard: staffData.targetDashboard
        };
    }

    // 1.3 Bin Staff / Smart Dustbin Operator (Restricted strictly to assigned bin)
    if (id.startsWith("BIN-") || id === "BIN_STAFF") {
        const validPass = (pass === "BIN@2026" || pass === "123456" || pass === "dustbin123" || pass === "admin");
        if (!validPass) return null;

        const binCode = id.startsWith("BIN-") ? id : "BIN-GOL-01";
        const staffData = {
            id: 301,
            userId: 301,
            name: \`Bin Operator (\${binCode})\`,
            staffId: binCode,
            assigned_bin_code: binCode,
            email: "dustbin.ops@smartcity.gorakhpur.gov.in",
            department: "waste",
            accountType: "BIN_STAFF",
            role: "bin_staff",
            type: "staff",
            editable: ["waste"],
            targetDashboard: \`pages/waste/bin_dashboard.html?binCode=\${binCode}\`
        };
        const token = generateToken(staffData, "bin_staff");
        return {
            success: true,
            message: \`Authenticated as Bin Staff for unit \${binCode}. Clearance restricted to assigned bin.\`,
            accountType: "BIN_STAFF",
            role: "bin_staff",
            user: staffData,
            token,
            targetDashboard: staffData.targetDashboard
        };
    }

    // 1.4 Waste Admin / Chief Officer
    if (id === "WST-ADMIN" || id === "WST_ADMIN") {
        const validPass = (pass === "admin123" || pass === "admin" || pass === "123456");
        if (!validPass) return null;

        const staffData = {
            id: 100,
            userId: 100,
            name: "Dharmendra Yadav (Municipal Waste Chief Officer)",
            staffId: "WST-ADMIN",
            email: "chief.waste@smartcity.gorakhpur.gov.in",
            department: "waste",
            accountType: "ADMIN",
            role: "admin",
            type: "admin",
            editable: ["waste", "admin"],
            targetDashboard: "pages/waste/waste.html?tab=admin"
        };
        const token = generateToken(staffData, "admin");
        return {
            success: true,
            message: "Waste Department Administrator authenticated.",
            accountType: "ADMIN",
            role: "admin",
            user: staffData,
            token,
            targetDashboard: staffData.targetDashboard
        };
    }`;

// Replace in authCode
if (authCode.includes(oldWasteAuth)) {
    authCode = authCode.replace(oldWasteAuth, newWasteAuth);
    console.log('✅ Replaced handleOfflineDemoStaffAuth in auth.routes.js');
} else {
    console.log('⚠️ Exact oldWasteAuth not found, attempting normalized replacement...');
    const startIdx = authCode.indexOf('// 1. Waste Management Staff');
    const endIdx = authCode.indexOf('// 2. Super Administrator');
    if (startIdx !== -1 && endIdx !== -1) {
        authCode = authCode.substring(0, startIdx) + newWasteAuth + '\n\n    ' + authCode.substring(endIdx);
        console.log('✅ Substring replacement succeeded in auth.routes.js');
    }
}

// Target 2: Add demo personas to /api/auth/demo-login
const demoWasteTarget = `if (persona === "waste" || persona === "waste_staff") {`;
const demoWasteReplacement = `if (persona === "waste_control_center" || persona === "control_center") {
            const staffData = {
                id: 102,
                userId: 102,
                name: "Amitabh Sen (Control Center Supervisor)",
                staffId: "WST-CC-01",
                email: "controlcenter.waste@smartcity.gorakhpur.gov.in",
                department: "waste",
                accountType: "CONTROL_CENTER",
                role: "control_center",
                type: "staff",
                permissions: ["control_center", "triage", "ai_assignment", "proof_verification"],
                editable: ["waste"],
                targetDashboard: "pages/waste/control_center.html"
            };
            const token = generateToken(staffData, "control_center");
            return res.json({
                success: true,
                message: "Demo Waste Control Center Staff authenticated.",
                accountType: "CONTROL_CENTER",
                role: "control_center",
                user: staffData,
                token,
                targetDashboard: staffData.targetDashboard
            });
        }

        if (persona === "waste_worker" || persona === "working_staff" || persona === "worker") {
            const staffData = {
                id: 201,
                userId: 201,
                worker_id: 1,
                name: "Ramesh Chandra (Sanitation Worker)",
                staffId: "WRK-001",
                email: "worker.waste@smartcity.gorakhpur.gov.in",
                department: "waste",
                accountType: "WORKING_STAFF",
                role: "working_staff",
                type: "staff",
                assigned_route_id: 1,
                assigned_area: "Golghar Commercial Corridor (Ward 14)",
                editable: ["waste"],
                targetDashboard: "pages/waste/worker_dashboard.html"
            };
            const token = generateToken(staffData, "working_staff");
            return res.json({
                success: true,
                message: "Demo Working Staff authenticated.",
                accountType: "WORKING_STAFF",
                role: "working_staff",
                user: staffData,
                token,
                targetDashboard: staffData.targetDashboard
            });
        }

        if (persona === "waste_bin_staff" || persona === "bin_staff") {
            const binCode = "BIN-GOL-01";
            const staffData = {
                id: 301,
                userId: 301,
                name: \`Bin Operator (\${binCode})\`,
                staffId: binCode,
                assigned_bin_code: binCode,
                email: "dustbin.ops@smartcity.gorakhpur.gov.in",
                department: "waste",
                accountType: "BIN_STAFF",
                role: "bin_staff",
                type: "staff",
                editable: ["waste"],
                targetDashboard: \`pages/waste/bin_dashboard.html?binCode=\${binCode}\`
            };
            const token = generateToken(staffData, "bin_staff");
            return res.json({
                success: true,
                message: \`Demo Bin Staff authenticated for \${binCode}.\`,
                accountType: "BIN_STAFF",
                role: "bin_staff",
                user: staffData,
                token,
                targetDashboard: staffData.targetDashboard
            });
        }

        if (persona === "waste" || persona === "waste_staff") {`;

if (authCode.includes(demoWasteTarget) && !authCode.includes('persona === "waste_control_center"')) {
    authCode = authCode.replace(demoWasteTarget, demoWasteReplacement);
    console.log('✅ Added demo personas to /api/auth/demo-login in auth.routes.js');
}

fs.writeFileSync(authPath, authCode, 'utf8');
console.log('✅ Successfully written updated backend/routes/auth.routes.js');

