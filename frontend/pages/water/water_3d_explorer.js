/**
 * SmartCity AI - 3D Pipeline Explorer & Digital Twin
 * Interactive Three.js WebGL Engine for Gorakhpur Hydraulic Network
 * Aligned with Leaflet 2D coordinates, shared stable Asset IDs,
 * directional freshwater/sewage/reclaimed flow pulses, licensed glTF assets
 * (Pump, Motor, Valve, Control Tower) with high-fidelity procedural fallbacks,
 * and clear MEASURED / SIMULATED / UNKNOWN data provenance.
 */

(function (window, document) {
    "use strict";

    const CENTER_LAT = 26.7606;
    const CENTER_LNG = 83.3732;
    const GEO_SCALE = 24000; // Converts lat/lng degree delta to 3D world units

    let container = null;
    let scene = null;
    let camera = null;
    let renderer = null;
    let controls = null;
    let animationFrameId = null;

    // Interactive Mesh Registries
    const nodeMeshes = [];
    const pipeMeshes = [];
    const roadMeshes = [];
    const flangeMeshes = [];
    const junctionBeacons = [];
    const flowParticles = [];
    const rotatingElements = [];
    let hoveredMesh = null;
    let selectedMesh = null;
    let monsoonSurgeActive = false;

    // GLTF Model Cache & Loader
    const modelCache = {};
    let gltfLoaderInstance = null;

    // Layer Visibilities
    const layerVisibility = {
        potable: true,
        wastewater: true,
        reclaimed: true,
        stormwater: true,
        assets: true,
        flowAnimation: true,
        sewageRoute: true
    };
    let plannedSewageGroup = null;
    let verticalExaggeration = 2.0;
    let lastTopologyData = null;
    let lastRouteData = null;

    // Coordinate Projection: (lat, lng, elev, depthMeters) -> THREE.Vector3
    function geoTo3D(lat, lng, elev = 80, depthMeters = 0) {
        const x = (Number(lng) - CENTER_LNG) * GEO_SCALE;
        const z = -(Number(lat) - CENTER_LAT) * GEO_SCALE;
        const y = (Number(elev) - 80) * 0.4 - (Number(depthMeters) * 1.5 * verticalExaggeration);
        return new THREE.Vector3(x, y, z);
    }

    /**
     * Lazy instantiate Three.js GLTFLoader if script is present
     */
    function getGLTFLoader() {
        if (!gltfLoaderInstance && typeof THREE !== "undefined" && typeof THREE.GLTFLoader !== "undefined") {
            try {
                gltfLoaderInstance = new THREE.GLTFLoader();
            } catch (e) {
                console.warn("[Water3DExplorer] Failed to instantiate GLTFLoader:", e);
            }
        }
        return gltfLoaderInstance;
    }

    /**
     * Load glTF asset asynchronously with instant procedural fallback
     */
    function loadGLTFAsset(modelType, fallbackGenerator, onLoaded) {
        const relativeMap = {
            pump: ["../../assets/models/water/pump.gltf", "/assets/models/water/pump.gltf", "/frontend/assets/models/water/pump.gltf"],
            motor: ["../../assets/models/water/motor.gltf", "/assets/models/water/motor.gltf", "/frontend/assets/models/water/motor.gltf"],
            valve: ["../../assets/models/water/valve.gltf", "/assets/models/water/valve.gltf", "/frontend/assets/models/water/valve.gltf"],
            control_tower: ["../../assets/models/water/control_tower.gltf", "/assets/models/water/control_tower.gltf", "/frontend/assets/models/water/control_tower.gltf"]
        };

        // 1. Check in-memory cache
        if (modelCache[modelType]) {
            const clone = modelCache[modelType].clone(true);
            onLoaded(clone, "GLTF_CACHED");
            return;
        }

        const loader = getGLTFLoader();
        if (!loader) {
            // No GLTFLoader available in environment, use procedural fallback immediately
            const procedural = fallbackGenerator();
            onLoaded(procedural, "PROCEDURAL_FALLBACK");
            return;
        }

        const candidatePaths = relativeMap[modelType] || [];
        let didSucceed = false;

        function attempt(idx) {
            if (idx >= candidatePaths.length) {
                // All paths failed or blocked, invoke procedural fallback
                const fallbackMesh = fallbackGenerator();
                onLoaded(fallbackMesh, "PROCEDURAL_FALLBACK");
                return;
            }

            loader.load(
                candidatePaths[idx],
                gltf => {
                    if (didSucceed) return;
                    didSucceed = true;
                    modelCache[modelType] = gltf.scene;
                    const cloned = gltf.scene.clone(true);
                    onLoaded(cloned, "GLTF_LOADED");
                },
                undefined,
                err => {
                    // Try next candidate URL
                    attempt(idx + 1);
                }
            );
        }

        attempt(0);
    }

    /**
     * HIGH-FIDELITY PROCEDURAL FALLBACKS
     * Licensed and crafted specifically for Gorakhpur digital twin
     */
    function createProceduralPump() {
        const group = new THREE.Group();
        group.name = "procedural_pump";

        // Cast-iron skid base
        const skidGeo = new THREE.BoxGeometry(7, 1, 4.5);
        const skidMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
        const skid = new THREE.Mesh(skidGeo, skidMat);
        skid.position.y = 0.5;
        group.add(skid);

        // Volute casing
        const voluteGeo = new THREE.CylinderGeometry(3.2, 3.6, 2.8, 20);
        voluteGeo.rotateZ(Math.PI / 2);
        const voluteMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.6 });
        const volute = new THREE.Mesh(voluteGeo, voluteMat);
        volute.position.set(1.2, 3.2, 0);
        group.add(volute);

        // Suction nozzle (front)
        const suctionGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 16);
        suctionGeo.rotateX(Math.PI / 2);
        const flangeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.7 });
        const suction = new THREE.Mesh(suctionGeo, flangeMat);
        suction.position.set(1.2, 3.2, 2.0);
        group.add(suction);

        // Discharge nozzle (top)
        const dischargeGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.4, 16);
        const discharge = new THREE.Mesh(dischargeGeo, flangeMat);
        discharge.position.set(1.2, 5.0, 0);
        group.add(discharge);

        // Electric motor section
        const motorGeo = new THREE.CylinderGeometry(2.2, 2.2, 4.0, 16);
        motorGeo.rotateZ(Math.PI / 2);
        const motorMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4, metalness: 0.5 });
        const motor = new THREE.Mesh(motorGeo, motorMat);
        motor.position.set(-2.2, 3.2, 0);
        group.add(motor);

        return group;
    }

    function createProceduralMotor() {
        const group = new THREE.Group();
        group.name = "procedural_motor";

        // Steel base
        const baseGeo = new THREE.BoxGeometry(6, 0.8, 4);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.4;
        group.add(base);

        // Cylindrical stator
        const statorGeo = new THREE.CylinderGeometry(2.4, 2.4, 5.2, 20);
        statorGeo.rotateZ(Math.PI / 2);
        const statorMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.65 });
        const stator = new THREE.Mesh(statorGeo, statorMat);
        stator.position.set(0, 3.0, 0);
        group.add(stator);

        // Terminal box on top
        const tBoxGeo = new THREE.BoxGeometry(1.6, 1.2, 1.6);
        const tBoxMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.4 });
        const tBox = new THREE.Mesh(tBoxGeo, tBoxMat);
        tBox.position.set(0, 5.8, 0);
        group.add(tBox);

        // Shaft
        const shaftGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.0, 12);
        shaftGeo.rotateZ(Math.PI / 2);
        const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.9 });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set(3.4, 3.0, 0);
        group.add(shaft);

        return group;
    }

    function createProceduralValve() {
        const group = new THREE.Group();
        group.name = "procedural_valve";

        // Spherical valve body
        const bodyGeo = new THREE.SphereGeometry(2.4, 16, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.35, metalness: 0.65 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 2.8, 0);
        group.add(body);

        // Connecting pipe flanges
        const flangeGeo = new THREE.CylinderGeometry(1.8, 1.8, 4.6, 16);
        flangeGeo.rotateZ(Math.PI / 2);
        const flangeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.7 });
        const flange = new THREE.Mesh(flangeGeo, flangeMat);
        flange.position.set(0, 2.8, 0);
        group.add(flange);

        // Valve stem & bonnet
        const stemGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.8, 12);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 5.4, 0);
        group.add(stem);

        // Actuator handwheel / automated servo
        const wheelGeo = new THREE.TorusGeometry(1.6, 0.3, 12, 24);
        wheelGeo.rotateX(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.5 });
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(0, 6.8, 0);
        group.add(wheel);

        return group;
    }

    function createProceduralControlTower() {
        const group = new THREE.Group();
        group.name = "procedural_control_tower";

        // Hexagonal concrete foundation
        const baseGeo = new THREE.CylinderGeometry(7, 8, 3, 6);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.2 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 1.5;
        group.add(base);

        // Tower shaft
        const shaftGeo = new THREE.CylinderGeometry(3.5, 5, 20, 8);
        const shaftMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.5 });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.y = 13;
        group.add(shaft);

        // Observation / SCADA control gallery
        const galleryGeo = new THREE.CylinderGeometry(7.5, 6, 5, 12);
        const galleryMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.85,
            roughness: 0.1,
            metalness: 0.9
        });
        const gallery = new THREE.Mesh(galleryGeo, galleryMat);
        gallery.position.y = 24.5;
        group.add(gallery);

        // Telemetry mast & rotating radar dish
        const mastGeo = new THREE.CylinderGeometry(0.5, 0.5, 7, 8);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.y = 30.5;
        group.add(mast);

        const dishGeo = new THREE.CylinderGeometry(2.5, 0.4, 0.8, 16);
        dishGeo.rotateZ(Math.PI / 4);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.6 });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.set(0, 34, 0);
        group.add(dish);
        group.userData.rotatingDish = dish;

        return group;
    }

    /**
     * Initialize Three.js Scene
     */
    function init3DExplorer() {
        container = document.getElementById("water3DCanvasContainer");
        if (!container) return;

        // Container dimensions
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 500;

        // 1. Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x070e1e); // Dark hydraulic night navy
        scene.fog = new THREE.FogExp2(0x070e1e, 0.0032);

        // 2. Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
        camera.position.set(0, 180, 260);

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Clear existing canvas
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 4. OrbitControls
        if (typeof THREE.OrbitControls !== "undefined") {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera sinking under ground
            controls.minDistance = 15;
            controls.maxDistance = 750;
            controls.target.set(0, 0, 0);
        }

        // 5. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.25);
        dirLight.position.set(140, 220, 90);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const secondaryLight = new THREE.DirectionalLight(0x10b981, 0.55);
        secondaryLight.position.set(-140, 120, -90);
        scene.add(secondaryLight);

        // 6. Ground Reference Grid
        const gridHelper = new THREE.GridHelper(450, 45, 0x1e3a8a, 0x1e293b);
        gridHelper.position.y = -2;
        scene.add(gridHelper);

        // Subterranean ground terrain plane
        const planeGeo = new THREE.PlaneGeometry(650, 650);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0x050b18,
            roughness: 0.95,
            metalness: 0.05
        });
        const ground = new THREE.Mesh(planeGeo, planeMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2.5;
        ground.receiveShadow = true;
        scene.add(ground);

        // 7. Group for Planned Sewage Routes
        plannedSewageGroup = new THREE.Group();
        plannedSewageGroup.name = "plannedSewageGroup";
        scene.add(plannedSewageGroup);

        // 8. Raycasting for Interaction
        setupRaycaster();

        // 9. Window resize
        window.addEventListener("resize", onWindowResize);

        // Start render loop
        animate();
    }

    /**
     * Floating Road Corridor Label Billboard
     */
    function createRoadSprite(name, lanes = 4) {
        const canvas = document.createElement("canvas");
        canvas.width = 340;
        canvas.height = 70;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        if (ctx.roundRect) ctx.roundRect(4, 4, 332, 62, 10);
        else ctx.fillRect(4, 4, 332, 62);
        ctx.fill();

        ctx.strokeStyle = lanes === 4 ? "#facc15" : "#94a3b8";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cleanName = (name || "").length > 25 ? name.slice(0, 23) + ".." : (name || "Gorakhpur Road");
        ctx.fillText(`🛣️ ${cleanName}`, 170, 24);

        ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = lanes === 4 ? "#facc15" : "#38bdf8";
        ctx.fillText(`${lanes}-Lane Arterial • Dual Verge Pipelines (Potable + Sewer)`, 170, 48);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(19, 3.9, 1);
        return sprite;
    }

    /**
     * Floating SCADA Junction Control Hub Billboard
     */
    function createJunctionSprite(id, label) {
        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(11, 19, 43, 0.95)";
        if (ctx.roundRect) ctx.roundRect(4, 4, 352, 88, 12);
        else ctx.fillRect(4, 4, 352, 88);
        ctx.fill();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = "bold 19px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`🎛️ SCADA CONTROL HUB: ${id}`, 180, 26);

        ctx.font = "600 13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        const cleanName = (label || "").length > 28 ? label.slice(0, 26) + ".." : (label || "");
        ctx.fillText(cleanName, 180, 52);

        ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("● 1480 RPM | 1.1 mm/s Vib | 3.5 bar | AUTO", 180, 75);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(23, 6.1, 1);
        return sprite;
    }

    /**
     * Render 3D Asphalt Road Ribbon Corridor
     * Visible from above with dark pavement, lane markings, curbs, and title sprite
     */
    function render3DRoadCorridorRibbon(corridor) {
        if (!corridor || !scene) return;
        let pts = corridor.centerline_points || [];
        if (typeof pts === "string") {
            try { pts = JSON.parse(pts); } catch (e) { pts = []; }
        }
        if (!Array.isArray(pts) || pts.length < 2) return;

        // Convert lat/lng to 3D points at ground surface level Y = 0.05
        const pts3D = pts.map(pt => {
            const v = geoTo3D(pt.lat, pt.lng, 80, 0);
            v.y = 0.05;
            return v;
        });

        // Smooth curve interpolation
        const curve = new THREE.CatmullRomCurve3(pts3D);
        curve.curveType = "catmullrom";
        curve.tension = 0.5;

        const numSteps = Math.max(28, pts3D.length * 10);
        const sampledPoints = curve.getPoints(numSteps);

        // Road width calculation (world units)
        const laneCount = Number(corridor.lane_count || 4);
        const widthM = Number(corridor.width_m || (laneCount === 2 ? 16 : 24));
        const halfWidth = Math.max(3.8, (widthM / 2.0) * 0.42);

        // Build ribbon quad strip geometry
        const vertices = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= numSteps; i++) {
            const currentPt = sampledPoints[i];
            let tangent;
            if (i === 0) {
                tangent = new THREE.Vector3().subVectors(sampledPoints[1], sampledPoints[0]).normalize();
            } else if (i === numSteps) {
                tangent = new THREE.Vector3().subVectors(sampledPoints[numSteps], sampledPoints[numSteps - 1]).normalize();
            } else {
                tangent = new THREE.Vector3().subVectors(sampledPoints[i + 1], sampledPoints[i - 1]).normalize();
            }

            // Normal vector perpendicular in horizontal plane
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            // Left and right road edge vertices
            const leftV = new THREE.Vector3().copy(currentPt).addScaledVector(normal, -halfWidth);
            const rightV = new THREE.Vector3().copy(currentPt).addScaledVector(normal, halfWidth);

            vertices.push(leftV.x, leftV.y, leftV.z);
            vertices.push(rightV.x, rightV.y, rightV.z);

            const vProgress = i / numSteps;
            uvs.push(0, vProgress);
            uvs.push(1, vProgress);

            if (i < numSteps) {
                const baseIdx = i * 2;
                indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
                indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
            }
        }

        const roadGeo = new THREE.BufferGeometry();
        roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        roadGeo.setIndex(indices);
        roadGeo.computeVertexNormals();

        // High-grade asphalt pavement material
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.88,
            metalness: 0.12,
            transparent: true,
            opacity: 0.94,
            side: THREE.DoubleSide
        });

        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.receiveShadow = true;
        roadMesh.userData = { isRoad: true, corridorData: corridor };
        scene.add(roadMesh);
        roadMeshes.push(roadMesh);

        // Centerline Divider Line
        const centerLineGeo = new THREE.BufferGeometry().setFromPoints(
            sampledPoints.map(p => new THREE.Vector3(p.x, p.y + 0.08, p.z))
        );
        const centerLineMat = new THREE.LineDashedMaterial({
            color: laneCount === 4 ? 0xfacc15 : 0xe2e8f0,
            linewidth: 2,
            scale: 1,
            dashSize: 3,
            gapSize: 2
        });
        const centerLineMesh = new THREE.Line(centerLineGeo, centerLineMat);
        centerLineMesh.computeLineDistances();
        scene.add(centerLineMesh);
        roadMeshes.push(centerLineMesh);

        // Road Verge Curb Edges
        const leftCurbPts = [];
        const rightCurbPts = [];
        for (let i = 0; i <= numSteps; i++) {
            const baseIdx = i * 6;
            leftCurbPts.push(new THREE.Vector3(vertices[baseIdx], vertices[baseIdx + 1] + 0.06, vertices[baseIdx + 2]));
            rightCurbPts.push(new THREE.Vector3(vertices[baseIdx + 3], vertices[baseIdx + 4] + 0.06, vertices[baseIdx + 5]));
        }

        const curbMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
        const leftCurb = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftCurbPts), curbMat);
        const rightCurb = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightCurbPts), curbMat);
        scene.add(leftCurb);
        scene.add(rightCurb);
        roadMeshes.push(leftCurb, rightCurb);

        // Floating Road Title Billboard
        const midIdx = Math.floor(sampledPoints.length / 2);
        const midPt = sampledPoints[midIdx];
        const roadSprite = createRoadSprite(corridor.name || "Gorakhpur Arterial Road", laneCount);
        roadSprite.position.set(midPt.x, midPt.y + 14, midPt.z);
        scene.add(roadSprite);
        roadMeshes.push(roadSprite);
    }

    /**
     * 3D SCADA Multi-Pipe Hydraulic Junction Control Section
     * Station placed at junctions where 3 or more pipes join/intersect.
     * Features concrete plinth, manifold distributor, dual booster pumps & motors,
     * RTU console, pulsing LED status beacon, and interactive click modal trigger.
     */
    function create3DHydraulicJunctionControlHub(node, group) {
        group.userData.isJunctionHub = true;

        // 1. Concrete Octagonal Plinth Base
        const plinthGeo = new THREE.CylinderGeometry(15, 16.5, 2.6, 8);
        const plinthMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.85,
            metalness: 0.2
        });
        const plinth = new THREE.Mesh(plinthGeo, plinthMat);
        plinth.position.y = 1.3;
        plinth.receiveShadow = true;
        group.add(plinth);

        // 2. Yellow Caution Hazard Perimeter Ring
        const hazardGeo = new THREE.CylinderGeometry(16.5, 17.2, 0.4, 8);
        const hazardMat = new THREE.MeshStandardMaterial({
            color: 0xeab308,
            roughness: 0.4,
            metalness: 0.3
        });
        const hazard = new THREE.Mesh(hazardGeo, hazardMat);
        hazard.position.y = 0.2;
        group.add(hazard);

        // 3. Central Multi-Port Hydraulic Manifold Distributor Chamber
        const manifoldGeo = new THREE.CylinderGeometry(6.2, 7.0, 5.5, 16);
        const manifoldMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            metalness: 0.7,
            roughness: 0.25
        });
        const manifold = new THREE.Mesh(manifoldGeo, manifoldMat);
        manifold.position.y = 4.2;
        group.add(manifold);

        // 4. Six Radial Route Diverter Branch Nozzles & Actuator Valves
        for (let a = 0; a < 6; a++) {
            const angle = (a * Math.PI) / 3;
            // Nozzle tube
            const nozzleGeo = new THREE.CylinderGeometry(1.2, 1.2, 4.2, 12);
            nozzleGeo.rotateZ(Math.PI / 2);
            const nozzleMat = new THREE.MeshStandardMaterial({
                color: 0x475569,
                metalness: 0.75,
                roughness: 0.3
            });
            const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
            nozzle.position.set(Math.cos(angle) * 7.2, 4.2, Math.sin(angle) * 7.2);
            nozzle.rotation.y = -angle;
            group.add(nozzle);

            // Actuator valve servo handwheel
            const vWheelGeo = new THREE.TorusGeometry(0.85, 0.18, 8, 16);
            vWheelGeo.rotateX(Math.PI / 2);
            const vWheelMat = new THREE.MeshStandardMaterial({
                color: (a % 2 === 0) ? 0x10b981 : 0x0284c7,
                roughness: 0.35,
                metalness: 0.5
            });
            const vWheel = new THREE.Mesh(vWheelGeo, vWheelMat);
            vWheel.position.set(Math.cos(angle) * 7.8, 5.8, Math.sin(angle) * 7.8);
            group.add(vWheel);
        }

        // 5. Twin Booster Pumps & High-Torque SCADA Induction Motors on Skids
        loadGLTFAsset("pump", createProceduralPump, (loadedPump) => {
            loadedPump.scale.set(0.9, 0.9, 0.9);
            loadedPump.position.set(-8.5, 2.6, 0);
            group.add(loadedPump);
        });

        loadGLTFAsset("motor", createProceduralMotor, (loadedMotor) => {
            loadedMotor.scale.set(0.9, 0.9, 0.9);
            loadedMotor.position.set(8.5, 2.6, 0);
            group.add(loadedMotor);
        });

        // 6. SCADA RTU Automation Kiosk with Digital Telemetry Display
        const kioskGeo = new THREE.BoxGeometry(2.6, 6.0, 2.2);
        const kioskMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.8,
            roughness: 0.2
        });
        const kiosk = new THREE.Mesh(kioskGeo, kioskMat);
        kiosk.position.set(0, 4.3, 10.2);
        group.add(kiosk);

        const screenGeo = new THREE.PlaneGeometry(2.0, 2.2);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 5.0, 11.32);
        group.add(screen);

        // 7. Telemetry Mast with Animated Pulsing LED Status Beacon
        const mastGeo = new THREE.CylinderGeometry(0.35, 0.45, 11, 8);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.set(0, 11.5, 0);
        group.add(mast);

        const beaconGeo = new THREE.SphereGeometry(1.6, 16, 16);
        const beaconMat = new THREE.MeshStandardMaterial({
            color: monsoonSurgeActive ? 0xef4444 : 0x10b981,
            emissive: monsoonSurgeActive ? 0xb91c1c : 0x059669,
            emissiveIntensity: 0.85,
            roughness: 0.15
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(0, 17.5, 0);
        group.add(beacon);
        beacon.userData = { isJunctionBeacon: true };
        junctionBeacons.push(beacon);

        // 8. Overhead SCADA Floating Label Billboard Sprite
        const sprite = createJunctionSprite(node.id, node.name);
        sprite.position.set(0, 25, 0);
        group.add(sprite);
    }

    /**
     * Render 3D Network from Topology Data
     * Supports 3D Road Corridors, Dual Parallel Verges (Potable + Sewer),
     * Multi-Pipe SCADA Junction Control Stations, and Monsoon Surge Outfall dynamics.
     */
    function render3DTopology(topologyData) {
        if (!scene) init3DExplorer();
        if (!scene || !topologyData) return;
        lastTopologyData = topologyData;

        // Clear existing network meshes
        clearNetworkMeshes();

        const nodes = topologyData.nodes || [];
        const edges = topologyData.edges || [];
        const corridors = topologyData.corridors || [];
        const nodePositionMap = {};

        // 1. BUILD 3D ROAD CORRIDOR RIBBONS (Surface view with lane markings & verges)
        if (corridors.length > 0) {
            corridors.forEach(c => render3DRoadCorridorRibbon(c));
        } else {
            // Auto-group edges by road_name if corridors array was not populated
            const roadMap = {};
            edges.forEach(e => {
                if (e.road_name && !roadMap[e.road_name]) {
                    roadMap[e.road_name] = {
                        id: `ROAD-${Object.keys(roadMap).length + 1}`,
                        name: e.road_name,
                        lane_count: e.lane_count || 4,
                        width_m: e.road_width_m || 24,
                        centerline_points: Array.isArray(e.curve_points) && e.curve_points.length > 0
                            ? e.curve_points
                            : [{ lat: e.start_lat, lng: e.start_lng }, { lat: e.end_lat, lng: e.end_lng }]
                    };
                }
            });
            Object.values(roadMap).forEach(c => render3DRoadCorridorRibbon(c));
        }

        // 2. BUILD 3D NODES & MULTI-PIPE JUNCTION CONTROL SECTIONS
        nodes.forEach(node => {
            const pos = geoTo3D(node.lat, node.lng, node.elevation_m || 80);
            nodePositionMap[node.id] = pos;

            const group = new THREE.Group();
            group.position.copy(pos);
            group.userData = {
                isNode: true,
                nodeData: node,
                assetId: node.id,
                name: node.name,
                type: node.type,
                dataSource: node.data_source || (node.is_simulated ? "SIMULATED" : "MEASURED"),
                license: node.license_type || "MIT / CC0-1.0 (SmartCity Verified)"
            };

            const nodeType = String(node.type || "").toUpperCase();
            const provenance = group.userData.dataSource;
            const connectedPipes = edges.filter(e => e.source_node === node.id || e.target_node === node.id);
            const isMultiPipeJunction = node.id.startsWith("JNC-CTRL") ||
                                       nodeType.includes("JUNCTION") ||
                                       nodeType.includes("OUTLET") ||
                                       connectedPipes.length >= 3;

            if (isMultiPipeJunction) {
                // 3D SCADA Multi-Pipe Hydraulic Junction Control Station
                create3DHydraulicJunctionControlHub(node, group);

            } else if (nodeType === "TANK") {
                // Cylindrical Water Tank with Water Level Indicator
                const tankRadius = 6.5;
                const tankHeight = 14.0;

                const shellGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 24);
                const shellMat = new THREE.MeshStandardMaterial({
                    color: 0x0284c7,
                    metalness: 0.5,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.85
                });
                const shell = new THREE.Mesh(shellGeo, shellMat);
                shell.position.y = tankHeight / 2;
                group.add(shell);

                // Water Column inside
                const levelPct = Math.max(5, Math.min(100, Number(node.level_pct || 50))) / 100;
                const waterHeight = tankHeight * levelPct * 0.95;
                const waterGeo = new THREE.CylinderGeometry(tankRadius * 0.9, tankRadius * 0.9, waterHeight, 20);
                const waterMat = new THREE.MeshStandardMaterial({
                    color: node.level_pct < 30 ? 0xef4444 : 0x00f0ff,
                    emissive: node.level_pct < 30 ? 0x991b1b : 0x0369a1,
                    emissiveIntensity: 0.4,
                    roughness: 0.1
                });
                const waterCol = new THREE.Mesh(waterGeo, waterMat);
                waterCol.position.y = waterHeight / 2;
                group.add(waterCol);

                // Pillar supports
                const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 8, 8);
                const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
                for (let a = 0; a < 4; a++) {
                    const angle = (a * Math.PI) / 2;
                    const p = new THREE.Mesh(pillarGeo, pillarMat);
                    p.position.set(Math.cos(angle) * 4.5, 4, Math.sin(angle) * 4.5);
                    group.add(p);
                }

                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);

            } else if (nodeType === "TREATMENT_PLANT_STP" || nodeType === "TREATMENT_PLANT_WTP") {
                // STP / WTP Plant Complex
                const isSTP = nodeType === "TREATMENT_PLANT_STP";
                const baseGeo = new THREE.BoxGeometry(22, 5, 18);
                const baseMat = new THREE.MeshStandardMaterial({
                    color: isSTP ? 0x8b5cf6 : 0x0ea5e9,
                    metalness: 0.3,
                    roughness: 0.4
                });
                const building = new THREE.Mesh(baseGeo, baseMat);
                building.position.y = 2.5;
                group.add(building);

                // Circular Clarifier Tank
                const clarifierGeo = new THREE.CylinderGeometry(8, 8, 3, 24);
                const clarifierMat = new THREE.MeshStandardMaterial({
                    color: isSTP ? 0x581c87 : 0x0369a1,
                    roughness: 0.2
                });
                const clarifier = new THREE.Mesh(clarifierGeo, clarifierMat);
                clarifier.position.set(16, 1.5, 0);
                group.add(clarifier);

                // Rotating Clarifier Arm
                const armGeo = new THREE.BoxGeometry(15, 0.6, 0.6);
                const armMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
                const arm = new THREE.Mesh(armGeo, armMat);
                arm.position.set(16, 3.2, 0);
                group.add(arm);
                rotatingElements.push(arm);

                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);

            } else if (nodeType === "BOOSTER_PUMP" || nodeType === "PUMP") {
                loadGLTFAsset("pump", createProceduralPump, (loadedMesh, loadStatus) => {
                    loadedMesh.scale.set(1.4, 1.4, 1.4);
                    group.add(loadedMesh);
                    group.userData.modelStatus = loadStatus;
                });
                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);

            } else if (nodeType === "MOTOR") {
                loadGLTFAsset("motor", createProceduralMotor, (loadedMesh, loadStatus) => {
                    loadedMesh.scale.set(1.3, 1.3, 1.3);
                    group.add(loadedMesh);
                    group.userData.modelStatus = loadStatus;
                });
                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);

            } else if (nodeType === "CONTROL_VALVE" || nodeType === "VALVE") {
                loadGLTFAsset("valve", createProceduralValve, (loadedMesh, loadStatus) => {
                    loadedMesh.scale.set(1.3, 1.3, 1.3);
                    group.add(loadedMesh);
                    group.userData.modelStatus = loadStatus;
                });
                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);

            } else if (nodeType === "CONTROL_TOWER" || nodeType === "TOWER") {
                loadGLTFAsset("control_tower", createProceduralControlTower, (loadedMesh, loadStatus) => {
                    loadedMesh.scale.set(1.0, 1.0, 1.0);
                    group.add(loadedMesh);
                    group.userData.modelStatus = loadStatus;
                    if (loadedMesh.userData && loadedMesh.userData.rotatingDish) {
                        rotatingElements.push(loadedMesh.userData.rotatingDish);
                    }
                });
                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);

            } else {
                const juncGeo = new THREE.SphereGeometry(3, 16, 16);
                const juncMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5 });
                const junc = new THREE.Mesh(juncGeo, juncMat);
                junc.position.y = 3;
                group.add(junc);
                const sprite = createTextSprite(node.id, node.name, provenance);
                sprite.position.set(0, 18, 0);
                group.add(sprite);
            }

            scene.add(group);
            nodeMeshes.push(group);
        });

        // 3. BUILD 3D DUAL PIPELINE EDGES (Left Potable + Right Sewage running alongside roads)
        edges.forEach(edge => {
            let startPos = null;
            let endPos = null;

            if (edge.source_node && nodePositionMap[edge.source_node]) {
                startPos = nodePositionMap[edge.source_node].clone();
                startPos.y -= (Number(edge.depth_meters || 2.4) * 1.5 * verticalExaggeration);
            } else {
                startPos = geoTo3D(edge.start_lat, edge.start_lng, 80, edge.depth_meters || 2.4);
            }

            if (edge.target_node && nodePositionMap[edge.target_node]) {
                endPos = nodePositionMap[edge.target_node].clone();
                endPos.y -= (Number(edge.depth_meters || 2.4) * 1.5 * verticalExaggeration);
            } else {
                endPos = geoTo3D(edge.end_lat, edge.end_lng, 80, edge.depth_meters || 2.4);
            }

            let curve;
            const curvePts = Array.isArray(edge.curve_points)
                ? edge.curve_points
                : (typeof edge.curve_points === "string" ? (function(){ try { return JSON.parse(edge.curve_points); } catch(e){ return null; } })() : null);

            if (Array.isArray(curvePts) && curvePts.length > 0) {
                const splinePoints = [];
                curvePts.forEach(cp => {
                    if (cp && cp.lat !== undefined && cp.lng !== undefined) {
                        const pt = geoTo3D(cp.lat, cp.lng, 80, edge.depth_meters || 2.4);
                        splinePoints.push(pt);
                    }
                });
                if (splinePoints.length >= 2) {
                    curve = new THREE.CatmullRomCurve3(splinePoints);
                    curve.curveType = "catmullrom";
                    curve.tension = 0.5;
                } else {
                    const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
                    mid.y -= 1.6;
                    curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
                }
            } else {
                const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
                mid.y -= 1.6;
                curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
            }

            // Equalized visual balance: Both Potable Sky Blue and Sewage Brown pipes have equal 3D radius & prominence
            const radius = 1.05;
            const tubeGeo = new THREE.TubeGeometry(curve, 64, radius, 12, false);

            // Water type colors & dynamic monsoon surge emissive response (balanced visibility)
            let pipeColor = 0x0284c7; // Azure Freshwater (Potable Left Verge)
            let emissiveColor = monsoonSurgeActive ? 0x0284c7 : 0x0369a1;
            let emissiveIntensity = monsoonSurgeActive ? 0.90 : 0.50; // 3.5 bar positive pressure barrier

            const pType = String(edge.pipe_type || "").toUpperCase();
            if (pType.includes("WASTE") || pType.includes("SEWAGE")) {
                pipeColor = 0x8d5b4c; // Rich Civil Brown Sewer Trunk (Right Verge)
                emissiveColor = monsoonSurgeActive ? 0x8d5b4c : 0x4a2c20;
                emissiveIntensity = monsoonSurgeActive ? 0.90 : 0.50;
            } else if (pType.includes("RECLAIMED") || pType.includes("RECYCLE")) {
                pipeColor = 0x10b981; // Emerald Teal Reclaimed Water
                emissiveColor = 0x065f46;
                emissiveIntensity = 0.40;
            } else if (pType.includes("STORM")) {
                pipeColor = 0x6366f1; // Indigo Stormwater Drainage
                emissiveColor = monsoonSurgeActive ? 0x4f46e5 : 0x3730a3;
                emissiveIntensity = monsoonSurgeActive ? 0.90 : 0.45;
            }

            if (edge.status && (edge.status.includes("Leak") || edge.status.includes("Low Pressure") || edge.status.includes("BURST"))) {
                pipeColor = 0xef4444;
                emissiveColor = 0x991b1b;
                emissiveIntensity = 0.9;
            }

            const tubeMat = new THREE.MeshStandardMaterial({
                color: pipeColor,
                emissive: emissiveColor,
                emissiveIntensity: emissiveIntensity,
                metalness: 0.55,
                roughness: 0.25,
                transparent: true,
                opacity: 0.95
            });

            const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
            tubeMesh.userData = {
                isPipe: true,
                pipeData: edge,
                assetId: edge.id,
                pipeType: edge.pipe_type || "POTABLE",
                flowDirection: edge.flow_direction || "FORWARD",
                dataSource: edge.data_source || (edge.is_simulated ? "SIMULATED" : "MEASURED"),
                sourceNode: edge.source_node,
                targetNode: edge.target_node,
                curve: curve
            };

            scene.add(tubeMesh);
            pipeMeshes.push(tubeMesh);

            // Intermediate Flange Joint Rings along the pipe curve
            for (let f = 1; f <= 3; f++) {
                const fPt = curve.getPointAt(f / 4);
                const fGeo = new THREE.TorusGeometry(radius * 1.25, 0.22, 8, 16);
                const fMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.3 });
                const fMesh = new THREE.Mesh(fGeo, fMat);
                fMesh.position.copy(fPt);
                scene.add(fMesh);
                flangeMeshes.push(fMesh);
            }

            // Create Animated Flow Pulses along the pipe respecting directional vectors
            createFlowParticles(curve, edge);
        });
    }

    /**
     * Create Animated Flow Particles travelling along pipe trajectory
     * Directional freshwater (azure), sewage (terracotta orange), reclaimed (teal)
     * Responds to Monsoon Surge Evacuation with 2.8x accelerated outfall velocity.
     */
    function createFlowParticles(curve, edge) {
        const particleCount = 4;
        const pGeo = new THREE.SphereGeometry(1.0, 8, 8);
        const pType = String(edge.pipe_type || "").toUpperCase();

        let partColor = 0x38bdf8; // Azure blue freshwater
        let isStormOrSewage = false;
        if (pType.includes("WASTE") || pType.includes("SEWAGE")) {
            partColor = 0xd7ccc8; // Tan/cream sewage particles for brown pipe
            isStormOrSewage = true;
        } else if (pType.includes("RECLAIMED") || pType.includes("RECYCLE")) {
            partColor = 0x34d399; // Emerald teal reclaimed water
        } else if (pType.includes("STORM")) {
            partColor = 0xa5b4fc; // Indigo stormwater
            isStormOrSewage = true;
        }

        const pMat = new THREE.MeshBasicMaterial({ color: partColor });
        const flowDir = String(edge.flow_direction || "FORWARD").toUpperCase();
        const isReverse = flowDir === "REVERSE";
        const isBidirectional = flowDir === "BIDIRECTIONAL";
        const baseSpeed = 0.0025 + Math.min(0.008, (Number(edge.flow_rate_lps || 50) / 10000));

        for (let i = 0; i < particleCount; i++) {
            const pMesh = new THREE.Mesh(pGeo, pMat);
            let dirMult = isReverse ? -1 : 1;
            if (isBidirectional && i % 2 === 1) {
                dirMult = -1;
            }

            const activeMultiplier = (monsoonSurgeActive && isStormOrSewage) ? 2.8 : 1.0;

            pMesh.userData = {
                curve: curve,
                progress: i / particleCount,
                baseSpeed: baseSpeed * dirMult,
                speed: baseSpeed * dirMult * activeMultiplier,
                pipeType: edge.pipe_type,
                isStormOrSewage: isStormOrSewage
            };
            scene.add(pMesh);
            flowParticles.push(pMesh);
        }
    }

    /**
     * Text Sprite Billboard with Honest Data Provenance Tag
     */
    function createTextSprite(id, label, provenance = "MEASURED") {
        const canvas = document.createElement("canvas");
        canvas.width = 280;
        canvas.height = 76;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(11, 19, 43, 0.90)";
        if (ctx.roundRect) ctx.roundRect(4, 4, 272, 68, 10);
        else ctx.fillRect(4, 4, 272, 68);
        ctx.fill();

        const provUpper = String(provenance || "").toUpperCase();
        let provColor = "#10b981"; // MEASURED (emerald)
        let provLabel = "MEASURED";
        if (provUpper === "SIMULATED") {
            provColor = "#f59e0b"; // SIMULATED (amber)
            provLabel = "SIMULATED";
        } else if (provUpper === "UNKNOWN") {
            provColor = "#ef4444"; // UNKNOWN (red)
            provLabel = "UNKNOWN";
        }

        ctx.strokeStyle = provColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = "bold 20px -apple-system, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(id, 140, 26);

        ctx.font = "bold 11px -apple-system, sans-serif";
        ctx.fillStyle = provColor;
        const cleanLabel = (label || "").length > 20 ? (label.slice(0, 18) + "..") : (label || "");
        ctx.fillText(`[${provLabel}] ${cleanLabel}`, 140, 52);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(17, 4.6, 1);
        return sprite;
    }

    /**
     * Raycasting & Interactive Asset Selection
     * Interacts with Pipes, Tanks, Pumps, and SCADA Junction Control Hubs.
     */
    function setupRaycaster() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        container.addEventListener("click", event => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // Check against nodes and pipes
            const interactiveObjects = [...pipeMeshes];
            nodeMeshes.forEach(g => {
                g.traverse(child => {
                    if (child.isMesh) {
                        child.userData = g.userData;
                        interactiveObjects.push(child);
                    }
                });
            });

            const intersects = raycaster.intersectObjects(interactiveObjects, false);

            if (intersects.length > 0) {
                const hit = intersects[0].object;
                const data = hit.userData;

                if (data && data.assetId) {
                    highlightAsset(data.assetId);

                    // If Junction Control Hub, open SCADA Multi-Pipe Junction Control Modal!
                    if (data.isJunctionHub || data.assetId.startsWith("JNC-CTRL") || (data.nodeData && (data.nodeData.type === "NETWORK_JUNCTION" || data.nodeData.type === "DRAINAGE_OUTLET"))) {
                        if (typeof window.openJunctionControlModal === "function") {
                            window.openJunctionControlModal(data.assetId);
                        }
                    }

                    // Trigger external inspector callback
                    if (typeof window.inspectWaterAsset === "function") {
                        window.inspectWaterAsset(data.assetId, data.nodeData || data.pipeData);
                    }
                }
            }
        });
    }

    /**
     * Highlight selected asset in 3D scene
     */
    function highlightAsset(assetId) {
        // Reset previous selections
        pipeMeshes.forEach(p => {
            if (p.material) {
                p.material.emissiveIntensity = 0.35;
                p.scale.set(1, 1, 1);
            }
        });

        // Find pipe or node
        const targetPipe = pipeMeshes.find(p => p.userData && p.userData.assetId === assetId);
        if (targetPipe) {
            targetPipe.material.emissiveIntensity = 1.0;
            targetPipe.scale.set(1.25, 1.25, 1.25);
            return;
        }

        const targetNode = nodeMeshes.find(n => n.userData && n.userData.assetId === assetId);
        if (targetNode && controls) {
            controls.target.copy(targetNode.position);
        }
    }

    /**
     * Clear dynamic meshes
     */
    function clearNetworkMeshes() {
        nodeMeshes.forEach(n => scene.remove(n));
        nodeMeshes.length = 0;

        pipeMeshes.forEach(p => scene.remove(p));
        pipeMeshes.length = 0;

        roadMeshes.forEach(r => scene.remove(r));
        roadMeshes.length = 0;

        flangeMeshes.forEach(f => scene.remove(f));
        flangeMeshes.length = 0;

        junctionBeacons.length = 0;

        flowParticles.forEach(f => scene.remove(f));
        flowParticles.length = 0;

        rotatingElements.length = 0;
    }

    /**
     * Layer Visibility Control
     */
    function setLayerVisibility(layer, isVisible) {
        layerVisibility[layer] = Boolean(isVisible);

        pipeMeshes.forEach(p => {
            const type = (p.userData.pipeType || "POTABLE").toLowerCase();
            if (type === "potable") p.visible = layerVisibility.potable;
            if (type === "wastewater") p.visible = layerVisibility.wastewater;
            if (type === "reclaimed") p.visible = layerVisibility.reclaimed;
        });

        nodeMeshes.forEach(n => {
            n.visible = layerVisibility.assets;
        });

        if (layer === "roads") {
            roadMeshes.forEach(r => {
                r.visible = Boolean(isVisible);
            });
        }

        flowParticles.forEach(f => {
            f.visible = layerVisibility.flowAnimation;
        });

        if (layer === "sewageRoute") {
            setSewageRouteVisibility(isVisible);
        }
    }

    /**
     * Render Planned Sewage Route in 3D below ground surface
     */
    function renderSewagePlannedRoute(routeData) {
        if (!scene) init3DExplorer();
        if (!scene) return;
        if (!plannedSewageGroup) {
            plannedSewageGroup = new THREE.Group();
            plannedSewageGroup.name = "plannedSewageGroup";
            scene.add(plannedSewageGroup);
        }

        clearSewagePlannedRoute();
        lastRouteData = routeData;
        if (!routeData || !routeData.waypoints || routeData.waypoints.length < 2) return;

        const waypoints = Array.isArray(routeData.waypoints) ? routeData.waypoints : [];
        const depthMeters = Number(routeData.burial_depth_m || 2.8);
        const diameterMm = Number(routeData.pipe_diameter_mm || 450);
        const radius = Math.max(1.0, (diameterMm / 1000) * 2.2);

        // Convert waypoints to 3D points
        const points3D = waypoints.map((wp, idx) => {
            const elev = Number(wp.elevation_m || (84 - idx * 1.2));
            return geoTo3D(wp.lat, wp.lng, elev, depthMeters);
        });

        // Build continuous underground 3D CatmullRom pipe
        const curve = new THREE.CatmullRomCurve3(points3D);
        curve.curveType = "catmullrom";
        curve.tension = 0.5;

        const tubeGeo = new THREE.TubeGeometry(curve, 64, radius, 12, false);

        // Dynamic color mapping based on pipeline network type
        const netType = String(routeData.network_type || routeData.pipe_type || "SEWAGE").toUpperCase();
        let pipeColor = 0xc2410c; // Terracotta sewer default
        let emissiveColor = 0x7c2d12;
        let shaftColor = 0x9a3412;
        let typeLabel = "Sewage / Wastewater";

        if (netType.includes("POTABLE") || netType.includes("FRESH")) {
            pipeColor = 0x38bdf8; // Sky blue fresh water
            emissiveColor = 0x0284c7;
            shaftColor = 0x0369a1;
            typeLabel = "Fresh Potable Supply";
        } else if (netType.includes("RAIN") || netType.includes("STORM") || netType.includes("DRAIN")) {
            pipeColor = 0x06b6d4; // Cyan stormwater
            emissiveColor = 0x0e7490;
            shaftColor = 0x155e75;
            typeLabel = "Rainwater / Drainage";
        } else if (netType.includes("RECLAIM") || netType.includes("RECYCLE")) {
            pipeColor = 0x10b981; // Emerald reclaimed water
            emissiveColor = 0x047857;
            shaftColor = 0x065f46;
            typeLabel = "Reclaimed Water";
        }

        const isSchematic = Boolean(routeData.is_schematic || routeData.data_source === "SIMULATED" || !routeData.verified_coordinates);
        const provenanceTag = isSchematic ? " [SIMULATED / SCHEMATIC]" : " [VERIFIED SURVEY]";

        const tubeMat = new THREE.MeshStandardMaterial({
            color: pipeColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.6,
            metalness: 0.5,
            roughness: 0.3,
            transparent: true,
            opacity: 0.95
        });

        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.userData = {
            isPlannedSewage: true,
            routeData: routeData,
            networkType: netType
        };
        plannedSewageGroup.add(tubeMesh);

        // Build 3D Manholes and Chambers for each waypoint
        waypoints.forEach((wp, idx) => {
            const pt = points3D[idx];
            const surfaceY = -2.0;
            const shaftHeight = Math.max(1.5, surfaceY - pt.y);

            // Vertical Concrete Shaft
            const shaftGeo = new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, shaftHeight, 16);
            const shaftMat = new THREE.MeshStandardMaterial({
                color: shaftColor,
                roughness: 0.7,
                metalness: 0.2
            });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.position.set(pt.x, pt.y + shaftHeight / 2, pt.z);
            plannedSewageGroup.add(shaft);

            // Cast Iron Manhole Cover at road surface
            const coverGeo = new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.4, 16);
            const coverMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                metalness: 0.8,
                roughness: 0.3
            });
            const cover = new THREE.Mesh(coverGeo, coverMat);
            cover.position.set(pt.x, surfaceY + 0.2, pt.z);
            plannedSewageGroup.add(cover);

            // Floating Label with honest data status
            const labelText = wp.node_type === "DESTINATION_STP" ? "STP CONNECTION" : `MH-0${idx + 1}`;
            const sprite = createTextSprite(labelText, `${wp.road_name || typeLabel} (${depthMeters}m depth)${provenanceTag}`, isSchematic ? "SIMULATED" : "MEASURED");
            sprite.position.set(pt.x, surfaceY + 12, pt.z);
            plannedSewageGroup.add(sprite);
        });

        // Create Animated Flow Particles reflecting direction and network type
        createFlowParticles(curve, {
            pipe_type: netType,
            name: routeData.name || `Proposed ${typeLabel} Route`,
            flow_direction: routeData.flow_direction || "FORWARD"
        });
    }

    function clearSewagePlannedRoute() {
        if (!plannedSewageGroup) return;
        while (plannedSewageGroup.children.length > 0) {
            const child = plannedSewageGroup.children[0];
            plannedSewageGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }
    }

    function focusOnSewageRoute(routeData) {
        if (!controls || !camera || !routeData || !routeData.waypoints || routeData.waypoints.length === 0) return;
        const waypoints = routeData.waypoints;
        const depthM = Number(routeData.burial_depth_m || 2.8);

        let sumX = 0, sumZ = 0;
        waypoints.forEach(wp => {
            const pt = geoTo3D(wp.lat, wp.lng, wp.elevation_m || 80, depthM);
            sumX += pt.x;
            sumZ += pt.z;
        });
        const midX = sumX / waypoints.length;
        const midZ = sumZ / waypoints.length;

        camera.position.set(midX - 30, 90, midZ + 110);
        controls.target.set(midX, -5, midZ);
        controls.update();
    }

    function setSewageRouteVisibility(visible) {
        if (plannedSewageGroup) {
            plannedSewageGroup.visible = Boolean(visible);
        }
    }

    /**
     * Camera Presets
     */
    function setCameraPreset(preset) {
        if (!controls || !camera) return;

        if (preset === "isometric") {
            camera.position.set(0, 180, 260);
            controls.target.set(0, 0, 0);
        } else if (preset === "top") {
            camera.position.set(0, 340, 5);
            controls.target.set(0, 0, 0);
        } else if (preset === "stp") {
            const stpNode = nodeMeshes.find(n => n.userData && n.userData.assetId === "STP-01");
            if (stpNode) {
                camera.position.set(stpNode.position.x - 40, stpNode.position.y + 35, stpNode.position.z + 50);
                controls.target.copy(stpNode.position);
            }
        }
        controls.update();
    }

    /**
     * Monsoon Surge Flood Evacuation Mode Controller
     * Accelerates storm outfall flow towards Rapti Bund outfall,
     * boosts potable clean water positive pressure barrier glow,
     * and triggers alert strobes on SCADA junction control beacons.
     */
    function setMonsoonMode(active) {
        monsoonSurgeActive = Boolean(active);

        // Update flow particles speed
        flowParticles.forEach(p => {
            const isStormOrSewage = p.userData.isStormOrSewage;
            const multiplier = (monsoonSurgeActive && isStormOrSewage) ? 2.8 : 1.0;
            p.userData.speed = p.userData.baseSpeed * multiplier;
        });

        // Update pipeline emissive glows
        pipeMeshes.forEach(p => {
            const pType = String(p.userData.pipeType || "").toUpperCase();
            if (pType.includes("WASTE") || pType.includes("SEWAGE")) {
                p.material.emissive.setHex(monsoonSurgeActive ? 0xd97706 : 0x7c2d12);
                p.material.emissiveIntensity = monsoonSurgeActive ? 0.85 : 0.45;
            } else if (pType.includes("POTABLE")) {
                p.material.emissive.setHex(monsoonSurgeActive ? 0x0284c7 : 0x0369a1);
                p.material.emissiveIntensity = monsoonSurgeActive ? 0.95 : 0.45;
            } else if (pType.includes("STORM")) {
                p.material.emissive.setHex(monsoonSurgeActive ? 0x4f46e5 : 0x3730a3);
                p.material.emissiveIntensity = monsoonSurgeActive ? 0.90 : 0.45;
            }
        });

        // Update junction beacons color
        junctionBeacons.forEach(b => {
            if (monsoonSurgeActive) {
                b.material.color.setHex(0xef4444);
                b.material.emissive.setHex(0xb91c1c);
            } else {
                b.material.color.setHex(0x10b981);
                b.material.emissive.setHex(0x059669);
            }
        });
    }

    /**
     * Main Animation Loop
     */
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // Update OrbitControls
        if (controls) controls.update();

        // Rotate animated elements (STP arms, radar dishes)
        rotatingElements.forEach(el => {
            if (el && el.rotation) {
                el.rotation.y += 0.015;
            }
        });

        // Advance flow pulse particles along 3D curves
        if (layerVisibility.flowAnimation) {
            flowParticles.forEach(p => {
                p.userData.progress += p.userData.speed;
                if (p.userData.progress > 1) p.userData.progress = 0;
                if (p.userData.progress < 0) p.userData.progress = 1;
                const point = p.userData.curve.getPointAt(p.userData.progress);
                p.position.copy(point);
            });
        }

        // Animate pulsing SCADA junction LED beacons
        if (junctionBeacons.length > 0) {
            const time = Date.now() * 0.005;
            junctionBeacons.forEach((b, idx) => {
                if (monsoonSurgeActive) {
                    b.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(time * 3 + idx);
                } else {
                    b.material.emissiveIntensity = 0.35 + 0.35 * Math.sin(time + idx);
                }
            });
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function onWindowResize() {
        if (!container || !renderer || !camera) return;
        const width = container.clientWidth;
        const height = container.clientHeight || 500;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Export module
    window.Water3DExplorer = {
        init: init3DExplorer,
        resize: onWindowResize,
        renderTopology: render3DTopology,
        renderSewagePlannedRoute: renderSewagePlannedRoute,
        clearSewagePlannedRoute: clearSewagePlannedRoute,
        focusOnSewageRoute: focusOnSewageRoute,
        setSewageRouteVisibility: setSewageRouteVisibility,
        highlightAsset: highlightAsset,
        setLayerVisibility: setLayerVisibility,
        setCameraPreset: setCameraPreset,
        resetCamera: setCameraPreset,
        setMonsoonMode: setMonsoonMode,
        getMonsoonMode: () => monsoonSurgeActive,
        getRoadMeshes: () => roadMeshes,
        getJunctionBeacons: () => junctionBeacons,
        setVerticalExaggeration: function (mult) {
            verticalExaggeration = Math.max(0.5, Math.min(5.0, Number(mult) || 1.0));
            if (lastTopologyData) render3DTopology(lastTopologyData);
            if (lastRouteData) renderSewagePlannedRoute(lastRouteData);
            const lbl = document.getElementById("exaggerationLabel");
            if (lbl) lbl.textContent = `${verticalExaggeration.toFixed(1)}x`;
        },
        getVerticalExaggeration: () => verticalExaggeration,
        getScene: () => scene,
        getPlannedSewageGroup: () => plannedSewageGroup,
        getPipeMeshes: () => pipeMeshes,
        destroy: () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", onWindowResize);
        }
    };

})(window, document);
