@echo off
title SmartCity AI Gorakhpur - Master Platform
echo ========================================================
echo   🚀 Starting SmartCity AI Master Platform (v2.0)
echo ========================================================
echo.
echo [1/3] Launching Python FastAPI AI Intelligence Layer (Port 8000)...
start "SmartCity AI Service (FastAPI :8000)" cmd /k "cd /d "%~dp0ai_service" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Launching Node.js Backend & Gateway Server (Port 5000)...
start "SmartCity Node Gateway (:5000)" cmd /k "cd /d "%~dp0" && node backend/server.js"

echo Waiting 3 seconds for services to initialize...
timeout /t 3 /nobreak >nul

echo [3/3] Opening SmartCity AI Portal in your default browser...
start http://localhost:5000

echo.
echo ========================================================
echo   ✨ SmartCity AI is now LIVE!
echo   - Citizen & Command Center Portal: http://localhost:5000
echo   - AI Intelligence API & Docs:     http://localhost:8000/docs
echo ========================================================
echo.
pause
