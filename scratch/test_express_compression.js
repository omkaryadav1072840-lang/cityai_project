const express = require('../backend/node_modules/express');
const zlib = require('zlib');
const assert = require('assert');
const { Readable } = require('stream');

const app = express();

// Middleware under test
app.use((req, res, next) => {
    const accept = req.headers["accept-encoding"] || "";
    if (!accept.includes("gzip") && !accept.includes("deflate")) return next();

    const oldSend = res.send;
    res.send = function (body) {
        if (res.headersSent || !body) return oldSend.call(this, body);
        if (res.getHeader("Content-Encoding")) return oldSend.call(this, body);

        let buf;
        if (Buffer.isBuffer(body)) {
            buf = body;
        } else if (typeof body === "string") {
            buf = Buffer.from(body);
        } else if (typeof body === "object") {
            buf = Buffer.from(JSON.stringify(body));
            res.setHeader("Content-Type", "application/json; charset=utf-8");
        } else {
            return oldSend.call(this, body);
        }

        if (buf.length < 1024) return oldSend.call(this, body);

        const useGzip = accept.includes("gzip");
        try {
            const compressed = useGzip ? zlib.gzipSync(buf, { level: 6 }) : zlib.deflateSync(buf, { level: 6 });
            res.setHeader("Content-Encoding", useGzip ? "gzip" : "deflate");
            res.setHeader("Content-Length", compressed.length);
            return res.end(compressed);
        } catch (e) {
            return oldSend.call(this, body);
        }
    };
    next();
});

app.get('/large', (req, res) => {
    res.json({ data: new Array(150).fill("Telemetric sensor data point") });
});

app.get('/small', (req, res) => {
    res.json({ ok: true });
});

function testCall(path, acceptHeader) {
    return new Promise((resolve) => {
        const req = new Readable();
        req._read = () => {};
        req.method = 'GET';
        req.url = path;
        req.headers = { host: 'localhost' };
        if (acceptHeader) req.headers['accept-encoding'] = acceptHeader;
        req.push(null);

        let statusCode = 200;
        const resHeaders = {};
        const chunks = [];

        const res = {
            statusCode: 200,
            setHeader: (k, v) => { resHeaders[k.toLowerCase()] = v; },
            getHeader: (k) => resHeaders[k.toLowerCase()],
            removeHeader: (k) => { delete resHeaders[k.toLowerCase()]; },
            status: function(c) { statusCode = c; this.statusCode = c; return this; },
            send: function(d) {
                this.end(Buffer.isBuffer(d) ? d : Buffer.from(typeof d === 'object' ? JSON.stringify(d) : String(d)));
            },
            end: function(chunk) {
                if (chunk) chunks.push(Buffer.from(chunk));
                resolve({ status: statusCode, headers: resHeaders, body: Buffer.concat(chunks) });
            }
        };

        app.handle(req, res);
    });
}

async function run() {
    // 1. Large with gzip
    const res1 = await testCall('/large', 'gzip, deflate');
    assert.strictEqual(res1.headers['content-encoding'], 'gzip', "Should be gzip compressed");
    const unzipped = zlib.gunzipSync(res1.body).toString('utf8');
    assert(unzipped.includes("Telemetric sensor data point"), "Payload matches");
    console.log("Large with gzip: PASSED! Compressed size:", res1.body.length, "bytes");

    // 2. Large without gzip
    const res2 = await testCall('/large', '');
    assert.strictEqual(res2.headers['content-encoding'], undefined, "Should not be compressed");
    assert(res2.body.length > res1.body.length, "Uncompressed is larger");
    console.log("Large without gzip: PASSED! Uncompressed size:", res2.body.length, "bytes");

    // 3. Small with gzip
    const res3 = await testCall('/small', 'gzip, deflate');
    assert.strictEqual(res3.headers['content-encoding'], undefined, "Small payload should not be compressed");
    console.log("Small with gzip: PASSED! Skipped compression for tiny response");

    console.log("\nAll compression tests passed!");
}

run();
