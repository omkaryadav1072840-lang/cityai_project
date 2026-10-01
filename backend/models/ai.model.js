/**
 * SmartCity AI - AI Governance & Predictions Domain Model
 * Encapsulates MySQL queries for AI Models, Predictions, Feedback, and Tool Logs.
 */

const pool = require("../config/db").promise();

class AIModel {
    static async getModels() {
        const [rows] = await pool.query(`SELECT * FROM ai_models ORDER BY id ASC`);
        return rows;
    }

    static async getPredictions(moduleFilter = null, limit = 50) {
        let sql = `SELECT * FROM ai_predictions`;
        const params = [];
        if (moduleFilter) {
            sql += ` WHERE module = ?`;
            params.push(moduleFilter);
        }
        sql += ` ORDER BY id DESC LIMIT ?`;
        params.push(Number(limit) || 50);
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async recordPrediction({ predictionId, modelName, module, inputSnapshot, predictionOutput, confidenceScore, dataSource = 'PREDICTED' }) {
        const [result] = await pool.query(`
            INSERT INTO ai_predictions
            (prediction_id, model_name, module, input_snapshot, prediction_output, confidence_score, data_source, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW())
        `, [predictionId, modelName, module, JSON.stringify(inputSnapshot || {}), JSON.stringify(predictionOutput || {}), confidenceScore || 0.90, dataSource]);
        return result.insertId;
    }

    static async recordFeedback({ predictionId, module, modelName, predictedValue, actualValue, accuracyScore, feedbackType, submittedBy, comments }) {
        const [result] = await pool.query(`
            INSERT INTO ai_feedback
            (prediction_id, module, model_name, predicted_value, actual_value, accuracy_score, feedback_type, submitted_by, comments, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [predictionId, module, modelName, String(predictedValue), String(actualValue), accuracyScore || 1.0, feedbackType || 'STAFF_REVIEW', submittedBy || null, comments || null]);
        return result.insertId;
    }

    static async recordToolLog({ toolCallId, toolName, parameters, resultSummary, userId, latencyMs, success, errorMessage }) {
        try {
            await pool.query(`
                INSERT INTO ai_tool_logs
                (tool_call_id, tool_name, parameters, result_summary, user_id, latency_ms, success, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [toolCallId, toolName, JSON.stringify(parameters || {}), resultSummary ? String(resultSummary).slice(0, 500) : null, userId || null, latencyMs || 0, success ? 1 : 0, errorMessage || null]);
        } catch (e) {
            console.warn("AI Tool Log write error (non-fatal):", e.message);
        }
    }
}

module.exports = AIModel;
