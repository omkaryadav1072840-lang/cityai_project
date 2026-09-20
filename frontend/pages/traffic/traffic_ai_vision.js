/**
 * SmartCity AI Traffic Platform - CCTV Video & Computer Vision Emulator
 * Generates synthetic traffic camera feeds with animated vehicles,
 * real-time YOLO object detection bounding boxes, and radar telemetry.
 *
 * NOTE: Explicitly marked as SIMULATED DEMO STREAM / AI EMULATION.
 */

class TrafficAIVisionCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.animationId = null;
        this.vehicles = [];
        this.cameraName = "Golghar North - Sadar Road Cam";
        this.junctionName = "Golghar Central Crossing";
        this.resolution = "1080p FHD";
        this.density = 48;
        this.avgSpeed = 22.0;
        this.scanLineY = 0;
        this.scanDir = 1;
        this.lastTime = Date.now();
        this.frameCount = 0;
        this.fps = 30;
        this.fpsTimer = Date.now();

        this.vehicleTypes = [
            { type: 'Car', color: '#38bdf8', w: 38, h: 22, maxSpeed: 45 },
            { type: 'Auto-Rickshaw', color: '#facc15', w: 28, h: 20, maxSpeed: 35 },
            { type: 'Two-Wheeler', color: '#a3e635', w: 16, h: 10, maxSpeed: 50 },
            { type: 'Bus', color: '#f87171', w: 65, h: 30, maxSpeed: 30 },
            { type: 'Truck', color: '#c084fc', w: 58, h: 26, maxSpeed: 28 }
        ];

        this.initVehicles();
    }

    initVehicles() {
        this.vehicles = [];
        const count = 7;
        for (let i = 0; i < count; i++) {
            this.spawnVehicle(true);
        }
    }

    spawnVehicle(randomX = false) {
        if (!this.canvas) return;
        const vType = this.vehicleTypes[Math.floor(Math.random() * this.vehicleTypes.length)];
        const lane = Math.random() < 0.5 ? 1 : 2; // Lane 1 or Lane 2
        const direction = lane === 1 ? 1 : -1; // Going down or up

        const laneY = lane === 1
            ? this.canvas.height * 0.45 + (Math.random() * 40 - 20)
            : this.canvas.height * 0.65 + (Math.random() * 40 - 20);

        const x = randomX
            ? Math.random() * this.canvas.width
            : (direction === 1 ? -60 : this.canvas.width + 60);

        const speed = (direction * (1.2 + Math.random() * 1.8));

        this.vehicles.push({
            type: vType.type,
            color: vType.color,
            w: vType.w,
            h: vType.h,
            x: x,
            y: laneY,
            speed: speed,
            direction: direction,
            confidence: (0.82 + Math.random() * 0.16).toFixed(2),
            speedKmh: Math.round(this.avgSpeed + (Math.random() * 12 - 6)),
            id: `V-${Math.floor(100 + Math.random() * 900)}`
        });
    }

    setCamera(cameraData, junctionName) {
        if (!cameraData) return;
        this.cameraName = cameraData.name || cameraData.camera_name || "Gorakhpur Urban CCTV";
        this.junctionName = junctionName || cameraData.junction_name || "Central Sector";
        this.resolution = cameraData.resolution || "1080p FHD";
        this.density = cameraData.vehicles_per_min || 45;
        this.avgSpeed = parseFloat(cameraData.avg_speed) || 24.0;
    }

    start() {
        if (!this.canvas || !this.ctx) return;
        const animate = () => {
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Calculate FPS
        this.frameCount++;
        if (Date.now() - this.fpsTimer >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = Date.now();
        }

        // 1. Draw Road Background & Asphalt
        ctx.fillStyle = "#0c1322";
        ctx.fillRect(0, 0, w, h);

        // Asphalt Corridor
        const roadTop = h * 0.32;
        const roadHeight = h * 0.48;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, roadTop, w, roadHeight);

        // Road Curb lines
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, roadTop);
        ctx.lineTo(w, roadTop);
        ctx.moveTo(0, roadTop + roadHeight);
        ctx.lineTo(w, roadTop + roadHeight);
        ctx.stroke();

        // Dashed Lane Dividers
        ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 14]);
        ctx.beginPath();
        ctx.moveTo(0, roadTop + roadHeight * 0.5);
        ctx.lineTo(w, roadTop + roadHeight * 0.5);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // 2. Animate and Render Vehicles with AI Bounding Boxes
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const v = this.vehicles[i];
            v.x += v.speed;

            // Remove if off-screen and spawn new
            if (v.direction === 1 && v.x > w + 80) {
                this.vehicles.splice(i, 1);
                this.spawnVehicle(false);
                continue;
            } else if (v.direction === -1 && v.x < -80) {
                this.vehicles.splice(i, 1);
                this.spawnVehicle(false);
                continue;
            }

            // Draw Vehicle Silhouette
            ctx.fillStyle = v.color;
            ctx.beginPath();
            ctx.roundRect(v.x, v.y, v.w, v.h, 4);
            ctx.fill();

            // Vehicle Headlights
            ctx.fillStyle = v.direction === 1 ? "rgba(254, 240, 138, 0.6)" : "rgba(239, 68, 68, 0.6)";
            const lightX = v.direction === 1 ? v.x + v.w : v.x;
            ctx.beginPath();
            ctx.arc(lightX, v.y + 4, 2.5, 0, Math.PI * 2);
            ctx.arc(lightX, v.y + v.h - 4, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // 3. Draw AI YOLO Object Detection Bounding Box
            const pad = 4;
            const bx = v.x - pad;
            const by = v.y - pad;
            const bw = v.w + pad * 2;
            const bh = v.h + pad * 2;

            ctx.strokeStyle = "#10b981"; // Emerald green detection box
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, bw, bh);

            // Bounding Corner Accents
            const cornerLen = 5;
            ctx.strokeStyle = "#34d399";
            ctx.lineWidth = 2.5;

            // Top-left
            ctx.beginPath();
            ctx.moveTo(bx, by + cornerLen);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + cornerLen, by);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(bx + bw, by + bh - cornerLen);
            ctx.lineTo(bx + bw, by + bh);
            ctx.lineTo(bx + bw - cornerLen, by + bh);
            ctx.stroke();

            // Detection Label
            ctx.fillStyle = "rgba(6, 78, 59, 0.9)";
            ctx.fillRect(bx, by - 16, bw + 14, 15);

            ctx.fillStyle = "#ecfdf5";
            ctx.font = "bold 9px system-ui, sans-serif";
            ctx.fillText(`${v.type} ${Math.round(v.confidence * 100)}% | ${v.speedKmh}kph`, bx + 2, by - 5);
        }

        // 4. Sweeping AI Laser Radar Line
        this.scanLineY += this.scanDir * 1.5;
        if (this.scanLineY > h * 0.8) this.scanDir = -1;
        if (this.scanLineY < h * 0.2) this.scanDir = 1;

        const scanGrad = ctx.createLinearGradient(0, this.scanLineY - 15, 0, this.scanLineY + 15);
        scanGrad.addColorStop(0, "rgba(16, 185, 129, 0)");
        scanGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.25)");
        scanGrad.addColorStop(1, "rgba(16, 185, 129, 0)");

        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, this.scanLineY - 15, w, 30);

        ctx.strokeStyle = "rgba(52, 211, 153, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.scanLineY);
        ctx.lineTo(w, this.scanLineY);
        ctx.stroke();

        // 5. Video HUD / OSD Overlay (On-Screen Display)
        // Red REC Dot
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(20, 22, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.fillText("LIVE CCTV", 34, 26);

        // Required Label: Clear Simulation Disclosure
        ctx.fillStyle = "#fbbf24"; // Amber warning badge
        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillText("[ SIMULATED DEMO STREAM / AI COMPUTER VISION ]", 115, 26);

        // Timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const dateStr = now.toISOString().split('T')[0];
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px monospace";
        ctx.fillText(`${dateStr} ${timeStr}`, w - 160, 26);

        // Camera Details Bar
        ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
        ctx.fillRect(10, h - 38, w - 20, 28);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.strokeRect(10, h - 38, w - 20, 28);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillText(`CAM: ${this.cameraName}`, 22, h - 20);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText(`JNC: ${this.junctionName}`, 250, h - 20);
        ctx.fillText(`FPS: ${this.fps} (${this.resolution})`, 440, h - 20);
        ctx.fillText(`FLOW: ${this.density} veh/min`, 570, h - 20);
        ctx.fillText(`AVG SPD: ${this.avgSpeed} km/h`, 680, h - 20);
    }
}

window.TrafficAIVisionCanvas = TrafficAIVisionCanvas;
