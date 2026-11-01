const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'pages', 'waste', 'waste.html');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                <div class="staff-actions-bar">
                    <button class="btn white-btn" onclick="openBinModal()">+ Add Bin</button>
                    <button class="btn green-btn" onclick="openVehicleModal()">+ Add Vehicle</button>
                    <button class="btn outline-btn" onclick="openWorkerModal()">+ Add Worker</button>
                    <button class="btn outline-btn" onclick="openRouteModal()">+ Create Route</button>
                    <button class="btn outline-btn" onclick="refreshAllData()">↻ Refresh</button>
                </div>
            <!-- ================= AI WASTE PREDICTOR & COLLECTION PRIORITY SUITE ================= -->`;

const replacementStr = `                <div class="staff-actions-bar">
                    <button class="btn green-btn" onclick="scrollToDustbinTerminal()" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-weight: 800; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                        🗑️ Smart Dustbin Dashboard (ID &amp; Pass)
                    </button>
                    <button class="btn white-btn" onclick="openBinModal()">+ Add Bin</button>
                    <button class="btn green-btn" onclick="openVehicleModal()">+ Add Vehicle</button>
                    <button class="btn outline-btn" onclick="openWorkerModal()">+ Add Worker</button>
                    <button class="btn outline-btn" onclick="openRouteModal()">+ Create Route</button>
                    <button class="btn outline-btn" onclick="refreshAllData()">↻ Refresh</button>
                </div>
            </div>

            <!-- ==============================================================================
                 NEW: SMART DUSTBIN COMMAND TERMINAL & IOT SENSOR AI DASHBOARD (STAFF LAYER)
            ============================================================================== -->
            <section class="card dustbin-terminal-card" id="dustbinTerminalSection" style="margin-bottom: 25px; border: 2px solid #10b981; background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);">
                <!-- Terminal Header Banner -->
                <div class="section-head" style="margin-bottom: 16px; border-bottom: 1px solid #d1fae5; padding-bottom: 14px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 24px;">🗑️</span>
                            <h2 style="font-size: 20px; color: #064e3b; margin: 0;">Smart Dustbin IoT &amp; AI Telemetry Dashboard</h2>
                            <span class="badge" style="background: #10b981; color: white; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">STAFF UNIT ACCESS</span>
                            <span class="live" style="margin-left: 6px;"><span></span> SENSOR ACTIVE</span>
                        </div>
                        <p style="margin: 4px 0 0; color: #475569; font-size: 13px;">
                            Enter Dustbin ID and Security Passcode to inspect real-time sensor levels, track visitor footfall frequency, monitor AI time-to-full predictions, and dispatch automated communication staff alerts.
                        </p>
                    </div>
                </div>

                <!-- 1. DUSTBIN EMPLOYEE LOGIN / AUTHENTICATION CARD -->
                <div id="dustbinAuthCard" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 22px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                        <span style="font-size: 22px;">🔐</span>
                        <div>
                            <h3 style="margin: 0; font-size: 16px; color: #1e293b;">Dustbin Employee Access &amp; Authentication</h3>
                            <p style="margin: 0; font-size: 12px; color: #64748b;">Enter the unique Dustbin ID and its assigned security passcode to access unit dashboard.</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">DUSTBIN ID / CODE *</label>
                            <input type="text" id="dtBinCodeInput" class="form-control" placeholder="e.g. BIN-GOL-01" value="BIN-GOL-01" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 700; letter-spacing: 0.5px;">
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                                Quick Select: 
                                <a href="javascript:void(0)" onclick="setQuickDustbin('BIN-GOL-01')" style="color:#059669; font-weight:700;">BIN-GOL-01</a> • 
                                <a href="javascript:void(0)" onclick="setQuickDustbin('BIN-CMK-02')" style="color:#059669; font-weight:700;">BIN-CMK-02</a> • 
                                <a href="javascript:void(0)" onclick="setQuickDustbin('BIN-RLY-03')" style="color:#059669; font-weight:700;">BIN-RLY-03</a> • 
                                <a href="javascript:void(0)" onclick="setQuickDustbin('BIN-MED-05')" style="color:#059669; font-weight:700;">BIN-MED-05</a>
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">SECURITY PASSCODE / PIN *</label>
                            <div style="position: relative;">
                                <input type="password" id="dtPasscodeInput" class="form-control" placeholder="Enter Dustbin Passcode" value="BIN@2026" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px;">
                                <button type="button" onclick="togglePasscodeVisibility()" style="position: absolute; right: 8px; top: 8px; background: none; border: none; cursor: pointer; font-size: 14px;">👁️</button>
                            </div>
                            <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 4px;">
                                🔑 Default Passcode: <code>BIN@2026</code> (or <code>123456</code>)
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">STAFF EMPLOYEE ID</label>
                            <input type="text" id="dtStaffIdInput" class="form-control" placeholder="e.g. WST001" value="WST001" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px;">
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Municipal Waste Clearance Badge</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn green-btn" onclick="authenticateDustbinTerminal()" style="padding: 10px 24px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px;">
                            <span>🔓</span> Unlock Dustbin Dashboard
                        </button>
                        <button class="btn outline-btn" onclick="quickFillAndOpenDustbin('BIN-GOL-01')" style="padding: 10px 18px; font-size: 13px;">
                            ⚡ Demo Unlock (Golghar Bin)
                        </button>
                    </div>
                </div>

                <!-- 2. DEDICATED LIVE DUSTBIN DASHBOARD (UNLOCKED STATE) -->
                <div id="dustbinActiveDashboard" style="display: none;">
                    <!-- Sub-Navbar for Active Bin -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #064e3b; color: white; padding: 14px 20px; border-radius: 10px; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 24px;">🗑️</span>
                                <div>
                                    <h3 id="dtHeaderBinTitle" style="margin: 0; font-size: 17px; font-weight: 800; color: #ffffff;">BIN-GOL-01 • Golghar Market Square</h3>
                                    <p id="dtHeaderBinSubtitle" style="margin: 2px 0 0; font-size: 12px; color: #a7f3d0;">Ward 14 • Mixed Commercial Waste • Sensor Telemetry Streaming Live</p>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="live" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white;">
                                <span></span> LIVE TELEMETRY
                            </span>
                            <button class="small-btn" onclick="refreshDustbinTerminal(true)" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                ↻ Refresh Telemetry
                            </button>
                            <button class="small-btn" onclick="toggleSensorTester()" style="background: #eab308; color: #172033; font-weight: 800; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                🧪 Hardware Tester
                            </button>
                            <button class="small-btn" onclick="lockDustbinTerminal()" style="background: rgba(239, 68, 68, 0.8); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                🔒 Lock Bin
                            </button>
                        </div>
                    </div>

                    <!-- Critical Alert Banner (Auto-dispacthed by AI) -->
                    <div id="dtAlertBanner" style="display: none; background: #fee2e2; border: 2px solid #ef4444; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 28px;">🚨</span>
                                <div>
                                    <strong id="dtAlertTitle" style="font-size: 15px; color: #991b1b; display: block;">AUTOMATED NOTIFICATION SENT TO COMMUNICATION STAFF</strong>
                                    <span id="dtAlertDesc" style="font-size: 13px; color: #7f1d1d;">Dustbin is predicted to reach capacity shortly. Automated dispatch alert delivered to Control Room and Sanitation Driver.</span>
                                </div>
                            </div>
                            <button class="btn red-btn" onclick="dispatchCollectionNow()" style="padding: 8px 16px; font-size: 13px; font-weight: 800;">
                                🚛 Dispatch Vehicle Now
                            </button>
                        </div>
                    </div>

                    <!-- Top 4 Key Metrics Overview -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px;">
                        <!-- Metric 1: Current Fill Level -->
                        <div class="stat-card" style="border-left: 4px solid #10b981; background: #ffffff;">
                            <div class="stat-icon green">📊</div>
                            <div>
                                <h3 id="dtMetricFill" style="font-size: 24px; margin: 0;">78%</h3>
                                <p style="margin: 0; font-size: 12px; color: #64748b;">Current Waste Fill</p>
                                <span id="dtMetricFillStatus" class="status" style="background: #fef08a; color: #854d0e; font-size: 11px; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">Nearly Full</span>
                            </div>
                        </div>

                        <!-- Metric 2: AI Predicted Time to Full -->
                        <div class="stat-card" style="border-left: 4px solid #f59e0b; background: #ffffff;">
                            <div class="stat-icon yellow">⏳</div>
                            <div>
                                <h3 id="dtMetricTimeToFull" style="font-size: 22px; margin: 0; color: #d97706;">1h 35m</h3>
                                <p style="margin: 0; font-size: 12px; color: #64748b;">AI Time Until 100% Full</p>
                                <span id="dtMetricOverflowClock" style="font-size: 11px; color: #b45309; font-weight: 700; display: block; margin-top: 4px;">Full at ~01:45 PM</span>
                            </div>
                        </div>

                        <!-- Metric 3: Footfall / People Inflow Rate -->
                        <div class="stat-card" style="border-left: 4px solid #3b82f6; background: #ffffff;">
                            <div class="stat-icon light-green">👥</div>
                            <div>
                                <h3 id="dtMetricFootfall" style="font-size: 22px; margin: 0; color: #1d4ed8;">2.8 min</h3>
                                <p style="margin: 0; font-size: 12px; color: #64748b;">Footfall Frequency (1 person)</p>
                                <span id="dtMetricVisitorsHour" style="font-size: 11px; color: #2563eb; font-weight: 700; display: block; margin-top: 4px;">24 visitors in past hour</span>
                            </div>
                        </div>

                        <!-- Metric 4: Weight & Sensor Clearance -->
                        <div class="stat-card" style="border-left: 4px solid #8b5cf6; background: #ffffff;">
                            <div class="stat-icon green">⚖️</div>
                            <div>
                                <h3 id="dtMetricWeight" style="font-size: 22px; margin: 0; color: #6d28d9;">114.2 kg</h3>
                                <p style="margin: 0; font-size: 12px; color: #64748b;">Measured Waste Weight</p>
                                <span id="dtMetricDistance" style="font-size: 11px; color: #7c3aed; font-weight: 700; display: block; margin-top: 4px;">Sensor Distance: 26.4 cm</span>
                            </div>
                        </div>
                    </div>

                    <!-- 2-COLUMN MAIN CONTENT: (LEFT: Location & Visual Level, RIGHT: AI Predictions & Footfall) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
                        
                        <!-- LEFT COLUMN: Location Micro-Map & Physical Bin Visualizer -->
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            
                            <!-- Card: Dustbin Location & GPS Coordinates -->
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <h4 style="margin: 0; font-size: 15px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                        <span>📍</span> Dustbin Geo-Location &amp; Coordinates
                                    </h4>
                                    <span id="dtLocationWardBadge" style="background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Ward 14</span>
                                </div>

                                <div style="font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.6;">
                                    <div><strong>Address:</strong> <span id="dtLocationAddress">Golghar Central Market Square</span></div>
                                    <div><strong>Coordinates:</strong> <code id="dtLocationCoords">26.7606° N, 83.3732° E</code></div>
                                    <div><strong>Assigned Route:</strong> <span id="dtAssignedRoute">RT-GOL-01 (Golghar Commercial Loop)</span></div>
                                </div>

                                <!-- Leaflet Micro-Map -->
                                <div id="dustbinMiniMap" style="height: 220px; width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; z-index: 10;"></div>
                            </div>

                            <!-- Card: Physical Bin Visualizer & Sensor Telemetry -->
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                                <h4 style="margin: 0 0 12px; font-size: 15px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                    <span>🗑️</span> Waste Level &amp; IoT Sensor Diagnostics
                                </h4>

                                <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
                                    <!-- 3D Cylinder Fill Graphic -->
                                    <div style="width: 90px; height: 160px; border: 3px solid #334155; border-radius: 16px; position: relative; background: #f1f5f9; overflow: hidden; display: flex; flex-direction: column-reverse; box-shadow: inset 0 2px 8px rgba(0,0,0,0.15);">
                                        <div id="dtCylinderFill" style="width: 100%; height: 78%; background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); transition: height 0.6s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 15px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                                            78%
                                        </div>
                                        <div style="position: absolute; top: 6px; width: 100%; text-align: center; font-size: 9px; font-weight: 800; color: #64748b;">
                                            ULTRASONIC
                                        </div>
                                    </div>

                                    <!-- Hardware Specs List -->
                                    <div style="flex: 1; font-size: 13px; line-height: 1.8; color: #334155;">
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                                            <span>Capacity:</span>
                                            <strong id="dtDetailCapacity">500 Liters</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 4px 0;">
                                            <span>Ultrasonic Distance:</span>
                                            <strong id="dtDetailDistance">26.4 cm to garbage</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 4px 0;">
                                            <span>Current Weight:</span>
                                            <strong id="dtDetailWeight">114.2 kg (Load Cell)</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 4px 0;">
                                            <span>Lid Status:</span>
                                            <strong id="dtDetailLid" style="color: #15803d;">Closed (Intact)</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 4px 0;">
                                            <span>Battery / Solar:</span>
                                            <strong id="dtDetailBattery" style="color: #16a34a;">94% • Solar Active</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; padding-top: 4px;">
                                            <span>Ambient Temp:</span>
                                            <strong id="dtDetailTemp">29.8 °C</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- RIGHT COLUMN: AI Footfall Analytics & Time-To-Full Prediction -->
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            
                            <!-- Card: AI Footfall & Usage Rate ("Kitne time me kitne log aate hain") -->
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <h4 style="margin: 0; font-size: 15px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                        <span>👥</span> AI Footfall &amp; Visitor Deposit Analysis
                                    </h4>
                                    <span style="background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">PIR SENSOR DATA</span>
                                </div>

                                <p style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
                                    Tracks how frequently citizens visit this dustbin and correlates footfall velocity to garbage fill rate.
                                </p>

                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                                    <div style="font-size: 14px; font-weight: 800; color: #1e293b;" id="dtFootfallFrequencyText">
                                        ⚡ Avg 1 person deposits waste every 2.8 minutes
                                    </div>
                                    <div style="font-size: 12px; color: #059669; font-weight: 700; margin-top: 2px;" id="dtFootfallDensityText">
                                        High Density (Peak Market Rush Window)
                                    </div>
                                </div>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 14px;">
                                    <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px;">
                                        <div style="color: #64748b;">Visitors (Past 1 Hr):</div>
                                        <strong id="dtFootfall1Hr" style="font-size: 16px; color: #1e293b;">24 people</strong>
                                    </div>
                                    <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px;">
                                        <div style="color: #64748b;">Total Footfall (Today):</div>
                                        <strong id="dtFootfallToday" style="font-size: 16px; color: #1e293b;">142 people</strong>
                                    </div>
                                </div>

                                <!-- Hourly Footfall Distribution Visual -->
                                <div>
                                    <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                                        HOURLY FOOTFALL &amp; INFLOW SURGE:
                                    </div>
                                    <div id="dtHourlyChart" style="display: flex; align-items: flex-end; gap: 6px; height: 70px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
                                        <!-- Bars rendered by JS -->
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px;">
                                        <span>08:00 AM</span>
                                        <span>12:00 PM</span>
                                        <span>04:00 PM</span>
                                        <span>08:00 PM</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Card: AI Time-To-Full Prediction Engine ("Kitne time me full ho jayega") -->
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border-top: 4px solid #f59e0b;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <h4 style="margin: 0; font-size: 15px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                        <span>🧠</span> AI Time-To-Full Prediction Engine
                                    </h4>
                                    <span style="background: #fef3c7; color: #b45309; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px;">ML ACTIVE (94.6%)</span>
                                </div>

                                <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                                    <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">ESTIMATED TIME UNTIL 100% CAPACITY:</div>
                                    <div style="display: flex; align-items: baseline; gap: 8px; margin: 4px 0;">
                                        <span id="dtAITimeToFullBig" style="font-size: 28px; font-weight: 800; color: #b45309;">1 Hour 35 Minutes</span>
                                    </div>
                                    <div id="dtAIOverflowExact" style="font-size: 13px; font-weight: 700; color: #78350f;">
                                        Predicted Overflow: Today at ~01:45 PM
                                    </div>
                                </div>

                                <div style="font-size: 12px; color: #475569; line-height: 1.8;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Current Fill Rate:</span>
                                        <strong id="dtAIFillVelocity" style="color: #b45309;">+14.2% / hour</strong>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Remaining Headroom:</span>
                                        <strong id="dtAIRemainingPct">22% (approx 110 Liters)</strong>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>Recommended Dispatch:</span>
                                        <strong id="dtAIAction" style="color: #dc2626;">Immediate Vehicle Routing Required</strong>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    <!-- 3. AUTOMATED COMMUNICATION & NOTIFICATION DISPATCH LOG -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <h4 style="margin: 0; font-size: 15px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                    <span>📢</span> Automated Staff Communication &amp; Dispatch Feed
                                </h4>
                                <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
                                    When AI detects imminent capacity overflow (&lt; 2 hrs or &gt; 80%), notifications are automatically sent to communication and sanitation staff.
                                </p>
                            </div>

                            <div style="display: flex; gap: 8px;">
                                <button class="btn green-btn btn-sm" onclick="sendCommunicationAlertManual('EMERGENCY_CLEARANCE')" style="font-size: 12px; padding: 6px 12px;">
                                    🚨 Send Urgent Staff Alert
                                </button>
                                <button class="btn outline-btn btn-sm" onclick="dispatchCollectionNow()" style="font-size: 12px; padding: 6px 12px;">
                                    🚛 Dispatch Vehicle
                                </button>
                            </div>
                        </div>

                        <!-- Notification Log Table -->
                        <div class="table-responsive" style="max-height: 180px; overflow-y: auto;">
                            <table class="data-table" style="width: 100%; font-size: 12px; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                                        <th style="padding: 8px;">Time</th>
                                        <th style="padding: 8px;">Urgency</th>
                                        <th style="padding: 8px;">Message &amp; Reason</th>
                                        <th style="padding: 8px;">Channels</th>
                                        <th style="padding: 8px;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="dtNotificationsTbody">
                                    <tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">Loading communication notifications...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 4. IOT HARDWARE SENSOR SIMULATOR & EMBEDDED CODE VIEWER -->
                    <div id="dtHardwareSuite" style="background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <h4 style="margin: 0; font-size: 16px; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                                    <span>🔌</span> IoT Sensor Integration &amp; Hardware Code Suite
                                </h4>
                                <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">
                                    Collect data from real hardware (ESP32, HC-SR04, PIR, HX711) or simulate sensor packets right here in the browser.
                                </p>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <button class="small-btn" onclick="switchSensorTab('tab-sim')" id="btnTabSim" style="background: #0284c7; color: white;">⚡ Live Simulator</button>
                                <button class="small-btn" onclick="switchSensorTab('tab-esp32')" id="btnTabEsp32" style="background: #1e293b; color: #94a3b8;">📟 ESP32 Code</button>
                                <button class="small-btn" onclick="switchSensorTab('tab-python')" id="btnTabPython" style="background: #1e293b; color: #94a3b8;">🐍 Python Script</button>
                                <button class="small-btn" onclick="switchSensorTab('tab-curl')" id="btnTabCurl" style="background: #1e293b; color: #94a3b8;">💻 cURL API</button>
                            </div>
                        </div>

                        <!-- TAB 1: SENSOR SIMULATOR -->
                        <div id="sensorTab-sim" style="background: #1e293b; border-radius: 8px; padding: 16px;">
                            <div style="font-size: 13px; font-weight: 700; color: #e2e8f0; margin-bottom: 10px;">
                                🕹️ INTERACTIVE SENSOR TELEMETRY SIMULATOR
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px;">
                                <div>
                                    <label style="font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">
                                        ULTRASONIC DISTANCE TO TRASH (CM):
                                    </label>
                                    <input type="range" id="simDistanceRange" min="5" max="115" step="1" value="26" style="width: 100%;" oninput="updateSimDistanceLabel(this.value)">
                                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #38bdf8; font-weight: 700;">
                                        <span id="simDistanceVal">26 cm (78% Full)</span>
                                        <span>Empty: 120cm | Full: 10cm</span>
                                    </div>
                                </div>

                                <div>
                                    <label style="font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">
                                        PIR FOOTFALL DETECTED (PEOPLE):
                                    </label>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="btn white-btn btn-sm" onclick="addSimPeople(1)" style="flex: 1; font-size: 12px; color: #0f172a;">+1 Person</button>
                                        <button class="btn white-btn btn-sm" onclick="addSimPeople(5)" style="flex: 1; font-size: 12px; color: #0f172a;">+5 Rush</button>
                                        <span id="simPeopleCountVal" style="background: #0f172a; color: #38bdf8; font-weight: 800; padding: 6px 12px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center;">3</span>
                                    </div>
                                </div>

                                <div>
                                    <label style="font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">
                                        QUICK PRESETS:
                                    </label>
                                    <div style="display: flex; gap: 6px;">
                                        <button class="btn btn-sm" onclick="setSimPreset(15)" style="background: #ef4444; color: white; font-size: 11px; padding: 4px 8px;">🔴 88% Overflow</button>
                                        <button class="btn btn-sm" onclick="setSimPreset(45)" style="background: #f59e0b; color: white; font-size: 11px; padding: 4px 8px;">🟡 62% Half</button>
                                        <button class="btn btn-sm" onclick="setSimPreset(105)" style="background: #10b981; color: white; font-size: 11px; padding: 4px 8px;">🟢 12% Empty</button>
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                                <button class="btn green-btn" onclick="sendSimulatedTelemetryPacket()" style="font-weight: 800; font-size: 13px;">
                                    📡 Send Real-Time Sensor Telemetry Packet
                                </button>
                            </div>
                        </div>

                        <!-- TAB 2: ESP32 CODE -->
                        <div id="sensorTab-esp32" style="display: none; background: #020617; border-radius: 8px; padding: 14px; position: relative;">
                            <button onclick="copyCodeBlock('esp32CodeText')" style="position: absolute; right: 14px; top: 14px; background: #38bdf8; color: #0f172a; border: none; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; cursor: pointer;">📋 Copy Code</button>
                            <pre id="esp32CodeText" style="font-size: 11px; color: #94a3b8; max-height: 220px; overflow-y: auto; font-family: monospace;">// ESP32 Smart Dustbin IoT Telemetry Code
#include &lt;WiFi.h&gt;
#include &lt;HTTPClient.h&gt;
#include &lt;ArduinoJson.h&gt;

const char* SERVER_URL = "http://YOUR_SERVER_IP:5000/api/waste/dustbin-terminal/sensor-data";
const char* DUSTBIN_CODE = "BIN-GOL-01";
const char* API_KEY = "BIN@2026";

#define PIN_TRIG 5   // Ultrasonic HC-SR04 Trig
#define PIN_ECHO 18  // Ultrasonic HC-SR04 Echo
#define PIN_PIR  19  // PIR Motion Footfall Sensor

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_PIR, INPUT);
  WiFi.begin("WIFI_SSID", "WIFI_PASSWORD");
}

void loop() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 30000);
  float dist = (dur * 0.0343) / 2.0;
  int people = digitalRead(PIN_PIR);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"bin_code\":\"" + String(DUSTBIN_CODE) + "\",\"api_key\":\"" + String(API_KEY) + "\",\"distance_cm\":" + String(dist) + ",\"people_count_delta\":" + String(people) + "}";
  http.POST(payload);
  http.end();
  delay(15000);
}</pre>
                        </div>

                        <!-- TAB 3: PYTHON SCRIPT -->
                        <div id="sensorTab-python" style="display: none; background: #020617; border-radius: 8px; padding: 14px; position: relative;">
                            <button onclick="copyCodeBlock('pythonCodeText')" style="position: absolute; right: 14px; top: 14px; background: #38bdf8; color: #0f172a; border: none; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; cursor: pointer;">📋 Copy Script</button>
                            <pre id="pythonCodeText" style="font-size: 11px; color: #94a3b8; max-height: 220px; overflow-y: auto; font-family: monospace;"># Run from terminal: python scripts/simulate_dustbin_sensor.py
import urllib.request, json

url = "http://localhost:5000/api/waste/dustbin-terminal/sensor-data"
payload = {
    "bin_code": "BIN-GOL-01",
    "api_key": "BIN@2026",
    "distance_cm": 15.0, # 15cm from top = ~88% full
    "weight_kg": 132.0,
    "people_count_delta": 3,
    "temperature_c": 30.5,
    "battery_pct": 95
}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    print(resp.read().decode())</pre>
                        </div>

                        <!-- TAB 4: CURL -->
                        <div id="sensorTab-curl" style="display: none; background: #020617; border-radius: 8px; padding: 14px; position: relative;">
                            <button onclick="copyCodeBlock('curlCodeText')" style="position: absolute; right: 14px; top: 14px; background: #38bdf8; color: #0f172a; border: none; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; cursor: pointer;">📋 Copy cURL</button>
                            <pre id="curlCodeText" style="font-size: 11px; color: #38bdf8; max-height: 220px; overflow-y: auto; font-family: monospace;">curl -X POST http://localhost:5000/api/waste/dustbin-terminal/sensor-data \\
  -H "Content-Type: application/json" \\
  -d '{"bin_code":"BIN-GOL-01","api_key":"BIN@2026","distance_cm":18.5,"weight_kg":124.0,"people_count_delta":4}'</pre>
                        </div>

                    </div>
                </div>
            </section>
            <!-- ================= END SMART DUSTBIN COMMAND TERMINAL ================= -->

            <!-- ================= AI WASTE PREDICTOR & COLLECTION PRIORITY SUITE ================= -->`;

// Normalize CRLF to LF for matching, then replace and restore
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');
const normReplacement = replacementStr.replace(/\r\n/g, '\n');

if (!normContent.includes(normTarget)) {
    console.error("❌ Target not found in waste.html!");
    process.exit(1);
}

const updatedContent = normContent.replace(normTarget, normReplacement);
// Write back with CRLF
fs.writeFileSync(filePath, updatedContent.replace(/\n/g, '\r\n'), 'utf8');
console.log("✅ Successfully injected Smart Dustbin Terminal into waste.html!");

