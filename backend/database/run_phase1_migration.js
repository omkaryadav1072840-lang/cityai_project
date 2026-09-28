const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
    console.log("Applying Phase 1 AI Orchestration Migration to MySQL...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity'
    });

    // 1. Inspect existing columns in ai_predictions
    const [cols] = await connection.query("DESCRIBE ai_predictions");
    const existingColNames = new Set(cols.map(c => c.Field.toLowerCase()));

    const columnsToAdd = [
        { name: 'prediction_id', sql: "ALTER TABLE ai_predictions ADD COLUMN prediction_id VARCHAR(64) NULL AFTER id" },
        { name: 'model_name', sql: "ALTER TABLE ai_predictions ADD COLUMN model_name VARCHAR(100) NULL AFTER prediction_id" },
        { name: 'input_data', sql: "ALTER TABLE ai_predictions ADD COLUMN input_data JSON NULL AFTER model_version" },
        { name: 'output_data', sql: "ALTER TABLE ai_predictions ADD COLUMN output_data JSON NULL AFTER input_data" },
        { name: 'reason', sql: "ALTER TABLE ai_predictions ADD COLUMN reason TEXT NULL AFTER confidence_score" },
        { name: 'location', sql: "ALTER TABLE ai_predictions ADD COLUMN location VARCHAR(150) NULL AFTER reason" },
        { name: 'user_id', sql: "ALTER TABLE ai_predictions ADD COLUMN user_id VARCHAR(64) NULL AFTER location" },
        { name: 'staff_id', sql: "ALTER TABLE ai_predictions ADD COLUMN staff_id VARCHAR(64) NULL AFTER user_id" },
        { name: 'actual_result', sql: "ALTER TABLE ai_predictions ADD COLUMN actual_result JSON NULL AFTER staff_id" },
        { name: 'was_correct', sql: "ALTER TABLE ai_predictions ADD COLUMN was_correct TINYINT(1) NULL AFTER actual_result" },
        { name: 'human_override', sql: "ALTER TABLE ai_predictions ADD COLUMN human_override TINYINT(1) DEFAULT 0 AFTER was_correct" },
        { name: 'override_reason', sql: "ALTER TABLE ai_predictions ADD COLUMN override_reason TEXT NULL AFTER human_override" },
        { name: 'data_source', sql: "ALTER TABLE ai_predictions ADD COLUMN data_source ENUM('REAL', 'SIMULATED', 'PREDICTED') DEFAULT 'PREDICTED' AFTER override_reason" },
        { name: 'processing_time', sql: "ALTER TABLE ai_predictions ADD COLUMN processing_time INT DEFAULT 0 AFTER data_source" },
        { name: 'status', sql: "ALTER TABLE ai_predictions ADD COLUMN status VARCHAR(50) DEFAULT 'COMPLETED' AFTER processing_time" }
    ];

    for (const col of columnsToAdd) {
        if (!existingColNames.has(col.name.toLowerCase())) {
            console.log(`Adding column '${col.name}' to ai_predictions...`);
            await connection.query(col.sql);
        }
    }

    // Backfill historical records
    await connection.query(`
        UPDATE ai_predictions 
        SET prediction_id = CONCAT('PRED-', id, '-', SUBSTRING(MD5(id), 1, 6)) 
        WHERE prediction_id IS NULL OR prediction_id = ''
    `);

    await connection.query(`
        UPDATE ai_predictions 
        SET model_name = model_identifier 
        WHERE model_name IS NULL AND model_identifier IS NOT NULL
    `);

    await connection.query(`
        UPDATE ai_predictions 
        SET input_data = input_snapshot 
        WHERE input_data IS NULL AND input_snapshot IS NOT NULL
    `);

    await connection.query(`
        UPDATE ai_predictions 
        SET output_data = prediction_output 
        WHERE output_data IS NULL AND prediction_output IS NOT NULL
    `);

    // Add indexes
    const [indexes] = await connection.query("SHOW INDEX FROM ai_predictions");
    const indexNames = new Set(indexes.map(i => i.Key_name.toLowerCase()));

    if (!indexNames.has('idx_pred_id')) {
        await connection.query("ALTER TABLE ai_predictions ADD UNIQUE INDEX idx_pred_id (prediction_id)");
    }
    if (!indexNames.has('idx_pred_model_name')) {
        await connection.query("ALTER TABLE ai_predictions ADD INDEX idx_pred_model_name (model_name)");
    }
    if (!indexNames.has('idx_pred_location')) {
        await connection.query("ALTER TABLE ai_predictions ADD INDEX idx_pred_location (location)");
    }

    // 2. Create ai_tool_logs
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_tool_logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            tool_call_id VARCHAR(64) NOT NULL UNIQUE,
            session_id VARCHAR(64) NULL,
            user_id VARCHAR(64) NULL,
            tool_name VARCHAR(100) NOT NULL,
            parameters JSON NULL,
            result_summary JSON NULL,
            latency_ms INT DEFAULT 0,
            success TINYINT(1) DEFAULT 1,
            error_message TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tool_name (tool_name),
            INDEX idx_tool_session (session_id),
            INDEX idx_tool_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Create ai_feedback
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_feedback (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            prediction_id VARCHAR(64) NOT NULL,
            module VARCHAR(50) NOT NULL,
            model_name VARCHAR(100) NOT NULL,
            predicted_value VARCHAR(255) NULL,
            actual_value VARCHAR(255) NULL,
            accuracy_score DECIMAL(5,4) NULL,
            feedback_type ENUM('AUTOMATED_OBSERVATION', 'STAFF_REVIEW', 'CITIZEN_RATING') DEFAULT 'STAFF_REVIEW',
            submitted_by VARCHAR(64) NULL,
            comments TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_fb_pred_id (prediction_id),
            INDEX idx_fb_module (module),
            INDEX idx_fb_model (model_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Create ai_chat_sessions & ai_chat_messages
    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(64) NOT NULL UNIQUE,
            user_id VARCHAR(64) NULL,
            language VARCHAR(20) DEFAULT 'bilingual',
            channel VARCHAR(50) DEFAULT 'web_floating_widget',
            metadata JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_chat_session_user (user_id),
            INDEX idx_chat_session_date (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            session_id VARCHAR(64) NOT NULL,
            sender ENUM('user', 'assistant', 'system') NOT NULL,
            message TEXT NOT NULL,
            intent VARCHAR(100) NULL,
            tool_called VARCHAR(100) NULL,
            data_source ENUM('REAL', 'SIMULATED', 'PREDICTED') DEFAULT 'REAL',
            confidence_score DECIMAL(5,4) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_msg_session (session_id),
            INDEX idx_msg_intent (intent),
            INDEX idx_msg_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ Phase 1 AI Orchestration SQL Migration applied successfully!");

    // Verify columns on ai_predictions
    const [finalCols] = await connection.query("DESCRIBE ai_predictions");
    console.log("Updated ai_predictions columns count:", finalCols.length);

    // Verify new tables
    const [tables] = await connection.query("SHOW TABLES LIKE 'ai_%'");
    console.log("AI Tables now available:", tables.map(r => Object.values(r)[0]));

    await connection.end();
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
