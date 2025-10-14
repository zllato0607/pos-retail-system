#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Removes development files and prepares for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Cleaning up project for production deployment...\n');

// Files to remove for production
const filesToRemove = [
  // Development databases
  'database.db',
  
  // Development/testing scripts
  'clear-cache.js',
  'create-admin.js', 
  'debug-api.js',
  'fix-errors.js',
  'migrate-db.js',
  'quick-setup.js',
  'test-migration.js',
  'test-sales.js',
  'test-server.js',
  'validate-db.js',
  
  // Development batch files
  'run-init.bat',
  'start.bat',
  'start.sh',
  'setup.ps1',
  
  // Archive files
  'pos-retail-system.zip',
  
  // Sample data (optional - keep if needed)
  'sample_products.csv',
  
  // Development environment
  '.env',
  
  // This cleanup script itself (after running)
  'cleanup-for-production.js'
];

// Directories to remove for production
const dirsToRemove = [
  'node_modules', // Will be reinstalled with --production
];

// Files to keep but are development-related (informational)
const developmentFiles = [
  '.env.example',
  'README.md',
  'SETUP.md',
  'DEPLOYMENT.md',
  'PLESK_DATABASE_SETUP.md',
  'PLESK_DEPLOYMENT_CHECKLIST.md'
];

let removedCount = 0;
let skippedCount = 0;

console.log('📋 Files scheduled for removal:');

// Remove files
for (const file of filesToRemove) {
  const filePath = path.join(__dirname, file);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  ✅ Removed: ${file}`);
      removedCount++;
    } else {
      console.log(`  ⚪ Not found: ${file}`);
      skippedCount++;
    }
  } catch (error) {
    console.log(`  ❌ Error removing ${file}: ${error.message}`);
  }
}

// Remove directories
console.log('\n📁 Directories scheduled for removal:');
for (const dir of dirsToRemove) {
  const dirPath = path.join(__dirname, dir);
  
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`  ✅ Removed directory: ${dir}`);
      removedCount++;
    } else {
      console.log(`  ⚪ Not found: ${dir}`);
      skippedCount++;
    }
  } catch (error) {
    console.log(`  ❌ Error removing ${dir}: ${error.message}`);
  }
}

console.log('\n📄 Development files kept (documentation):');
developmentFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '📖' : '⚪'} ${file}`);
});

console.log('\n🎯 Essential production files:');
const productionFiles = [
  'package.json',
  'package-lock.json',
  '.env.production',
  '.htaccess',
  'ecosystem.config.js',
  'deploy.sh',
  'deploy.bat',
  'verify-deployment.js',
  'init-database.js',
  'init-mysql-database.js',
  'index.html',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'server/',
  'src/'
];

productionFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

console.log(`\n📊 Cleanup Summary:`);
console.log(`  ✅ Files/directories removed: ${removedCount}`);
console.log(`  ⚪ Files not found (already clean): ${skippedCount}`);

console.log('\n🚀 Next steps for production deployment:');
console.log('1. Run: npm install --production');
console.log('2. Run: npm run build');
console.log('3. Run: npm run verify');
console.log('4. Deploy to your Plesk hosting');

console.log('\n✨ Project cleaned and ready for production!');
