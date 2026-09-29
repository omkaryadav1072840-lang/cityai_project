const path = require("path");
const fs = require("fs");
const multer = require("multer");

const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");

// Helper to serve clean HTML error pages
function serveHtmlErrorPage(res, statusCode, fallbackMessage) {
    const errorPageMap = {
        403: path.join(FRONTEND_DIR, "403.html"),
        404: path.join(FRONTEND_DIR, "404.html"),
        500: path.join(FRONTEND_DIR, "500.html")
    };

    const filePath = errorPageMap[statusCode] || errorPageMap[500];

    if (fs.existsSync(filePath)) {
        res.status(statusCode);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return fs.createReadStream(filePath).pipe(res);
    }

    res.status(statusCode).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${statusCode} Error - SmartCity AI</title>
            <style>
                body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                .box { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h1 { font-size: 3rem; margin: 0 0 1rem; color: #38bdf8; }
                p { color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
                a { display: inline-block; background: #2563eb; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
                a:hover { background: #1d4ed8; }
            </style>
        </head>
        <body>
            <div class="box">
                <h1>${statusCode}</h1>
                <p>${fallbackMessage || "An unexpected error occurred."}</p>
                <a href="/">← Return to SmartCity Home</a>
            </div>
        </body>
        </html>
    `);
}

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

    if (err && err.message && (
        err.message.includes("allowed") ||
        err.message.includes("Only PDF") ||
        err.message.includes("image files") ||
        err.message.includes("File type")
    )) {
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
    const isApiRequest = req.path.startsWith("/api/") || req.path.startsWith("/socket.io/");
    const prefersHtml = req.accepts("html") && !req.accepts("json");

    if (isApiRequest || !prefersHtml) {
        return res.status(404).json({
            success: false,
            message: "API endpoint not found."
        });
    }

    return serveHtmlErrorPage(res, 404, "The requested civic page could not be found on SmartCity AI.");
}

// =========================================================
// GENERAL ERROR HANDLER
// =========================================================

function generalErrorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";

    // Safe error logging: don't log passwords or sensitive headers
    console.error(`❌ [Server Error ${status}]:`, err.message || err);

    const isApiRequest = req.path.startsWith("/api/") || req.path.startsWith("/socket.io/");
    const prefersHtml = req.accepts("html") && !req.accepts("json");

    if (isApiRequest || !prefersHtml) {
        return res.status(status).json({
            success: false,
            message: status === 400 ? err.message : (status === 403 ? "Access forbidden." : "Internal server error."),
            ...(isProduction ? {} : { error: err.message })
        });
    }

    if (status === 403) {
        return serveHtmlErrorPage(res, 403, "You do not have permission to access this protected municipal resource.");
    }

    return serveHtmlErrorPage(res, 500, "A secure server error occurred while processing your request. Please try again shortly.");
}

module.exports = {
    serveHtmlErrorPage,
    multerErrorHandler,
    notFoundHandler,
    generalErrorHandler
};
