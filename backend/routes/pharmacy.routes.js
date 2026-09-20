const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const { prescriptionUpload, prescriptionUploadDir } = require("../middleware/upload.middleware");
const { authenticateToken, requireRole } = require("../middleware/auth.middleware");

// =========================================================
// PHARMACY - GET ALL MEDICINES
// =========================================================

router.get("/api/pharmacy", (req, res) => {
    const sql = `
        SELECT
            id,
            medicine_name,
            category,
            quantity,
            price,
            availability,
            updated_at
        FROM pharmacy
        ORDER BY medicine_name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Pharmacy fetch error:", err);
            return res.status(500).json({
                success: false,
                message: "Pharmacy database error",
                error: err.message,
                medicines: []
            });
        }

        res.status(200).json({
            success: true,
            message: "Pharmacy data loaded",
            medicines: results
        });
    });
});

// =========================================================
// PHARMACY - SEARCH MEDICINE
// =========================================================

router.get("/api/pharmacy/search/:medicine", (req, res) => {
    const medicine = req.params.medicine.trim();

    if (!medicine) {
        return res.status(400).json({
            success: false,
            message: "Medicine name is required.",
            medicines: []
        });
    }

    const searchValue = `%${medicine}%`;
    const sql = `
        SELECT
            id,
            medicine_name,
            category,
            quantity,
            price,
            availability,
            updated_at
        FROM pharmacy
        WHERE LOWER(medicine_name) LIKE LOWER(?)
        ORDER BY medicine_name ASC
    `;

    db.query(sql, [searchValue], (err, results) => {
        if (err) {
            console.error("Medicine search error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error.",
                medicines: []
            });
        }

        res.json({
            success: true,
            message: "Medicine search completed.",
            medicines: results
        });
    });
});

// =========================================================
// PHARMACY - ADD MEDICINE
// =========================================================

router.post("/api/pharmacy", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const { medicineName, category, quantity, price } = req.body;

    if (!medicineName) {
        return res.status(400).json({
            message: "Medicine name is required."
        });
    }

    const medicineQuantity = Number(quantity || 0);
    const medicinePrice = Number(price || 0);
    const availability = medicineQuantity > 0 ? "Available" : "Out of Stock";

    const sql = `
        INSERT INTO pharmacy (medicine_name, category, quantity, price, availability)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [medicineName, category || null, medicineQuantity, medicinePrice, availability],
        (err, result) => {
            if (err) {
                console.error("Add medicine error:", err);
                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.status(201).json({
                message: "Medicine added successfully.",
                medicineId: result.insertId
            });
        }
    );
});

// =========================================================
// PHARMACY - UPDATE MEDICINE
// =========================================================

router.put("/api/pharmacy/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const { quantity, price, availability } = req.body;

    const medicineQuantity = Number(quantity || 0);
    const medicinePrice = Number(price || 0);
    const medicineAvailability =
        availability || (medicineQuantity > 0 ? "Available" : "Out of Stock");

    const sql = `
        UPDATE pharmacy
        SET quantity = ?, price = ?, availability = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [medicineQuantity, medicinePrice, medicineAvailability, id],
        (err, result) => {
            if (err) {
                console.error("Medicine update error:", err);
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Medicine not found."
                });
            }

            res.json({
                message: "Medicine updated successfully."
            });
        }
    );
});

// =========================================================
// PHARMACY - OLD PRESCRIPTION RECORD API
// =========================================================

router.post("/api/pharmacy/prescriptions", (req, res) => {
    const { patientId, prescriptionFile, doctorName } = req.body;

    if (!patientId || !prescriptionFile) {
        return res.status(400).json({
            message: "Patient ID and prescription are required."
        });
    }

    const sql = `
        INSERT INTO prescriptions (patient_id, prescription_file, doctor_name, status)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [patientId, prescriptionFile, doctorName || null, "Uploaded"],
        (err, result) => {
            if (err) {
                console.error("Prescription record error:", err);
                return res.status(500).json({
                    message: "Prescription database error."
                });
            }

            res.status(201).json({
                message: "Prescription uploaded successfully.",
                prescription: {
                    id: result.insertId,
                    patientId,
                    prescriptionFile,
                    doctorName: doctorName || null,
                    status: "Uploaded"
                }
            });
        }
    );
});

// =========================================================
// PHARMACY - ADD MEDICINE TO CART
// =========================================================

router.post("/api/pharmacy/cart", (req, res) => {
    const { patientId, medicineId, medicineName, quantity } = req.body;

    if (!patientId || !medicineId || !medicineName || !quantity) {
        return res.status(400).json({
            message: "Patient ID, medicine and quantity are required."
        });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
            message: "Invalid quantity."
        });
    }

    const stockSQL = `
        SELECT id, medicine_name, quantity, price, availability
        FROM pharmacy
        WHERE id = ?
        LIMIT 1
    `;

    db.query(stockSQL, [medicineId], (err, results) => {
        if (err) {
            console.error("Medicine stock error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Medicine not found."
            });
        }

        const medicine = results[0];
        if (Number(medicine.quantity) < qty) {
            return res.status(400).json({
                message: `Only ${medicine.quantity} units available.`
            });
        }

        const total = Number(medicine.price) * qty;

        const cartSQL = `
            INSERT INTO pharmacy_cart (patient_id, medicine_id, medicine_name, quantity, price, total)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            cartSQL,
            [patientId, medicine.id, medicine.medicine_name, qty, medicine.price, total],
            (cartErr, result) => {
                if (cartErr) {
                    console.error("Cart error:", cartErr);
                    return res.status(500).json({
                        message: "Unable to add medicine to cart."
                    });
                }

                res.status(201).json({
                    message: "Medicine added to cart.",
                    cartItem: {
                        id: result.insertId,
                        patientId,
                        medicineId: medicine.id,
                        medicineName: medicine.medicine_name,
                        quantity: qty,
                        price: medicine.price,
                        total
                    }
                });
            }
        );
    });
});

// =========================================================
// PHARMACY - GET PATIENT CART
// =========================================================

router.get("/api/pharmacy/cart/:patientId", (req, res) => {
    const patientId = req.params.patientId;

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required."
        });
    }

    const sql = `
        SELECT id, patient_id, medicine_id, medicine_name, quantity, price, total, created_at
        FROM pharmacy_cart
        WHERE patient_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Cart fetch error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        let subtotal = 0;
        results.forEach(item => {
            subtotal += Number(item.total || 0);
        });

        res.json({
            message: "Cart loaded successfully.",
            items: results,
            subtotal
        });
    });
});

// =========================================================
// PHARMACY - REMOVE CART ITEM
// =========================================================

router.delete("/api/pharmacy/cart/:id", (req, res) => {
    const id = req.params.id;

    const sql = `
        DELETE FROM pharmacy_cart
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Cart delete error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Cart item not found."
            });
        }

        res.json({
            message: "Medicine removed from cart."
        });
    });
});

// =========================================================
// PHARMACY - CHECKOUT / GENERATE BILL
// =========================================================

router.post("/api/pharmacy/checkout", (req, res) => {
    const { patientId, discount } = req.body;

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required."
        });
    }

    const discountAmount = Number(discount || 0);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
        return res.status(400).json({
            message: "Invalid discount."
        });
    }

    const cartSQL = `
        SELECT id, medicine_id, medicine_name, quantity, price, total
        FROM pharmacy_cart
        WHERE patient_id = ?
    `;

    db.query(cartSQL, [patientId], (cartErr, cartItems) => {
        if (cartErr) {
            console.error("Checkout cart error:", cartErr);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (cartItems.length === 0) {
            return res.status(400).json({
                message: "Cart is empty."
            });
        }

        let subtotal = 0;
        cartItems.forEach(item => {
            subtotal += Number(item.total || 0);
        });

        if (discountAmount > subtotal) {
            return res.status(400).json({
                message: "Discount cannot be greater than total."
            });
        }

        const finalAmount = subtotal - discountAmount;
        const billNumber = "BILL-" + Date.now();

        const billSQL = `
            INSERT INTO pharmacy_bills (bill_number, patient_id, subtotal, discount, final_amount, payment_status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            billSQL,
            [billNumber, patientId, subtotal, discountAmount, finalAmount, "Pending"],
            (billErr, billResult) => {
                if (billErr) {
                    console.error("Bill creation error:", billErr);
                    return res.status(500).json({
                        message: "Bill creation failed."
                    });
                }

                const billId = billResult.insertId;
                let completed = 0;
                let failed = false;

                cartItems.forEach(item => {
                    const itemSQL = `
                        INSERT INTO pharmacy_bill_items (bill_id, medicine_id, medicine_name, quantity, price, total)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;

                    db.query(
                        itemSQL,
                        [billId, item.medicine_id, item.medicine_name, item.quantity, item.price, item.total],
                        (itemErr) => {
                            if (itemErr) {
                                console.error("Bill item error:", itemErr);
                                if (!failed) {
                                    failed = true;
                                    return res.status(500).json({
                                        message: "Bill item creation failed."
                                    });
                                }
                                return;
                            }

                            completed++;
                            if (completed === cartItems.length && !failed) {
                                res.status(201).json({
                                    message: "Bill generated successfully.",
                                    bill: {
                                        id: billId,
                                        billNumber,
                                        patientId,
                                        items: cartItems,
                                        subtotal,
                                        discount: discountAmount,
                                        finalAmount,
                                        paymentStatus: "Pending"
                                    }
                                });
                            }
                        }
                    );
                });
            }
        );
    });
});

// =========================================================
// PHARMACY - GET PATIENT BILLS
// =========================================================

router.get("/api/pharmacy/bills/:patientId", (req, res) => {
    const patientId = req.params.patientId;

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required."
        });
    }

    const sql = `
        SELECT id, bill_number, patient_id, subtotal, discount, final_amount, payment_status, created_at
        FROM pharmacy_bills
        WHERE patient_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [patientId], (err, bills) => {
        if (err) {
            console.error("Bill fetch error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Patient bills fetched successfully.",
            bills
        });
    });
});

// =========================================================
// GET PRESCRIPTIONS FOR A PATIENT (medical record tab)
// =========================================================

router.get("/api/prescriptions/:patientId", (req, res) => {
    const patientId = req.params.patientId;

    if (!patientId) {
        return res.status(400).json({ message: "Patient ID is required." });
    }

    const sql = `
        SELECT *
        FROM prescriptions
        WHERE patient_id = ?
        ORDER BY id DESC
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Prescriptions fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Prescriptions fetched successfully.",
            prescriptions: results
        });
    });
});

// =========================================================
// UPLOAD PRESCRIPTION - ACTUAL FILE UPLOAD
// =========================================================

router.post(
    "/api/prescriptions/upload",
    prescriptionUpload.single("prescriptionFile"),
    async (req, res) => {
        try {
            const { patientId, uploadedBy, doctorName } = req.body;

            if (!patientId) {
                if (req.file) {
                    const uploadedFile = path.join(prescriptionUploadDir, req.file.filename);
                    if (fs.existsSync(uploadedFile)) {
                        fs.unlinkSync(uploadedFile);
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: "Patient ID is required."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Prescription file is required."
                });
            }

            const filePath = `/uploads/prescriptions/${req.file.filename}`;
            const sql = `
                INSERT INTO prescriptions
                (patient_id, original_file_name, stored_file_name, file_path, file_type, file_size, uploaded_by, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                patientId,
                req.file.originalname,
                req.file.filename,
                filePath,
                req.file.mimetype,
                req.file.size,
                uploadedBy || "Patient",
                "Uploaded"
            ];

            const [result] = await db.promise().execute(sql, values);

            res.status(201).json({
                success: true,
                message: "Prescription uploaded successfully.",
                prescription: {
                    id: result.insertId,
                    patientId,
                    originalFileName: req.file.originalname,
                    fileName: req.file.filename,
                    fileType: req.file.mimetype,
                    fileSize: req.file.size,
                    doctorName: doctorName || null,
                    uploadedBy: uploadedBy || "Patient",
                    status: "Uploaded",
                    filePath,
                    fileUrl: `http://localhost:5000${filePath}`
                }
            });
        } catch (error) {
            console.error("Prescription upload error:", error);
            if (req.file) {
                const uploadedFile = path.join(prescriptionUploadDir, req.file.filename);
                if (fs.existsSync(uploadedFile)) {
                    fs.unlinkSync(uploadedFile);
                }
            }
            res.status(500).json({
                success: false,
                message: "Prescription upload failed.",
                error: error.message
            });
        }
    }
);

// =========================================================
// PHARMACY PAYMENT
// =========================================================

function reduceMedicineStock(items, callback) {
    if (!Array.isArray(items) || items.length === 0) {
        callback();
        return;
    }

    let completed = 0;
    let failed = false;

    items.forEach(item => {
        const medicineId = item.id || item.medicineId;
        const quantity = Number(item.quantity) || 0;

        if (!medicineId || quantity <= 0) {
            completed++;
            if (completed === items.length && !failed) {
                callback();
            }
            return;
        }

        const sql = `
            UPDATE pharmacy
            SET quantity = GREATEST(quantity - ?, 0),
                availability = CASE WHEN GREATEST(quantity - ?, 0) = 0 THEN 'Out of Stock' ELSE availability END
            WHERE id = ?
        `;

        db.query(sql, [quantity, quantity, medicineId], (error) => {
            if (error) {
                console.error("Stock update error:", error);
                if (!failed) {
                    failed = true;
                    callback();
                }
                return;
            }

            completed++;
            if (completed === items.length && !failed) {
                callback();
            }
        });
    });
}

router.post("/api/pharmacy/payment", (req, res) => {
    const { patientId, paymentMethod, amount, items } = req.body;

    if (!patientId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID is required."
        });
    }

    if (!paymentMethod) {
        return res.status(400).json({
            success: false,
            message: "Payment method is required."
        });
    }

    if (amount === undefined || Number(amount) <= 0) {
        return res.status(400).json({
            success: false,
            message: "Valid payment amount is required."
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Cart is empty."
        });
    }

    const allowedMethods = ["UPI", "Card", "Net Banking", "COD"];
    if (!allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment method."
        });
    }

    const transactionId = "TXN-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
    const billNumber = "LCB-" + Date.now();
    const finalAmount = Number(amount);

    const billSQL = `
        INSERT INTO pharmacy_bills (bill_number, patient_id, subtotal, discount, final_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        billSQL,
        [
            billNumber,
            patientId,
            finalAmount,
            0,
            finalAmount,
            paymentMethod === "COD" ? "Pending" : "Paid"
        ],
        (billError, billResult) => {
            if (billError) {
                console.error("Payment bill error:", billError);
                return res.status(500).json({
                    success: false,
                    message: "Unable to create payment bill.",
                    error: billError.message
                });
            }

            const billId = billResult.insertId;
            let completed = 0;
            let failed = false;

            items.forEach(item => {
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const total = quantity * price;

                const itemSQL = `
                    INSERT INTO pharmacy_bill_items (bill_id, medicine_id, medicine_name, quantity, price, total)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    itemSQL,
                    [
                        billId,
                        item.id || item.medicineId,
                        item.name || item.medicineName || "Medicine",
                        quantity,
                        price,
                        total
                    ],
                    (itemError) => {
                        if (itemError) {
                            console.error("Payment item error:", itemError);
                            if (!failed) {
                                failed = true;
                                return res.status(500).json({
                                    success: false,
                                    message: "Unable to save payment items."
                                });
                            }
                            return;
                        }

                        completed++;
                        if (completed === items.length && !failed) {
                            reduceMedicineStock(items, () => {
                                // Clear patient cart upon successful order
                                db.query("DELETE FROM pharmacy_cart WHERE patient_id = ?", [patientId], (cartErr) => {
                                    if (cartErr) console.warn("Cart cleanup warning after payment:", cartErr);
                                });

                                res.status(201).json({
                                    success: true,
                                    message:
                                        paymentMethod === "COD"
                                            ? "Order placed successfully."
                                            : "Payment successful.",
                                    transactionId,
                                    billNumber,
                                    billId,
                                    patientId,
                                    paymentMethod,
                                    amount: finalAmount,
                                    paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid"
                                });
                            });
                        }
                    }
                );
            });
        }
    );
});

module.exports = router;
