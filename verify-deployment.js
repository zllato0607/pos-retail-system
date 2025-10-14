#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks if the POS system is properly configured for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying POS Retail System deployment readiness...\n');

const checks = [];

// Check if required files exist
const requiredFiles = [
  'package.json',
  'server/index.js',
  'init-database.js',
  '.env.production',
  'ecosystem.config.js'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  checks.push({ name: `File: ${file}`, passed: exists });
});

// Check if dist directory exists (built frontend)
const distExists = fs.existsSync(path.join(__dirname, 'dist'));
console.log(`\n🏗️ Frontend build:`);
console.log(`  ${distExists ? '✅' : '❌'} dist/ directory exists`);
checks.push({ name: 'Frontend built', passed: distExists });

if (distExists) {
  const indexExists = fs.existsSync(path.join(__dirname, 'dist/index.html'));
  console.log(`  ${indexExists ? '✅' : '❌'} dist/index.html exists`);
  checks.push({ name: 'Frontend index.html', passed: indexExists });
}

// Check package.json scripts
console.log(`\n📦 Package.json scripts:`);
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const requiredScripts = ['start', 'build'];
  
  requiredScripts.forEach(script => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    console.log(`  ${exists ? '✅' : '❌'} ${script} script`);
    checks.push({ name: `Script: ${script}`, passed: !!exists });
  });
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}`);
  checks.push({ name: 'Package.json readable', passed: false });
}

// Check environment file
console.log(`\n🔧 Environment configuration:`);
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.production'), 'utf8');
  const requiredVars = ['NODE_ENV', 'PORT', 'JWT_SECRET', 'CORS_ORIGIN'];
  
  requiredVars.forEach(varName => {
    const exists = envContent.includes(`${varName}=`);
    console.log(`  ${exists ? '✅' : '❌'} ${varName} configured`);
    checks.push({ name: `Env var: ${varName}`, passed: exists });
  });
  
  // Check if JWT_SECRET is changed from default
  const hasCustomJWT = !envContent.includes('your-super-secret-jwt-key');
  console.log(`  ${hasCustomJWT ? '✅' : '⚠️'} JWT_SECRET is ${hasCustomJWT ? 'customized' : 'using default (change this!)'}`);
  checks.push({ name: 'JWT_SECRET customized', passed: hasCustomJWT });
  
} catch (error) {
  console.log(`  ❌ Error reading .env.production: ${error.message}`);
  checks.push({ name: 'Environment file readable', passed: false });
}

// Check directories
console.log(`\n📂 Required directories:`);
const requiredDirs = ['data', 'logs', 'uploads'];
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir));
  console.log(`  ${exists ? '✅' : '⚠️'} ${dir}/ ${exists ? 'exists' : 'will be created'}`);
  // These directories can be created during deployment, so we don't fail the check
});

// Summary
console.log('\n📊 Deployment Readiness Summary:');
const passedChecks = checks.filter(check => check.passed).length;
const totalChecks = checks.length;
const readinessPercentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`  Passed: ${passedChecks}/${totalChecks} checks (${readinessPercentage}%)`);

if (readinessPercentage === 100) {
  console.log('\n🎉 Your application is ready for deployment!');
  console.log('\n📋 Next steps:');
  console.log('1. Upload files to your Plesk hosting');
  console.log('2. Configure Node.js in Plesk panel');
  console.log('3. Run: npm install --production');
  console.log('4. Run: node init-database.js (if needed)');
  console.log('5. Start your application');
} else if (readinessPercentage >= 80) {
  console.log('\n⚠️ Your application is mostly ready, but please address the failed checks above.');
} else {
  console.log('\n❌ Your application needs more preparation before deployment.');
  console.log('\nFailed checks:');
  checks.filter(check => !check.passed).forEach(check => {
    console.log(`  - ${check.name}`);
  });
}

console.log('\n📖 For detailed deployment instructions, see:');
console.log('  - DEPLOYMENT.md');
console.log('  - PLESK_DEPLOYMENT_CHECKLIST.md');

process.exit(readinessPercentage === 100 ? 0 : 1);
