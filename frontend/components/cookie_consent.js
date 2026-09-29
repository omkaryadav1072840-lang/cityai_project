/**
 * SmartCity AI - Cookie Consent Manager
 * Respects user privacy, stores state in localStorage, manages telemetry activation
 */

(function () {
    const STORAGE_KEY = "smartcity_cookie_consent";

    function getConsent() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function setConsent(choice) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                choice: choice,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {}

        // Notify other components (like analytics)
        window.dispatchEvent(new CustomEvent("smartcity:cookie_consent_updated", {
            detail: { choice }
        }));
    }

    function initCookieBanner() {
        const existingConsent = getConsent();
        if (existingConsent) {
            // Consent already recorded; don't bother the citizen
            return;
        }

        // Dynamically inject CSS if not loaded
        if (!document.querySelector('link[href*="cookie_consent.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "/components/cookie_consent.css";
            document.head.appendChild(link);
        }

        // Create banner DOM
        const banner = document.createElement("div");
        banner.className = "sc-cookie-banner";
        banner.id = "scCookieConsentBanner";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-live", "polite");
        banner.setAttribute("aria-label", "Cookie Consent Notification");

        banner.innerHTML = `
            <div class="sc-cookie-content">
                <div class="sc-cookie-title">
                    <span>🍪</span> Municipal Platform Cookie & Privacy Notice
                </div>
                <p class="sc-cookie-text">
                    SmartCity AI uses essential cookies to authenticate citizen and staff sessions securely. We also use privacy-preserving, non-PII telemetry to optimize hospital, parking, and traffic response times. Review our <a href="/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>.
                </p>
            </div>
            <div class="sc-cookie-actions">
                <button type="button" class="sc-cookie-btn sc-cookie-btn-decline" id="scCookieDeclineBtn">
                    Essential Only
                </button>
                <button type="button" class="sc-cookie-btn sc-cookie-btn-accept" id="scCookieAcceptBtn">
                    Accept All
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        // Animate in smoothly
        setTimeout(() => {
            banner.classList.add("visible");
        }, 800);

        // Bind buttons
        const acceptBtn = banner.querySelector("#scCookieAcceptBtn");
        const declineBtn = banner.querySelector("#scCookieDeclineBtn");

        function hideBanner() {
            banner.classList.remove("visible");
            setTimeout(() => banner.remove(), 400);
        }

        acceptBtn.addEventListener("click", () => {
            setConsent("all");
            hideBanner();
        });

        declineBtn.addEventListener("click", () => {
            setConsent("essential");
            hideBanner();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCookieBanner);
    } else {
        initCookieBanner();
    }

    // Expose utility globally
    window.SmartCityConsent = {
        getConsent,
        hasConsentForAnalytics: function () {
            const c = getConsent();
            if (!c) return false;
            try {
                const parsed = JSON.parse(c);
                return parsed.choice === "all";
            } catch (e) {
                return false;
            }
        }
    };
})();
