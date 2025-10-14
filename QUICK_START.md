# ⚡ Quick Start Guide - Google Cloud Deployment

## 🎯 Deploy in 5 Minutes

### Step 1: Push Your Code (Local Machine)
```bash
cd "c:\Users\Zllato\CascadeProjects\pos-retail-system\pos-retail-system new"
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect to Your VM
```bash
ssh your-username@34.169.96.234
```

### Step 3: Download & Run Deployment Script
```bash
# Clone your repository
git clone https://github.com/zllato0607/pos-retail-system.git
cd pos-retail-system

# Make script executable
chmod +x deploy-gcp.sh

# Run deployment
sudo bash deploy-gcp.sh
```

**Wait 5-10 minutes for deployment to complete.**

### Step 4: Verify Deployment
```bash
# Make verification script executable
chmod +x verify-gcp-deployment.sh

# Run verification
bash verify-gcp-deployment.sh
```

### Step 5: Access Your Application
Open browser and go to:
```
http://34.169.96.234
```

---

## 🔑 Create Admin User

```bash
cd /var/www/pos-retail-system
node create-admin.js
```

Follow the prompts to create your admin account.

---

## 📊 Essential Commands

### Check Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs
```

### Restart Application
```bash
pm2 restart all
```

### Stop Application
```bash
pm2 stop all
```

---

## 🐛 If Something Goes Wrong

### Check Logs
```bash
pm2 logs --lines 50
```

### Restart Everything
```bash
pm2 restart all
sudo systemctl restart nginx
```

### Full Redeploy
```bash
cd ~
sudo bash pos-retail-system/deploy-gcp.sh
```

---

## 🔒 Security (Do This After Deployment)

### 1. Change Database Password
```bash
nano /var/www/pos-retail-system/.env.production
# Change DB_PASSWORD to a strong password
pm2 restart all
```

### 2. Set Up SSL (If Using Domain)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 📞 Need Help?

1. **Check deployment logs**: `pm2 logs`
2. **Verify services**: `bash verify-gcp-deployment.sh`
3. **Review full guide**: See `GCP_DEPLOYMENT_GUIDE.md`

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Deployment script completed without errors
- [ ] Verification script shows all green checks
- [ ] Can access application in browser
- [ ] Admin user created
- [ ] Database password changed
- [ ] SSL configured (if using domain)

---

**That's it! Your POS system is now live! 🎉**
