const fs = require('fs');
const path = 'frontend/pages/emergency/emergency.css';
let content = fs.readFileSync(path, 'utf8');

const ambulanceCss = `
/* =====================================================
   HOSPITAL AMBULANCE NETWORK DISPATCH & TRACKING (EMERGENCY)
===================================================== */

.ambulance-modal-box {
    width: 960px !important;
    max-width: 95% !important;
    max-height: 90vh !important;
    overflow-y: auto !important;
    padding: 28px !important;
    border-radius: 20px !important;
    background: #0f172a !important;
    color: #f8fafc !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.7) !important;
}

.ambulance-modal-box h2 {
    color: #ffffff !important;
    font-size: 22px !important;
    font-weight: 800 !important;
}

.ambulance-modal-box .close-btn {
    color: #94a3b8 !important;
    font-size: 28px !important;
    top: 18px !important;
    right: 20px !important;
    transition: color 0.2s ease !important;
    line-height: 1;
}

.ambulance-modal-box .close-btn:hover {
    color: #ffffff !important;
}

.ambulance-request-bar {
    margin: 12px 0 16px;
}

.emergency-request-btn {
    width: 100%;
    border: 0;
    padding: 14px 18px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #ffffff;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
    transition: all 0.2s ease;
}

.emergency-request-btn:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(239, 68, 68, 0.5);
}

.emergency-request-panel {
    margin-top: 14px;
    padding: 18px;
    border-radius: 14px;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: grid;
    gap: 12px;
}

.emergency-request-panel .match-lists {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

@media (max-width: 680px) {
    .emergency-request-panel .match-lists {
        grid-template-columns: 1fr;
    }
}

.match-list h4 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 700;
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.match-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.match-item:hover {
    border-color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
}

.match-item.selected {
    border-color: #38bdf8;
    background: rgba(56, 189, 248, 0.15);
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3);
}

.match-item strong {
    display: block;
    color: #f8fafc;
    font-size: 13px;
}

.match-item small {
    display: block;
    color: #94a3b8;
    font-size: 11px;
}

.match-item .distance-pill {
    font-size: 11px;
    font-weight: 700;
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 3px 8px;
    border-radius: 999px;
    white-space: nowrap;
}

.inline-msg {
    font-size: 13px;
    padding: 12px 14px;
    border-radius: 10px;
    line-height: 1.5;
}

.inline-msg.info { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
.inline-msg.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.inline-msg.error { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
.inline-msg.success { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

.ambulance-map {
    width: 100%;
    height: 380px;
    min-height: 340px;
    border-radius: 14px;
    overflow: hidden;
    margin: 16px 0;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: #020617;
}

.ambulance-marker {
    font-size: 28px;
    line-height: 1;
    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));
}

.ambulance-popup h3 {
    margin: 0 0 6px;
    font-size: 14px;
    color: #0f172a;
}

.ambulance-popup p {
    margin: 4px 0;
    font-size: 12px;
    color: #334155;
}

.ambulance-route-panel {
    margin: 14px 0;
    display: grid;
    gap: 12px;
}

.ambulance-route-panel:empty {
    margin: 0;
}

.route-status-timeline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.route-status-step {
    flex: 1;
    min-width: 100px;
    text-align: center;
    padding: 8px 6px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    background: rgba(255, 255, 255, 0.04);
}

.route-status-step.done {
    color: #ffffff;
    background: #16a34a;
}

.route-status-step.current {
    color: #0f172a;
    background: #fbbf24;
    font-weight: 700;
}

.route-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
    font-weight: 600;
    font-size: 13px;
}

.route-panel-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.route-panel-actions button {
    flex: 1;
    min-width: 140px;
    border: 0;
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s ease;
}

.route-panel-actions .advance-btn { background: #3b82f6; color: #fff; }
.route-panel-actions .advance-btn:hover { background: #2563eb; }
.route-panel-actions .refresh-btn { background: rgba(255, 255, 255, 0.1); color: #f8fafc; }
.route-panel-actions .refresh-btn:hover { background: rgba(255, 255, 255, 0.18); }
.route-panel-actions .reset-btn { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.route-panel-actions .reset-btn:hover { background: rgba(239, 68, 68, 0.35); }

.ambulance-list {
    display: grid;
    gap: 12px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
}

.ambulance-card {
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    background: rgba(30, 41, 59, 0.6);
}

.ambulance-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.ambulance-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(239, 68, 68, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}

.ambulance-card-header h3 {
    margin: 0 0 4px;
    font-size: 15px;
    color: #f8fafc;
}

.ambulance-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
}

.ambulance-status i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
}

.ambulance-status.emergency i { background: #ef4444; }
.ambulance-status.maintenance i { background: #f59e0b; }
.ambulance-status.offline i { background: #64748b; }

.ambulance-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 14px 0;
}

@media (max-width: 600px) {
    .ambulance-details { grid-template-columns: 1fr 1fr; }
}

.ambulance-details div {
    padding: 10px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.ambulance-details span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    margin-bottom: 3px;
}

.ambulance-details strong {
    font-size: 13px;
    color: #f8fafc;
}

.track-live-btn {
    width: 100%;
    border: 0;
    padding: 10px;
    border-radius: 8px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: background 0.2s ease;
}

.track-live-btn:hover {
    background: #1d4ed8;
}
`;

if (!content.includes('.ambulance-modal-box')) {
    content += '\n' + ambulanceCss;
    fs.writeFileSync(path, content, 'utf8');
    console.log('Appended ambulance styles to emergency.css');
} else {
    console.log('ambulance styles already in emergency.css');
}

