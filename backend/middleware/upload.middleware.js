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
// ALLOWED FILE TYPES (PDF, JPG, PNG, WEBP)
// =========================================================

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
];

function commonFileFilter(req, file, cb) {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, JPG, PNG and WEBP files are allowed."));
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
        const extension = path.extname(file.originalname);
        const uniqueName =
            "prescription-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            extension;
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
        const extension = path.extname(file.originalname);
        const uniqueName =
            "report-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            extension;
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
