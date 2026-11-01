const zlib = require('zlib');
const assert = require('assert');

// Test gzip compression on sample payload
const payload = JSON.stringify({ message: "Hello SmartCity AI Gorakhpur", data: new Array(100).fill("Telemetric sensor data point") });
const originalBuffer = Buffer.from(payload);
const compressed = zlib.gzipSync(originalBuffer, { level: 6 });

console.log("Original size:", originalBuffer.length, "bytes");
console.log("Compressed size:", compressed.length, "bytes");
console.log("Reduction:", Math.round((1 - compressed.length / originalBuffer.length) * 100) + "%");

assert(compressed.length < originalBuffer.length, "Compressed size must be smaller");

// Verify decompression
const decompressed = zlib.gunzipSync(compressed).toString('utf8');
assert.strictEqual(decompressed, payload, "Decompressed must match original");

console.log("Compression verification: PASSED!");

