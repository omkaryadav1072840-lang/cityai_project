/**
 * SmartCity AI - 3D Pipeline Explorer & Digital Twin
 * Interactive Three.js WebGL Engine for Gorakhpur Hydraulic Network
 * Aligned with Leaflet 2D coordinates, shared stable Asset IDs,
 * animated flow pulses, underground depth offsets, and asset inspection.
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
    const flowParticles = [];
    let hoveredMesh = null;
    let selectedMesh = null;

    // Layer Visibilities
    const layerVisibility = {
        potable: true,
        wastewater: true,
        reclaimed: true,
        assets: true,
        flowAnimation: true,
        sewageRoute: true
    };
    let plannedSewageGroup = null;
    let verticalExaggeration = 2.0;
    let lastTopologyData = null;
    let lastRouteData = null;

    // Coordinate Projection: (lat, lng, elev) -> THREE.Vector3
    // Schematic 3D Depth Projection: depthMeters exaggerated vertically for subterranean visibility
    function geoTo3D(lat, lng, elev = 0, depthMeters = 0) {
        const x = (Number(lng) - CENTER_LNG) * GEO_SCALE;
        const z = -(Number(lat) - CENTER_LAT) * GEO_SCALE;
        const y = (Number(elev) - 80) * 0.4 - (Number(depthMeters) * 1.5 * verticalExaggeration);
        return new THREE.Vector3(x, y, z);
    }

    /**
     * Initialize Three.js Scene
     */
    function init3DExplorer() {
        container = document.getElementById("water3DCanvasContainer");
        if (!container) return;

        // Ensure container dimensions
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 500;

        // 1. Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b1329); // Dark civic navy blue
        scene.fog = new THREE.FogExp2(0x0b1329, 0.0035);

        // 2. Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
        camera.position.set(0, 180, 260);

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Clear existing canvas if any
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 4. OrbitControls
        if (typeof THREE.OrbitControls !== "undefined") {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera sinking under ground
            controls.minDistance = 20;
            controls.maxDistance = 600;
            controls.target.set(0, 0, 0);
        }

        // 5. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
        dirLight.position.set(120, 200, 80);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const secondaryLight = new THREE.DirectionalLight(0x10b981, 0.5);
        secondaryLight.position.set(-120, 100, -80);
        scene.add(secondaryLight);

        // 6. Ground Reference Grid
        const gridHelper = new THREE.GridHelper(400, 40, 0x1e3a8a, 0x1e293b);
        gridHelper.position.y = -2;
        scene.add(gridHelper);

        // Subtle ground terrain plane
        const planeGeo = new THREE.PlaneGeometry(600, 600);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0x060d1f,
            roughness: 0.9,
            metalness: 0.1
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

        // 8. Window resize
        window.addEventListener("resize", onWindowResize);

        // Start render loop
        animate();
    }

    /**
     * Render 3D Network from Topology Data
     */
    function render3DTopology(topologyData) {
        if (!scene) init3DExplorer();
        if (!scene || !topologyData) return;
        lastTopologyData = topologyData;

        // Clear existing network meshes
        clearNetworkMeshes();

        const nodes = topologyData.nodes || [];
        const edges = topologyData.edges || [];
        const nodePositionMap = {};

        // 1. BUILD 3D NODES
        nodes.forEach(node => {
            const pos = geoTo3D(node.lat, node.lng, node.elevation_m || 80);
            nodePositionMap[node.id] = pos;

            const group = new THREE.Group();
            group.position.copy(pos);
            group.userData = { isNode: true, nodeData: node, assetId: node.id };

            if (node.type === "TANK") {
                // Cylindrical Water Tank with Water Level Indicator
                const tankRadius = 6.5;
                const tankHeight = 14.0;

                // Outer Shell
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

            } else if (node.type === "TREATMENT_PLANT_STP" || node.type === "TREATMENT_PLANT_WTP") {
                // Treatment Plant Compound (Aeration Basins & Main Complex)
                const isSTP = node.type === "TREATMENT_PLANT_STP";
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
                group.userData.rotatingArm = arm;

            } else if (node.type === "BOOSTER_PUMP") {
                // Booster Pump Casing
                const pumpGeo = new THREE.CylinderGeometry(4, 4.5, 6, 16);
                const pumpMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 });
                const pump = new THREE.Mesh(pumpGeo, pumpMat);
                pump.position.y = 3;
                group.add(pump);

            } else if (node.type === "CONTROL_VALVE") {
                // Actuated Valve Body
                const valveGeo = new THREE.SphereGeometry(3.5, 16, 16);
                const valveMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.6 });
                const valve = new THREE.Mesh(valveGeo, valveMat);
                valve.position.y = 3.5;
                group.add(valve);

            } else {
                // Junction Node / Outfall
                const juncGeo = new THREE.SphereGeometry(3, 16, 16);
                const juncMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5 });
                const junc = new THREE.Mesh(juncGeo, juncMat);
                junc.position.y = 3;
                group.add(junc);
            }

            // Create Floating Asset ID Label Sprite
            const sprite = createTextSprite(node.id, node.name);
            sprite.position.set(0, 18, 0);
            group.add(sprite);

            scene.add(group);
            nodeMeshes.push(group);
        });

        // 2. BUILD 3D PIPELINE EDGES (Tubes with Flow Animation)
        edges.forEach(edge => {
            const startPos = geoTo3D(edge.start_lat, edge.start_lng, 80, edge.depth_meters || 2.4);
            const endPos = geoTo3D(edge.end_lat, edge.end_lng, 80, edge.depth_meters || 2.4);

            // Connect using cubic curve with natural underground catenary curvature
            const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
            mid.y -= 1.5; // slight sag underground

            const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
            const radius = Math.max(0.8, (Number(edge.diameter_mm || 450) / 1000) * 1.8);

            const tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 10, false);

            // Pipe styling by water classification (Potable, Sewage, Reclaimed, Stormwater)
            let pipeColor = 0x0284c7; // Potable clean azure
            let emissiveColor = 0x0369a1;

            const pType = String(edge.pipe_type || "").toUpperCase();
            if (pType.includes("WASTE") || pType.includes("SEWAGE")) {
                pipeColor = 0xc2410c; // Terracotta sanitary sewer
                emissiveColor = 0x7c2d12;
            } else if (pType.includes("RECLAIMED")) {
                pipeColor = 0x10b981; // Reclaimed water emerald teal
                emissiveColor = 0x065f46;
            } else if (pType.includes("STORM")) {
                pipeColor = 0x6366f1; // Stormwater drainage indigo
                emissiveColor = 0x3730a3;
            }

            if (edge.status && (edge.status.includes("Leak") || edge.status.includes("Low Pressure") || edge.status.includes("BURST"))) {
                pipeColor = 0xef4444; // Warning alert red
                emissiveColor = 0x991b1b;
            }

            const tubeMat = new THREE.MeshStandardMaterial({
                color: pipeColor,
                emissive: emissiveColor,
                emissiveIntensity: 0.35,
                metalness: 0.45,
                roughness: 0.25,
                transparent: true,
                opacity: 0.92
            });

            const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
            tubeMesh.userData = {
                isPipe: true,
                pipeData: edge,
                assetId: edge.id,
                pipeType: edge.pipe_type || "POTABLE",
                flowDirection: edge.flow_direction || "FORWARD",
                curve: curve
            };

            scene.add(tubeMesh);
            pipeMeshes.push(tubeMesh);

            // Create Animated Flow Pulses along the pipe
            createFlowParticles(curve, edge);
        });
    }

    /**
     * Create Animated Flow Particles travelling along pipe trajectory
     */
    function createFlowParticles(curve, edge) {
        const particleCount = 4;
        const pGeo = new THREE.SphereGeometry(1.0, 8, 8);
        const pType = String(edge.pipe_type || "").toUpperCase();
        let partColor = 0x38bdf8;
        if (pType.includes("WASTE") || pType.includes("SEWAGE")) partColor = 0xfb923c;
        else if (pType.includes("RECLAIMED")) partColor = 0x34d399;
        else if (pType.includes("STORM")) partColor = 0xa5b4fc;

        const pMat = new THREE.MeshBasicMaterial({ color: partColor });
        const isReverse = String(edge.flow_direction || "").toUpperCase() === "REVERSE";
        const dirMultiplier = isReverse ? -1 : 1;

        for (let i = 0; i < particleCount; i++) {
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.userData = {
                curve: curve,
                progress: i / particleCount,
                speed: (0.0025 + Math.min(0.008, (Number(edge.flow_rate_lps || 50) / 10000))) * dirMultiplier,
                pipeType: edge.pipe_type
            };
            scene.add(pMesh);
            flowParticles.push(pMesh);
        }
    }

    /**
     * Text Sprite Billboard
     */
    function createTextSprite(id, label) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.roundRect ? ctx.roundRect(4, 4, 248, 56, 12) : ctx.fillRect(4, 4, 248, 56);
        ctx.fill();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = "bold 22px -apple-system, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(id, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(16, 4, 1);
        return sprite;
    }

    /**
     * Raycasting & Interactive Asset Selection
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
                g.children.forEach(c => {
                    if (c.isMesh) {
                        c.userData = g.userData;
                        interactiveObjects.push(c);
                    }
                });
            });

            const intersects = raycaster.intersectObjects(interactiveObjects, false);

            if (intersects.length > 0) {
                const hit = intersects[0].object;
                const data = hit.userData;

                if (data && data.assetId) {
                    highlightAsset(data.assetId);

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
            // Animate camera smoothly towards the selected asset
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

        flowParticles.forEach(f => scene.remove(f));
        flowParticles.length = 0;
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

        // Dynamic configurable color mapping based on pipeline network type
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
            const sprite = createTextSprite(labelText, `${wp.road_name || typeLabel} (${depthMeters}m depth)${provenanceTag}`);
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
            // Zoom into Central Sewage Treatment Plant
            const stpNode = nodeMeshes.find(n => n.userData && n.userData.assetId === "STP-01");
            if (stpNode) {
                camera.position.set(stpNode.position.x - 40, stpNode.position.y + 35, stpNode.position.z + 50);
                controls.target.copy(stpNode.position);
            }
        }
        controls.update();
    }

    /**
     * Main Animation Loop
     */
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // Update OrbitControls
        if (controls) controls.update();

        // Rotate STP clarifier arms
        nodeMeshes.forEach(g => {
            if (g.userData && g.userData.rotatingArm) {
                g.userData.rotatingArm.rotation.y += 0.015;
            }
        });

        // Advance flow pulse particles
        if (layerVisibility.flowAnimation) {
            flowParticles.forEach(p => {
                p.userData.progress += p.userData.speed;
                if (p.userData.progress > 1) p.userData.progress = 0;
                if (p.userData.progress < 0) p.userData.progress = 1;
                const point = p.userData.curve.getPointAt(p.userData.progress);
                p.position.copy(point);
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
        renderTopology: render3DTopology,
        renderSewagePlannedRoute: renderSewagePlannedRoute,
        clearSewagePlannedRoute: clearSewagePlannedRoute,
        focusOnSewageRoute: focusOnSewageRoute,
        setSewageRouteVisibility: setSewageRouteVisibility,
        highlightAsset: highlightAsset,
        setLayerVisibility: setLayerVisibility,
        setCameraPreset: setCameraPreset,
        resetCamera: setCameraPreset,
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
