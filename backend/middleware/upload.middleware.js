const path = require("path");
const fs = require("fs");
const multer = require("multer");

// =========================================================
// UPLOAD DIRECTORIES
// =========================================================

const uploadsBaseDir = path.join(__dirname, "..", "uploads");
const prescriptionUploadDir = path.join(uploadsBaseDir, "prescriptions");
const reportUploadDir = path.join(uploadsBaseDir, "reports");

[uploadsBaseDir, prescriptionUploadDir, reportUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// =========================================================
// ALLOWED FILE TYPES (Strict MIME & Extension Whitelist)
// =========================================================

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
];

const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const mimeToExtension = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};

function commonFileFilter(req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const isMimeValid = allowedMimeTypes.includes(file.mimetype);
    const isExtValid = allowedExtensions.includes(rawExt);

    // Block dangerous extension spoofing or executable MIME bypass
    if (isMimeValid && isExtValid) {
        cb(null, true);
    } else {
        cb(new Error("Security violation: Only authentic PDF, JPG, PNG and WEBP documents are allowed."));
    }
}

// =========================================================
// PRESCRIPTION STORAGE & UPLOAD
// =========================================================

const prescriptionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, prescriptionUploadDir);
    },
    filename: function (req, file, cb) {
        // Enforce safe canonical extension derived strictly from verified MIME-type
        const safeExt = mimeToExtension[file.mimetype] || ".png";
        const uniqueName =
            "prescription-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            safeExt;
        cb(null, uniqueName);
    }
});

const prescriptionUpload = multer({
    storage: prescriptionStorage,
    fileFilter: commonFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// =========================================================
// REPORT STORAGE & UPLOAD
// =========================================================

const reportStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, reportUploadDir);
    },
    filename: function (req, file, cb) {
        // Enforce safe canonical extension derived strictly from verified MIME-type
        const safeExt = mimeToExtension[file.mimetype] || ".png";
        const uniqueName =
            "report-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            safeExt;
        cb(null, uniqueName);
    }
});

const reportUpload = multer({
    storage: reportStorage,
    fileFilter: commonFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

module.exports = {
    prescriptionUpload,
    reportUpload,
    prescriptionUploadDir,
    reportUploadDir,
    uploadsBaseDir
};
