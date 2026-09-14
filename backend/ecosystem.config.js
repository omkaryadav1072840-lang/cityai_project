/**
 * SmartCity AI - PM2 Production Ecosystem Configuration
 * -----------------------------------------------------
 * For VM, VPS, and Bare-Metal deployments using PM2.
 * Run via: pm2 start ecosystem.config.js --env production
 */

module.exports = {
    apps: [
        {
            name: "smartcity-api",
            script: "server.js",
            cwd: __dirname,
            instances: 1, // Fork mode recommended because of stateful Socket.IO connections & simulator
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 8000,
            env: {
                NODE_ENV: "development",
                PORT: 5000
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 5000,
                SIMULATE_AMBULANCES: "true"
            },
            error_file: "logs/pm2-error.log",
            out_file: "logs/pm2-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true
        }
    ]
};
