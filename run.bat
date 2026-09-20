@echo off
title SmartCity AI Platform
echo ===================================================
echo   Starting SmartCity AI Server & Connecting Backend
echo ===================================================
echo.
echo 1. Launching Node.js Backend Server on Port 5000...
start cmd /k "node backend/server.js"
timeout /t 2 /nobreak >nul
echo 2. Opening SmartCity AI in your default browser...
start http://localhost:5000
echo.
echo ===================================================
echo   SmartCity AI is now LIVE at http://localhost:5000
echo ===================================================
