const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const findings = {
    CONFIRMED_MISSING: [],
    BROKEN_REFERENCE: [],
    MISSING_DEPENDENCY: [],
    MISSING_CONFIGURATION: [],
    INCOMPLETE_IMPLEMENTATION: [],
    OPTIONAL: [],
    VERIFIED_PRESENT: []
};

// 1. Audit Backend JS requires
function auditBackendRequires() {
    const backendFiles = getAllFiles(path.join(ROOT_DIR, 'backend'), ['.js']);
    const scriptsFiles = getAllFiles(path.join(ROOT_DIR, 'scripts'), ['.js']);
    const allJsFiles = [...backendFiles, ...scriptsFiles];

    const packageJsonPath = path.join(ROOT_DIR, 'backend', 'package.json');
    const rootPackageJsonPath = path.join(ROOT_DIR, 'package.json');
    const backendPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const rootPkg = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));

    const installedDeps = new Set([
        ...Object.keys(backendPkg.dependencies || {}),
        ...Object.keys(backendPkg.devDependencies || {}),
        ...Object.keys(rootPkg.dependencies || {}),
        ...Object.keys(rootPkg.devDependencies || {}),
        'fs', 'path', 'http', 'https', 'crypto', 'os', 'child_process', 'url', 'events', 'stream', 'util', 'assert', 'zlib', 'buffer'
    ]);

    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const filePath of allJsFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        while ((match = requireRegex.exec(content)) !== null) {
            const reqPath = match[1];
            if (reqPath.startsWith('.')) {
                // Relative require
                const resolved = path.resolve(path.dirname(filePath), reqPath);
                let exists = false;
                const candidates = [
                    resolved,
                    resolved + '.js',
                    resolved + '.json',
                    path.join(resolved, 'index.js'),
                    path.join(resolved, 'index.json')
                ];
                for (const c of candidates) {
                    if (fs.existsSync(c)) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    findings.BROKEN_REFERENCE.push({
                        type: 'LOCAL_REQUIRE',
                        sourceFile: path.relative(ROOT_DIR, filePath),
                        referenced: reqPath,
                        candidatePaths: candidates.map(c => path.relative(ROOT_DIR, c))
                    });
                } else {
                    findings.VERIFIED_PRESENT.push({
                        type: 'LOCAL_REQUIRE',
                        sourceFile: path.relative(ROOT_DIR, filePath),
                        referenced: reqPath
                    });
                }
            } else {
                // Dependency require
                const baseModule = reqPath.startsWith('@') ? reqPath.split('/').slice(0, 2).join('/') : reqPath.split('/')[0];
                if (!installedDeps.has(baseModule)) {
                    findings.MISSING_DEPENDENCY.push({
                        type: 'NPM_PACKAGE',
                        sourceFile: path.relative(ROOT_DIR, filePath),
                        referenced: baseModule,
                        fullRequire: reqPath
                    });
                } else {
                    findings.VERIFIED_PRESENT.push({
                        type: 'NPM_PACKAGE',
                        sourceFile: path.relative(ROOT_DIR, filePath),
                        referenced: baseModule
                    });
                }
            }
        }
    }
}

// 2. Audit Frontend HTML references (<script src="...">, <link href="...">, <img src="...">)
function auditFrontendHtml() {
    const htmlFiles = getAllFiles(path.join(ROOT_DIR, 'frontend'), ['.html']);

    const srcRegex = /(?:src|href)\s*=\s*['"]([^'"]+)['"]/g;

    for (const filePath of htmlFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        while ((match = srcRegex.exec(content)) !== null) {
            const ref = match[1];
            if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('//') || ref.startsWith('data:') || ref.startsWith('#') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('javascript:')) {
                continue;
            }

            // Clean query or hash
            const cleanRef = ref.split('?')[0].split('#')[0];
            if (!cleanRef) continue;

            let resolved;
            if (cleanRef.startsWith('/')) {
                // Root relative to frontend dir
                resolved = path.join(ROOT_DIR, 'frontend', cleanRef);
            } else {
                resolved = path.resolve(path.dirname(filePath), cleanRef);
            }

            // Exclude proxy routes
            if (cleanRef.startsWith('/api/') || cleanRef.startsWith('/socket.io/') || cleanRef.startsWith('api/')) {
                continue;
            }

            if (!fs.existsSync(resolved)) {
                findings.BROKEN_REFERENCE.push({
                    type: 'FRONTEND_HTML_ASSET',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: ref,
                    resolvedPath: path.relative(ROOT_DIR, resolved)
                });
            } else {
                findings.VERIFIED_PRESENT.push({
                    type: 'FRONTEND_HTML_ASSET',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: ref
                });
            }
        }
    }
}

// 3. Audit CSS url() references
function auditFrontendCss() {
    const cssFiles = getAllFiles(path.join(ROOT_DIR, 'frontend'), ['.css']);
    const urlRegex = /url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/g;

    for (const filePath of cssFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            const ref = match[1];
            if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('//') || ref.startsWith('data:')) {
                continue;
            }
            const cleanRef = ref.split('?')[0].split('#')[0];
            if (!cleanRef) continue;

            let resolved;
            if (cleanRef.startsWith('/')) {
                resolved = path.join(ROOT_DIR, 'frontend', cleanRef);
            } else {
                resolved = path.resolve(path.dirname(filePath), cleanRef);
            }

            if (!fs.existsSync(resolved)) {
                findings.BROKEN_REFERENCE.push({
                    type: 'CSS_URL',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: ref,
                    resolvedPath: path.relative(ROOT_DIR, resolved)
                });
            } else {
                findings.VERIFIED_PRESENT.push({
                    type: 'CSS_URL',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: ref
                });
            }
        }
    }
}

// 4. Audit Docker and Compose files
function auditDocker() {
    const composePath = path.join(ROOT_DIR, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
        const content = fs.readFileSync(composePath, 'utf8');
        // Check volume mounts: - ./path:target
        const volRegex = /-\s+([.\/\w\-_]+):([.\/\w\-_]+)/g;
        let match;
        while ((match = volRegex.exec(content)) !== null) {
            const hostPath = match[1];
            if (hostPath.startsWith('.')) {
                const resolved = path.resolve(ROOT_DIR, hostPath);
                if (!fs.existsSync(resolved)) {
                    findings.CONFIRMED_MISSING.push({
                        type: 'DOCKER_VOLUME_HOST_PATH',
                        sourceFile: 'docker-compose.yml',
                        referenced: hostPath,
                        resolvedPath: path.relative(ROOT_DIR, resolved)
                    });
                } else {
                    findings.VERIFIED_PRESENT.push({
                        type: 'DOCKER_VOLUME_HOST_PATH',
                        sourceFile: 'docker-compose.yml',
                        referenced: hostPath
                    });
                }
            }
        }

        // Check Dockerfile contexts
        const contextRegex = /context:\s*([.\/\w\-_]+)/g;
        while ((match = contextRegex.exec(content)) !== null) {
            const ctxPath = match[1];
            const resolved = path.resolve(ROOT_DIR, ctxPath);
            if (!fs.existsSync(resolved)) {
                findings.CONFIRMED_MISSING.push({
                    type: 'DOCKER_CONTEXT_PATH',
                    sourceFile: 'docker-compose.yml',
                    referenced: ctxPath,
                    resolvedPath: path.relative(ROOT_DIR, resolved)
                });
            }
        }
    }
}

// 5. Audit Python AI service requirements, files, and imports
function auditPythonService() {
    const pyDir = path.join(ROOT_DIR, 'ai_service');
    if (!fs.existsSync(pyDir)) return;

    const pyFiles = getAllFiles(pyDir, ['.py']);
    const reqPath = path.join(pyDir, 'requirements.txt');
    const reqContent = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf8') : '';
    const reqLines = reqContent.split('\n').map(l => l.trim().split('==')[0].split('>=')[0].toLowerCase()).filter(Boolean);
    const reqSet = new Set(reqLines);

    // standard library
    const stdLib = new Set(['os', 'sys', 'time', 'datetime', 'json', 'math', 'random', 'logging', 're', 'pathlib', 'typing', 'collections', 'itertools', 'functools', 'copy', 'hashlib', 'sqlite3', 'urllib', 'http', 'asyncio', 'socket']);

    const importRegex = /(?:from|import)\s+([\w\.]+)/g;

    for (const filePath of pyFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const mod = match[1].split('.')[0];
            if (stdLib.has(mod)) continue;

            // Check if local file or directory
            const localPy = path.join(path.dirname(filePath), mod + '.py');
            const localDir = path.join(path.dirname(filePath), mod);
            const aiDirPy = path.join(pyDir, mod + '.py');
            const aiDirDir = path.join(pyDir, mod);
            if (fs.existsSync(localPy) || fs.existsSync(localDir) || fs.existsSync(aiDirPy) || fs.existsSync(aiDirDir)) {
                findings.VERIFIED_PRESENT.push({
                    type: 'PYTHON_LOCAL_MODULE',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: mod
                });
                continue;
            }

            // Normalise common pkg names
            let pkgName = mod.toLowerCase();
            if (pkgName === 'sklearn') pkgName = 'scikit-learn';
            if (pkgName === 'cv2') pkgName = 'opencv-python';
            if (pkgName === 'dotenv') pkgName = 'python-dotenv';
            if (pkgName === 'jose') pkgName = 'python-jose';

            if (!reqSet.has(pkgName)) {
                findings.MISSING_DEPENDENCY.push({
                    type: 'PYTHON_REQUIREMENT',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: mod,
                    mappedPackage: pkgName
                });
            } else {
                findings.VERIFIED_PRESENT.push({
                    type: 'PYTHON_REQUIREMENT',
                    sourceFile: path.relative(ROOT_DIR, filePath),
                    referenced: mod
                });
            }
        }
    }
}

// 6. Audit Database Scripts in package.json and init_db.js
function auditDatabaseScripts() {
    const initDbPath = path.join(ROOT_DIR, 'backend', 'database', 'init_db.js');
    if (fs.existsSync(initDbPath)) {
        const content = fs.readFileSync(initDbPath, 'utf8');
        // Check for referenced sql or js files in init_db.js
        const fileRefRegex = /['"]([^'"]+\.(?:sql|js))['"]/g;
        let match;
        while ((match = fileRefRegex.exec(content)) !== null) {
            const ref = match[1];
            if (ref.startsWith('.')) {
                const resolved = path.resolve(path.dirname(initDbPath), ref);
                if (!fs.existsSync(resolved)) {
                    findings.CONFIRMED_MISSING.push({
                        type: 'INIT_DB_SCRIPT_REF',
                        sourceFile: 'backend/database/init_db.js',
                        referenced: ref,
                        resolvedPath: path.relative(ROOT_DIR, resolved)
                    });
                } else {
                    findings.VERIFIED_PRESENT.push({
                        type: 'INIT_DB_SCRIPT_REF',
                        sourceFile: 'backend/database/init_db.js',
                        referenced: ref
                    });
                }
            }
        }
    }
}

// 7. Audit Environment Configuration files
function auditEnvironment() {
    const envExamplePath = path.join(ROOT_DIR, '.env.example');
    const backendEnvExamplePath = path.join(ROOT_DIR, 'backend', '.env.example');
    const aiEnvExamplePath = path.join(ROOT_DIR, 'ai_service', '.env.example');

    if (!fs.existsSync(envExamplePath)) {
        findings.MISSING_CONFIGURATION.push({
            type: 'ENV_EXAMPLE',
            file: '.env.example'
        });
    }
    if (!fs.existsSync(backendEnvExamplePath)) {
        findings.MISSING_CONFIGURATION.push({
            type: 'ENV_EXAMPLE',
            file: 'backend/.env.example'
        });
    }
    if (!fs.existsSync(aiEnvExamplePath)) {
        findings.MISSING_CONFIGURATION.push({
            type: 'ENV_EXAMPLE',
            file: 'ai_service/.env.example'
        });
    }
}

// Helper: recursive file getter excluding node_modules, .git, etc.
function getAllFiles(dir, exts) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (file === 'node_modules' || file === '.git' || file === '__pycache__' || file === '.pytest_cache') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath, exts));
        } else {
            const ext = path.extname(file).toLowerCase();
            if (exts.includes(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

// Execute all audits
console.log('--- AUDITING CODEBASE REFERENCES ---');
auditBackendRequires();
auditFrontendHtml();
auditFrontendCss();
auditDocker();
auditPythonService();
auditDatabaseScripts();
auditEnvironment();

console.log('\n--- AUDIT SUMMARY ---');
console.log('CONFIRMED_MISSING:', findings.CONFIRMED_MISSING.length);
console.log('BROKEN_REFERENCE:', findings.BROKEN_REFERENCE.length);
console.log('MISSING_DEPENDENCY:', findings.MISSING_DEPENDENCY.length);
console.log('MISSING_CONFIGURATION:', findings.MISSING_CONFIGURATION.length);
console.log('INCOMPLETE_IMPLEMENTATION:', findings.INCOMPLETE_IMPLEMENTATION.length);
console.log('OPTIONAL:', findings.OPTIONAL.length);
console.log('VERIFIED_PRESENT:', findings.VERIFIED_PRESENT.length);

const outPath = path.join(ROOT_DIR, 'scratch', 'audit_findings_raw.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2), 'utf8');
console.log(`\nDetailed findings written to ${outPath}`);
