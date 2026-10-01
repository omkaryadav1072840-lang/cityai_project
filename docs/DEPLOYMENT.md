# SmartCity AI - Deployment & Operations Guide

## 1. System Topology & Port Allocations

| Service | Technology | Port | Purpose |
|---|---|---|---|
| **Web Gateway / Backend** | Node.js / Express 5 | `5000` | REST API, WebSocket (Socket.IO), static assets |
| **Python ML Engine** | FastAPI / Scikit-Learn | `8000` | Computer vision, ANPR, traffic ML regression |
| **Database** | MySQL 8.0 Community | `3306` | Persistent relational storage (`smartcity` DB) |
| **Frontend Dev Server** | Static HTTP / Nginx | `3000` | Browser application serving `frontend/` |

---

## 2. Environment Configuration (`.env`)

Create `backend/.env` based on the following template:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

# Database Connection (MySQL 8.0)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smartcity
DB_CONNECTION_LIMIT=25

# Authentication & Security
JWT_SECRET=smartcity_super_secret_jwt_key_gorakhpur_2026
JWT_EXPIRES_IN=7d
REQUIRE_AUTH=false

# External AI & Python Service
PYTHON_AI_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_optional_gemini_api_key_here
```

---

## 3. Step-by-Step Local Deployment

### Step 3.1: MySQL Database Initialization
1. Ensure MySQL Server is running on port `3306`.
2. Create and seed the `smartcity` database:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS smartcity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p smartcity < backend/database/schema.sql
   mysql -u root -p smartcity < backend/database/seed_data.sql
   ```

### Step 3.2: Python AI Service Setup
1. Navigate to `ai_service/`:
   ```bash
   cd ai_service
   python -m venv venv
   source venv/bin/activate       # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Start FastAPI development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Step 3.3: Node.js Backend Gateway Setup
1. From the project root or `backend/`:
   ```bash
   cd backend
   npm install
   npm run dev                   # Starts server via nodemon on http://localhost:5000
   ```
2. Verify system health:
   ```bash
   curl http://localhost:5000/api/health
   ```

### Step 3.4: Frontend Client Access
- The backend statically serves all frontend files directly at `http://localhost:5000/`.
- Alternatively, launch the isolated frontend development server:
   ```bash
   node scripts/serve_frontend.js
   ```

---

## 4. One-Click Batch Startup (Windows)

A unified launcher script is provided at the workspace root:

```cmd
run.bat
```

This batch script:
1. Validates MySQL database connectivity on port 3306.
2. Launches Python ML FastAPI server on port 8000.
3. Launches Node.js Express Gateway on port 5000.
4. Opens the default browser to `http://localhost:5000/`.

---

## 5. Docker Production Deployment

Use Docker Compose to deploy the full stack with isolated containers:

```bash
docker-compose up -d --build
```

To view real-time container logs:
```bash
docker-compose logs -f backend
```

To stop containers:
```bash
docker-compose down
```
