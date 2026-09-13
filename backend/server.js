const db = require("./db");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@xellenixtech.com";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";
const NODE_ENV = process.env.NODE_ENV || "development";

// SMTP and notification configuration
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || ADMIN_EMAIL;

let mailTransporter = null;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    mailTransporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    mailTransporter.verify().then(() => {
        console.log('SMTP transporter verified');
    }).catch(err => {
        console.error('SMTP verification failed:', err && err.message ? err.message : err);
        mailTransporter = null;
    });
} else {
    console.warn('SMTP not configured; admin notification emails will be disabled.');
}

const allowedBusinessTypes = [
    "cleaning",
    "restaurant",
    "retail",
    "construction",
    "real-estate",
    "school",
    "other"
];

const allowedWebsitePackages = [
    "starter",
    "business",
    "professional",
    "ecommerce"
];

const MAX_LENGTHS = {
    fullName: 100,
    businessName: 100,
    email: 150,
    phone: 30,
    message: 2000,
    notes: 2000
};

const allowedStatuses = [
    "New",
    "Contacted",
    "In Progress",
    "Completed",
    "Cancelled"
];

app.use(helmet());
// Configure CORS: in production only allow configured FRONTEND_URL
const allowedOrigins = FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (curl, server-to-server) without origin
        if (!origin) return callback(null, true);

        if (NODE_ENV === 'production') {
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('CORS policy does not allow this origin.'));
        }

        // In development allow localhost origins
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Also allow configured frontend during development
        if (allowedOrigins.includes(origin)) return callback(null, true);

        return callback(new Error('CORS policy does not allow this origin.'));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "12kb" }));
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

function sanitizeText(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .trim();
}

function isValidStatus(status) {
    return allowedStatuses.includes(status);
}

function generateAdminToken() {
    return jwt.sign({ email: ADMIN_EMAIL }, JWT_SECRET, {
        // Shorter-lived access token
        expiresIn: "1h"
    });
}

function getTokenFromHeader(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== "string") {
        return null;
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return null;
    }
    return parts[1];
}

function getTokenFromRequest(req) {
    // Check Authorization header first
    const headerToken = getTokenFromHeader(req);
    if (headerToken) return headerToken;

    // Fallback: check cookie named xellenix_admin_token
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader || typeof cookieHeader !== 'string') return null;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
        const [name, ...rest] = cookie.split('=');
        if (name === 'xellenix_admin_token') {
            return rest.join('=');
        }
    }
    return null;
}

function requireAdminAuth(req, res, next) {
    const token = getTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.email !== ADMIN_EMAIL) {
            throw new Error("Unauthorized admin.");
        }

        req.admin = { email: decoded.email };
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
}

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function validateAdminPassword(password) {
    if (!ADMIN_PASSWORD_HASH) {
        return false;
    }
    return bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(pw) {
    if (typeof pw !== 'string') return false;
    // Minimum 12 chars, at least one lowercase, one uppercase, one digit, one symbol
    return /(?=.{12,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(pw);
}

function isValidPhone(phone) {
    return /^[0-9+\-\s]{7,30}$/.test(phone);
}

function hasValidLength(value, maxLength) {
    return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function createWebsiteRequestsTableIfNeeded() {
    const [tables] = await db.query("SHOW TABLES LIKE 'website_requests'");

    if (tables.length === 0) {
        await db.query(`
            CREATE TABLE IF NOT EXISTS website_requests (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                business_name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL,
                phone VARCHAR(30) NOT NULL,
                business_type VARCHAR(50) NOT NULL,
                website_package VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'New',
                notes TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        return;
    }

    const [columns] = await db.query("SHOW COLUMNS FROM website_requests");
    const names = columns.map(column => column.Field);
    const updates = [];

    if (!names.includes("status")) {
        updates.push("ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'New' AFTER website_package");
    }

    if (!names.includes("notes")) {
        updates.push("ADD COLUMN notes TEXT NULL AFTER status");
    }

    if (!names.includes("created_at")) {
        updates.push("ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER notes");
    }

    if (!names.includes("updated_at")) {
        updates.push("ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
    }

    if (updates.length > 0) {
        await db.query(`ALTER TABLE website_requests ${updates.join(", ")}`);
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function sendAdminNotificationEmail(request) {
    if (!mailTransporter) return;

    try {
        const html = `
            <h2>New Website Request</h2>
            <p><strong>Customer:</strong> ${escapeHtml(request.fullName)}</p>
            <p><strong>Business:</strong> ${escapeHtml(request.businessName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(request.email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(request.phone)}</p>
            <p><strong>Business Type:</strong> ${escapeHtml(request.businessType)}</p>
            <p><strong>Package:</strong> ${escapeHtml(request.websitePackage)}</p>
            <p><strong>Message:</strong><br/>${escapeHtml(request.message).replace(/\n/g, '<br/>')}</p>
            <p><small>Received: ${new Date().toLocaleString()}</small></p>
        `;

        await mailTransporter.sendMail({
            from: SMTP_USER,
            to: ADMIN_NOTIFICATION_EMAIL,
            subject: 'New website request — Xellenix Tech Solution',
            html
        });
    } catch (err) {
        console.error('Failed to send admin notification email:', err && err.message ? err.message : err);
    }
}

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Xellenix Tech Solution API is running"
    });
});

app.post("/api/admin/login", authLimiter, async (req, res) => {
    try {
        const email = sanitizeText(req.body.email).toLowerCase();
        const password = sanitizeText(req.body.password);

        if (!isValidEmail(email) || password.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid email and password."
            });
        }

        if (email !== ADMIN_EMAIL.toLowerCase() || !validateAdminPassword(password)) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials."
            });
        }

        const token = generateAdminToken();
        // Set cookie for optional migration to cookie-based auth
        res.cookie('xellenix_admin_token', token, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        res.json({
            success: true,
            message: "Admin authenticated successfully.",
            token
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to process login at this time."
        });
    }
});

// One-time admin password setup endpoint. Protected by SETUP_TOKEN env var.
app.post('/api/admin/set-password', async (req, res) => {
    try {
        const setupToken = req.headers['x-setup-token'] || req.body.setupToken;
        if (!process.env.SETUP_TOKEN || !setupToken || setupToken !== process.env.SETUP_TOKEN) {
            return res.status(403).json({ success: false, message: 'Invalid setup token.' });
        }

        const password = typeof req.body.password === 'string' ? req.body.password : '';
        if (!isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: 'Password does not meet strength requirements (min 12 chars, upper+lower+digit+symbol).' });
        }

        const newHash = bcrypt.hashSync(password, 12);
        // Update in-memory hash. Persisting to .env must be done by the deployer.
        ADMIN_PASSWORD_HASH = newHash;

        return res.json({ success: true, message: 'Admin password hash set in memory. Persist ADMIN_PASSWORD_HASH in your environment.' });
    } catch (err) {
        console.error('Error setting admin password:', err);
        return res.status(500).json({ success: false, message: 'Unable to set admin password.' });
    }
});

app.get("/api/admin/validate", requireAdminAuth, (req, res) => {
    res.json({
        success: true,
        message: "Admin token is valid.",
        admin: req.admin
    });
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('xellenix_admin_token');
    res.json({ success: true, message: 'Logged out successfully.' });
});

app.post("/api/requests", async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({
                success: false,
                message: "Invalid request payload."
            });
        }

        const rawPayload = {
            fullName: sanitizeText(req.body.fullName),
            businessName: sanitizeText(req.body.businessName),
            email: sanitizeText(req.body.email).toLowerCase(),
            phone: sanitizeText(req.body.phone),
            businessType: sanitizeText(req.body.businessType).toLowerCase(),
            websitePackage: sanitizeText(req.body.websitePackage).toLowerCase(),
            message: sanitizeText(req.body.message)
        };

        if (
            !hasValidLength(rawPayload.fullName, MAX_LENGTHS.fullName) ||
            !hasValidLength(rawPayload.businessName, MAX_LENGTHS.businessName) ||
            !hasValidLength(rawPayload.email, MAX_LENGTHS.email) ||
            !hasValidLength(rawPayload.phone, MAX_LENGTHS.phone) ||
            !hasValidLength(rawPayload.message, MAX_LENGTHS.message)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid input for all required fields."
            });
        }

        if (!isValidEmail(rawPayload.email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (!isValidPhone(rawPayload.phone)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid phone number."
            });
        }

        if (!allowedBusinessTypes.includes(rawPayload.businessType)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid business type."
            });
        }

        if (!allowedWebsitePackages.includes(rawPayload.websitePackage)) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid website package."
            });
        }

        const sql = `
            INSERT INTO website_requests
            (
                full_name,
                business_name,
                email,
                phone,
                business_type,
                website_package,
                message,
                status,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(sql, [
            rawPayload.fullName,
            rawPayload.businessName,
            rawPayload.email,
            rawPayload.phone,
            rawPayload.businessType,
            rawPayload.websitePackage,
            rawPayload.message,
            "New",
            null
        ]);

        const responsePayload = {
            success: true,
            message: "Your website request has been received successfully.",
            requestId: result.insertId
        };

        // Send response first, then attempt to notify admin via email in background
        res.status(201).json(responsePayload);

        // Fire-and-forget email notification (do not block response)
        sendAdminNotificationEmail({
            fullName: rawPayload.fullName,
            businessName: rawPayload.businessName,
            email: rawPayload.email,
            phone: rawPayload.phone,
            businessType: rawPayload.businessType,
            websitePackage: rawPayload.websitePackage,
            message: rawPayload.message,
            id: result.insertId
        }).catch(() => {});
    } catch (error) {
        console.error("Error saving website request:", error);
        res.status(500).json({
            success: false,
            message: "Unable to save your request at this time. Please try again later."
        });
    }
});

app.get("/api/requests", requireAdminAuth, async (req, res) => {
    try {
        const status = sanitizeText(req.query.status);
        const search = sanitizeText(req.query.search);
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);
        const offset = (page - 1) * limit;

        const conditions = ["1 = 1"];
        const params = [];

        if (status && isValidStatus(status)) {
            conditions.push("status = ?");
            params.push(status);
        }

        if (search) {
            const likeTerm = `%${search}%`;
            conditions.push("(full_name LIKE ? OR business_name LIKE ? OR email LIKE ? OR phone LIKE ? OR website_package LIKE ? OR message LIKE ?)");
            params.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
        }

        const totalSql = `SELECT COUNT(*) AS total FROM website_requests WHERE ${conditions.join(" AND ")}`;
        const [[{ total }]] = await db.query(totalSql, params);

        const statusCountsSql = `
            SELECT status, COUNT(*) AS count
            FROM website_requests
            WHERE ${conditions.join(" AND ")}
            GROUP BY status
        `;
        const [statusRows] = await db.query(statusCountsSql, params);
        const statusCounts = statusRows.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
        }, {});

        const sql = `
            SELECT id,
                   full_name AS fullName,
                   business_name AS businessName,
                   email,
                   phone,
                   business_type AS businessType,
                   website_package AS websitePackage,
                   status,
                   notes,
                   created_at AS createdAt,
                   updated_at AS updatedAt
            FROM website_requests
            WHERE ${conditions.join(" AND ")}
            ORDER BY created_at DESC
            LIMIT ?
            OFFSET ?
        `;

        const [rows] = await db.query(sql, [...params, limit, offset]);

        res.json({
            success: true,
            results: rows,
            page,
            limit,
            total,
            statusCounts
        });
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch requests at this time."
        });
    }
});

// Export requests as CSV (requires admin auth)
app.get('/api/requests/export.csv', requireAdminAuth, async (req, res) => {
    try {
        const status = sanitizeText(req.query.status);
        const search = sanitizeText(req.query.search);
        const limit = Math.min(parsePositiveInt(req.query.limit, 1000), 10000);

        const conditions = ['1 = 1'];
        const params = [];

        if (status && isValidStatus(status)) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (search) {
            const likeTerm = `%${search}%`;
            conditions.push('(full_name LIKE ? OR business_name LIKE ? OR email LIKE ? OR phone LIKE ? OR website_package LIKE ? OR message LIKE ?)');
            params.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
        }

        const sql = `
            SELECT id,
                   full_name AS fullName,
                   business_name AS businessName,
                   email,
                   phone,
                   business_type AS businessType,
                   website_package AS websitePackage,
                   status,
                   notes,
                   message,
                   created_at AS createdAt,
                   updated_at AS updatedAt
            FROM website_requests
            WHERE ${conditions.join(' AND ')}
            ORDER BY created_at DESC
            LIMIT ?
        `;

        const [rows] = await db.query(sql, [...params, limit]);

        function csvEscape(value) {
            if (value === null || value === undefined) return '';
            const s = String(value);
            if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        }

        const headers = ['ID','Customer','Business','Email','Phone','Business Type','Package','Status','Notes','Message','Created At','Updated At'];
        const lines = [headers.join(',')];
        for (const r of rows) {
            const line = [
                csvEscape(r.id),
                csvEscape(r.fullName),
                csvEscape(r.businessName),
                csvEscape(r.email),
                csvEscape(r.phone),
                csvEscape(r.businessType),
                csvEscape(r.websitePackage),
                csvEscape(r.status),
                csvEscape(r.notes),
                csvEscape(r.message),
                csvEscape(r.createdAt),
                csvEscape(r.updatedAt)
            ].join(',');
            lines.push(line);
        }

        const csv = lines.join('\n');
        const filename = `xellenix_requests_${new Date().toISOString().slice(0,10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        console.error('Error exporting CSV:', err && err.message ? err.message : err);
        res.status(500).json({ success: false, message: 'Unable to export CSV at this time.' });
    }
});

app.get("/api/requests/:id", requireAdminAuth, async (req, res) => {
    try {
        const requestId = parsePositiveInt(req.params.id, 0);

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Invalid request ID."
            });
        }

        const sql = `
            SELECT id,
                   full_name AS fullName,
                   business_name AS businessName,
                   email,
                   phone,
                   business_type AS businessType,
                   website_package AS websitePackage,
                   message,
                   status,
                   notes,
                   created_at AS createdAt,
                   updated_at AS updatedAt
            FROM website_requests
            WHERE id = ?
            LIMIT 1
        `;
        const [rows] = await db.query(sql, [requestId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Request not found."
            });
        }

        res.json({ success: true, request: rows[0] });
    } catch (error) {
        console.error("Error fetching request:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch the request at this time."
        });
    }
});

app.put("/api/requests/:id", requireAdminAuth, async (req, res) => {
    try {
        const requestId = parsePositiveInt(req.params.id, 0);

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Invalid request ID."
            });
        }

        const updates = [];
        const params = [];

        if (req.body.status) {
            const status = sanitizeText(req.body.status);
            if (!isValidStatus(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status value."
                });
            }
            updates.push("status = ?");
            params.push(status);
        }

        if (req.body.notes !== undefined) {
            const notes = sanitizeText(req.body.notes);
            if (!hasValidLength(notes, MAX_LENGTHS.notes)) {
                return res.status(400).json({
                    success: false,
                    message: "Notes exceed the maximum allowed length."
                });
            }
            updates.push("notes = ?");
            params.push(notes || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        params.push(requestId);
        const sql = `UPDATE website_requests SET ${updates.join(", ")} WHERE id = ?`;
        const [result] = await db.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Request not found."
            });
        }

        res.json({
            success: true,
            message: "Request updated successfully."
        });
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({
            success: false,
            message: "Unable to update the request at this time."
        });
    }
});

app.delete("/api/requests/:id", requireAdminAuth, async (req, res) => {
    try {
        const requestId = parsePositiveInt(req.params.id, 0);

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Invalid request ID."
            });
        }

        const [result] = await db.execute("DELETE FROM website_requests WHERE id = ?", [requestId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Request not found."
            });
        }

        res.json({
            success: true,
            message: "Request deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete the request at this time."
        });
    }
});

async function startServer() {
    try {
        await createWebsiteRequestsTableIfNeeded();
        console.log("Website request table schema is ready.");

        // Startup checks for critical secrets
        if (!process.env.JWT_SECRET || JWT_SECRET === 'change_this_secret') {
            console.warn('Warning: JWT_SECRET is not set or uses the default. Set a strong JWT_SECRET in environment for production.');
        }

        if (!ADMIN_PASSWORD_HASH) {
            console.warn('Warning: ADMIN_PASSWORD_HASH is not set. Admin login will fail until a bcrypt hash is configured. Use SETUP_TOKEN to set a password temporarily.');
        }

        app.listen(PORT, () => {
            console.log(`Xellenix API running on port ${PORT} (env=${NODE_ENV})`);
        });
    } catch (error) {
        console.error("Startup error:", error);
        process.exit(1);
    }
}

startServer();