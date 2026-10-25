const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const report = {
    CONFIRMED_MISSING: [],
    BROKEN_REFERENCE: [],
    MISSING_DEPENDENCY: [],
    MISSING_CONFIGURATION: [],
    INCOMPLETE_IMPLEMENTATION: [],
    OPTIONAL: [],
    VERIFIED_PRESENT: []
};

function checkFileExists(relPath, context, classification = 'CONFIRMED_MISSING') {
    const fullPath = path.resolve(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
        report[classification].push({
            file: relPath,
            context: context
        });
        return false;
    } else {
        report.VERIFIED_PRESENT.push({
            file: relPath,
            context: context
        });
        return true;
    }
}

// 1. Audit root package.json and backend/package.json scripts
console.log('Auditing package.json scripts...');
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
for (const [scriptName, cmd] of Object.entries(rootPkg.scripts || {})) {
    // extract any file paths like node path/to/file.js or python ...
    const tokens = cmd.split(/\s+/);
    for (const t of tokens) {
        if (t.endsWith('.js') || t.endsWith('.py') || t.endsWith('.sql')) {
            const cleanToken = t.replace(/['"]/g, '');
            checkFileExists(cleanToken, `root package.json script "${scriptName}"`);
        }
    }
}

const backendPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'backend', 'package.json'), 'utf8'));
for (const [scriptName, cmd] of Object.entries(backendPkg.scripts || {})) {
    const tokens = cmd.split(/\s+/);
    for (const t of tokens) {
        if (t.endsWith('.js') || t.endsWith('.py') || t.endsWith('.sql')) {
            const cleanToken = t.replace(/['"]/g, '');
            checkFileExists(path.join('backend', cleanToken), `backend package.json script "${scriptName}"`);
        }
    }
}

// 2. Audit scripts/run_all_tests.js test suites
console.log('Auditing run_all_tests.js test suites...');
const runAllContent = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'run_all_tests.js'), 'utf8');
const suiteFileMatches = runAllContent.match(/file:\s*["']([^"']+)["']/g) || [];
for (const m of suiteFileMatches) {
    const fileRel = m.replace(/file:\s*["']/, '').replace(/["']/, '');
    checkFileExists(fileRel, 'scripts/run_all_tests.js TEST_SUITES');
}

// 3. Audit batch and powershell scripts
console.log('Auditing batch and shell scripts...');
const batFiles = ['run.bat', 'build_apk.bat', 'build_apk.ps1', 'open_android.bat'];
for (const bf of batFiles) {
    if (checkFileExists(bf, 'Root project launch script')) {
        const content = fs.readFileSync(path.join(ROOT_DIR, bf), 'utf8');
        // check any referenced relative files
        const matches = content.match(/[\w\-\.\/\\]+\.(?:js|py|bat|json|apk|html)/gi) || [];
        for (const m of matches) {
            if (m.includes('/') || m.includes('\\')) {
                // likely a file path
                // skip output apk or dynamic variables
                if (m.includes('build\\outputs') || m.includes('%') || m.includes('$')) continue;
                const normalized = m.replace(/\\/g, '/');
                checkFileExists(normalized, `${bf} reference`);
            }
        }
    }
}

// 4. Audit capacitor.config.json
console.log('Auditing Capacitor config...');
const capConfigPath = path.join(ROOT_DIR, 'capacitor.config.json');
if (checkFileExists('capacitor.config.json', 'Mobile build config')) {
    const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
    if (capConfig.webDir) {
        checkFileExists(capConfig.webDir, 'capacitor.config.json webDir');
    }
}

// 5. Audit docker-compose.yml and Dockerfiles
console.log('Auditing Docker configuration...');
checkFileExists('docker-compose.yml', 'Container orchestration');
checkFileExists('backend/Dockerfile', 'Backend container build');
checkFileExists('frontend/Dockerfile', 'Frontend container build');
checkFileExists('ai_service/Dockerfile', 'AI Service container build');
checkFileExists('frontend/nginx.conf', 'Nginx web server reverse proxy config');

// 6. Audit all Frontend HTML files for local script, link, img, audio, video, source tags
console.log('Auditing Frontend HTML assets & references...');
function scanHtmlDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            scanHtmlDir(full);
        } else if (ent.name.endsWith('.html')) {
            const htmlContent = fs.readFileSync(full, 'utf8');
            const relHtml = path.relative(ROOT_DIR, full);
            
            // Regex for src and href
            const regex = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
            let match;
            while ((match = regex.exec(htmlContent)) !== null) {
                const url = match[1].trim();
                // ignore externals, anchors, protocols
                if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') ||
                    url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('data:') || url.startsWith('javascript:')) {
                    continue;
                }
                const cleanUrl = url.split('?')[0].split('#')[0];
                if (!cleanUrl) continue;
                // ignore backend api calls
                if (cleanUrl.startsWith('/api/') || cleanUrl.startsWith('api/') || cleanUrl.startsWith('/socket.io/')) continue;

                let resolvedPath;
                if (cleanUrl.startsWith('/')) {
                    resolvedPath = path.join(ROOT_DIR, 'frontend', cleanUrl);
                } else {
                    resolvedPath = path.resolve(path.dirname(full), cleanUrl);
                }

                const relTarget = path.relative(ROOT_DIR, resolvedPath);
                if (!fs.existsSync(resolvedPath)) {
                    report.BROKEN_REFERENCE.push({
                        sourceFile: relHtml,
                        referenced: url,
                        resolvedTarget: relTarget
                    });
                } else {
                    report.VERIFIED_PRESENT.push({
                        sourceFile: relHtml,
                        referenced: url,
                        target: relTarget
                    });
                }
            }
        }
    }
}
scanHtmlDir(path.join(ROOT_DIR, 'frontend'));

// 7. Audit Frontend CSS files for url() references
console.log('Auditing Frontend CSS url references...');
function scanCssDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            scanCssDir(full);
        } else if (ent.name.endsWith('.css')) {
            const cssContent = fs.readFileSync(full, 'utf8');
            const relCss = path.relative(ROOT_DIR, full);
            const urlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
            let match;
            while ((match = urlRegex.exec(cssContent)) !== null) {
                const url = match[1].trim();
                if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('data:')) {
                    continue;
                }
                const cleanUrl = url.split('?')[0].split('#')[0];
                if (!cleanUrl) continue;

                let resolvedPath;
                if (cleanUrl.startsWith('/')) {
                    resolvedPath = path.join(ROOT_DIR, 'frontend', cleanUrl);
                } else {
                    resolvedPath = path.resolve(path.dirname(full), cleanUrl);
                }
                const relTarget = path.relative(ROOT_DIR, resolvedPath);
                if (!fs.existsSync(resolvedPath)) {
                    report.BROKEN_REFERENCE.push({
                        sourceFile: relCss,
                        referenced: url,
                        resolvedTarget: relTarget
                    });
                } else {
                    report.VERIFIED_PRESENT.push({
                        sourceFile: relCss,
                        referenced: url,
                        target: relTarget
                    });
                }
            }
        }
    }
}
scanCssDir(path.join(ROOT_DIR, 'frontend'));

// 8. Audit Backend Routes & Controllers
console.log('Auditing Backend routes, controllers, models, and services...');
function scanBackendJs(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === 'uploads') continue;
            scanBackendJs(full);
        } else if (ent.name.endsWith('.js')) {
            const content = fs.readFileSync(full, 'utf8');
            const relJs = path.relative(ROOT_DIR, full);
            const reqRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
            let match;
            while ((match = reqRegex.exec(content)) !== null) {
                const reqPath = match[1].trim();
                if (reqPath.startsWith('.')) {
                    const resolved = path.resolve(path.dirname(full), reqPath);
                    const candidates = [
                        resolved,
                        resolved + '.js',
                        resolved + '.json',
                        path.join(resolved, 'index.js'),
                        path.join(resolved, 'index.json')
                    ];
                    let found = false;
                    for (const cand of candidates) {
                        if (fs.existsSync(cand)) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        report.BROKEN_REFERENCE.push({
                            sourceFile: relJs,
                            referenced: reqPath,
                            resolvedTarget: path.relative(ROOT_DIR, resolved)
                        });
                    } else {
                        report.VERIFIED_PRESENT.push({
                            sourceFile: relJs,
                            referenced: reqPath
                        });
                    }
                }
            }
        }
    }
}
scanBackendJs(path.join(ROOT_DIR, 'backend'));

// 9. Audit AI Service python imports & files
console.log('Auditing AI Service Python module structure...');
function scanPyDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === '__pycache__' || ent.name === '.pytest_cache') continue;
            scanPyDir(full);
        } else if (ent.name.endsWith('.py')) {
            const content = fs.readFileSync(full, 'utf8');
            const relPy = path.relative(ROOT_DIR, full);
            
            // Check relative imports like from . import xyz or from ..xyz import abc
            const relImportRegex = /from\s+(\.+[\w\.]*)\s+import/g;
            let match;
            while ((match = relImportRegex.exec(content)) !== null) {
                const dotPath = match[1];
                report.VERIFIED_PRESENT.push({
                    sourceFile: relPy,
                    relImport: dotPath
                });
            }
        }
    }
}
scanPyDir(path.join(ROOT_DIR, 'ai_service'));

// 10. Audit Environment configurations
console.log('Auditing Environment templates...');
checkFileExists('.env.example', 'Root Environment Example', 'MISSING_CONFIGURATION');
checkFileExists('backend/.env.example', 'Backend Environment Example', 'MISSING_CONFIGURATION');
checkFileExists('ai_service/.env.example', 'AI Service Environment Example', 'MISSING_CONFIGURATION');
checkFileExists('docker.env.example', 'Docker Environment Example', 'MISSING_CONFIGURATION');

// Summary
console.log('\n=============================================');
console.log('           AUDIT RESULTS SUMMARY             ');
console.log('=============================================');
console.log(`CONFIRMED_MISSING:        ${report.CONFIRMED_MISSING.length}`);
console.log(`BROKEN_REFERENCE:         ${report.BROKEN_REFERENCE.length}`);
console.log(`MISSING_DEPENDENCY:       ${report.MISSING_DEPENDENCY.length}`);
console.log(`MISSING_CONFIGURATION:    ${report.MISSING_CONFIGURATION.length}`);
console.log(`INCOMPLETE_IMPLEMENTATION:${report.INCOMPLETE_IMPLEMENTATION.length}`);
console.log(`OPTIONAL:                 ${report.OPTIONAL.length}`);
console.log(`VERIFIED_PRESENT:         ${report.VERIFIED_PRESENT.length}`);

fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'deep_audit_results.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('Results written to scratch/deep_audit_results.json');
