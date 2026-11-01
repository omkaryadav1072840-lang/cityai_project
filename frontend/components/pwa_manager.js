/**
 * SMARTCITY AI - PWA INSTALLATION & OFFLINE MANAGER
 * Manages Service Worker lifecycle, Web App Install Prompt, and Online/Offline telemetry status.
 */

(function (window, document) {
    "use strict";

    let deferredPrompt = null;
    const DISMISS_KEY = "sc_pwa_dismissed_until";

    const PWAManager = {
        init: function () {
            this.registerServiceWorker();
            this.initInstallPrompt();
            this.initOnlineOfflineListener();
            this.injectPWAStyles();
        },

        registerServiceWorker: function () {
            if (!("serviceWorker" in navigator)) return;
            if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;

            // Determine correct path to sw.js based on current directory
            const isSubpage = window.location.pathname.includes("/pages/");
            const swPath = isSubpage ? "../../sw.js" : "./sw.js";

            window.addEventListener("load", () => {
                navigator.serviceWorker.register(swPath, { scope: "/" })
                    .then((reg) => {
                        console.log("🚀 [PWA] ServiceWorker registered with scope:", reg.scope);
                        
                        reg.onupdatefound = () => {
                            const installingWorker = reg.installing;
                            if (!installingWorker) return;
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    console.log("🔄 [PWA] New version available! Refreshing...");
                                }
                            };
                        };
                    })
                    .catch((err) => {
                        console.debug("[PWA] ServiceWorker registration fallback:", err);
                    });
            });
        },

        initInstallPrompt: function () {
            // Check if already in standalone mode
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
            if (isStandalone) {
                console.log("📱 [PWA] App is already running in standalone mode");
                return;
            }

            window.addEventListener("beforeinstallprompt", (e) => {
                e.preventDefault();
                deferredPrompt = e;
                console.log("📱 [PWA] beforeinstallprompt event captured");

                // Check if user dismissed banner recently
                const dismissedUntil = localStorage.getItem(DISMISS_KEY);
                if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
                    return;
                }

                // Show install banner after 2 seconds
                setTimeout(() => {
                    this.renderInstallBanner();
                }, 2000);
            });

            window.addEventListener("appinstalled", () => {
                console.log("🎉 [PWA] SmartCity AI installed successfully!");
                deferredPrompt = null;
                const banner = document.getElementById("scPwaInstallBanner");
                if (banner) banner.remove();
                if (window.SmartCityUI && window.SmartCityUI.toast) {
                    window.SmartCityUI.toast("SmartCity AI installed on your home screen!", "success");
                }
            });
        },

        renderInstallBanner: function () {
            if (document.getElementById("scPwaInstallBanner")) return;

            const banner = document.createElement("div");
            banner.id = "scPwaInstallBanner";
            banner.className = "sc-pwa-banner";
            banner.innerHTML = `
                <div class="sc-pwa-content">
                    <div class="sc-pwa-icon">🏛️</div>
                    <div class="sc-pwa-text">
                        <strong>Install SmartCity Gorakhpur</strong>
                        <span>Fast, 1-tap emergency access & offline citizen maps</span>
                    </div>
                </div>
                <div class="sc-pwa-actions">
                    <button class="sc-pwa-install-btn" id="scPwaInstallBtn">
                        <span>📲 Install App</span>
                    </button>
                    <button class="sc-pwa-close-btn" id="scPwaCloseBtn" title="Dismiss">✕</button>
                </div>
            `;

            document.body.appendChild(banner);

            document.getElementById("scPwaInstallBtn").addEventListener("click", () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === "accepted") {
                        console.log("User accepted the PWA install prompt");
                    }
                    deferredPrompt = null;
                    banner.remove();
                });
            });

            document.getElementById("scPwaCloseBtn").addEventListener("click", () => {
                // Dismiss for 24 hours
                localStorage.setItem(DISMISS_KEY, (Date.now() + 24 * 3600 * 1000).toString());
                banner.classList.add("sc-pwa-hiding");
                setTimeout(() => banner.remove(), 350);
            });
        },

        initOnlineOfflineListener: function () {
            const updateStatus = () => {
                let badge = document.getElementById("scPwaNetworkPill");
                if (!navigator.onLine) {
                    if (!badge) {
                        badge = document.createElement("div");
                        badge.id = "scPwaNetworkPill";
                        badge.className = "sc-offline-pill";
                        badge.innerHTML = `<span>⚡</span> Offline Mode Active — Showing Cached Telemetry`;
                        document.body.appendChild(badge);
                    }
                    badge.style.display = "flex";
                } else {
                    if (badge) {
                        badge.className = "sc-offline-pill sc-online-toast";
                        badge.innerHTML = `<span>🟢</span> Connected to Gorakhpur ICCC Network`;
                        setTimeout(() => {
                            badge.style.display = "none";
                            badge.className = "sc-offline-pill";
                        }, 2500);
                    }
                }
            };

            window.addEventListener("online", updateStatus);
            window.addEventListener("offline", updateStatus);
        },

        injectPWAStyles: function () {
            if (document.getElementById("scPwaStyles")) return;
            const style = document.createElement("style");
            style.id = "scPwaStyles";
            style.textContent = `
                .sc-pwa-banner {
                    position: fixed;
                    bottom: max(20px, env(safe-area-inset-bottom, 20px));
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15, 23, 42, 0.94);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.2);
                    border-radius: 16px;
                    padding: 12px 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    z-index: 99998;
                    max-width: 520px;
                    width: calc(100% - 32px);
                    animation: scPwaSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .sc-pwa-hiding {
                    animation: scPwaSlideDown 0.35s ease forwards !important;
                }
                @keyframes scPwaSlideUp {
                    from { transform: translate(-50%, 60px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes scPwaSlideDown {
                    from { transform: translate(-50%, 0); opacity: 1; }
                    to { transform: translate(-50%, 60px); opacity: 0; }
                }
                .sc-pwa-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .sc-pwa-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #0284c7, #2563eb);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
                }
                .sc-pwa-text {
                    display: flex;
                    flex-direction: column;
                }
                .sc-pwa-text strong {
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: -0.2px;
                }
                .sc-pwa-text span {
                    color: #94a3b8;
                    font-size: 11.5px;
                    line-height: 1.35;
                }
                .sc-pwa-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                .sc-pwa-install-btn {
                    background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    padding: 9px 15px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                }
                .sc-pwa-install-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
                }
                .sc-pwa-close-btn {
                    background: transparent;
                    color: #94a3b8;
                    border: none;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .sc-pwa-close-btn:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.1);
                }
                .sc-offline-pill {
                    position: fixed;
                    top: max(14px, env(safe-area-inset-top, 14px));
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(217, 119, 6, 0.95);
                    color: #ffffff;
                    padding: 8px 18px;
                    border-radius: 30px;
                    font-size: 12.5px;
                    font-weight: 700;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    animation: scPwaSlideDown 0.3s ease;
                }
                .sc-online-toast {
                    background: rgba(16, 185, 129, 0.95) !important;
                }
            `;
            document.head.appendChild(style);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => PWAManager.init());
    } else {
        PWAManager.init();
    }

    window.SmartCityPWA = PWAManager;
})(window, document);
