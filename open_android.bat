@echo off
echo ========================================================
echo   SmartCity AI - Open Android Studio Project
echo ========================================================
echo.
echo Syncing web assets...
call npx cap sync android
echo.
echo Opening project in Android Studio...
call npx cap open android
pause
