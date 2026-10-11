/**
 * SmartCity AI - Mobile App Adapter & Capacitor Native Bridge
 * Enables native Android capabilities (hardware back button, status bar,
 * splash screen, and dynamic backend server configuration for APK builds).
 */

(function (window, document) {
    "use strict";

    const STORAGE_KEY_SERVER = "smartcity_mobile_server_url";
    const isCapacitor = Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

    // 1. DYNAMIC API RESOLUTION FOR ANDROID APK
    function initMobileApiBase() {
        // Saved server URL in app storage (e.g., http://192.168.1.15:5000 or production server)
        const savedUrl = localStorage.getItem(STORAGE_KEY_SERVER);

        if (savedUrl) {
            window.API_BASE_URL = savedUrl.replace(/\/+$/, "");
            console.log("📱 [Mobile App] Connected to configured server:", window.API_BASE_URL);
            return;
        }

        // If inside native Android WebView (origin is http://localhost or https://localhost)
        if (isCapacitor || (window.location && window.location.origin && window.location.origin.includes("localhost") && !window.location.port)) {
            // Default to Android Emulator host or localhost
            const defaultUrl = "http://10.0.2.2:5000";
            window.API_BASE_URL = defaultUrl;
            console.log("📱 [Mobile App] Running in native wrapper, default server:", defaultUrl);
        }
    }

    initMobileApiBase();

    // 2. CAPACITOR HARDWARE BACK BUTTON & NATIVE PLUGINS
    function initNativePlugins() {
        if (!window.Capacitor) return;

        const Plugins = window.Capacitor.Plugins || {};

        // Status Bar Styling
        if (Plugins.StatusBar) {
            try {
                Plugins.StatusBar.setStyle({ style: "DARK" }).catch(() => {});
                Plugins.StatusBar.setBackgroundColor({ color: "#0f172a" }).catch(() => {});
            } catch (e) {
                console.debug("[Mobile App] StatusBar plugin notice:", e);
            }
        }

        // Splash Screen auto-dismiss
        if (Plugins.SplashScreen) {
            try {
                setTimeout(() => {
                    Plugins.SplashScreen.hide().catch(() => {});
                }, 800);
            } catch (e) {
                console.debug("[Mobile App] SplashScreen plugin notice:", e);
            }
        }

        // Android Hardware Back Button Handling
        if (Plugins.App) {
            let lastBackPressTime = 0;
            Plugins.App.addListener("backButton", ({ canGoBack }) => {
                // Check if any modal is currently visible
                const activeModals = document.querySelectorAll(
                    '.modal[style*="block"], .sc-modal-backdrop, [class*="modal"].active, .auth-modal-overlay'
                );

                if (activeModals && activeModals.length > 0) {
                    // Close top active modal
                    for (let i = activeModals.length - 1; i >= 0; i--) {
                        const m = activeModals[i];
                        const closeBtn = m.querySelector('.close-modal, .sc-btn-close, [data-dismiss="modal"]');
                        if (closeBtn) {
                            closeBtn.click();
                            return;
                        }
                        if (m.style) m.style.display = "none";
                        return;
                    }
                }

                // Check browser history
                if (canGoBack && window.history.length > 1) {
                    window.history.back();
                    return;
                }

                // Double back to exit
                const now = Date.now();
                if (now - lastBackPressTime < 2500) {
                    Plugins.App.exitApp();
                } else {
                    lastBackPressTime = now;
                    if (window.SmartCityUI && window.SmartCityUI.toast) {
                        window.SmartCityUI.toast("Press back again to exit SmartCity AI", "info");
                    } else {
                        alert("Press back again to exit SmartCity AI");
                    }
                }
            });
        }
    }

    // 3. SERVER CONFIGURATION MODAL FOR TESTERS / DEVELOPERS
    function createServerSettingsUI() {
        // Only render floating button if running inside Capacitor or localhost
        const isNative = isCapacitor || (window.location && window.location.protocol === "file:") || (window.location.hostname === "localhost" && !window.location.port);
        if (!isNative) return;

        // Create discreet floating widget
        const widget = document.createElement("div");
        widget.id = "smartcity-mobile-server-widget";
        widget.innerHTML = `
            <style>
                #smartcity-mobile-server-widget {
                    position: fixed;
                    bottom: 16px;
                    left: 16px;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .sc-mobile-pill {
                    background: rgba(15, 23, 42, 0.92);
                    color: #38bdf8;
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    padding: 6px 12px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
                    backdrop-filter: blur(8px);
                }
                .sc-mobile-modal {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000000;
                    padding: 20px;
                }
                .sc-mobile-card {
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    max-width: 400px;
                    width: 100%;
                    padding: 20px;
                    color: #f8fafc;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                }
            </style>
            <div class="sc-mobile-pill" id="scMobileSettingsBtn" title="Set Backend Server IP">
                <span>⚡</span>
                <span id="scMobileServerLabel">${window.API_BASE_URL || 'Local Server'}</span>
                <span>⚙️</span>
            </div>
            <div class="sc-mobile-modal" id="scMobileSettingsModal">
                <div class="sc-mobile-card">
                    <h3 style="margin-top:0;font-size:16px;display:flex;align-items:center;gap:8px;">
                        <span>⚙️</span> Mobile Backend Server
                    </h3>
                    <p style="font-size:12px;color:#94a3b8;line-height:1.5;">
                        Configure the backend server IP for your Android device (e.g., your laptop's Wi-Fi IP address or live server).
                    </p>
                    <label style="font-size:12px;color:#cbd5e1;display:block;margin-bottom:6px;font-weight:600;">
                        Server URL (with port 5000):
                    </label>
                    <input type="text" id="scServerUrlInput" placeholder="http://192.168.1.15:5000"
                           value="${window.API_BASE_URL || ''}"
                           style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#ffffff;font-size:13px;margin-bottom:12px;outline:none;" />
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button type="button" id="scCancelServerBtn" style="padding:8px 14px;border-radius:8px;border:1px solid #334155;background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;">Cancel</button>
                        <button type="button" id="scSaveServerBtn" style="padding:8px 16px;border-radius:8px;border:none;background:#2563eb;color:#ffffff;font-size:12px;font-weight:600;cursor:pointer;">Save & Reconnect</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        const pill = document.getElementById("scMobileSettingsBtn");
        const modal = document.getElementById("scMobileSettingsModal");
        const cancelBtn = document.getElementById("scCancelServerBtn");
        const saveBtn = document.getElementById("scSaveServerBtn");
        const input = document.getElementById("scServerUrlInput");
        const label = document.getElementById("scMobileServerLabel");

        if (pill && modal) {
            pill.addEventListener("click", () => {
                modal.style.display = "flex";
                input.value = window.API_BASE_URL || "";
                input.focus();
            });
        }
        if (cancelBtn && modal) {
            cancelBtn.addEventListener("click", () => { modal.style.display = "none"; });
        }
        if (saveBtn && modal) {
            saveBtn.addEventListener("click", () => {
                const val = (input.value || "").trim().replace(/\/+$/, "");
                if (val) {
                    localStorage.setItem(STORAGE_KEY_SERVER, val);
                    window.API_BASE_URL = val;
                    if (label) label.textContent = val.replace(/^https?:\/\//, "");
                } else {
                    localStorage.removeItem(STORAGE_KEY_SERVER);
                    window.API_BASE_URL = "";
                    if (label) label.textContent = "Default Server";
                }
                modal.style.display = "none";
                window.location.reload();
            });
        }
    }

    // Register Service Worker for PWA
    function registerPWA() {
        if ("serviceWorker" in navigator && !isCapacitor && window.location.protocol.startsWith("http")) {
            navigator.serviceWorker.register("/sw.js")
                .then(() => console.log("📱 [PWA] Service Worker registered"))
                .catch(err => console.debug("[PWA] Service Worker notice:", err));
        }
    }

    // Init on DOM ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initNativePlugins();
            createServerSettingsUI();
            registerPWA();
        });
    } else {
        initNativePlugins();
        createServerSettingsUI();
        registerPWA();
    }

    // Export helper
    window.SmartCityMobile = {
        isNative: isCapacitor,
        getServerUrl: () => window.API_BASE_URL,
        setServerUrl: (url) => {
            localStorage.setItem(STORAGE_KEY_SERVER, url);
            window.API_BASE_URL = url;
            window.location.reload();
        }
    };
})(window, document);
