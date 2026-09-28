# SMARTCITY AI — SETUP & DEPLOYMENT GUIDE (WINDOWS)
**Platform**: Gorakhpur Smart City Management Platform  
**Target OS**: Windows 10 / 11 (PowerShell)  

---

## 1. System Prerequisites

Ensure the following runtimes are installed on your machine:
- **Node.js**: v18.0.0 or higher (`node -v`)
- **Python**: v3.10 to v3.13 (`python --version`)
- **MySQL Server**: 8.0+ running on port `3306`

---

## 2. Step-by-Step Installation

### Step 1: Clone & Configure Environment Variables
Open Windows PowerShell in the project root:
```powershell
# Copy the environment template
Copy-Item .env.example backend\.env
```
Open `backend\.env` in an editor and update your MySQL credentials:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_actual_password
MYSQL_DATABASE=smartcity_db
JWT_SECRET=smartcity_super_secret_jwt_key_gorakhpur_2026
```

### Step 2: Install Node.js Backend Dependencies
```powershell
cd backend
npm install
cd ..
```

### Step 3: Install Python AI Dependencies (Optional / Virtualenv)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn scikit-learn pandas numpy opencv-python
```

### Step 4: Execute Database Migrations
Run the three migration scripts to create all 89+ tables and the AI Prediction Ledgers:
```powershell
# 1. Core AI Orchestrator & Tool Logs Migration
node backend/database/run_phase1_migration.js

# 2. Traffic, CV/ANPR, Grievance, and Waste AI Migration
node backend/database/run_phase2_to_6_migration.js

# 3. Water, Healthcare, Parking, and Environment Migration
node backend/database/run_phase7_to_11_migration.js
```

---

## 3. Starting the Platform Services

### Terminal 1: Start Python AI Microservices (FastAPI on Port 8000)
```powershell
# In PowerShell:
uvicorn ai_service.main:app --host 127.0.0.1 --port 8000 --reload
```
*(Note: If Python is not running, Node.js automatically falls back to local mathematical heuristic engines with zero service interruption).*

### Terminal 2: Start Node.js Application Gateway (Port 5000)
```powershell
# In PowerShell:
node backend/server.js
```
Expected output:
```
🟢 MySQL Connection Pool initialized successfully.
🚀 Server running at http://localhost:5000
```

### Terminal 3: Access Frontend
Simply open your browser to:
```
http://localhost:5000/
```
Or open [frontend/index.html](file:///d:/cityai_project%20-%20Copy/frontend/index.html) directly.
