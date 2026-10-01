/**
 * SMARTCITY AI - REUSABLE JAVASCRIPT UI COMPONENTS
 * Exposes window.SmartCityUI factory for modular, responsive UI rendering.
 */

(function () {
    const SmartCityUI = {};

    // 1. Toast Container Singleton
    let toastContainer = null;
    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.getElementById("sc-toast-container");
            if (!toastContainer) {
                toastContainer = document.createElement("div");
                toastContainer.id = "sc-toast-container";
                toastContainer.className = "sc-toast-container";
                document.body.appendChild(toastContainer);
            }
        }
        return toastContainer;
    }

    /**
     * Show a modern toast notification
     * @param {string} message 
     * @param {'success'|'error'|'warning'|'info'} [type='info'] 
     * @param {number} [duration=4000] 
     */
    SmartCityUI.toast = function (message, type = "info", duration = 4000) {
        const container = getToastContainer();
        const toast = document.createElement("div");
        toast.className = `sc-toast sc-toast-${type}`;

        const icons = {
            success: "✅",
            error: "❌",
            warning: "⚠️",
            info: "ℹ️"
        };

        toast.innerHTML = `
            <span class="sc-toast-icon">${icons[type] || icons.info}</span>
            <div class="sc-toast-message">${message}</div>
            <button class="sc-toast-close" aria-label="Close">&times;</button>
        `;

        const closeBtn = toast.querySelector(".sc-toast-close");
        const removeToast = () => {
            toast.classList.remove("sc-toast-visible");
            setTimeout(() => {
                if (toast.parentElement) toast.parentElement.removeChild(toast);
            }, 300);
        };

        closeBtn.addEventListener("click", removeToast);
        container.appendChild(toast);

        // Animate entrance
        requestAnimationFrame(() => {
            toast.classList.add("sc-toast-visible");
        });

        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    };

    /**
     * Show loading overlay inside a container element
     * @param {HTMLElement|string} target 
     * @param {string} [message="Loading SmartCity telemetry..."] 
     */
    SmartCityUI.showLoading = function (target, message = "Loading SmartCity telemetry...") {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;

        el.dataset.prevHtml = el.innerHTML;
        el.innerHTML = `
            <div class="sc-loading-overlay">
                <div class="sc-spinner"></div>
                <div class="sc-loading-text">${message}</div>
            </div>
        `;
    };

    /**
     * Restore container from loading state
     * @param {HTMLElement|string} target 
     */
    SmartCityUI.hideLoading = function (target) {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;
        const overlay = el.querySelector(".sc-loading-overlay");
        if (overlay) overlay.remove();
    };

    /**
     * Render empty state in container
     * @param {HTMLElement|string} target 
     * @param {Object} options 
     */
    SmartCityUI.renderEmpty = function (target, {
        icon = "📂",
        title = "No Data Available",
        description = "There are no records matching your query at this moment.",
        actionText = null,
        onAction = null
    } = {}) {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;

        el.innerHTML = `
            <div class="sc-state-box">
                <div class="sc-state-icon">${icon}</div>
                <div class="sc-state-title">${title}</div>
                <div class="sc-state-desc">${description}</div>
                ${actionText ? `<button class="sc-btn sc-btn-secondary" id="sc-empty-action-btn">${actionText}</button>` : ""}
            </div>
        `;

        if (actionText && typeof onAction === "function") {
            const btn = el.querySelector("#sc-empty-action-btn");
            if (btn) btn.addEventListener("click", onAction);
        }
    };

    /**
     * Render error state with retry button
     * @param {HTMLElement|string} target 
     * @param {Object} options 
     */
    SmartCityUI.renderError = function (target, {
        icon = "⚠️",
        title = "Unable to Load Data",
        description = "We encountered a network or server issue fetching the requested information.",
        retryText = "Retry Connection",
        onRetry = null
    } = {}) {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;

        el.innerHTML = `
            <div class="sc-state-box">
                <div class="sc-state-icon">${icon}</div>
                <div class="sc-state-title" style="color: #f87171;">${title}</div>
                <div class="sc-state-desc">${description}</div>
                ${retryText ? `<button class="sc-btn sc-btn-primary" id="sc-error-retry-btn">🔄 ${retryText}</button>` : ""}
            </div>
        `;

        if (retryText && typeof onRetry === "function") {
            const btn = el.querySelector("#sc-error-retry-btn");
            if (btn) btn.addEventListener("click", onRetry);
        }
    };

    /**
     * Render Stat Card HTML string
     * @param {Object} card 
     * @returns {string} HTML string
     */
    SmartCityUI.renderStatCard = function ({
        title = "Total",
        value = "0",
        unit = "",
        icon = "📊",
        trend = null,
        trendType = "up"
    } = {}) {
        return `
            <div class="sc-stat-card">
                <div class="sc-stat-top">
                    <span class="sc-stat-label">${title}</span>
                    <div class="sc-stat-icon-wrap">${icon}</div>
                </div>
                <div class="sc-stat-value">${value} <span style="font-size: 1rem; font-weight: normal; color: var(--sc-text-muted);">${unit}</span></div>
                ${trend ? `
                    <div class="sc-stat-footer">
                        <span class="${trendType === 'up' ? 'sc-stat-trend-up' : 'sc-stat-trend-down'}">${trendType === 'up' ? '▲' : '▼'} ${trend}</span>
                        <span>vs previous hour</span>
                    </div>
                ` : ""}
            </div>
        `;
    };

    /**
     * Reusable Modal Dialog
     * @param {Object} options 
     */
    SmartCityUI.openModal = function ({
        title = "SmartCity Notification",
        content = "",
        buttons = [{ text: "Close", type: "secondary", onClick: null }],
        onClose = null
    } = {}) {
        const modalId = "sc-modal-" + Date.now();
        const backdrop = document.createElement("div");
        backdrop.id = modalId;
        backdrop.className = "sc-modal-backdrop";

        const btnHtml = buttons.map((b, idx) => `
            <button class="sc-btn sc-btn-${b.type || 'secondary'}" data-btn-idx="${idx}">${b.text}</button>
        `).join("");

        backdrop.innerHTML = `
            <div class="sc-modal-dialog">
                <div class="sc-modal-header">
                    <h3 class="sc-modal-title">${title}</h3>
                    <button class="sc-modal-close-btn">&times;</button>
                </div>
                <div class="sc-modal-body">${content}</div>
                <div class="sc-modal-footer">${btnHtml}</div>
            </div>
        `;

        const closeModal = () => {
            backdrop.classList.remove("sc-modal-active");
            setTimeout(() => {
                if (backdrop.parentElement) backdrop.parentElement.removeChild(backdrop);
                if (typeof onClose === "function") onClose();
            }, 250);
        };

        backdrop.querySelector(".sc-modal-close-btn").addEventListener("click", closeModal);
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) closeModal();
        });

        // Wire button callbacks
        buttons.forEach((b, idx) => {
            const btnEl = backdrop.querySelector(`[data-btn-idx="${idx}"]`);
            if (btnEl) {
                btnEl.addEventListener("click", () => {
                    if (typeof b.onClick === "function") {
                        const preventClose = b.onClick();
                        if (preventClose !== true) closeModal();
                    } else {
                        closeModal();
                    }
                });
            }
        });

        document.body.appendChild(backdrop);
        requestAnimationFrame(() => {
            backdrop.classList.add("sc-modal-active");
        });

        return modalId;
    };

    /**
     * Render Module Header inside a container
     * @param {HTMLElement|string} target 
     * @param {Object} options 
     */
    SmartCityUI.renderModuleHeader = function (target, {
        icon = "🏙️",
        title = "Smart City Module",
        subtitle = "Live Gorakhpur Municipal Telemetry",
        badge = "LIVE",
        actionsHtml = ""
    } = {}) {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        if (!el) return;

        el.innerHTML = `
            <div class="sc-module-header">
                <div class="sc-module-info">
                    <div class="sc-module-icon">${icon}</div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <h1 class="sc-module-title">${title}</h1>
                            ${badge ? `<span class="sc-badge sc-badge-live">${badge}</span>` : ""}
                        </div>
                        <p class="sc-module-desc">${subtitle}</p>
                    </div>
                </div>
                <div class="sc-module-actions">${actionsHtml}</div>
            </div>
        `;
    };

    window.SmartCityUI = SmartCityUI;
})();
