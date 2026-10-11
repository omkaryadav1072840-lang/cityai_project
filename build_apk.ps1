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

Write-Host "[2/3] Checking Android build..." -ForegroundColor Yellow
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
        Write-Host "[INFO] Direct Gradle CLI build requires Android SDK installed on your system." -ForegroundColor Yellow
        Write-Host "To build APK with 1-click in Android Studio:" -ForegroundColor Cyan
        Write-Host "  1. Run: .\open_android.bat (or npm run mobile:open)" -ForegroundColor White
        Write-Host "  2. In Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor White
    }
}
Set-Location -Path $originalDir
