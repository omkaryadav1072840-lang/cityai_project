const multer = require("multer");

// =========================================================
// MULTER ERROR HANDLER
// =========================================================

function multerErrorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size cannot exceed 10 MB."
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err && err.message && err.message.includes("Only PDF")) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next(err);
}

// =========================================================
// 404 NOT FOUND HANDLER
// =========================================================

function notFoundHandler(req, res) {
    res.status(404).json({
        message: "API route not found."
    });
}

// =========================================================
// GENERAL ERROR HANDLER
// =========================================================

function generalErrorHandler(err, req, res, next) {
    console.error("❌ Server error:", err);

    res.status(500).json({
        message: "Internal server error.",
        error: err.message
    });
}

module.exports = {
    multerErrorHandler,
    notFoundHandler,
    generalErrorHandler
};
