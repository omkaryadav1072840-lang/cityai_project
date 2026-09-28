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
            if (document.getElementById("scUniversalAIWindow")) return;

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
            link.href = isSubpage ? "../../components/ai_widget.css" : "./components/ai_widget.css";
            document.head.appendChild(link);
        },

        renderDOM: function () {
            // 1. Floating Action Button
            const fab = document.createElement("div");
            fab.id = "scUniversalAIFab";
            fab.setAttribute("title", "SmartCity AI Assistant (Gorakhpur)");
            fab.innerHTML = `
                <div class="sc-fab-icon">🤖</div>
                <div class="sc-fab-badge"></div>
            `;
            document.body.appendChild(fab);

            // 2. Chat Window Panel
            const win = document.createElement("div");
            win.id = "scUniversalAIWindow";
            win.innerHTML = `
                <div class="sc-ai-header">
                    <div class="sc-ai-header-info">
                        <div class="sc-ai-avatar">🏛️</div>
                        <div>
                            <h3 class="sc-ai-title">Gorakhpur AI Assistant</h3>
                            <p class="sc-ai-subtitle">Grounded Municipal Intelligence</p>
                        </div>
                    </div>
                    <div class="sc-ai-header-actions">
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
                    <input type="text" class="sc-ai-input" id="scAiInput" placeholder="Ask in Hindi, English or Hinglish..." autocomplete="off">
                    <button class="sc-ai-send-btn" id="scAiSendBtn" title="Send">➤</button>
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

            fab.addEventListener("click", () => this.toggle());
            closeBtn.addEventListener("click", () => this.toggle(false));

            clearBtn.addEventListener("click", () => {
                const msgBox = document.getElementById("scAiMessages");
                msgBox.innerHTML = `
                    <div class="sc-msg sc-msg-bot">
                        <div class="sc-bubble">Conversation cleared. How can I assist you today?</div>
                    </div>
                `;
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

                // Append Bot Bubble with Tool and Data Badges
                const botMsg = document.createElement("div");
                botMsg.className = "sc-msg sc-msg-bot";

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

                botMsg.innerHTML = `
                    <div class="sc-bubble">
                        ${this.formatMarkdown(data.reply)}
                        ${chipsHtml ? `<div class="sc-meta-chips">${chipsHtml}</div>` : ''}
                    </div>
                `;
                messages.appendChild(botMsg);

            } catch (err) {
                if (document.getElementById("scAiLoader")) {
                    document.getElementById("scAiLoader").remove();
                }
                const errMsg = document.createElement("div");
                errMsg.className = "sc-msg sc-msg-bot";
                errMsg.innerHTML = `
                    <div class="sc-bubble" style="border-color: rgba(239, 68, 68, 0.4); color: #fca5a5;">
                        ⚠️ Kripya dhyan dein: AI Service se sampark nahi ho saka. Emergency ke liye <strong>112</strong> par call karein.
                    </div>
                `;
                messages.appendChild(errMsg);
            } finally {
                this.isBusy = false;
                messages.scrollTop = messages.scrollHeight;
                input.focus();
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
