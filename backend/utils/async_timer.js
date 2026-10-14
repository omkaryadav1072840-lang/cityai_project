/**
 * SmartCity AI - Safe Asynchronous Interval Utility
 * Prevents unhandled promise rejections in periodic simulation loops
 * and prevents interval overlap if a DB query takes longer than the interval.
 */

function safeAsyncInterval(asyncFn, intervalMs, errorLogger = console.error) {
    let isRunning = false;

    const timerId = setInterval(async () => {
        // Prevent overlapping executions if previous tick is still awaiting DB
        if (isRunning) return;
        isRunning = true;

        try {
            await asyncFn();
        } catch (err) {
            if (typeof errorLogger === "function") {
                errorLogger("⚠️ [SafeAsyncInterval Error]:", err.message || err);
            }
        } finally {
            isRunning = false;
        }
    }, intervalMs);

    // Unref so test suites can exit cleanly
    if (timerId.unref) {
        timerId.unref();
    }

    return timerId;
}

module.exports = { safeAsyncInterval };
