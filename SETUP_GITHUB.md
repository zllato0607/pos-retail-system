# 🔧 GitHub Setup Guide

## Step 1: Initialize Git Repository

Open PowerShell in your project directory and run:

```powershell
cd "c:\Users\Zllato\CascadeProjects\pos-retail-system\pos-retail-system new"

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - POS Retail System with GCP deployment"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `pos-retail-system`
3. Description: "Point of Sale Web Application for Local Retail Management"
4. Visibility: **Private** (recommended) or Public
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 3: Connect to GitHub

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/pos-retail-system.git

# Or if you already have the repo:
git remote add origin https://github.com/zllato0607/pos-retail-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Verify Upload

Go to your GitHub repository and verify these files are present:
- ✅ deploy-gcp.sh
- ✅ GCP_DEPLOYMENT_GUIDE.md
- ✅ verify-gcp-deployment.sh
- ✅ QUICK_START.md
- ✅ DEPLOYMENT_SUMMARY.md
- ✅ package.json
- ✅ server/ directory
- ✅ src/ directory

## Step 5: You're Ready to Deploy!

Now follow the **QUICK_START.md** guide to deploy to Google Cloud!

---

## Alternative: If Repository Already Exists

If you already have a GitHub repository:

```powershell
cd "c:\Users\Zllato\CascadeProjects\pos-retail-system\pos-retail-system new"

# Initialize if needed
git init

# Add remote
git remote add origin https://github.com/zllato0607/pos-retail-system.git

# Pull existing content (if any)
git pull origin main --allow-unrelated-histories

# Add new files
git add .

# Commit
git commit -m "Add GCP deployment scripts and documentation"

# Push
git push origin main
```

---

## Troubleshooting

### Error: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/pos-retail-system.git
```

### Error: "failed to push some refs"
```powershell
git pull origin main --rebase
git push origin main
```

### Error: Authentication failed
Use a Personal Access Token instead of password:
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Generate new token with "repo" permissions
3. Use token as password when pushing

---

**Once pushed to GitHub, proceed to QUICK_START.md for deployment! 🚀**
