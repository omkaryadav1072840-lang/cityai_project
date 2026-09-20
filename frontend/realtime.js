/**
 * SmartCity AI - Master Frontend Real-Time Client Library
 * Handles Socket.io connection, room joins, emergency audio alerts, and event listeners.
 */

(function (window) {
    "use strict";

    const SERVER_URL = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
        ? window.API_BASE_URL
        : (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http"))
            ? (window.location.port === "5000" || window.location.protocol === "file:" ? (window.location.port === "5000" ? window.location.origin : "http://localhost:5000") : "")
            : "http://localhost:5000";
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
         * Mount Universal Floating AI Assistant Widget
         */
        mountAIWidget: function (options = {}) {
            if (typeof document === "undefined") return;
            if (document.getElementById("scGlobalAIFloatingBtn")) return;

            // Don't mount floating widget if the page already has the full-page embedded chat
            const hasEmbeddedChat = document.getElementById("userInput") && document.getElementById("chatMessages");
            if (hasEmbeddedChat && !options.force) {
                return;
            }

            // Create styles
            const style = document.createElement("style");
            style.textContent = `
                .sc-ai-float-btn {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 58px;
                    height: 58px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4), 0 0 15px rgba(124, 58, 237, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    color: #fff;
                    font-size: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 99990;
                    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
                    user-select: none;
                }
                .sc-ai-float-btn:hover {
                    transform: scale(1.08) translateY(-2px);
                    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.5), 0 0 20px rgba(124, 58, 237, 0.4);
                }
                .sc-ai-float-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 14px;
                    height: 14px;
                    background: #10b981;
                    border-radius: 50%;
                    border: 2px solid #0f172a;
                    box-shadow: 0 0 6px #10b981;
                }
                .sc-ai-popup {
                    position: fixed;
                    bottom: 92px;
                    right: 24px;
                    width: 390px;
                    max-width: calc(100vw - 32px);
                    height: 560px;
                    max-height: calc(100vh - 120px);
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 18px;
                    box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(59, 130, 246, 0.15);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    z-index: 99991;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    animation: scPopupIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .sc-ai-popup.open {
                    display: flex;
                }
                @keyframes scPopupIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .sc-ai-header {
                    padding: 14px 16px;
                    background: linear-gradient(135deg, rgba(30, 58, 138, 0.7), rgba(88, 28, 135, 0.7));
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    color: #fff;
                }
                .sc-ai-header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .sc-ai-header-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .sc-ai-header-title {
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                }
                .sc-ai-header-sub {
                    font-size: 10px;
                    color: #93c5fd;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .sc-ai-header-dot {
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 0 6px #10b981;
                }
                .sc-ai-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .sc-ai-header-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: #cbd5e1;
                    cursor: pointer;
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: background 0.2s, color 0.2s;
                }
                .sc-ai-header-btn:hover {
                    background: rgba(255, 255, 255, 0.25);
                    color: #fff;
                }
                .sc-ai-suggestions {
                    display: flex;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(15, 23, 42, 0.6);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .sc-ai-suggestions::-webkit-scrollbar { display: none; }
                .sc-ai-chip {
                    white-space: nowrap;
                    font-size: 11px;
                    padding: 4px 10px;
                    border-radius: 9999px;
                    background: rgba(59, 130, 246, 0.12);
                    border: 1px solid rgba(59, 130, 246, 0.25);
                    color: #93c5fd;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .sc-ai-chip:hover {
                    background: rgba(59, 130, 246, 0.25);
                    color: #fff;
                    border-color: #3b82f6;
                }
                .sc-ai-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .sc-ai-bubble {
                    max-width: 85%;
                    padding: 10px 14px;
                    border-radius: 14px;
                    font-size: 12.5px;
                    line-height: 1.45;
                    word-break: break-word;
                }
                .sc-ai-bubble-bot {
                    align-self: flex-start;
                    background: rgba(30, 41, 59, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #e2e8f0;
                    border-bottom-left-radius: 4px;
                }
                .sc-ai-bubble-user {
                    align-self: flex-end;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: #fff;
                    border-bottom-right-radius: 4px;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                }
                .sc-ai-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 8px;
                }
                .sc-ai-action-btn {
                    padding: 5px 10px;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 6px;
                    border: 1px solid transparent;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s;
                }
                .sc-ai-action-primary {
                    background: #2563eb;
                    color: #fff;
                    border-color: #3b82f6;
                }
                .sc-ai-action-primary:hover {
                    background: #1d4ed8;
                }
                .sc-ai-action-secondary {
                    background: rgba(255, 255, 255, 0.08);
                    color: #cbd5e1;
                    border-color: rgba(255, 255, 255, 0.15);
                }
                .sc-ai-action-secondary:hover {
                    background: rgba(255, 255, 255, 0.16);
                    color: #fff;
                }
                .sc-ai-typing {
                    align-self: flex-start;
                    display: flex;
                    gap: 4px;
                    padding: 8px 12px;
                    background: rgba(30, 41, 59, 0.85);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                .sc-ai-dot {
                    width: 6px;
                    height: 6px;
                    background: #94a3b8;
                    border-radius: 50%;
                    animation: scDotBounce 1.2s infinite ease-in-out;
                }
                .sc-ai-dot:nth-child(2) { animation-delay: 0.2s; }
                .sc-ai-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes scDotBounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-4px); opacity: 1; }
                }
                .sc-ai-footer {
                    padding: 10px 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(15, 23, 42, 0.9);
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .sc-ai-input {
                    flex: 1;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 8px;
                    color: #fff;
                    padding: 8px 12px;
                    font-size: 13px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .sc-ai-input:focus {
                    border-color: #3b82f6;
                }
                .sc-ai-send-btn {
                    background: #2563eb;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .sc-ai-send-btn:hover {
                    background: #1d4ed8;
                }
            `;
            document.head.appendChild(style);

            // Create Floating Button
            const floatBtn = document.createElement("div");
            floatBtn.id = "scGlobalAIFloatingBtn";
            floatBtn.className = "sc-ai-float-btn";
            floatBtn.title = "Gorakhpur Smart City AI Assistant";
            floatBtn.innerHTML = `
                🤖
                <span class="sc-ai-float-badge"></span>
            `;

            // Create Popup Box
            const popup = document.createElement("div");
            popup.id = "scGlobalAIChatPopup";
            popup.className = "sc-ai-popup";
            popup.innerHTML = `
                <div class="sc-ai-header">
                    <div class="sc-ai-header-left">
                        <div class="sc-ai-header-avatar">🤖</div>
                        <div>
                            <div class="sc-ai-header-title">SmartCity AI Assistant</div>
                            <div class="sc-ai-header-sub">
                                <span class="sc-ai-header-dot"></span>
                                Live Grounded Intelligence
                            </div>
                        </div>
                    </div>
                    <div class="sc-ai-header-actions">
                        <button class="sc-ai-header-btn" id="scWidgetClearBtn" title="Clear Chat">🗑️</button>
                        <button class="sc-ai-header-btn" id="scWidgetCloseBtn" title="Close">✕</button>
                    </div>
                </div>
                <div class="sc-ai-suggestions" id="scWidgetSuggestions">
                    <span class="sc-ai-chip" data-query="Find emergency ICU beds">🏥 ICU Beds</span>
                    <span class="sc-ai-chip" data-query="Check Golghar parking">🅿️ Parking Lots</span>
                    <span class="sc-ai-chip" data-query="Track live ambulance">🚑 Ambulance</span>
                    <span class="sc-ai-chip" data-query="Check water tank level">💧 Water Tanks</span>
                    <span class="sc-ai-chip" data-query="Emergency help">🚨 SOS Alert</span>
                    <span class="sc-ai-chip" data-query="Tell me about Gorakhpur attractions">🏛️ Attractions</span>
                </div>
                <div class="sc-ai-messages" id="scWidgetMessages">
                    <div class="sc-ai-bubble sc-ai-bubble-bot">
                        👋 Namaste! I am your <strong>Gorakhpur Smart City AI Assistant</strong>.<br><br>
                        I have real-time live grounding with city parking slots, hospital trauma beds, ambulance GPS positions, water reservoirs, and civic services. How can I assist you right now?
                    </div>
                </div>
                <div class="sc-ai-footer">
                    <input type="text" class="sc-ai-input" id="scWidgetInput" placeholder="Ask about hospital beds, parking, water..." />
                    <button class="sc-ai-send-btn" id="scWidgetSendBtn" title="Send message">➤</button>
                </div>
            `;

            document.body.appendChild(floatBtn);
            document.body.appendChild(popup);

            // State & history
            let conversationHistory = [];
            let isBusy = false;

            function togglePopup() {
                popup.classList.toggle("open");
                if (popup.classList.contains("open")) {
                    const input = popup.querySelector("#scWidgetInput");
                    if (input) input.focus();
                }
            }

            floatBtn.addEventListener("click", togglePopup);
            popup.querySelector("#scWidgetCloseBtn").addEventListener("click", togglePopup);

            popup.querySelector("#scWidgetClearBtn").addEventListener("click", () => {
                conversationHistory = [];
                const messages = popup.querySelector("#scWidgetMessages");
                messages.innerHTML = `
                    <div class="sc-ai-bubble sc-ai-bubble-bot">
                        Conversation cleared. How can I assist you with Gorakhpur city services?
                    </div>
                `;
            });

            // Handle suggestions clicks
            popup.querySelectorAll(".sc-ai-chip").forEach(chip => {
                chip.addEventListener("click", () => {
                    const query = chip.getAttribute("data-query");
                    if (query) {
                        const input = popup.querySelector("#scWidgetInput");
                        input.value = query;
                        sendWidgetQuery();
                    }
                });
            });

            // Normalizes relative navigation depending on current URL depth
            function resolveNavUrl(targetUrl) {
                if (!targetUrl) return "#";
                if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://") || targetUrl.startsWith("tel:") || targetUrl.startsWith("mailto:")) {
                    return targetUrl;
                }
                const isSubpage = window.location.pathname.includes("/pages/");
                if (isSubpage) {
                    if (targetUrl.startsWith("/pages/")) {
                        return targetUrl.replace(/^\/pages\//, "../");
                    }
                    if (targetUrl === "/" || targetUrl === "/index.html") {
                        return "../../index.html";
                    }
                }
                return targetUrl;
            }

            // Message formatter
            function formatMarkdown(text) {
                if (!text) return "";
                let html = text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    .replace(/•/g, "•")
                    .replace(/\n/g, "<br>");
                return html;
            }

            // Send message function
            async function sendWidgetQuery() {
                const input = popup.querySelector("#scWidgetInput");
                const messages = popup.querySelector("#scWidgetMessages");
                const text = (input.value || "").trim();
                if (!text || isBusy) return;

                input.value = "";
                isBusy = true;

                // User Bubble
                const userBubble = document.createElement("div");
                userBubble.className = "sc-ai-bubble sc-ai-bubble-user";
                userBubble.textContent = text;
                messages.appendChild(userBubble);
                conversationHistory.push({ sender: "user", text });

                // Typing Indicator
                const typingEl = document.createElement("div");
                typingEl.className = "sc-ai-typing";
                typingEl.innerHTML = '<span class="sc-ai-dot"></span><span class="sc-ai-dot"></span><span class="sc-ai-dot"></span>';
                messages.appendChild(typingEl);
                messages.scrollTop = messages.scrollHeight;

                try {
                    const endpoint = (typeof window !== "undefined" && window.API_BASE_URL !== undefined)
                        ? `${window.API_BASE_URL}/api/ai/chat`
                        : (window.location.port === "5000" || window.location.pathname.startsWith("/")
                            ? "/api/ai/chat"
                            : "http://localhost:5000/api/ai/chat");

                    const fetchFn = (typeof SmartCityAuth !== "undefined" && SmartCityAuth.fetch)
                        ? SmartCityAuth.fetch
                        : fetch;

                    const res = await fetchFn(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            message: text,
                            history: conversationHistory
                        })
                    });

                    typingEl.remove();

                    if (!res.ok) throw new Error("HTTP error " + res.status);
                    const data = await res.json();

                    // Bot Bubble
                    const botBubble = document.createElement("div");
                    botBubble.className = "sc-ai-bubble sc-ai-bubble-bot";
                    let contentHtml = formatMarkdown(data.reply);

                    if (Array.isArray(data.actions) && data.actions.length > 0) {
                        contentHtml += '<div class="sc-ai-actions">';
                        data.actions.forEach(act => {
                            const btnClass = act.type === "primary" ? "sc-ai-action-primary" : "sc-ai-action-secondary";
                            const resolvedUrl = resolveNavUrl(act.url);
                            contentHtml += `<a href="${resolvedUrl}" class="sc-ai-action-btn ${btnClass}">${act.label}</a>`;
                        });
                        contentHtml += '</div>';
                    }

                    botBubble.innerHTML = contentHtml;
                    messages.appendChild(botBubble);
                    conversationHistory.push({ sender: "bot", text: data.reply });

                    if (SmartCityRealtime.playAlertSound) {
                        SmartCityRealtime.playAlertSound(data.intent === "EMERGENCY" ? "emergency" : "chime");
                    }
                } catch (err) {
                    typingEl.remove();
                    const errBubble = document.createElement("div");
                    errBubble.className = "sc-ai-bubble sc-ai-bubble-bot";
                    errBubble.style.borderColor = "rgba(239, 68, 68, 0.4)";
                    errBubble.innerHTML = "⚠️ <em>Unable to reach Smart City AI Engine. Please check backend status.</em>";
                    messages.appendChild(errBubble);
                } finally {
                    isBusy = false;
                    messages.scrollTop = messages.scrollHeight;
                    input.focus();
                }
            }

            popup.querySelector("#scWidgetSendBtn").addEventListener("click", sendWidgetQuery);
            popup.querySelector("#scWidgetInput").addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    sendWidgetQuery();
                }
            });
        },

        toggleAIWidget: function () {
            const popup = document.getElementById("scGlobalAIChatPopup");
            if (popup) popup.classList.toggle("open");
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
