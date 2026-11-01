/**
 * SMARTCITY AI - UNIVERSAL FLOATING AI WIDGET
 * Grounded Municipal Bilingual Assistant (Gorakhpur, UP)
 * Connects directly to /api/ai/chat and /api/ai/tool-call
 */

(function (window) {
    "use strict";

    const SmartCityAIWidget = {
        sessionId: null,
        isOpen: false,
        isBusy: false,

        init: function () {
            if (document.getElementById("scUniversalAIWindow") || document.getElementById("scUniversalAIFab")) return;

            // Remove legacy floating button if realtime.js created one
            const oldBtn = document.getElementById("scGlobalAIFloatingBtn");
            if (oldBtn) oldBtn.remove();
            const oldPopup = document.getElementById("scGlobalAIPopup");
            if (oldPopup) oldPopup.remove();

            this.sessionId = localStorage.getItem("sc_ai_session_id") || `SESS-${Date.now().toString(36).toUpperCase()}`;
            localStorage.setItem("sc_ai_session_id", this.sessionId);

            this.injectStyles();
            this.renderDOM();
            this.bindEvents();
            this.updateAuthStatus();
        },

        injectStyles: function () {
            if (document.querySelector("link[href*='ai_widget.css']")) return;
            const link = document.createElement("link");
            link.rel = "stylesheet";
            // Resolve relative path to root or subpages
            const isSubpage = window.location.pathname.includes("/pages/");
            link.href = isSubpage ? "../../components/ai_widget.css?v=3.5" : "./components/ai_widget.css?v=3.5";
            document.head.appendChild(link);
        },

        renderDOM: function () {
            const isSubpage = window.location.pathname.includes("/pages/");
            const logoPath = isSubpage ? "../../logo.png" : "./logo.png";

            // 1. Floating Action Button (bulletproof inline constraints: 58px circle, 38px contained image)
            const fab = document.createElement("div");
            fab.id = "scUniversalAIFab";
            fab.setAttribute("title", "SmartCity AI Assistant (Gorakhpur)");
            fab.style.cssText = "position: fixed !important; bottom: 24px !important; right: 24px !important; width: 58px !important; height: 58px !important; min-width: 58px !important; min-height: 58px !important; max-width: 58px !important; max-height: 58px !important; border-radius: 50% !important; z-index: 999999 !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; background: linear-gradient(135deg, #2563eb, #7c3aed) !important; border: 2px solid rgba(255, 255, 255, 0.25) !important; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45) !important; padding: 0 !important; margin: 0 !important; box-sizing: border-box !important;";
            fab.innerHTML = `
                <div class="sc-fab-icon" style="width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; border-radius: 50% !important; overflow: hidden !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 0 !important; margin: 0 !important;">
                    <img src="${logoPath}?v=3.5" alt="SmartCity AI Logo" class="sc-fab-logo-img" width="38" height="38" style="width: 38px !important; height: 38px !important; max-width: 38px !important; max-height: 38px !important; min-width: 38px !important; min-height: 38px !important; object-fit: contain !important; border-radius: 50% !important; display: block !important; pointer-events: none !important; margin: auto !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45)) !important;">
                </div>
                <div class="sc-fab-badge" style="position: absolute !important; top: -2px !important; right: -2px !important; width: 14px !important; height: 14px !important; background: #10b981 !important; border: 2px solid #0f172a !important; border-radius: 50% !important; z-index: 2 !important; pointer-events: none !important;"></div>
            `;
            document.body.appendChild(fab);

            // 2. Chat Window Panel
            const win = document.createElement("div");
            win.id = "scUniversalAIWindow";
            win.innerHTML = `
                <div class="sc-ai-header">
                    <div class="sc-ai-header-info">
                        <div class="sc-ai-avatar" style="width: 40px !important; height: 40px !important; min-width: 40px !important; min-height: 40px !important; border-radius: 10px !important; overflow: hidden !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 2px !important; flex-shrink: 0 !important;"><img src="${logoPath}?v=3.5" alt="SmartCity AI Logo" class="sc-ai-avatar-img" style="width: 34px !important; height: 34px !important; max-width: 34px !important; max-height: 34px !important; object-fit: contain !important; display: block !important;" width="34" height="34"></div>
                        <div>
                            <h3 class="sc-ai-title">Gorakhpur AI Assistant</h3>
                            <p class="sc-ai-subtitle">Grounded Municipal Intelligence</p>
                        </div>
                    </div>
                    <div class="sc-ai-header-actions">
                        <button class="sc-ai-btn-icon" id="scAiHistoryBtn" title="Conversation History">📜</button>
                        <button class="sc-ai-btn-icon" id="scAiClearBtn" title="Clear Chat">🗑️</button>
                        <button class="sc-ai-btn-icon" id="scAiCloseBtn" title="Close">✕</button>
                    </div>
                </div>

                <div class="sc-ai-auth-badge" id="scAiAuthStatus">
                    <span>👤 <span id="scAiUserLabel">Citizen Mode</span></span>
                    <span style="font-size: 10px; color: #6ee7b7;">● Online</span>
                </div>

                <div class="sc-ai-messages" id="scAiMessages">
                    <div class="sc-msg sc-msg-bot">
                        <div class="sc-bubble">
                            नमस्ते! मैं <strong>Gorakhpur SmartCity AI</strong> हूँ।<br>
                            मैं ट्रैफ़िक, हॉस्पिटल बेड्स, पार्किंग, आपातकालीन सेवाएँ (112), और शिकायतों की <em>लाइव प्रमाणित जानकारी</em> दे सकता हूँ।
                        </div>
                    </div>
                </div>

                <div class="sc-ai-suggestions" id="scAiSuggestions">
                    <span class="sc-suggestion-pill" data-query="Golghar ke paas parking kaha hai?">🚗 Golghar Parking</span>
                    <span class="sc-suggestion-pill" data-query="Which hospital has ICU beds available?">🏥 ICU Beds Live</span>
                    <span class="sc-suggestion-pill" data-query="आज Gorakhpur में traffic कहाँ ज्यादा है?">🚦 Live Traffic</span>
                    <span class="sc-suggestion-pill" data-query="Nearest police station and helpline?">👮 Police & 112 SOS</span>
                    <span class="sc-suggestion-pill" data-query="Ramgarh Tal ke liye one-day trip batao">🏛️ Ramgarh Tal Tour</span>
                </div>

                <div class="sc-ai-input-bar">
                    <button class="sc-ai-mic-btn" id="scAiMicBtn" title="Speak in Hindi/English (Voice Search)" type="button">🎙️</button>
                    <input type="text" class="sc-ai-input" id="scAiInput" placeholder="Type or speak in Hindi/English..." autocomplete="off">
                    <button class="sc-ai-send-btn" id="scAiSendBtn" title="Send" type="button">➤</button>
                </div>

                <!-- Conversation History Panel -->
                <div class="sc-ai-history-panel" id="scAiHistoryPanel" style="display: none;">
                    <div class="sc-ai-history-header">
                        <h4>Conversation History</h4>
                        <button class="sc-ai-btn-icon" id="scAiHistoryCloseBtn" title="Close History">✕</button>
                    </div>
                    <div class="sc-ai-history-list" id="scAiHistoryList"></div>
                    <div class="sc-ai-history-actions">
                        <button class="sc-ai-history-btn" id="scAiClearHistoryBtn" title="Clear All History">🗑️ Clear All History</button>
                    </div>
                </div>
            `;
            document.body.appendChild(win);
        },

        bindEvents: function () {
            const fab = document.getElementById("scUniversalAIFab");
            const win = document.getElementById("scUniversalAIWindow");
            const closeBtn = document.getElementById("scAiCloseBtn");
            const clearBtn = document.getElementById("scAiClearBtn");
            const sendBtn = document.getElementById("scAiSendBtn");
            const input = document.getElementById("scAiInput");
            const suggestions = document.getElementById("scAiSuggestions");
            const historyBtn = document.getElementById("scAiHistoryBtn");
            const historyCloseBtn = document.getElementById("scAiHistoryCloseBtn");
            const historyPanel = document.getElementById("scAiHistoryPanel");
            const historyList = document.getElementById("scAiHistoryList");
            const clearHistoryBtn = document.getElementById("scAiClearHistoryBtn");

            fab.addEventListener("click", () => this.toggle());
            closeBtn.addEventListener("click", () => this.toggle(false));

            clearBtn.addEventListener("click", () => {
                const msgBox = document.getElementById("scAiMessages");
                msgBox.innerHTML = `
                    <div class="sc-msg sc-msg-bot">
                        <div class="sc-bubble">Conversation cleared. How can I assist you today?</div>
                    </div>
                `;
                this.saveMessageToHistory("assistant", "Conversation cleared. How can I assist you today?");
            });

            // History Panel Events
            historyBtn.addEventListener("click", () => this.toggleHistoryPanel());
            historyCloseBtn.addEventListener("click", () => this.toggleHistoryPanel(false));

            clearHistoryBtn.addEventListener("click", () => {
                if (confirm("Clear all conversation history? This cannot be undone.")) {
                    this.clearHistory();
                }
            });

            sendBtn.addEventListener("click", () => this.handleSend());
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.handleSend();
                }
            });

            suggestions.querySelectorAll(".sc-suggestion-pill").forEach(pill => {
                pill.addEventListener("click", () => {
                    const q = pill.getAttribute("data-query");
                    if (q) {
                        input.value = q;
                        this.handleSend();
                    }
                });
            });

            // Global helper to open AI assistant from any button or navbar link
            window.openAiAssistant = () => this.toggle(true);

            // Bind all elements or links targeting #aiAssistant
            document.querySelectorAll('a[href="#aiAssistant"], [data-action="open-ai"]').forEach(el => {
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.toggle(true);
                });
            });

            this.initVoiceInput();
        },

        initVoiceInput: function () {
            const micBtn = document.getElementById("scAiMicBtn");
            const input = document.getElementById("scAiInput");
            if (!micBtn || !input) return;

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                micBtn.title = "Voice recognition not supported in this browser";
                micBtn.style.opacity = "0.5";
                micBtn.style.cursor = "not-allowed";
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = "hi-IN";
            recognition.continuous = false;
            recognition.interimResults = false;

            let isListening = false;

            micBtn.addEventListener("click", () => {
                if (isListening) {
                    recognition.stop();
                    return;
                }
                try {
                    recognition.start();
                    isListening = true;
                    micBtn.classList.add("sc-listening");
                    micBtn.textContent = "🛑";
                    input.setAttribute("placeholder", "सुन रहा हूँ... Speak now in Hindi or English...");
                } catch (err) {
                    console.warn("Speech recognition error:", err);
                }
            });

            recognition.onresult = (event) => {
                const transcript = event.results?.[0]?.[0]?.transcript;
                if (transcript) {
                    input.value = transcript;
                    this.handleSend();
                }
            };

            recognition.onend = () => {
                isListening = false;
                micBtn.classList.remove("sc-listening");
                micBtn.textContent = "🎙️";
                input.setAttribute("placeholder", "Ask in Hindi, English or Hinglish...");
            };

            recognition.onerror = () => {
                isListening = false;
                micBtn.classList.remove("sc-listening");
                micBtn.textContent = "🎙️";
                input.setAttribute("placeholder", "Ask in Hindi, English or Hinglish...");
            };
        },

        toggle: function (forceState) {
            const win = document.getElementById("scUniversalAIWindow");
            this.isOpen = typeof forceState === "boolean" ? forceState : !this.isOpen;
            if (this.isOpen) {
                win.classList.add("sc-open");
                document.getElementById("scAiInput").focus();
            } else {
                win.classList.remove("sc-open");
            }
        },

        toggleHistoryPanel: function (forceState) {
            const panel = document.getElementById("scAiHistoryPanel");
            const isOpen = typeof forceState === "boolean" ? forceState : !panel.classList.contains("sc-open");
            if (isOpen) {
                panel.style.display = "block";
                panel.classList.add("sc-open");
                this.loadHistoryFromStorage();
            } else {
                panel.classList.remove("sc-open");
                setTimeout(() => { panel.style.display = "none"; }, 200);
            }
        },

        loadHistoryFromStorage: function () {
            const list = document.getElementById("scAiHistoryList");
            if (!list) return;
            try {
                const history = JSON.parse(localStorage.getItem("sc_ai_conversation_history") || "[]");
                if (history.length === 0) {
                    list.innerHTML = '<div class="sc-ai-history-empty">No conversation history yet.</div>';
                    return;
                }
                list.innerHTML = history.slice(-20).reverse().map((msg, idx) => `
                    <div class="sc-ai-history-item ${msg.role === 'user' ? 'sc-user' : 'sc-bot'}">
                        <span class="sc-ai-history-role">${msg.role === 'user' ? '👤 You' : '🤖 AI'}</span>
                        <span class="sc-ai-history-text">${msg.text.substring(0, 80)}${msg.text.length > 80 ? '...' : ''}</span>
                        <span class="sc-ai-history-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                `).join('');
            } catch (e) {
                list.innerHTML = '<div class="sc-ai-history-empty">Error loading history.</div>';
            }
        },

        saveMessageToHistory: function (role, text) {
            try {
                const history = JSON.parse(localStorage.getItem("sc_ai_conversation_history") || "[]");
                history.push({ role, text, timestamp: Date.now() });
                // Keep last 100 messages
                if (history.length > 100) history.shift();
                localStorage.setItem("sc_ai_conversation_history", JSON.stringify(history));
            } catch (e) {}
        },

        clearHistory: function () {
            localStorage.removeItem("sc_ai_conversation_history");
            this.loadHistoryFromStorage();
        },

        updateAuthStatus: function () {
            const userLabel = document.getElementById("scAiUserLabel");
            const token = localStorage.getItem("token") || localStorage.getItem("jwt");
            let user = null;
            try {
                user = JSON.parse(localStorage.getItem("user") || "{}");
            } catch (e) {}

            if (token && user && user.name) {
                userLabel.textContent = `${user.name} (${user.role || 'User'})`;
            } else {
                userLabel.textContent = "Guest Citizen (Gorakhpur)";
            }
        },

        formatMarkdown: function (text) {
            if (!text) return "";
            return text
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<em>$1</em>")
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #60a5fa; text-decoration: underline;">$1</a>')
                .replace(/\n/g, "<br>");
        },

        handleSend: async function () {
            const input = document.getElementById("scAiInput");
            const text = (input.value || "").trim();
            if (!text || this.isBusy) return;

            input.value = "";
            this.isBusy = true;
            const messages = document.getElementById("scAiMessages");

            // Append User Bubble
            const userMsg = document.createElement("div");
            userMsg.className = "sc-msg sc-msg-user";
            userMsg.innerHTML = `<div class="sc-bubble">${this.formatMarkdown(text)}</div>`;
            messages.appendChild(userMsg);
            this.saveMessageToHistory("user", text);

            // Append Loader
            const loader = document.createElement("div");
            loader.className = "sc-msg sc-msg-bot";
            loader.id = "scAiLoader";
            loader.innerHTML = `
                <div class="sc-typing-loader">
                    <span class="sc-typing-dot"></span>
                    <span class="sc-typing-dot"></span>
                    <span class="sc-typing-dot"></span>
                </div>
            `;
            messages.appendChild(loader);
            messages.scrollTop = messages.scrollHeight;

            let retryCount = 0;
            const maxRetries = 2;

            const attemptRequest = async () => {
                try {
                    const token = localStorage.getItem("token") || localStorage.getItem("jwt");
                    const headers = { "Content-Type": "application/json" };
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    const endpoint = (window.location.port === "5000" || window.location.pathname.startsWith("/"))
                        ? "/api/ai/chat"
                        : "http://localhost:5000/api/ai/chat";

                    const response = await fetch(endpoint, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            message: text,
                            sessionId: this.sessionId
                        })
                    });

                    loader.remove();
                    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                    const data = await response.json();

                    // Append Bot Bubble with Tool, Data Badges, and Feedback
                    const botMsg = document.createElement("div");
                    botMsg.className = "sc-msg sc-msg-bot";
                    botMsg.dataset.predictionId = data.prediction_id || "";
                    botMsg.dataset.sessionId = data.session_id || this.sessionId;

                    let chipsHtml = "";
                    if (data.tool_called) {
                        chipsHtml += `<span class="sc-chip sc-chip-tool">⚡ ${data.tool_called}</span>`;
                    }

                    if (data.data_source === "REAL") {
                        chipsHtml += `<span class="sc-chip sc-chip-real">🟢 Verified Real Data</span>`;
                    } else if (data.data_source === "PREDICTED") {
                        chipsHtml += `<span class="sc-chip sc-chip-predicted">🔮 AI Prediction</span>`;
                    } else if (data.data_source === "SIMULATED") {
                        chipsHtml += `<span class="sc-chip sc-chip-simulated">🧪 Simulated Scenario</span>`;
                    }

                    const feedbackHtml = `
                        <div class="sc-feedback-bar" style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="sc-feedback-btn" data-feedback="up" title="Helpful" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 14px; color: #475569;">👍 Helpful</button>
                            <button class="sc-feedback-btn" data-feedback="down" title="Not Helpful" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 14px; color: #475569;">👎 Not Helpful</button>
                        </div>
                    `;

                    botMsg.innerHTML = `
                        <div class="sc-bubble">
                            ${this.formatMarkdown(data.reply)}
                            ${chipsHtml ? `<div class="sc-meta-chips">${chipsHtml}</div>` : ''}
                            ${feedbackHtml}
                        </div>
                    `;
                    messages.appendChild(botMsg);
                    this.saveMessageToHistory("assistant", data.reply);

                    // Bind feedback buttons
                    botMsg.querySelectorAll(".sc-feedback-btn").forEach(btn => {
                        btn.addEventListener("click", () => this.submitFeedback(botMsg, btn.dataset.feedback, data));
                    });

                } catch (err) {
                    if (document.getElementById("scAiLoader")) {
                        document.getElementById("scAiLoader").remove();
                    }
                    if (retryCount < maxRetries) {
                        retryCount++;
                        await new Promise(r => setTimeout(r, 1000 * retryCount));
                        return attemptRequest();
                    }
                    const errMsg = document.createElement("div");
                    errMsg.className = "sc-msg sc-msg-bot";
                    errMsg.innerHTML = `
                        <div class="sc-bubble" style="border-color: rgba(239, 68, 68, 0.4); color: #fca5a5;">
                            ⚠️ Kripya dhyan dein: AI Service se sampark nahi ho saka. Emergency ke liye <strong>112</strong> par call karein.
                            <div style="margin-top: 8px;">
                                <button class="sc-retry-btn" style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px;">🔄 Retry</button>
                            </div>
                        </div>
                    `;
                    messages.appendChild(errMsg);
                    errMsg.querySelector(".sc-retry-btn").addEventListener("click", () => {
                        errMsg.remove();
                        this.handleSend();
                    });
                } finally {
                    this.isBusy = false;
                    messages.scrollTop = messages.scrollHeight;
                    input.focus();
                }
            };

            await attemptRequest();
        },

        submitFeedback: async function (botMsg, feedback, data) {
            const predictionId = botMsg.dataset.predictionId || "";
            const sessionId = botMsg.dataset.sessionId || this.sessionId;
            if (!predictionId) return;

            // Disable feedback buttons after click
            botMsg.querySelectorAll(".sc-feedback-btn").forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
            });

            // Show selected state
            const selectedBtn = botMsg.querySelector(`[data-feedback="${feedback}"]`);
            if (selectedBtn) {
                selectedBtn.style.background = feedback === "up" ? "#dcfce7" : "#fee2e2";
                selectedBtn.style.borderColor = feedback === "up" ? "#22c55e" : "#ef4444";
                selectedBtn.style.color = feedback === "up" ? "#16a34a" : "#dc2626";
            }

            try {
                const token = localStorage.getItem("token") || localStorage.getItem("jwt");
                const headers = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const endpoint = (window.location.port === "5000" || window.location.pathname.startsWith("/"))
                    ? `/api/ai/predictions/${encodeURIComponent(predictionId)}/feedback`
                    : `http://localhost:5000/api/ai/predictions/${encodeURIComponent(predictionId)}/feedback`;

                await fetch(endpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        was_correct: feedback === "up",
                        feedback_type: "CITIZEN_RATING",
                        comments: `User rated: ${feedback === "up" ? "Helpful" : "Not Helpful"}`
                    })
                });

                // Show thank you
                const thankYou = document.createElement("div");
                thankYou.className = "sc-feedback-thanks";
                thankYou.style.cssText = "margin-top: 6px; font-size: 12px; color: #64748b;";
                thankYou.textContent = feedback === "up" ? "✅ Thank you! Your feedback helps improve the assistant." : "✅ Thank you! We'll work on improving this response.";
                botMsg.querySelector(".sc-bubble").appendChild(thankYou);

            } catch (err) {
                console.warn("Feedback submission failed:", err);
                // Re-enable buttons on error
                botMsg.querySelectorAll(".sc-feedback-btn").forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.cursor = "pointer";
                });
            }
        }
    };

    // Auto initialize when DOM is ready
    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => SmartCityAIWidget.init());
        } else {
            SmartCityAIWidget.init();
        }
    }

    window.SmartCityAIWidget = SmartCityAIWidget;
})(window);
