/**
 * SmartCity AI - Standardized API Response Formatter
 * Enforces consistent API envelopes while maintaining backward compatibility:
 * Success: { success: true, message: "...", data: {...}, error: null, ...extraFields }
 * Error:   { success: false, message: "...", data: null, error: { code: "...", details: "..." }, ...extraFields }
 */

function apiSuccess(res, data = {}, message = "Operation completed successfully", statusCode = 200, extraFields = {}) {
    const payload = {
        success: true,
        message: message,
        data: data,
        error: null,
        ...extraFields
    };
    return res.status(statusCode).json(payload);
}

function apiError(res, message = "An error occurred", statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details = null, extraFields = {}) {
    const payload = {
        success: false,
        message: message,
        data: null,
        error: {
            code: errorCode,
            details: details || message
        },
        ...extraFields
    };
    return res.status(statusCode).json(payload);
}

module.exports = {
    apiSuccess,
    apiError
};
