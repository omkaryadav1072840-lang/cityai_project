Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SmartCity AI - Android APK Builder & Sync Tool" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Syncing latest frontend code into Android project..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to sync web assets." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[SUCCESS] Frontend assets synced!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Checking Java runtime environment..." -ForegroundColor Yellow

# Search for compatible JDK 17 or 21
$compatibleJdkFound = $false
$candidatePaths = @(
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Android\Android Studio\jre",
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Eclipse Adoptium\jdk-21*",
    "C:\Program Files\Microsoft\jdk-17*",
    "C:\Program Files\Microsoft\jdk-21*",
    "C:\Program Files\Java\jdk-17*",
    "C:\Program Files\Java\jdk-21*",
    "C:\Program Files\Amazon Corretto\jdk17*",
    "C:\Program Files\Amazon Corretto\jdk21*"
)

foreach ($pattern in $candidatePaths) {
    $resolved = Get-Item -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($resolved -and (Test-Path "$($resolved.FullName)\bin\java.exe")) {
        $env:JAVA_HOME = $resolved.FullName
        $env:PATH = "$($resolved.FullName)\bin;$env:PATH"
        Write-Host "[INFO] Using compatible JDK: $($resolved.FullName)" -ForegroundColor Green
        $compatibleJdkFound = $true
        break
    }
}

# Check current active Java version
$javaVersionOutput = & java -version 2>&1 | Out-String
$isJava26OrHigher = $javaVersionOutput -match 'version "(2[2-9]|[3-9]\d)'

if ($isJava26OrHigher -and -not $compatibleJdkFound) {
    Write-Host ""
    Write-Host "[WARNING] Java 26+ detected ($($javaVersionOutput.Trim().Split("`n")[0]))" -ForegroundColor Yellow
    Write-Host "Gradle & Android Gradle Plugin 8.x do not support Java 26 (Class file major version 70)." -ForegroundColor Yellow
    Write-Host "Android builds strictly require Java 17 or Java 21 LTS." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick Solutions:" -ForegroundColor Cyan
    Write-Host "  1. (Recommended) Install JDK 17 with 1-click via winget:" -ForegroundColor White
    Write-Host "     winget install EclipseAdoptium.Temurin.17.JDK --accept-package-agreements --accept-source-agreements" -ForegroundColor Green
    Write-Host "  2. Open in Android Studio (uses built-in JBR 17):" -ForegroundColor White
    Write-Host "     Run: .\open_android.bat (then Build -> Build APK)" -ForegroundColor Green
    Write-Host "  3. Cloud Auto-Build (Free GitHub Actions):" -ForegroundColor White
    Write-Host "     Push to GitHub - `.github/workflows/build-apk.yml` builds the APK automatically!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "[3/3] Checking Android build..." -ForegroundColor Yellow
$originalDir = Get-Location
Set-Location -Path "$PSScriptRoot\android"

if (Test-Path "gradlew.bat") {
    Write-Host "Running Gradle build..." -ForegroundColor Cyan
    cmd.exe /c "gradlew.bat assembleDebug"
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================================" -ForegroundColor Green
        Write-Host "[SUCCESS] APK Generated Successfully!" -ForegroundColor Green
        Write-Host "APK Location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
        Write-Host "========================================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[INFO] Gradle build finished with exit code $LASTEXITCODE." -ForegroundColor Yellow
        Write-Host "To build APK with 1-click in Android Studio:" -ForegroundColor Cyan
        Write-Host "  1. Run: .\open_android.bat (or npm run mobile:open)" -ForegroundColor White
        Write-Host "  2. In Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor White
    }
}
Set-Location -Path $originalDir

