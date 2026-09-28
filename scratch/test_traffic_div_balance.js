const fs = require('fs');

let html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

// 1. Remove line 322 duplicate <div id="layer-citizen-content">
const p1 = `    <!-- =========================================================
         LAYER 1: CITIZEN / USER LAYER
    ========================================================= -->
    <div id="layer-citizen-content">
        <div class="two-column-grid">`;

const r1 = `    <!-- =========================================================
         LAYER 1: CITIZEN / USER LAYER
    ========================================================= -->
        <div class="two-column-grid">`;

// Handle CRLF and LF
html = html.replace(p1.replace(/\n/g, '\r\n'), r1.replace(/\n/g, '\r\n'));
html = html.replace(p1, r1);

// 2. Add the 3 missing </div> tags before Webster's engine
const p2 = `                        <button class="btn-secondary btn-sm" onclick="applyManualOverride('RESTORE_AUTO')" style="color: #16a34a; font-weight: 700;">
                            🔄 Restore Auto
                        </button>
            <!-- ================= WEBSTER'S OPTIMUM SIGNAL TIMING ENGINE ================= -->`;

const r2 = `                        <button class="btn-secondary btn-sm" onclick="applyManualOverride('RESTORE_AUTO')" style="color: #16a34a; font-weight: 700;">
                            🔄 Restore Auto
                        </button>
                    </div>
                </div>
            </div>
            <!-- ================= WEBSTER'S OPTIMUM SIGNAL TIMING ENGINE ================= -->`;

html = html.replace(p2.replace(/\n/g, '\r\n'), r2.replace(/\n/g, '\r\n'));
html = html.replace(p2, r2);

// 3. Add missing </div> at line 1482 before modal-anpr-evidence
const p3 = `        </div>
    </div>
<!-- 7. ANPR Optical Evidence Inspection Modal -->`;

const r3 = `        </div>
    </div>
</div>
<!-- 7. ANPR Optical Evidence Inspection Modal -->`;

html = html.replace(p3.replace(/\n/g, '\r\n'), r3.replace(/\n/g, '\r\n'));
html = html.replace(p3, r3);

// Verify div balance
const lines = html.split(/\r?\n/);
const stack = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const regex = /<\/?div[^>]*>/g;
    let match;
    while ((match = regex.exec(l)) !== null) {
        const tag = match[0];
        if (tag.startsWith('</')) {
            if (stack.length === 0) {
                console.log('Extra </div> at line', (i+1));
            } else {
                stack.pop();
            }
        } else {
            stack.push({ line: i + 1, content: l.trim().substring(0, 70) });
        }
    }
}

console.log('Unclosed divs count after fix:', stack.length);
stack.forEach(s => console.log('Line ' + s.line + ': ' + s.content));
