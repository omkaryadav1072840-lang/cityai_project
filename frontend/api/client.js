/**
 * SMARTCITY AI - CENTRALIZED API CLIENT
 * Handles authentication headers, token storage, retries, timeouts,
 * and standardized response formatting:
 * { success: true, message: "...", data: {}, error: null }
 */

(function () {
    const API_BASE = ""; // Relative base for local proxy / domain gateway
    const DEFAULT_TIMEOUT_MS = 15000;
    const MAX_RETRIES = 2;

    class ApiClient {
        constructor() {
            this.tokenKey = "token";
            this.userKey = "user";
        }

        getToken() {
            return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey) || null;
        }

        setToken(token, user = null, persist = true) {
            const storage = persist ? localStorage : sessionStorage;
            storage.setItem(this.tokenKey, token);
            if (user) {
                storage.setItem(this.userKey, JSON.stringify(user));
            }
        }

        clearToken() {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            sessionStorage.removeItem(this.tokenKey);
            sessionStorage.removeItem(this.userKey);
        }

        getUser() {
            try {
                const userStr = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
                return userStr ? JSON.parse(userStr) : null;
            } catch (e) {
                return null;
            }
        }

        /**
         * Core request dispatcher with retry and timeout
         */
        async request(endpoint, {
            method = "GET",
            headers = {},
            body = null,
            timeoutMs = DEFAULT_TIMEOUT_MS,
            retries = 0
        } = {}) {
            const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
            const reqHeaders = {
                "Accept": "application/json",
                ...headers
            };

            const token = this.getToken();
            if (token && !reqHeaders["Authorization"]) {
                reqHeaders["Authorization"] = `Bearer ${token}`;
            }

            if (body && !(body instanceof FormData) && !reqHeaders["Content-Type"]) {
                reqHeaders["Content-Type"] = "application/json";
            }

            const fetchOptions = {
                method,
                headers: reqHeaders,
                body: body && !(body instanceof FormData) && typeof body === "object" ? JSON.stringify(body) : body
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            fetchOptions.signal = controller.signal;

            try {
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);

                // Handle HTTP 401 Unauthorized
                if (response.status === 401) {
                    if (window.SmartCityUI) {
                        SmartCityUI.toast("Session expired. Please log in again.", "warning");
                    }
                    this.clearToken();
                }

                let responseData;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    responseData = await response.json();
                } else {
                    responseData = { raw: await response.text() };
                }

                // If response is already in standard format
                if (responseData && typeof responseData.success === "boolean") {
                    if (!response.ok && responseData.success) {
                        responseData.success = false;
                    }
                    return responseData;
                }

                // Normalize non-standard response
                if (response.ok) {
                    return {
                        success: true,
                        message: responseData.message || "Operation successful.",
                        data: responseData.data !== undefined ? responseData.data : responseData,
                        error: null
                    };
                } else {
                    return {
                        success: false,
                        message: responseData.message || `Request failed with status ${response.status}`,
                        data: null,
                        error: {
                            code: responseData.error || response.statusText || "HTTP_ERROR",
                            details: responseData.details || responseData
                        }
                    };
                }
            } catch (err) {
                clearTimeout(timeoutId);

                // Retry idempotent GET requests on network/timeout failures
                if (method === "GET" && retries < MAX_RETRIES) {
                    console.warn(`[ApiClient] Request to ${endpoint} failed, retrying (${retries + 1}/${MAX_RETRIES})...`);
                    await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
                    return this.request(endpoint, { method, headers, body, timeoutMs, retries: retries + 1 });
                }

                const isTimeout = err.name === "AbortError";
                const errorMsg = isTimeout ? "Request timed out. Please check network connection." : (err.message || "Network error occurred.");

                return {
                    success: false,
                    message: errorMsg,
                    data: null,
                    error: {
                        code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
                        details: err.message
                    }
                };
            }
        }

        get(endpoint, params = null, options = {}) {
            let url = endpoint;
            if (params) {
                const query = new URLSearchParams();
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== undefined && v !== null) query.append(k, v);
                });
                const queryString = query.toString();
                if (queryString) url += (url.includes("?") ? "&" : "?") + queryString;
            }
            return this.request(url, { ...options, method: "GET" });
        }

        post(endpoint, body = null, options = {}) {
            return this.request(endpoint, { ...options, method: "POST", body });
        }

        put(endpoint, body = null, options = {}) {
            return this.request(endpoint, { ...options, method: "PUT", body });
        }

        delete(endpoint, options = {}) {
            return this.request(endpoint, { ...options, method: "DELETE" });
        }
    }

    window.SmartCityClient = new ApiClient();
})();
