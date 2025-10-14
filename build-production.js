#!/usr/bin/env node

// Ultra-minimal production build script
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️  Starting minimal production build...');

// Extremely conservative resource limits
const buildProcess = spawn('npx', ['vite', 'build'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    // Minimal resource usage
    NODE_OPTIONS: '--max-old-space-size=512',
    GOMAXPROCS: '1',
    UV_THREADPOOL_SIZE: '2',
  }
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed!');
  } else {
    console.error('❌ Build failed with code:', code);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Build error:', error);
  process.exit(1);
});
