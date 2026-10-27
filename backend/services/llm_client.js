/**
 * SmartCity AI - Resilient LLM Client
 * ===================================
 * Configurable, production-grade LLM Gateway:
 * - Google Gemini 1.5 Flash / Gemini 2.0 via Google Generative Language REST API
 * - Safe AbortController timeouts (default 7500ms)
 * - Bounded retries with exponential backoff and randomized jitter
 * - Token budgeting and response size constraints
 * - Zero secret leakage in logs or error messages
 * - Graceful fallback signaling for offline/quota-exceeded states
 */

const https = require("https");
const { URL } = require("url");

class LLMClient {
    constructor() {
        this.provider = (process.env.LLM_PROVIDER || "google_gemini").toLowerCase();
        this.apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || "";
        this.model = process.env.GEMINI_MODEL || process.env.LLM_MODEL || "gemini-1.5-flash";
        this.apiBaseUrl = process.env.LLM_API_BASE_URL || "https://generativelanguage.googleapis.com";
        this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || "7500", 10);
        this.maxRetries = parseInt(process.env.LLM_MAX_RETRIES || "2", 10);
        this.maxOutputTokens = parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || "800", 10);
        this.temperature = parseFloat(process.env.LLM_TEMPERATURE || "0.2"); // Low temperature for high factual adherence
    }

    /**
     * Check if provider is configured with valid credentials
     */
    isConfigured() {
        return Boolean(this.apiKey && typeof this.apiKey === "string" && this.apiKey.trim().length > 10);
    }

    /**
     * Get safe status for telemetry and admin reporting
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            provider: this.provider,
            model: this.model,
            timeoutMs: this.timeoutMs,
            maxRetries: this.maxRetries,
            apiKeyRedacted: this.isConfigured() ? `***${this.apiKey.slice(-4)}` : "NOT_CONFIGURED"
        };
    }

    /**
     * Sleep helper for exponential backoff with jitter
     */
    _sleepWithJitter(attempt) {
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), 4000);
        const jitter = Math.floor(Math.random() * 250);
        return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
    }

    /**
     * Sends a grounded prompt to Google Gemini with bounded retries and timeout
     */
    async generateGroundedContent({ systemPrompt = "", userPrompt = "", history = [], temperature = null }) {
        if (!this.isConfigured()) {
            return {
                success: false,
                fallback: true,
                reason: "LLM_NOT_CONFIGURED",
                error: "Gemini API key is not configured. Falling back to deterministic grounded engine."
            };
        }

        const endpoint = `${this.apiBaseUrl}/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        
        // Build contents payload
        const contents = [];
        for (const h of history.slice(-6)) {
            if (h.role && h.text) {
                contents.push({
                    role: h.role === "user" ? "user" : "model",
                    parts: [{ text: String(h.text) }]
                });
            }
        }

        const promptText = systemPrompt 
            ? `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER QUERY:\n${userPrompt}`
            : userPrompt;

        contents.push({
            role: "user",
            parts: [{ text: promptText }]
        });

        const requestBody = JSON.stringify({
            contents,
            generationConfig: {
                temperature: temperature != null ? temperature : this.temperature,
                maxOutputTokens: this.maxOutputTokens,
                topP: 0.95
            }
        });

        let lastError = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                const res = await this._postJson(endpoint, requestBody, this.timeoutMs);
                const latencyMs = Date.now() - startTime;

                if (res.statusCode === 200 && res.body?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const text = res.body.candidates[0].content.parts[0].text.trim();
                    return {
                        success: true,
                        reply: text,
                        provider: "google_gemini",
                        model: this.model,
                        latencyMs,
                        attempt: attempt + 1
                    };
                }

                // If quota or rate limited (429) or server error (500/503), retry
                const isRetryable = res.statusCode === 429 || res.statusCode >= 500;
                if (!isRetryable || attempt === this.maxRetries) {
                    const errMsg = res.body?.error?.message || `HTTP ${res.statusCode}`;
                    throw new Error(`Gemini API Error: ${errMsg}`);
                }

                await this._sleepWithJitter(attempt);
            } catch (err) {
                lastError = err;
                if (attempt < this.maxRetries && (err.name === "AbortError" || err.message.includes("timeout") || err.message.includes("429"))) {
                    await this._sleepWithJitter(attempt);
                } else {
                    break;
                }
            }
        }

        return {
            success: false,
            fallback: true,
            reason: "LLM_CALL_FAILED",
            error: lastError ? lastError.message : "Unknown LLM failure",
            model: this.model
        };
    }

    /**
     * HTTPS POST helper with AbortSignal timeout
     */
    _postJson(urlString, jsonString, timeoutMs) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(urlString);
            const req = https.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(jsonString)
                },
                timeout: timeoutMs
            }, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    let body = null;
                    try {
                        body = JSON.parse(data);
                    } catch {
                        body = { raw: data };
                    }
                    resolve({ statusCode: res.statusCode, body });
                });
            });

            req.on("timeout", () => {
                req.destroy();
                reject(new Error(`LLM Request timed out after ${timeoutMs}ms`));
            });

            req.on("error", (err) => {
                reject(err);
            });

            req.write(jsonString);
            req.end();
        });
    }
}

module.exports = new LLMClient();
