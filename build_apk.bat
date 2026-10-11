@echo off
echo ========================================================
echo   SmartCity AI - Android APK Builder & Sync Tool
echo ========================================================
echo.

echo [1/3] Syncing latest frontend code into Android project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Failed to sync web assets.
    pause
    exit /b %errorlevel%
)
echo [SUCCESS] Frontend assets synced!
echo.

echo [2/3] Checking Gradle and Android Environment...
cd android
if exist "gradlew.bat" (
    echo Building debug APK via Gradle...
    call gradlew.bat assembleDebug
    if %errorlevel% equ 0 (
        echo.
        echo ========================================================
        echo [SUCCESS] APK Generated Successfully!
        echo APK Path: android\app\build\outputs\apk\debug\app-debug.apk
        echo ========================================================
        cd ..
        pause
        exit /b 0
    ) else (
        echo.
        echo [INFO] Direct Gradle CLI build requires Android SDK installed on your system.
        echo You can open this project in Android Studio to build the APK with 1-click:
        echo    Run: npm run mobile:open
        echo    Then: Build menu -^> Build Bundle(s) / APK(s) -^> Build APK(s)
        cd ..
        pause
        exit /b 0
    )
) else (
    echo [ERROR] android/gradlew.bat not found.
    cd ..
    pause
    exit /b 1
)
