/**
 * SmartCity AI - Development Frontend Server with API Proxy
 * Mimics Nginx container behavior on Port 3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND_TARGET = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function proxyRequest(req, res, targetUrl) {
    const target = new URL(targetUrl);
    const options = {
        hostname: target.hostname,
        port: target.port,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: target.host
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend gateway unreachable', details: err.message }));
    });

    req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
    // 1. Proxy API, uploads, and socket.io to backend (port 5000)
    if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/') || req.url.startsWith('/socket.io/')) {
        return proxyRequest(req, res, BACKEND_TARGET);
    }

    // 2. Serve static frontend files
    let reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
    }

    const filePath = path.join(FRONTEND_DIR, reqPath);

    // Security: avoid path traversal
    if (!filePath.startsWith(FRONTEND_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Access Denied');
    }

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            return fs.createReadStream(filePath).pipe(res);
        }

        // Try appending index.html for directories
        const dirIndex = path.join(filePath, 'index.html');
        fs.stat(dirIndex, (err2, stats2) => {
            if (!err2 && stats2.isFile()) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                return fs.createReadStream(dirIndex).pipe(res);
            }

            // SPA Fallback to index.html if not an asset request
            if (!path.extname(reqPath)) {
                const fallback = path.join(FRONTEND_DIR, 'index.html');
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                return fs.createReadStream(fallback).pipe(res);
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File Not Found');
        });
    });
});

server.listen(PORT, () => {
    console.log(`🌐 [Frontend Server] Running at http://localhost:${PORT}`);
    console.log(`🔀 [Frontend Proxy] Forwarding /api/ requests to ${BACKEND_TARGET}`);
});

process.on('SIGINT', () => {
    server.close(() => process.exit(0));
});

module.exports = server;
