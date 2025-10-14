# 🚀 Complete Google Cloud Deployment Guide
## POS Retail System - Production Deployment on Debian VM

---

## 📋 Prerequisites

### Google Cloud VM Requirements:
- **OS**: Debian 11 (Bullseye) or later
- **Machine Type**: e2-medium (2 vCPU, 4GB RAM) minimum
- **Disk**: 20GB SSD minimum
- **Firewall**: Allow HTTP (80), HTTPS (443), SSH (22)
- **External IP**: Static IP recommended

### Local Requirements:
- Git installed
- GitHub account with your repository
- SSH access to your VM

---

## 🎯 Deployment Steps

### Step 1: Prepare Your Repository

1. **Commit all changes**:
```bash
cd "c:\Users\Zllato\CascadeProjects\pos-retail-system\pos-retail-system new"
git add .
git commit -m "Production deployment ready"
git push origin main
```

2. **Verify critical files exist**:
   - ✅ `package.json`
   - ✅ `server/index.js`
   - ✅ `src/main.jsx`
   - ✅ `vite.config.js`
   - ✅ `index.html`
   - ✅ `.env.production`

---

### Step 2: Connect to Your Google Cloud VM

```bash
# SSH into your VM (replace with your actual IP)
ssh your-username@34.169.96.234
```

Or use Google Cloud Console's SSH button.

---

### Step 3: Upload Deployment Script

**Option A: Direct Upload**
```bash
# On your local machine
scp deploy-gcp.sh your-username@34.169.96.234:~/
```

**Option B: Clone Repository First**
```bash
# On the VM
git clone https://github.com/zllato0607/pos-retail-system.git
cd pos-retail-system
chmod +x deploy-gcp.sh
```

---

### Step 4: Run Deployment

```bash
# Make script executable
chmod +x deploy-gcp.sh

# Run deployment (will ask for sudo password)
sudo bash deploy-gcp.sh
```

**Expected Duration**: 5-10 minutes

---

### Step 5: Verify Deployment

1. **Check PM2 Status**:
```bash
pm2 status
```
Expected output:
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ status  │ restart │ uptime   │
├─────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0   │ pos-backend      │ online  │ 0       │ 2m       │
│ 1   │ pos-frontend     │ online  │ 0       │ 2m       │
└─────┴──────────────────┴─────────┴─────────┴──────────┘
```

2. **Check Application Logs**:
```bash
pm2 logs
```

3. **Test Backend API**:
```bash
curl http://localhost:5001/api/health
```

4. **Test Frontend**:
```bash
curl http://localhost:5000
```

5. **Access via Browser**:
```
http://34.169.96.234
```

---

## 🔧 Post-Deployment Configuration

### 1. Create Admin User

```bash
cd /var/www/pos-retail-system
node create-admin.js
```

### 2. Update Environment Variables

```bash
nano /var/www/pos-retail-system/.env.production
```

**Critical settings to change**:
- `DB_PASSWORD`: Use a strong password
- `JWT_SECRET`: Already auto-generated
- `CORS_ORIGIN`: Update if using a domain name

### 3. Set Up SSL (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

---

## 📊 Monitoring & Maintenance

### View Application Logs
```bash
# All logs
pm2 logs

# Backend only
pm2 logs pos-backend

# Frontend only
pm2 logs pos-frontend

# Last 100 lines
pm2 logs --lines 100
```

### Restart Applications
```bash
# Restart all
pm2 restart all

# Restart specific app
pm2 restart pos-backend
pm2 restart pos-frontend
```

### Stop Applications
```bash
pm2 stop all
```

### Check System Resources
```bash
pm2 monit
```

### Database Backup
```bash
# Create backup
mysqldump -u pos_user -p pos_retail_db > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u pos_user -p pos_retail_db < backup_20241014.sql
```

---

## 🐛 Troubleshooting

### Issue: PM2 shows "errored" status

**Solution**:
```bash
# Check logs for errors
pm2 logs pos-backend --err

# Common fixes:
cd /var/www/pos-retail-system
npm install
pm2 restart all
```

### Issue: Database connection failed

**Solution**:
```bash
# Verify MariaDB is running
sudo systemctl status mariadb

# Test database connection
mysql -u pos_user -p pos_retail_db

# Check credentials in .env.production
cat /var/www/pos-retail-system/.env.production
```

### Issue: Nginx 502 Bad Gateway

**Solution**:
```bash
# Check if apps are running
pm2 status

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: Port already in use

**Solution**:
```bash
# Find process using port 5001
sudo lsof -i :5001

# Kill the process
sudo kill -9 <PID>

# Restart PM2
pm2 restart all
```

### Issue: Build fails with memory error

**Solution**:
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

---

## 🔄 Updating Your Application

### Method 1: Git Pull Update
```bash
cd /var/www/pos-retail-system
git pull origin main
npm install
npm run build
pm2 restart all
```

### Method 2: Full Redeployment
```bash
sudo bash deploy-gcp.sh
```

---

## 🔒 Security Checklist

- [ ] Change default database password
- [ ] Set up SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Enable automatic security updates
- [ ] Set up regular database backups
- [ ] Use strong JWT secret
- [ ] Disable root SSH login
- [ ] Set up fail2ban
- [ ] Monitor application logs
- [ ] Keep Node.js and dependencies updated

---

## 📞 Quick Reference Commands

```bash
# Application Management
pm2 status                    # Check app status
pm2 logs                      # View logs
pm2 restart all              # Restart apps
pm2 stop all                 # Stop apps
pm2 monit                    # Monitor resources

# Database Management
sudo systemctl status mariadb # Check DB status
mysql -u pos_user -p         # Access database

# Nginx Management
sudo nginx -t                # Test config
sudo systemctl restart nginx # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View logs

# System Management
df -h                        # Check disk space
free -m                      # Check memory
htop                         # System monitor
```

---

## 🎯 Default Credentials

**Database**:
- Host: localhost
- Port: 3306
- Database: pos_retail_db
- User: pos_user
- Password: SecurePass2024! (change this!)

**Application**:
- Create admin user with: `node create-admin.js`

---

## 📝 Architecture Overview

```
Internet
    ↓
Nginx (Port 80/443)
    ↓
    ├─→ Frontend (Port 5000) - Vite Preview Server
    │   └─→ React SPA
    │
    └─→ Backend API (Port 5001) - Express Server
        └─→ MariaDB (Port 3306)
```

---

## 🆘 Support

If you encounter issues:

1. Check logs: `pm2 logs`
2. Verify services: `pm2 status`
3. Check database: `sudo systemctl status mariadb`
4. Review Nginx: `sudo nginx -t`
5. Check firewall: `sudo ufw status`

---

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MariaDB Documentation](https://mariadb.com/kb/en/)
- [Google Cloud VM Documentation](https://cloud.google.com/compute/docs)

---

**Last Updated**: October 14, 2025
**Version**: 1.0.0
