#!/bin/bash
# ==============================================================================
# HISECURE ERP v2.0.0 — PRODUCTION DEPLOYMENT RUNBOOK (ORACLE LINUX 9)
# ==============================================================================
# Versions: Node.js v20.11.0 | PostgreSQL v15.x | Redis v7.x
# ==============================================================================

set -euo pipefail

# 1. ORACLE LINUX 9 SYSTEM DAEMON SETUP & PACKAGE INSTALLS
sudo dnf clean all
sudo dnf update -y
sudo dnf install -y epel-release dnf-plugins-core

# Install Node.js v20.11.0
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs-20.11.0

# Install PostgreSQL 15
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf -qy module disable postgresql
sudo dnf install -y postgresql15-server postgresql15-contrib
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
sudo systemctl enable postgresql-15 --now

# Install Redis 7
sudo dnf install -y redis
sudo systemctl enable redis --now

# Install Nginx & Open Firewall Ports
sudo dnf install -y nginx
sudo systemctl enable nginx --now
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo setsebool -P httpd_can_network_connect 1

# Install PM2 Process Manager globally
sudo npm install -g pm2

# 2. POSTGRESQL HARDENED USER CONFIGURATION
sudo -i -u postgres psql <<EOF
CREATE DATABASE hisecure_erp;
CREATE USER hisecure_app WITH PASSWORD 'CHANGE_THIS_TO_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE hisecure_erp TO hisecure_app;
ALTER USER hisecure_app CONNECTION LIMIT 80;
EOF

# 3. REDIS HARDENED SECURITY CONFIGURATION
sudo tee /etc/redis/redis.conf > /dev/null <<EOF
bind 127.0.0.1 ::1
protected-mode yes
port 6379
requirepass CHANGE_THIS_TO_STRONG_REDIS_PASSWORD
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
EOF
sudo systemctl restart redis

# 4. ENVIRONMENT VARIABLE TEMPLATE
# Save this configuration inside ~/Hi-Secure-ERP/server/.env
cat <<'EOF' > ~/Hi-Secure-ERP/server/.env
NODE_ENV=production
PORT=3004
CLIENT_URL="https://erp.yourdomain.com"
JWT_SECRET="CHANGE_TO_64_CHAR_HEX_KEY"
DATABASE_URL="postgresql://hisecure_app:CHANGE_THIS_TO_STRONG_PASSWORD@127.0.0.1:5432/hisecure_erp?schema=public&sslmode=prefer"
REDIS_URL="redis://:CHANGE_THIS_TO_STRONG_REDIS_PASSWORD@127.0.0.1:6379/0"
TELEGRAM_BOT_ENABLED=false
ANTIVIRUS_PROVIDER=clamav
CLAMAV_HOST="127.0.0.1"
CLAMAV_PORT=3310
EOF

# 5. WORKSPACE DEPENDENCY & WORKSPACE COMPILES
cd ~/Hi-Secure-ERP
npm run install:all
npm run build

# 6. PRISMA SCHEMA GENERATION & ATOMIC MIGRATIONS
cd ~/Hi-Secure-ERP/server
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy
node seed-admin.js

# 7. PM2 ECOSYSTEM DAEMON LIFECYCLE STARTUP
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 8. NGINX REVERSE PROXY SSL CONFIGURATION
sudo tee /etc/nginx/conf.d/hisecure-erp.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name erp.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        root /var/www/hisecure-erp/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo systemctl restart nginx
