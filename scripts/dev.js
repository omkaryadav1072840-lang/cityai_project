/**
 * SmartCity AI - Master Development Orchestrator
 * Starts Frontend, Backend Gateway, and Python AI Service automatically
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('========================================================');
console.log('  🚀 Starting SmartCity AI Master Full-Stack Platform');
console.log('========================================================\n');

const ROOT_DIR = path.join(__dirname, '..');
const children = [];

function startProcess(name, command, args, cwd) {
    console.log(`[${name}] Starting: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
        cwd: cwd || ROOT_DIR,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' }
    });

    proc.on('error', (err) => {
        console.warn(`⚠️ [${name}] Process error:`, err.message);
    });

    proc.on('exit', (code, signal) => {
        if (signal) {
            console.log(`🛑 [${name}] Stopped via signal ${signal}`);
        } else if (code !== 0 && code !== null) {
            console.warn(`⚠️ [${name}] Exited with code ${code}`);
        }
    });

    children.push({ name, proc });
    return proc;
}

// 1. Launch Node.js Backend Gateway & Express Server (Port 5000)
const backendProc = startProcess('Backend-5000', 'node', ['backend/server.js'], ROOT_DIR);

// 2. Launch Dedicated Frontend Static Server & Reverse Proxy (Port 3000)
const frontendProc = startProcess('Frontend-3000', 'node', ['scripts/serve_frontend.js'], ROOT_DIR);

// 3. Launch Python FastAPI AI Intelligence Layer (Port 8000) if python is present
const aiServiceDir = path.join(ROOT_DIR, 'ai_service');
const aiProc = startProcess('FastAPI-8000', 'python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], aiServiceDir);

// Summary Banner
setTimeout(() => {
    console.log('\n========================================================');
    console.log('  ✨ SmartCity AI Full-Stack Platform is ACTIVE:');
    console.log('  - 🌐 Frontend Portal (Nginx style): http://localhost:3000');
    console.log('  - 🚀 Node.js Gateway & Portal:     http://localhost:5000');
    console.log('  - 📡 Socket.IO Realtime Telemetry: ws://localhost:5000/socket.io/');
    console.log('  - 🤖 Python AI Service (FastAPI):  http://127.0.0.1:8000/docs');
    console.log('  - 🐳 Docker Multi-Container Mode:  npm run docker:up');
    console.log('  - 🧪 Run Full Verification Suite:   npm test');
    console.log('========================================================\n');
}, 3500);

// Graceful multi-process cleanup
function cleanup() {
    console.log('\n🛑 Shutting down all SmartCity AI child processes...');
    for (const { name, proc } of children) {
        try {
            if (process.platform === 'win32' && proc.pid) {
                spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { stdio: 'ignore' });
            } else {
                proc.kill('SIGINT');
            }
        } catch (e) {}
    }
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
