@echo off
echo 🚀 Starting POS Retail System deployment for Windows...

REM Create necessary directories
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

REM Install dependencies
echo 📦 Installing dependencies...
npm install --production

REM Build frontend
echo 🏗️ Building frontend...
npm run build

REM Initialize database if it doesn't exist
if not exist "data\pos_system.db" (
    echo 🗄️ Initializing database...
    node init-database.js
)

echo ✅ Deployment completed!
echo 📝 Next steps:
echo 1. Update .env.production with your domain and JWT secret
echo 2. Start the application with: npm start
echo 3. Access your POS system at: https://yourdomain.com

pause
