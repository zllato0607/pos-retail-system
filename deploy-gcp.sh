#!/bin/bash
# Production Deployment Script for Google Cloud Debian VM
# POS Retail System - Full Stack Deployment

set -e  # Exit on any error

# ============================================
# CONFIGURATION
# ============================================
APP_DIR="/var/www/pos-retail-system"
GIT_REPO="https://github.com/zllato0607/pos-retail-system.git"
BRANCH="main"
DOMAIN_OR_IP="34.169.96.234"

# Database Configuration
DB_NAME="fixmobi1_pos"
DB_USER="fixmobi1_pos"
DB_PASSWORD="Br9c5v*49"

# Application Ports
BACKEND_PORT=5001
FRONTEND_PORT=5000

echo "🚀 Starting POS Retail System Deployment on Google Cloud..."
echo "=================================================="

# ============================================
# 1. SYSTEM PREPARATION
# ============================================
echo ""
echo "📦 Step 1: System Preparation..."
sudo apt update
sudo apt install -y git nginx curl build-essential

# ============================================
# 2. INSTALL NODE.JS 20.x
# ============================================
echo ""
echo "📦 Step 2: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✓ Node.js already installed: $(node -v)"
fi

# Install PM2 globally
sudo npm install -g pm2

# ============================================
# 3. INSTALL MARIADB
# ============================================
echo ""
echo "📦 Step 3: Installing MariaDB..."
if ! command -v mysql &> /dev/null; then
    sudo apt install -y mariadb-server mariadb-client
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
else
    echo "✓ MariaDB already installed"
fi

# Wait for MariaDB to be ready
echo "⏳ Waiting for MariaDB to start..."
for i in {1..30}; do
    if sudo mysql -e "SELECT 1" &> /dev/null; then
        echo "✓ MariaDB is ready"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ MariaDB failed to start"
        exit 1
    fi
done

# ============================================
# 4. DATABASE SETUP
# ============================================
echo ""
echo "📦 Step 4: Setting up Database..."
sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "✓ Database created: ${DB_NAME}"

# ============================================
# 5. CLONE APPLICATION
# ============================================
echo ""
echo "📦 Step 5: Cloning Application..."
if [ -d "$APP_DIR" ]; then
    echo "⚠️  Directory exists. Backing up..."
    sudo mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

git clone -b "$BRANCH" "$GIT_REPO" "$APP_DIR" || {
    echo "❌ Git clone failed"
    exit 1
}

cd "$APP_DIR" || exit 1
echo "✓ Application cloned successfully"

# ============================================
# 6. VERIFY PROJECT STRUCTURE
# ============================================
echo ""
echo "📦 Step 6: Verifying Project Structure..."
REQUIRED_FILES=(
    "package.json"
    "vite.config.js"
    "index.html"
    "src/main.jsx"
    "server/index.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done
echo "✓ All required files present"

# ============================================
# 7. CONFIGURE ENVIRONMENT
# ============================================
echo ""
echo "📦 Step 7: Configuring Environment..."
cat > .env.production <<EOL
# Production Environment
NODE_ENV=production
PORT=${BACKEND_PORT}

# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)

# CORS Configuration
CORS_ORIGIN=http://${DOMAIN_OR_IP}

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOL

echo "✓ Environment configured"

# ============================================
# 8. INSTALL DEPENDENCIES
# ============================================
echo ""
echo "📦 Step 8: Installing Dependencies..."
npm install --production=false || {
    echo "❌ npm install failed"
    exit 1
}
echo "✓ Dependencies installed"

# ============================================
# 9. INITIALIZE DATABASE
# ============================================
echo ""
echo "📦 Step 9: Initializing Database Schema..."
if [ -f "init-mysql-database.js" ]; then
    node init-mysql-database.js || {
        echo "⚠️  Database initialization failed, continuing..."
    }
else
    echo "⚠️  No database initialization script found"
fi

# ============================================
# 10. BUILD FRONTEND
# ============================================
echo ""
echo "📦 Step 10: Building Frontend..."
npm run build || {
    echo "❌ Frontend build failed"
    exit 1
}
echo "✓ Frontend built successfully"

# ============================================
# 11. CREATE DIRECTORIES
# ============================================
echo ""
echo "📦 Step 11: Creating Required Directories..."
mkdir -p uploads logs data
chmod 755 uploads logs data
echo "✓ Directories created"

# ============================================
# 12. CONFIGURE PM2
# ============================================
echo ""
echo "📦 Step 12: Configuring PM2..."
cat > ecosystem.config.cjs <<EOL
module.exports = {
  apps: [
    {
      name: 'pos-backend',
      script: './server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'pos-frontend',
      script: 'npx',
      args: 'vite preview --port ${FRONTEND_PORT} --host',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
EOL

echo "✓ PM2 configuration created"

# ============================================
# 13. START APPLICATIONS
# ============================================
echo ""
echo "📦 Step 13: Starting Applications with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -n 1 | sudo bash
echo "✓ Applications started"

# ============================================
# 14. CONFIGURE NGINX
# ============================================
echo ""
echo "📦 Step 14: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/pos-retail-system > /dev/null <<EOL
server {
    listen 80;
    server_name ${DOMAIN_OR_IP};

    # Frontend
    location / {
        proxy_pass http://localhost:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    # File uploads
    client_max_body_size 10M;
}
EOL

# Enable site
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/pos-retail-system /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t && sudo systemctl restart nginx
echo "✓ Nginx configured"

# ============================================
# 15. CONFIGURE FIREWALL
# ============================================
echo ""
echo "📦 Step 15: Configuring Firewall..."
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
echo "✓ Firewall configured"

# ============================================
# DEPLOYMENT COMPLETE
# ============================================
echo ""
echo "=================================================="
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo ""
echo "📊 Deployment Summary:"
echo "  • Application Directory: ${APP_DIR}"
echo "  • Database: ${DB_NAME}"
echo "  • Backend Port: ${BACKEND_PORT}"
echo "  • Frontend Port: ${FRONTEND_PORT}"
echo ""
echo "🌐 Access your application:"
echo "  • URL: http://${DOMAIN_OR_IP}"
echo ""
echo "🔧 Useful Commands:"
echo "  • View logs: pm2 logs"
echo "  • Check status: pm2 status"
echo "  • Restart: pm2 restart all"
echo "  • Stop: pm2 stop all"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "  1. Change the database password in .env.production"
echo "  2. Set up SSL/HTTPS with Let's Encrypt"
echo "  3. Configure proper backup strategy"
echo ""
