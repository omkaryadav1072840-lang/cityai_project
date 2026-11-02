/**
 * SmartCity AI - Master Frontend Real-Time Client Library
 * Handles Socket.io connection, room joins, emergency audio alerts, and event listeners.
 */

(function (window) {
    "use strict";

    function _resolveSocketUrl() {
        if (typeof window !== "undefined") {
            const loc = window.location;

            try {
                localStorage.removeItem("smartcity_api_server");
                localStorage.removeItem("smartcity_mobile_server_url");
            } catch (_) {}

            if (window.API_BASE_URL) return window.API_BASE_URL;
            if (window.SmartCityAuth && typeof window.SmartCityAuth.getApiBase === "function") {
                return window.SmartCityAuth.getApiBase();
            }

            if (loc && loc.origin && loc.origin.startsWith("http")) {
                if (loc.port === "5000" || loc.port === "3000") return loc.origin;
                if (loc.port && loc.port !== "5000" && loc.port !== "3000") {
                    return `${loc.protocol}//${loc.hostname}:5000`;
                }
                return loc.origin;
            }
        }
        return "http://127.0.0.1:5000";
    }

    const SERVER_URL = _resolveSocketUrl();
    let socket = null;
    let audioCtx = null;
    const listeners = {};

    const SmartCityRealtime = {
        /**
         * Initialize socket connection
         */
        init: function (options = {}) {
            if (socket) return socket;
            if (typeof io === "undefined") {
                console.warn("[Realtime] Socket.io client script not loaded.");
                return null;
            }

            try {
                socket = io(SERVER_URL, {
                    transports: ["websocket", "polling"],
                    reconnectionAttempts: 10,
                    reconnectionDelay: 2000,
                    ...options
                });

                socket.on("connect", () => {
                    console.log("🟢 [Realtime] Connected to SmartCity Live Server:", socket.id);
                    SmartCityRealtime.updateStatusUI(true);

                    // Re-join any previously registered rooms
                    if (SmartCityRealtime._joinedRooms) {
                        SmartCityRealtime._joinedRooms.forEach(room => {
                            socket.emit(`join-${room}`);
                        });
                    }
                });

                socket.on("disconnect", (reason) => {
                    console.warn("🔴 [Realtime] Disconnected from Live Server:", reason);
                    SmartCityRealtime.updateStatusUI(false);
                });

                socket.on("connect_error", (err) => {
                    console.warn("⚠️ [Realtime] Connection error:", err.message);
                    SmartCityRealtime.updateStatusUI(false);
                });

                // Global Emergency SOS Listener with siren chime
                socket.on("emergency:new-sos", (alertData) => {
                    SmartCityRealtime.playAlertSound("emergency");
                    SmartCityRealtime.showBroadcastBanner(
                        `🚨 EMERGENCY SOS ALERT: ${alertData.type || 'CRITICAL'}`,
                        `Location: ${alertData.location || 'Gorakhpur'} — ${alertData.description || 'Response units notified.'}`,
                        "danger"
                    );
                });

                // Global Notification & Service Request Listeners
                socket.on("notification:new", (notif) => {
                    if (window.SmartCityAuth && window.SmartCityAuth.refreshNotificationCount) {
                        window.SmartCityAuth.refreshNotificationCount();
                    }
                    SmartCityRealtime.showBroadcastBanner(
                        notif.title || "New City Notification",
                        notif.message || "You have a new update in your civic portal.",
                        "info"
                    );
                });

                socket.on("request:status_updated", (reqData) => {
                    if (window.SmartCityAuth && window.SmartCityAuth.refreshNotificationCount) {
                        window.SmartCityAuth.refreshNotificationCount();
                    }
                    SmartCityRealtime.showBroadcastBanner(
                        `Request Update: ${reqData.requestCode}`,
                        `Status updated to '${reqData.status}'`,
                        reqData.status === "Resolved" ? "success" : "info"
                    );
                });

                socket.on("request:escalated", (esc) => {
                    if (window.SmartCityAuth && window.SmartCityAuth.refreshNotificationCount) {
                        window.SmartCityAuth.refreshNotificationCount();
                    }
                    SmartCityRealtime.playAlertSound("emergency");
                    SmartCityRealtime.showBroadcastBanner(
                        `🚨 SLA ESCALATION: ${esc.requestCode}`,
                        `${(esc.department || '').toUpperCase()} - ${esc.category} exceeded SLA deadline. Escalated to supervisor.`,
                        "warning"
                    );
                });

                return socket;
            } catch (err) {
                console.error("[Realtime] Failed to initialize socket:", err);
                return null;
            }
        },

        _joinedRooms: new Set(),

        /**
         * Join a real-time room (e.g. 'ambulance-tracking', 'parking', 'emergency', 'water', 'city')
         */
        joinRoom: function (roomName) {
            SmartCityRealtime._joinedRooms.add(roomName);
            if (socket && socket.connected) {
                const eventName = roomName.startsWith("join-") ? roomName : `join-${roomName}`;
                socket.emit(eventName);
                console.log(`📡 [Realtime] Joined room: ${roomName}`);
            }
        },

        /**
         * Generic event listener
         */
        on: function (event, handler) {
            if (!socket) SmartCityRealtime.init();
            if (socket) {
                socket.on(event, handler);
            }
        },

        /**
         * Ambulance location updates
         */
        onAmbulanceLocation: function (handler) {
            SmartCityRealtime.joinRoom("ambulance-tracking");
            SmartCityRealtime.on("ambulance:location-updated", handler);
            SmartCityRealtime.on("ambulance-location-updated", handler); // legacy parity
        },

        /**
         * Ambulance status updates
         */
        onAmbulanceStatus: function (handler) {
            SmartCityRealtime.joinRoom("ambulance-tracking");
            SmartCityRealtime.on("ambulance:status-updated", handler);
            SmartCityRealtime.on("ambulance-status-updated", handler);
        },

        /**
         * Parking lot slot updates
         */
        onParkingUpdate: function (handler) {
            SmartCityRealtime.joinRoom("parking");
            SmartCityRealtime.on("parking:slot-updated", handler);
        },

        /**
         * Emergency alert listener
         */
        onEmergencyAlert: function (handler) {
            SmartCityRealtime.joinRoom("emergency");
            SmartCityRealtime.on("emergency:new-sos", handler);
        },

        /**
         * Emergency resolved listener
         */
        onEmergencyResolved: function (handler) {
            SmartCityRealtime.joinRoom("emergency");
            SmartCityRealtime.on("emergency:resolved", handler);
        },

        /**
         * Water tank / supply updates
         */
        onWaterUpdate: function (handler) {
            SmartCityRealtime.joinRoom("water");
            SmartCityRealtime.on("water:tank-updated", handler);
        },

        /**
         * City traffic and environment updates
         */
        onCityUpdate: function (handler) {
            SmartCityRealtime.joinRoom("city");
            SmartCityRealtime.on("city:status-updated", handler);
        },

        /**
         * Synthesize audio chime using Web Audio API (no external asset required)
         */
        playAlertSound: function (type = "chime") {
            try {
                if (!audioCtx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) audioCtx = new AudioContext();
                }
                if (!audioCtx) return;

                if (audioCtx.state === "suspended") {
                    audioCtx.resume();
                }

                const now = audioCtx.currentTime;

                if (type === "emergency") {
                    // Two-tone urgent siren pulse
                    [880, 660, 880, 660].forEach((freq, idx) => {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = "sawtooth";
                        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

                        gain.gain.setValueAtTime(0.15, now + idx * 0.18);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + (idx + 1) * 0.18);

                        osc.connect(gain);
                        gain.connect(audioCtx.destination);

                        osc.start(now + idx * 0.18);
                        osc.stop(now + (idx + 1) * 0.18);
                    });
                } else {
                    // Soft pleasant ding
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(587.33, now); // D5
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    osc.start(now);
                    osc.stop(now + 0.45);
                }
            } catch (e) {
                // Audio autoplay might be blocked before first user gesture
            }
        },

        /**
         * Display floating real-time broadcast banner
         */
        showBroadcastBanner: function (title, message, type = "info") {
            let container = document.getElementById("smartCityLiveAlertContainer");
            if (!container) {
                container = document.createElement("div");
                container.id = "smartCityLiveAlertContainer";
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-width: 420px;
                    pointer-events: none;
                `;
                document.body.appendChild(container);
            }

            const alertEl = document.createElement("div");
            const isDanger = type === "danger";
            alertEl.style.cssText = `
                pointer-events: auto;
                background: ${isDanger ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.95))' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'};
                color: #ffffff;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px ${isDanger ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.3)'};
                border: 1px solid ${isDanger ? '#ef4444' : '#3b82f6'};
                backdrop-filter: blur(8px);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                animation: slideInBanner 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            `;

            alertEl.innerHTML = `
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
                    <div>
                        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                            ${title}
                        </div>
                        <div style="font-size: 12px; opacity: 0.92; line-height: 1.4;">
                            ${message}
                        </div>
                    </div>
                    <button style="background: transparent; border: none; color: #fff; cursor: pointer; font-size: 18px; line-height: 1; padding: 2px 6px; opacity: 0.7;" onclick="this.parentElement.parentElement.remove()">✕</button>
                </div>
            `;

            container.appendChild(alertEl);

            setTimeout(() => {
                if (alertEl.parentElement) {
                    alertEl.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                    alertEl.style.opacity = "0";
                    alertEl.style.transform = "translateX(40px)";
                    setTimeout(() => alertEl.remove(), 400);
                }
            }, 8000);
        },

        /**
         * Mount live connection badge onto page
         */
        renderLiveIndicator: function (targetSelector = ".navbar") {
            const container = document.querySelector(targetSelector);
            if (!container || document.getElementById("realtimeLiveBadge")) return;

            const badge = document.createElement("div");
            badge.id = "realtimeLiveBadge";
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 9999px;
                background: rgba(16, 185, 129, 0.15);
                color: #10b981;
                border: 1px solid rgba(16, 185, 129, 0.3);
                letter-spacing: 0.5px;
                text-transform: uppercase;
                margin-left: 12px;
                user-select: none;
            `;
            badge.innerHTML = `
                <span id="liveBadgeDot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulseDot 2s infinite;"></span>
                <span id="liveBadgeText">LIVE SYNC</span>
            `;
            container.appendChild(badge);
        },

        updateStatusUI: function (isConnected) {
            const badge = document.getElementById("realtimeLiveBadge");
            const dot = document.getElementById("liveBadgeDot");
            const text = document.getElementById("liveBadgeText");
            if (!badge || !dot || !text) return;

            if (isConnected) {
                badge.style.background = "rgba(16, 185, 129, 0.15)";
                badge.style.color = "#10b981";
                badge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
                dot.style.background = "#10b981";
                dot.style.boxShadow = "0 0 8px #10b981";
                text.textContent = "LIVE SYNC";
            } else {
                badge.style.background = "rgba(239, 68, 68, 0.15)";
                badge.style.color = "#ef4444";
                badge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
                dot.style.background = "#ef4444";
                dot.style.boxShadow = "none";
                text.textContent = "RECONNECTING";
            }
        },

        /**
         * Legacy AI Widget hook - completely purges old legacy popup/floating buttons and invalidates old caches
         */
        mountAIWidget: function () {
            if (typeof document === "undefined") return;
            const purge = () => {
                const legacyIds = ["scGlobalAIChatPopup", "scGlobalAIFloatingBtn", "globalAIPopup", "scWidgetSuggestions", "scWidgetMessages"];
                legacyIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                document.querySelectorAll(".sc-ai-popup, .sc-ai-float-btn, [id='scGlobalAIChatPopup'], [id='scGlobalAIFloatingBtn']").forEach(el => el.remove());
            };
            purge();
            setTimeout(purge, 500);
            setTimeout(purge, 1500);
            if (typeof window !== "undefined" && "caches" in window) {
                caches.keys().then(keys => {
                    keys.filter(k => k !== "smartcity-v15-clean").forEach(k => caches.delete(k));
                }).catch(() => {});
            }
        },

        toggleAIWidget: function () {
            if (window.SmartCityAIWidget && typeof window.SmartCityAIWidget.toggle === "function") {
                window.SmartCityAIWidget.toggle();
            }
        }
    };

    // Auto-mount keyframe animation styles
    if (typeof document !== "undefined") {
        const style = document.createElement("style");
        style.textContent = `
            @keyframes pulseDot {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
            }
            @keyframes slideInBanner {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                SmartCityRealtime.mountAIWidget();
            });
        } else {
            SmartCityRealtime.mountAIWidget();
        }
    }

    window.SmartCityRealtime = SmartCityRealtime;
})(window);
