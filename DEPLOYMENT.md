# SmartCity AI (Gorakhpur) — Enterprise Production Deployment Guide

This guide details instructions for deploying, managing, and scaling the **SmartCity AI** platform in production environments.

---

## Architecture Overview

```
                          [ Internet / Citizens / Admin Staff ]
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Nginx Reverse Proxy (Port 80/443)    │
                      │    (Gzip, Static Caching, SSL/TLS)      │
                      └────────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
        ┌───────────────────────┐                     ┌───────────────────────┐
        │  Static Web Frontend  │                     │   Node.js Backend     │
        │  (HTML5, CSS3, JS)    │                     │   Express 5 + Sockets │
        └───────────────────────┘                     │   Port: 5000          │
                                                      └───────────┬───────────┘
                                                                  │
                                                                  ▼
                                                      ┌───────────────────────┐
                                                      │ MySQL 8.0 Database    │
                                                      │ (Connection Pooling)  │
                                                      └───────────────────────┘
```

---

## Method 1: Docker Compose Deployment (Recommended)

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+

### Quick Start (1 Command)

1. **Clone the repository and enter the directory**:
   ```bash
   git clone <repo-url> smartcity
   cd smartcity
   ```

2. **Configure Environment**:
   ```bash
   cp docker.env.example .env
   # Edit .env with your desired production DB password and JWT secret:
   nano .env
   ```

3. **Build and Launch the Entire Stack**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify Container Health**:
   ```bash
   docker compose ps
   ```
   *Output should show all three services (`smartcity-mysql`, `smartcity-backend`, `smartcity-frontend`) in `healthy` / `running` status.*

5. **Access the Application**:
   - Web Platform: `http://localhost` or `http://your-server-ip`
   - Secondary Port: `http://localhost:3000`
   - Backend Direct API / Health: `http://localhost:5000/api/health`

### Useful Docker Management Commands

| Action | Command |
|---|---|
| View real-time logs | `docker compose logs -f` |
| View backend logs | `docker compose logs -f backend` |
| Check health status | `curl http://localhost/api/health` |
| Restart services | `docker compose restart` |
| Stop stack | `docker compose down` |
| Clean teardown (preserves DB data) | `docker compose down` |
| Destroy stack & remove DB volumes | `docker compose down -v` |

---

## Method 2: Bare-Metal / Cloud VM Deployment (PM2 + Nginx)

For deployment on an Ubuntu 22.04/24.04 LTS VPS (AWS EC2, DigitalOcean, Linode, Azure, Hetzner).

### 1. System Dependencies
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git curl

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Configure MySQL 8.0
```bash
sudo mysql -u root
```
```sql
CREATE DATABASE smartcity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smartcity_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON smartcity.* TO 'smartcity_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Setup Application
```bash
git clone <repo-url> /var/www/smartcity
cd /var/www/smartcity/backend

# Install production dependencies
npm ci --omit=dev

# Configure environment
cp .env.example .env
nano .env
```
Ensure `.env` contains:
```ini
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_USER=smartcity_user
DB_PASSWORD=StrongPassword123!
DB_NAME=smartcity
JWT_SECRET=production_secret_key_at_least_32_characters_long
```

### 4. Initialize Database Schema & Seed Data
```bash
npm run init-db
```

### 5. Launch Backend via PM2
```bash
# Start backend via ecosystem configuration
pm2 start ecosystem.config.js --env production

# Ensure PM2 restarts on server boot
pm2 save
pm2 startup
```

### 6. Configure Nginx
Create `/etc/nginx/sites-available/smartcity`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/smartcity/frontend;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript image/svg+xml;

    # Static assets cache
    location ~* \.(?:css|js|jpg|jpeg|png|gif|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads Proxy
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
    }

    # Socket.IO WebSocket Proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # Web pages
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/smartcity /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL/TLS with Let's Encrypt Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Health Checks & Uptime Monitoring

The backend exposes a production health diagnostic endpoint at `GET /api/health`:

```bash
curl -s http://localhost:5000/api/health | jq .
```

### Sample Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-14T14:30:00.000Z",
  "uptimeSeconds": 1420,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "latencyMs": 2,
      "pool": {
        "totalConnections": 15,
        "freeConnections": 14,
        "queuedRequests": 0
      }
    },
    "realtime": {
      "status": "active",
      "activeClients": 12
    },
    "ambulanceSimulation": {
      "status": "running"
    }
  },
  "memory": {
    "heapUsedMB": 42,
    "heapTotalMB": 68,
    "rssMB": 112
  },
  "responseTimeMs": 3
}
```
*If MySQL becomes unreachable, the endpoint returns `HTTP 503 Service Unavailable` with degraded status details.*

---

## Database Backup & Restore Runbook

### Automated Daily Backup via Cron
Create a backup script `/usr/local/bin/backup-smartcity.sh`:
```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/smartcity"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Dump database
mysqldump -u root -p"$DB_PASSWORD" smartcity | gzip > "$BACKUP_DIR/smartcity_$TIMESTAMP.sql.gz"

# Retain last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```

Make executable and register in crontab:
```bash
chmod +x /usr/local/bin/backup-smartcity.sh
# Run daily at 2:00 AM
echo "0 2 * * * root /usr/local/bin/backup-smartcity.sh" | sudo tee -a /etc/crontab
```

### Database Restoration
```bash
gunzip < /var/backups/smartcity/smartcity_YYYYMMDD_HHMMSS.sql.gz | mysql -u root -p smartcity
```

---

## Production Security Checklist

- [x] **Zero Plaintext Passwords**: Password hashing via crypto and parameterized SQL queries.
- [x] **Rate Limiting Active**: Safeguards against brute-force login and DDoS attacks.
- [x] **Security Headers**: Injected (`nosniff`, `SAMEORIGIN`, `X-XSS-Protection`).
- [x] **Role-Based Access Control**: Strict JWT token validation on all mutation endpoints.
- [x] **Non-Root Execution**: Docker container runs as `node` user.
- [x] **Graceful Shutdown**: Drains connections and stops simulator cleanly on `SIGTERM`.
- [x] **Database Automated Migration**: Pre-packaged in `/docker-entrypoint-initdb.d/`.
