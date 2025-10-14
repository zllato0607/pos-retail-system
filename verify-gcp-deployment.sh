#!/bin/bash
# Deployment Verification Script
# Run this after deployment to verify everything is working

echo "🔍 POS Retail System - Deployment Verification"
echo "================================================"
echo ""

PASS=0
FAIL=0

# Function to check status
check() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
        ((PASS++))
    else
        echo "❌ $1"
        ((FAIL++))
    fi
}

# 1. Check Node.js
echo "📦 Checking Node.js..."
node -v > /dev/null 2>&1
check "Node.js installed"

# 2. Check npm
npm -v > /dev/null 2>&1
check "npm installed"

# 3. Check PM2
pm2 -v > /dev/null 2>&1
check "PM2 installed"

# 4. Check MariaDB
sudo systemctl is-active --quiet mariadb
check "MariaDB running"

# 5. Check Nginx
sudo systemctl is-active --quiet nginx
check "Nginx running"

# 6. Check application directory
if [ -d "/var/www/pos-retail-system" ]; then
    echo "✅ Application directory exists"
    ((PASS++))
else
    echo "❌ Application directory missing"
    ((FAIL++))
fi

# 7. Check PM2 processes
echo ""
echo "📊 PM2 Process Status:"
pm2 list

BACKEND_STATUS=$(pm2 jlist | grep -o '"name":"pos-backend".*"status":"[^"]*"' | grep -o 'online')
FRONTEND_STATUS=$(pm2 jlist | grep -o '"name":"pos-frontend".*"status":"[^"]*"' | grep -o 'online')

if [ "$BACKEND_STATUS" = "online" ]; then
    echo "✅ Backend is online"
    ((PASS++))
else
    echo "❌ Backend is not running"
    ((FAIL++))
fi

if [ "$FRONTEND_STATUS" = "online" ]; then
    echo "✅ Frontend is online"
    ((PASS++))
else
    echo "❌ Frontend is not running"
    ((FAIL++))
fi

# 8. Check backend port
echo ""
echo "🔌 Checking Ports..."
if sudo lsof -i :5001 > /dev/null 2>&1; then
    echo "✅ Backend port 5001 is active"
    ((PASS++))
else
    echo "❌ Backend port 5001 is not listening"
    ((FAIL++))
fi

if sudo lsof -i :5000 > /dev/null 2>&1; then
    echo "✅ Frontend port 5000 is active"
    ((PASS++))
else
    echo "❌ Frontend port 5000 is not listening"
    ((FAIL++))
fi

# 9. Check Nginx configuration
echo ""
echo "🌐 Checking Nginx..."
sudo nginx -t > /dev/null 2>&1
check "Nginx configuration valid"

# 10. Test backend API
echo ""
echo "🔧 Testing Backend API..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null || echo "000")
if [ "$BACKEND_RESPONSE" = "200" ] || [ "$BACKEND_RESPONSE" = "404" ]; then
    echo "✅ Backend API responding (HTTP $BACKEND_RESPONSE)"
    ((PASS++))
else
    echo "❌ Backend API not responding (HTTP $BACKEND_RESPONSE)"
    ((FAIL++))
fi

# 11. Test frontend
echo ""
echo "🎨 Testing Frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend responding (HTTP $FRONTEND_RESPONSE)"
    ((PASS++))
else
    echo "❌ Frontend not responding (HTTP $FRONTEND_RESPONSE)"
    ((FAIL++))
fi

# 12. Check database connection
echo ""
echo "🗄️ Testing Database..."
if sudo mysql -e "USE pos_retail_db; SHOW TABLES;" > /dev/null 2>&1; then
    echo "✅ Database accessible"
    ((PASS++))
    
    # Count tables
    TABLE_COUNT=$(sudo mysql -e "USE pos_retail_db; SHOW TABLES;" | wc -l)
    echo "   Tables found: $((TABLE_COUNT - 1))"
else
    echo "❌ Database not accessible"
    ((FAIL++))
fi

# 13. Check disk space
echo ""
echo "💾 Checking Disk Space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "✅ Disk space OK (${DISK_USAGE}% used)"
    ((PASS++))
else
    echo "⚠️  Disk space warning (${DISK_USAGE}% used)"
    ((FAIL++))
fi

# 14. Check memory
echo ""
echo "🧠 Checking Memory..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
if [ "$MEMORY_USAGE" -lt 90 ]; then
    echo "✅ Memory OK (${MEMORY_USAGE}% used)"
    ((PASS++))
else
    echo "⚠️  Memory warning (${MEMORY_USAGE}% used)"
    ((FAIL++))
fi

# Summary
echo ""
echo "================================================"
echo "📊 Verification Summary"
echo "================================================"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 All checks passed! Deployment is successful!"
    echo ""
    echo "🌐 Access your application at:"
    echo "   http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP')"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Create admin user: cd /var/www/pos-retail-system && node create-admin.js"
    echo "   2. Set up SSL: sudo certbot --nginx"
    echo "   3. Configure backups"
    exit 0
else
    echo "⚠️  Some checks failed. Please review the errors above."
    echo ""
    echo "🔧 Common fixes:"
    echo "   • Check logs: pm2 logs"
    echo "   • Restart services: pm2 restart all"
    echo "   • Check database: sudo systemctl status mariadb"
    echo "   • Review Nginx: sudo nginx -t"
    exit 1
fi
