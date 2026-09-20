/**
 * SmartCity AI Traffic Platform - OpenLayers Map Integration
 * Clean, practical, professional map for Gorakhpur Urban Operations
 */

class SmartCityTrafficMap {
    constructor(targetElementId) {
        this.targetId = targetElementId;
        this.map = null;
        this.junctionSource = new ol.source.Vector();
        this.junctionLayer = null;
        this.signalSource = new ol.source.Vector();
        this.signalLayer = null;
        this.parkingSource = new ol.source.Vector();
        this.parkingLayer = null;
        this.incidentSource = new ol.source.Vector();
        this.incidentLayer = null;
        this.waterloggingSource = new ol.source.Vector();
        this.waterloggingLayer = null;
        this.corridorSource = new ol.source.Vector();
        this.corridorLayer = null;
        this.routeSource = new ol.source.Vector();
        this.routeLayer = null;
        this.vmsSource = new ol.source.Vector();
        this.vmsLayer = null;
        this.radarSource = new ol.source.Vector();
        this.radarLayer = null;
        this.ambulanceSource = new ol.source.Vector();
        this.ambulanceLayer = null;
        this.criticalRouteSource = new ol.source.Vector();
        this.criticalRouteLayer = null;
        this.heatmapSource = new ol.source.Vector();
        this.heatmapLayer = null;
        this.overlay = null;
        this.onMarkerClickCallback = null;

        this.pickingCoordinates = false;
        this.onCoordinatePicked = null;

        // Gorakhpur City Center (Golghar / Civil Lines)
        this.centerCoords = [83.3731, 26.7588];
    }

    init() {
        if (!window.ol) {
            console.error("OpenLayers library (ol) not loaded!");
            return;
        }

        // Robust OSM / Carto base tile layer that resolves properly in all environments
        const baseLayer = new ol.layer.Tile({
            title: "Standard Street Map",
            source: new ol.source.OSM({
                attributions: "© OpenStreetMap contributors"
            })
        });

        // Congestion Heatmap with smart-city thermal gradient
        this.heatmapLayer = new ol.layer.Heatmap({
            source: this.heatmapSource,
            blur: 28,
            radius: 26,
            weight: (feat) => feat.get('weight') || 0.5,
            gradient: ['#22c55e', '#a3e635', '#facc15', '#f97316', '#ef4444', '#7f1d1d'],
            opacity: 0.85,
            visible: true
        });

        // Vector Layers
        this.radarLayer = new ol.layer.Vector({
            source: this.radarSource,
            style: (f) => this.getRadarStyle(f)
        });

        this.corridorLayer = new ol.layer.Vector({
            source: this.corridorSource,
            style: (f) => this.getCorridorStyle(f)
        });

        this.criticalRouteLayer = new ol.layer.Vector({
            source: this.criticalRouteSource,
            style: (f) => this.getCriticalRouteStyle(f),
            zIndex: 45,
            visible: true
        });

        this.routeLayer = new ol.layer.Vector({
            source: this.routeSource,
            style: (f) => this.getRouteStyle(f)
        });

        this.junctionLayer = new ol.layer.Vector({
            source: this.junctionSource,
            style: (f) => this.getJunctionStyle(f)
        });

        this.signalLayer = new ol.layer.Vector({
            source: this.signalSource,
            style: (f) => this.getSignalStyle(f)
        });

        this.parkingLayer = new ol.layer.Vector({
            source: this.parkingSource,
            style: (f) => this.getParkingStyle(f)
        });

        this.incidentLayer = new ol.layer.Vector({
            source: this.incidentSource,
            style: (f) => this.getIncidentStyle(f)
        });

        this.waterloggingLayer = new ol.layer.Vector({
            source: this.waterloggingSource,
            style: (f) => this.getWaterloggingStyle(f),
            visible: true
        });

        this.vmsLayer = new ol.layer.Vector({
            source: this.vmsSource,
            style: (f) => this.getVMSStyle(f),
            visible: true
        });

        this.ambulanceLayer = new ol.layer.Vector({
            source: this.ambulanceSource,
            style: (f) => this.getAmbulanceStyle(f),
            zIndex: 50,
            visible: true
        });

        // Popup Overlay
        const popupElement = document.getElementById('map-popup');
        this.overlay = new ol.Overlay({
            element: popupElement,
            autoPan: { animation: { duration: 250 } }
        });

        this.map = new ol.Map({
            target: this.targetId,
            layers: [
                baseLayer,
                this.heatmapLayer,
                this.radarLayer,
                this.corridorLayer,
                this.criticalRouteLayer,
                this.routeLayer,
                this.junctionLayer,
                this.signalLayer,
                this.parkingLayer,
                this.incidentLayer,
                this.waterloggingLayer,
                this.vmsLayer,
                this.ambulanceLayer
            ],
            overlays: [this.overlay],
            view: new ol.View({
                center: ol.proj.fromLonLat(this.centerCoords),
                zoom: 13.5,
                minZoom: 11,
                maxZoom: 18
            }),
            controls: (() => {
                try {
                    if (ol.control && ol.control.defaults && typeof ol.control.defaults.defaults === 'function') {
                        return ol.control.defaults.defaults({ zoom: true, attribution: false, rotate: false });
                    }
                    if (ol.control && typeof ol.control.defaults === 'function') {
                        return ol.control.defaults({ zoom: true, attribution: false, rotate: false });
                    }
                } catch (e) {}
                return undefined;
            })()
        });

        // Trigger immediate viewport calculation
        setTimeout(() => {
            if (this.map) this.map.updateSize();
        }, 100);

        // Map Click Listener (Feature click OR Coordinate Pick)
        this.map.on('singleclick', (evt) => {
            const lonLat = ol.proj.toLonLat(evt.coordinate);

            // If in coordinate picker mode
            if (this.pickingCoordinates && this.onCoordinatePicked) {
                this.onCoordinatePicked(lonLat[1], lonLat[0]);
                this.stopCoordinatePickMode();
                return;
            }

            const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f) => f);
            if (feature) {
                const props = feature.getProperties();
                if (this.onMarkerClickCallback) {
                    this.onMarkerClickCallback(props, evt.coordinate);
                }
            } else {
                if (this.overlay) this.overlay.setPosition(undefined);
            }
        });

        // Pointer move styling
        this.map.on('pointermove', (e) => {
            if (this.pickingCoordinates) {
                this.map.getTargetElement().style.cursor = 'crosshair';
            } else {
                const hit = this.map.hasFeatureAtPixel(e.pixel);
                this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
            }
        });
    }

    setMarkerClickHandler(callback) {
        this.onMarkerClickCallback = callback;
    }

    startCoordinatePickMode(callback) {
        this.pickingCoordinates = true;
        this.onCoordinatePicked = callback;
        const banner = document.getElementById('map-coord-pick-banner');
        if (banner) banner.style.display = 'flex';
        this.map.getTargetElement().style.cursor = 'crosshair';
    }

    stopCoordinatePickMode() {
        this.pickingCoordinates = false;
        this.onCoordinatePicked = null;
        const banner = document.getElementById('map-coord-pick-banner');
        if (banner) banner.style.display = 'none';
        this.map.getTargetElement().style.cursor = '';
    }

    resetView() {
        if (!this.map) return;
        this.map.getView().animate({
            center: ol.proj.fromLonLat(this.centerCoords),
            zoom: 13.5,
            duration: 700
        });
    }

    updateSize() {
        if (this.map) {
            this.map.updateSize();
        }
    }

    closePopup() {
        if (this.overlay) {
            this.overlay.setPosition(undefined);
        }
    }

    toggleHeatmap(show) {
        if (this.heatmapLayer) {
            const vis = show !== undefined ? show : !this.heatmapLayer.getVisible();
            this.heatmapLayer.setVisible(vis);
            return vis;
        }
        return false;
    }

    setHeatmapRadius(r) {
        if (this.heatmapLayer) this.heatmapLayer.setRadius(parseInt(r) || 26);
    }

    setHeatmapBlur(b) {
        if (this.heatmapLayer) this.heatmapLayer.setBlur(parseInt(b) || 28);
    }

    setHeatmapOpacity(op) {
        if (this.heatmapLayer) this.heatmapLayer.setOpacity(parseFloat(op) || 0.85);
    }

    toggleVMS(visible) {
        if (this.vmsLayer) {
            const vis = visible !== undefined ? visible : !this.vmsLayer.getVisible();
            this.vmsLayer.setVisible(vis);
            return vis;
        }
        return false;
    }

    toggleLayer(name, show) {
        const layers = {
            junctions: this.junctionLayer,
            signals: this.signalLayer,
            parking: this.parkingLayer,
            incidents: this.incidentLayer,
            routes: this.routeLayer,
            corridors: this.corridorLayer,
            ambulances: this.ambulanceLayer,
            criticalRoutes: this.criticalRouteLayer,
            vms: this.vmsLayer,
            waterlogging: this.waterloggingLayer
        };
        if (layers[name]) layers[name].setVisible(show);
    }

    // Data Rendering
    renderJunctions(junctions) {
        this.junctionSource.clear();
        this.heatmapSource.clear();

        junctions.forEach(j => {
            const lon = parseFloat(j.longitude);
            const lat = parseFloat(j.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const coord = ol.proj.fromLonLat([lon, lat]);
            const feat = new ol.Feature({
                geometry: new ol.geom.Point(coord),
                type: 'junction',
                data: j
            });
            this.junctionSource.addFeature(feat);

            // Heatmap weight (0.2 to 1.0)
            const congestion = Number(j.congestion_level) || 35;
            const weight = Math.min(1.0, Math.max(0.2, congestion / 100));

            // Core junction center point
            this.heatmapSource.addFeature(new ol.Feature({
                geometry: new ol.geom.Point(coord),
                weight: weight
            }));

            // Arterial road approach offsets (N/S/E/W) so congestion visually paints along corridors
            const offsets = [
                [0.0008, 0.0000],   // North
                [-0.0008, 0.0000],  // South
                [0.0000, 0.0010],   // East
                [0.0000, -0.0010],  // West
                [0.0016, 0.0000],   // Ext North
                [-0.0016, 0.0000],  // Ext South
                [0.0000, 0.0018],   // Ext East
                [0.0000, -0.0018]   // Ext West
            ];

            offsets.forEach(([dLat, dLon], idx) => {
                const spreadWeight = idx >= 4 ? weight * 0.55 : weight * 0.82;
                this.heatmapSource.addFeature(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([lon + dLon, lat + dLat])),
                    weight: spreadWeight
                }));
            });
        });
    }

    renderSignals(signals) {
        this.signalSource.clear();
        signals.forEach(s => {
            const lon = parseFloat(s.longitude);
            const lat = parseFloat(s.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                type: 'signal',
                data: s
            });
            feat.setId(`sig-${s.id}`);
            this.signalSource.addFeature(feat);
        });
    }

    updateSignalPosition(sigId, lat, lng) {
        if (!this.signalSource) return;
        const lonNum = parseFloat(lng);
        const latNum = parseFloat(lat);
        if (isNaN(lonNum) || isNaN(latNum)) return;

        const coords = ol.proj.fromLonLat([lonNum, latNum]);
        let feat = this.signalSource.getFeatureById(`sig-${sigId}`);

        if (!feat) {
            const allFeats = this.signalSource.getFeatures();
            feat = allFeats.find(f => {
                const d = f.get('data');
                return d && String(d.id) === String(sigId);
            });
        }

        if (feat) {
            feat.getGeometry().setCoordinates(coords);
            const data = feat.get('data') || {};
            data.latitude = latNum;
            data.longitude = lonNum;
            feat.set('data', data);
        }
    }

    renderParking(lots) {
        this.parkingSource.clear();
        lots.forEach(lot => {
            const lon = parseFloat(lot.longitude);
            const lat = parseFloat(lot.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                type: 'parking',
                data: lot
            });
            this.parkingSource.addFeature(feat);
        });
    }

    renderIncidents(incidents) {
        this.incidentSource.clear();
        incidents.forEach(inc => {
            const lon = parseFloat(inc.longitude);
            const lat = parseFloat(inc.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                type: 'incident',
                data: inc
            });
            this.incidentSource.addFeature(feat);
        });
    }

    renderWaterlogging(zones) {
        this.waterloggingSource.clear();
        if (!zones || !zones.length) return;

        zones.forEach(z => {
            const lon = parseFloat(z.longitude);
            const lat = parseFloat(z.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                type: 'waterlogging',
                data: z
            });
            this.waterloggingSource.addFeature(feat);
        });
    }

    toggleWaterlogging(visible) {
        if (this.waterloggingLayer) {
            this.waterloggingLayer.setVisible(visible !== undefined ? visible : !this.waterloggingLayer.getVisible());
            return this.waterloggingLayer.getVisible();
        }
        return false;
    }

    renderRoutes(routes, parkAndWalkRoute = null) {
        this.routeSource.clear();
        let hasAny = false;

        if (routes && routes.length) {
            routes.forEach(r => {
                const coords = r.coordinates.map(c => ol.proj.fromLonLat([parseFloat(c[0]), parseFloat(c[1])]));
                const lineFeature = new ol.Feature({
                    geometry: new ol.geom.LineString(coords),
                    type: 'route',
                    data: r
                });
                this.routeSource.addFeature(lineFeature);
                hasAny = true;
            });
        }

        // Add Park & Walk Multi-Modal Route if provided
        if (parkAndWalkRoute) {
            // Drive segment (origin to parking lot)
            if (parkAndWalkRoute.driveCoordinates && parkAndWalkRoute.driveCoordinates.length) {
                const driveCoords = parkAndWalkRoute.driveCoordinates.map(c => ol.proj.fromLonLat([parseFloat(c[0]), parseFloat(c[1])]));
                const driveFeature = new ol.Feature({
                    geometry: new ol.geom.LineString(driveCoords),
                    type: 'route',
                    route_sub_type: 'park_drive',
                    data: { ...parkAndWalkRoute, name: `${parkAndWalkRoute.name} - Driving` }
                });
                this.routeSource.addFeature(driveFeature);
                hasAny = true;
            }

            // Walk segment (parking lot to final destination)
            if (parkAndWalkRoute.walkCoordinates && parkAndWalkRoute.walkCoordinates.length) {
                const walkCoords = parkAndWalkRoute.walkCoordinates.map(c => ol.proj.fromLonLat([parseFloat(c[0]), parseFloat(c[1])]));
                const walkFeature = new ol.Feature({
                    geometry: new ol.geom.LineString(walkCoords),
                    type: 'route',
                    route_sub_type: 'walk',
                    data: { ...parkAndWalkRoute, name: `${parkAndWalkRoute.name} - Walking` }
                });
                this.routeSource.addFeature(walkFeature);
                hasAny = true;
            }
        }

        if (hasAny) {
            const extent = this.routeSource.getExtent();
            if (extent && !ol.extent.isEmpty(extent)) {
                this.map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 700 });
            }
        }
    }

    renderVMSBoards(boards) {
        this.vmsSource.clear();
        if (!boards || !boards.length) return;

        boards.forEach(b => {
            const lon = parseFloat(b.longitude);
            const lat = parseFloat(b.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                type: 'vms_board',
                data: b
            });
            this.vmsSource.addFeature(feat);
        });
    }

    renderAmbulanceRadar(lon, lat, radiusMeters = 500) {
        this.radarSource.clear();
        const center = ol.proj.fromLonLat([lon, lat]);
        
        // Circular radar boundary feature
        const circleGeom = new ol.geom.Circle(center, radiusMeters);
        const radarFeature = new ol.Feature({
            geometry: circleGeom,
            type: 'ambulance_radar'
        });

        // Vehicle icon feature
        const vehicleFeature = new ol.Feature({
            geometry: new ol.geom.Point(center),
            type: 'ambulance_marker'
        });

        this.radarSource.addFeature(radarFeature);
        this.radarSource.addFeature(vehicleFeature);
    }

    clearAmbulanceRadar() {
        this.radarSource.clear();
    }

    renderActiveCorridor(corridorData, junctions) {
        this.corridorSource.clear();
        if (!corridorData || corridorData.status !== 'Active') return;

        const jncIds = Array.isArray(corridorData.junction_sequence)
            ? corridorData.junction_sequence
            : JSON.parse(corridorData.junction_sequence || '[]');

        const jncMap = new Map(junctions.map(j => [j.id, j]));
        const coords = [];

        jncIds.forEach(id => {
            const j = jncMap.get(id);
            if (j) {
                coords.push(ol.proj.fromLonLat([parseFloat(j.longitude), parseFloat(j.latitude)]));
            }
        });

        if (coords.length > 1) {
            const corridorFeature = new ol.Feature({
                geometry: new ol.geom.LineString(coords),
                type: 'active_corridor',
                data: corridorData
            });
            this.corridorSource.addFeature(corridorFeature);
        }
    }

    clearCorridor() {
        this.corridorSource.clear();
    }

    renderLiveAmbulances(ambulances) {
        if (!this.ambulanceSource) return;
        this.ambulanceSource.clear();
        (ambulances || []).forEach(amb => {
            const lon = parseFloat(amb.longitude);
            const lat = parseFloat(amb.latitude);
            if (isNaN(lon) || isNaN(lat)) return;

            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                type: 'ambulance',
                data: amb
            });
            feat.setId(`amb-${amb.id || amb.ambulance_id}`);
            this.ambulanceSource.addFeature(feat);

            if (amb.isCritical && amb.routeWaypoints && amb.routeWaypoints.length > 1) {
                this.renderCriticalAmbulanceRoute(amb);
            }
        });
    }

    updateAmbulancePosition(amb) {
        if (!this.ambulanceSource || !amb) return;
        const lon = parseFloat(amb.longitude);
        const lat = parseFloat(amb.latitude);
        if (isNaN(lon) || isNaN(lat)) return;

        const featId = `amb-${amb.id || amb.ambulance_id}`;
        let feat = this.ambulanceSource.getFeatureById(featId);
        const coords = ol.proj.fromLonLat([lon, lat]);

        if (feat) {
            feat.getGeometry().setCoordinates(coords);
            feat.set('data', amb);
        } else {
            feat = new ol.Feature({
                geometry: new ol.geom.Point(coords),
                type: 'ambulance',
                data: amb
            });
            feat.setId(featId);
            this.ambulanceSource.addFeature(feat);
        }

        if (amb.isCritical && amb.routeWaypoints && amb.routeWaypoints.length > 1) {
            this.renderCriticalAmbulanceRoute(amb);
        }
    }

    renderCriticalAmbulanceRoute(amb) {
        if (!this.criticalRouteSource || !amb) return;
        this.criticalRouteSource.clear();

        const waypoints = amb.routeWaypoints || [];
        if (waypoints.length < 2) return;

        const coords = waypoints.map(wp => ol.proj.fromLonLat([wp.lng, wp.lat]));
        const routeFeat = new ol.Feature({
            geometry: new ol.geom.LineString(coords),
            type: 'critical_corridor_route',
            data: amb
        });
        this.criticalRouteSource.addFeature(routeFeat);

        // Destination Hospital Pin
        const destWp = waypoints[waypoints.length - 1];
        if (destWp) {
            const destFeat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([destWp.lng, destWp.lat])),
                type: 'hospital_destination',
                data: {
                    name: amb.destinationHospital || destWp.name || 'Emergency Trauma Center',
                    ambulance: amb
                }
            });
            this.criticalRouteSource.addFeature(destFeat);
        }
    }

    clearCriticalAmbulanceRoute() {
        if (this.criticalRouteSource) {
            this.criticalRouteSource.clear();
        }
    }

    toggleAmbulances(visible) {
        if (this.ambulanceLayer) {
            const cur = this.ambulanceLayer.getVisible();
            const next = visible !== undefined ? visible : !cur;
            this.ambulanceLayer.setVisible(next);
            if (this.criticalRouteLayer) this.criticalRouteLayer.setVisible(next);
            return next;
        }
        return false;
    }

    // Styles
    getJunctionStyle(feature) {
        const j = feature.get('data') || {};
        const congestion = j.congestion_level || 30;
        let color = '#16a34a'; // green
        if (congestion >= 75) color = '#dc2626'; // red
        else if (congestion >= 50) color = '#d97706'; // amber

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 10,
                fill: new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
            }),
            text: new ol.style.Text({
                text: `${j.name ? j.name.split(' ')[0] : 'JNC'} (${congestion}%)`,
                offsetY: -16,
                font: 'bold 11px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#0f172a' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }),
                backgroundFill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.9)' }),
                padding: [2, 5, 2, 5]
            })
        });
    }

    getSignalStyle(feature) {
        const s = feature.get('data') || {};
        const color = s.current_color === 'Green' ? '#16a34a' : s.current_color === 'Yellow' ? '#d97706' : '#dc2626';

        return new ol.style.Style({
            image: new ol.style.RegularShape({
                points: 3,
                radius: 8,
                fill: new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.5 })
            }),
            text: new ol.style.Text({
                text: `🚦 ${s.approach ? s.approach[0] : ''} (${s.countdown || 0}s)`,
                offsetY: 14,
                font: 'bold 10px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#1e293b' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
            })
        });
    }

    getParkingStyle(feature) {
        const lot = feature.get('data') || {};
        const avail = lot.available_slots !== undefined ? lot.available_slots : lot.availableSlots;
        const color = (avail > 10) ? '#0284c7' : (avail > 0 ? '#d97706' : '#dc2626');

        return new ol.style.Style({
            image: new ol.style.RegularShape({
                points: 4,
                radius: 9,
                angle: Math.PI / 4,
                fill: new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
            }),
            text: new ol.style.Text({
                text: `🅿️ ${avail || 0} free`,
                offsetY: -15,
                font: 'bold 10px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#0f172a' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 }),
                backgroundFill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.9)' }),
                padding: [2, 4, 2, 4]
            })
        });
    }

    getIncidentStyle(feature) {
        const inc = feature.get('data') || {};
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 9,
                fill: new ol.style.Fill({ color: '#dc2626' }),
                stroke: new ol.style.Stroke({ color: '#fef08a', width: 2 })
            }),
            text: new ol.style.Text({
                text: `⚠️ ${inc.incident_type || 'Incident'}`,
                offsetY: -14,
                font: 'bold 10px Arial, sans-serif',
                fill: new ol.style.Fill({ color: '#991b1b' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
            })
        });
    }

    getRouteStyle(feature) {
        const r = feature.get('data') || {};
        const subType = feature.get('route_sub_type');

        if (subType === 'walk') {
            return [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#059669',
                        width: 4,
                        lineDash: [6, 6]
                    })
                })
            ];
        }

        if (subType === 'park_drive') {
            return [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#2563eb',
                        width: 5
                    })
                })
            ];
        }

        const isRec = r.recommended;
        return [
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: isRec ? '#16a34a' : '#dc2626',
                    width: isRec ? 5 : 4,
                    lineDash: isRec ? null : [8, 6]
                })
            })
        ];
    }

    getWaterloggingStyle(feature) {
        const w = feature.get('data') || {};
        const depth = w.waterDepthCm || 20;
        const isHigh = w.riskLevel === 'HIGH_RISK' || depth > 30;

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 11,
                fill: new ol.style.Fill({ color: isHigh ? '#dc2626' : '#0284c7' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 })
            }),
            text: new ol.style.Text({
                text: `🌧️ ${w.name ? w.name.split(' ')[0] : 'Flood'} (${depth}cm)`,
                offsetY: -16,
                font: 'bold 10px Arial, sans-serif',
                fill: new ol.style.Fill({ color: isHigh ? '#991b1b' : '#0369a1' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }),
                backgroundFill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
                padding: [2, 4, 2, 4]
            })
        });
    }

    getVMSStyle(feature) {
        const b = feature.get('data') || {};
        const isAlert = b.status === 'EMERGENCY_ALERT';
        return new ol.style.Style({
            image: new ol.style.RegularShape({
                points: 4,
                radius: 12,
                angle: 0,
                fill: new ol.style.Fill({ color: '#0f172a' }),
                stroke: new ol.style.Stroke({ color: isAlert ? '#ef4444' : '#ffb703', width: 2.5 })
            }),
            text: new ol.style.Text({
                text: `📺 VMS: ${b.name ? b.name.split(' ')[0] : 'Board'}`,
                offsetY: -16,
                font: 'bold 10px Arial, sans-serif',
                fill: new ol.style.Fill({ color: isAlert ? '#dc2626' : '#b45309' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }),
                backgroundFill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.95)' }),
                padding: [2, 4, 2, 4]
            })
        });
    }

    getRadarStyle(feature) {
        const type = feature.get('type');
        if (type === 'ambulance_marker') {
            return new ol.style.Style({
                text: new ol.style.Text({
                    text: '🚑',
                    font: '24px Arial, sans-serif'
                })
            });
        }
        return [
            new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(239, 68, 68, 0.12)' }),
                stroke: new ol.style.Stroke({
                    color: '#ef4444',
                    width: 2,
                    lineDash: [6, 4]
                })
            })
        ];
    }

    getCorridorStyle() {
        return [
            new ol.style.Style({
                stroke: new ol.style.Stroke({ color: 'rgba(37, 99, 235, 0.3)', width: 12 })
            }),
            new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#2563eb', width: 5 })
            })
        ];
    }

    getAmbulanceStyle(feature) {
        const amb = feature.get('data') || {};
        const isCrit = !!amb.isCritical;
        const color = isCrit ? '#dc2626' : '#2563eb';
        const haloColor = isCrit ? 'rgba(239, 68, 68, 0.35)' : 'rgba(37, 99, 235, 0.25)';

        return [
            new ol.style.Style({
                image: new ol.style.Circle({
                    radius: isCrit ? 18 : 13,
                    fill: new ol.style.Fill({ color: haloColor }),
                    stroke: new ol.style.Stroke({ color: color, width: isCrit ? 2.5 : 1.5 })
                })
            }),
            new ol.style.Style({
                image: new ol.style.Circle({
                    radius: isCrit ? 10 : 8,
                    fill: new ol.style.Fill({ color }),
                    stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                }),
                text: new ol.style.Text({
                    text: `${isCrit ? '🚨 CRITICAL' : '🚑'} ${amb.vehicle_number || amb.ambulance_id || 'AMB'} (${amb.speedKmh || 40}km/h)`,
                    offsetY: -22,
                    font: 'bold 11px Arial, sans-serif',
                    fill: new ol.style.Fill({ color: isCrit ? '#991b1b' : '#1e3a8a' }),
                    stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }),
                    backgroundFill: new ol.style.Fill({ color: isCrit ? 'rgba(254, 226, 226, 0.95)' : 'rgba(239, 246, 255, 0.95)' }),
                    padding: [3, 6, 3, 6]
                })
            })
        ];
    }

    getCriticalRouteStyle(feature) {
        const type = feature.get('type');
        if (type === 'hospital_destination') {
            const data = feature.get('data') || {};
            return new ol.style.Style({
                image: new ol.style.RegularShape({
                    points: 4,
                    radius: 14,
                    angle: Math.PI / 4,
                    fill: new ol.style.Fill({ color: '#16a34a' }),
                    stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                }),
                text: new ol.style.Text({
                    text: `🏥 ${data.name} (TRAUMA WARD)`,
                    offsetY: -22,
                    font: 'bold 11px Arial, sans-serif',
                    fill: new ol.style.Fill({ color: '#14532d' }),
                    stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }),
                    backgroundFill: new ol.style.Fill({ color: 'rgba(240, 253, 244, 0.95)' }),
                    padding: [3, 6, 3, 6]
                })
            });
        }

        // Critical Transit Glowing Route Line
        return [
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'rgba(239, 68, 68, 0.35)',
                    width: 14
                })
            }),
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#dc2626',
                    width: 6
                })
            }),
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#fef08a',
                    width: 2.5,
                    lineDash: [8, 6]
                })
            })
        ];
    }
}

window.SmartCityTrafficMap = SmartCityTrafficMap;
