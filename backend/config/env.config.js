/**
 * SmartCity AI - Centralized Environment Configuration & Validation
 * -----------------------------------------------------------------
 * Validates critical environment variables, enforces fail-safe boot in production,
 * and eliminates hardcoded secrets across all modules.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// Insecure default values that must be blocked in production
const INSECURE_DEFAULT_SECRETS = [
    "smartcity_super_secret_jwt_key_gorakhpur_2026",
    "secret",
    "changeme",
    "jwt_secret",
    "123456",
    "password",
    "admin123"
];

function validateEnv() {
    const errors = [];
    const rawJwtSecret = process.env.JWT_SECRET;

    if (IS_PROD) {
        if (!rawJwtSecret) {
            errors.push("FATAL: JWT_SECRET environment variable is missing in production.");
        } else if (INSECURE_DEFAULT_SECRETS.includes(rawJwtSecret.toLowerCase()) || rawJwtSecret.length < 32) {
            errors.push("FATAL: JWT_SECRET is set to an insecure default or is shorter than 32 characters in production.");
        }

        if (process.env.DB_PASSWORD === undefined && process.env.MYSQL_PASSWORD === undefined) {
            errors.push("FATAL: DB_PASSWORD / MYSQL_PASSWORD environment variable is missing in production.");
        }
    }

    if (errors.length > 0) {
        errors.forEach(err => console.error(`🔴 [ENV CONFIG ERROR] ${err}`));
        throw new Error(`Environment configuration failed validation:\n${errors.join("\n")}`);
    }
}

// Dev fallback: in non-production, if JWT_SECRET is unset, warn clearly and use an ephemeral dev secret
let resolvedJwtSecret = process.env.JWT_SECRET;
if (!resolvedJwtSecret) {
    if (IS_PROD) {
        throw new Error("FATAL: JWT_SECRET must be defined in production environment.");
    }
    console.warn("⚠️ [SECURITY WARNING] JWT_SECRET is not set in .env. Using ephemeral development secret. Set JWT_SECRET in .env for production.");
    resolvedJwtSecret = "smartcity_dev_ephemeral_jwt_key_gorakhpur_local_only";
}

// Proxy configuration
let trustProxySetting = false;
if (process.env.TRUST_PROXY !== undefined) {
    if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
        trustProxySetting = 1;
    } else if (process.env.TRUST_PROXY === "false" || process.env.TRUST_PROXY === "0") {
        trustProxySetting = false;
    } else {
        trustProxySetting = process.env.TRUST_PROXY;
    }
} else if (IS_PROD) {
    trustProxySetting = 1;
}

module.exports = {
    validateEnv,
    NODE_ENV,
    IS_PROD,
    JWT_SECRET: resolvedJwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    PORT: Number(process.env.PORT) || 5000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || null,
    CORS_ORIGINS: process.env.CORS_ORIGINS || null,
    TRUST_PROXY: trustProxySetting,
    // Database Pool Configuration (grounded in MySQL server metrics: max_connections=151, connect_timeout=10s)
    DB_CONNECTION_LIMIT: Number(process.env.DB_CONNECTION_LIMIT || process.env.MYSQL_CONNECTION_LIMIT) || 25,
    DB_CONNECT_TIMEOUT_MS: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
    DB_QUEUE_LIMIT: Number(process.env.DB_QUEUE_LIMIT) || 50
};
