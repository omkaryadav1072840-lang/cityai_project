# SmartCity AI (Gorakhpur) — Run & Setup Guide

**Document Version:** 2.0.0-MASTER  
**Date:** October 19, 2026  
**Repository Root:** `D:\cityai_project - Copy`  

---

## 1. System Requirements

- **Operating System:** Windows 10/11, Ubuntu 22.04 LTS, or macOS 13+
- **Node.js:** v20.x or higher (LTS recommended)
- **Python:** 3.10+ (Tested on Python 3.13)
- **Database:** MySQL 8.0+ running on port `3306`
- **RAM / CPU:** Minimum 4 GB RAM, 2 CPU cores

---

## 2. Environment Configuration

Copy `.env.example` to `backend/.env` and `ai_service/.env`:
```bash
# Backend Environment
copy .env.example backend\.env
# AI Service Environment
copy ai_service\.env.example ai_service\.env
```

Ensure the following critical variables are configured in `backend/.env`:
```ini
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_LOCAL_MYSQL_PASSWORD
DB_NAME=smartcity
JWT_SECRET=YOUR_MIN_32_CHAR_SECRET_KEY
```

---

## 3. Database Initialization

Run database initialization and schema migration:
```bash
# 1. Initialize core tables & seed data
npm run init-db

# 2. Apply security hardening & waste schema migration
node backend/database/migrations/security_hardening_migration.js
```

---

## 4. Starting the Application

### Development Mode (Node.js Master Server)
```bash
# Start backend server with frontend static hosting on http://localhost:5000
npm run dev
```

### Starting the Python AI Microservice (FastAPI)
```bash
# In a separate terminal:
cd ai_service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. Running Automated Verification Suites

```bash
# 1. Run Master Suite (All 25 test suites)
npm run test:all

# 2. Run Python AI Pytest Suite (10 tests)
npm run test:py

# 3. Run Dedicated Security Tests
node backend/test_phase2_otp_and_auth.js
node backend/test_phase3_and_waste_security.js

# 4. Run Traffic Enhancements Test
node backend/test_all_traffic_enhancements.js
```

---

## 6. Troubleshooting Common Issues

1. **MySQL Connection Error (`ECONNREFUSED` / `ER_ACCESS_DENIED_ERROR`):**
   - Verify MySQL service is running: `Get-Service MySQL*` or `services.msc`.
   - Ensure credentials in `backend/.env` match your local MySQL root password.
2. **Port 5000 Already in Use:**
   - Stop any existing background dev servers or specify `PORT=5001` in `backend/.env`.
3. **CORS Errors in Browser:**
   - The server dynamically allows `localhost` and `127.0.0.1` ports in development. Ensure requests send `credentials: 'include'`.
