const db = require('../config/db');

async function runBillingAndLogoMigration() {
    const pool = db.promise();
    console.log("🚀 Starting Billing, Concurrency, and Official Logo Database Migration...");

    // 1. Create hospital_billing_payments table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hospital_billing_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            payment_id VARCHAR(50) NOT NULL UNIQUE,
            invoice_id VARCHAR(50) NOT NULL,
            hospital_id VARCHAR(50) NOT NULL,
            patient_id VARCHAR(50) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'Cash',
            transaction_ref VARCHAR(100) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            received_by VARCHAR(100) DEFAULT 'Billing Cashier',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_hpay_inv (invoice_id),
            INDEX idx_hpay_hosp (hospital_id),
            INDEX idx_hpay_pat (patient_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ hospital_billing_payments table verified/created.");

    // 2. Add hospital_logo snapshot column to prescriptions
    const [pCols] = await pool.query("DESCRIBE prescriptions");
    if (!pCols.some(c => c.Field === 'hospital_logo')) {
        await pool.query("ALTER TABLE prescriptions ADD COLUMN hospital_logo VARCHAR(500) DEFAULT NULL AFTER hospital_id");
        console.log("✅ Added hospital_logo column to prescriptions for historical document snapshot.");
    } else {
        console.log("ℹ️ prescriptions already has hospital_logo column.");
    }

    // 3. Add remaining_amount column to hospital_invoices
    const [iCols] = await pool.query("DESCRIBE hospital_invoices");
    if (!iCols.some(c => c.Field === 'remaining_amount')) {
        await pool.query("ALTER TABLE hospital_invoices ADD COLUMN remaining_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER paid_amount");
        console.log("✅ Added remaining_amount column to hospital_invoices.");
    } else {
        console.log("ℹ️ hospital_invoices already has remaining_amount column.");
    }

    // Populate remaining_amount on existing hospital_invoices
    await pool.query("UPDATE hospital_invoices SET remaining_amount = GREATEST(0, total_amount - discount - paid_amount)");
    console.log("✅ Calculated and populated remaining_amount on all existing hospital_invoices.");

    // 4. Ensure upload folder for hospital logos exists
    const fs = require('fs');
    const path = require('path');
    const logoDir = path.join(__dirname, '..', 'uploads', 'hospital_logos');
    if (!fs.existsSync(logoDir)) {
        fs.mkdirSync(logoDir, { recursive: true });
        console.log("✅ Created hospital_logos upload directory:", logoDir);
    }

    console.log("🎯 Billing and Logo Migration complete!");
    return true;
}

if (require.main === module) {
    runBillingAndLogoMigration().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
}

module.exports = runBillingAndLogoMigration;
